import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, AppState, Keyboard, Linking, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  AudioQuality,
  IOSOutputFormat,
  RecordingPresets,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  type RecordingOptions,
} from 'expo-audio';
import Wallpaper from './Wallpaper';
import SettingsButton from './SettingsSheet';
import NamesSheet, { type Names } from './NamesSheet';
import type { Concept } from './concepts';
import { fill } from './i18n';
import { roundPlayed } from './review';
import type { Preset } from './shot';
import { sfx } from './sfx';
import { useSettings } from './settings';
import { BannerSlot, useAds } from './ads';
import { BigButton, Button, Pill, Text, font, ink, useSize } from './ui';
import { deleteFiles, readWav, reversed, saveWav, trimSilence } from './wav';

type Slot = 'p1' | 'p2';
/** orig: player 1 as recorded, origRev: reversed, imit: player 2's imitation flipped back. */
type Sounds = { orig: string | null; origRev: string | null; imit: string | null };
const EMPTY: Sounds = { orig: null, origRev: null, imit: null };

const C = { rec: '#FF3B6B', rev: '#7B4BFF', play: '#13B3A5', win: '#FF9F1C' };

// Uncompressed WAV on iOS, so the samples can be read back and reversed.
const REC_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  extension: '.wav',
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 705600,
  ios: {
    extension: '.wav',
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: AudioQuality.MAX,
    sampleRate: 44100,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
};

/**
 * duo: two players take turns and keep score. solo: one player copies their own word.
 * intro: the try-out on first launch (and from Settings), the solo loop once with its own words.
 */
export type Mode = 'duo' | 'solo' | 'intro';

/**
 * One step per screen. say: the word is recorded. p2: listen to it backwards and record a copy.
 * guess: the copy plays flipped back. result: original and copy side by side. score: who got it.
 */
type Step = 'say' | 'p2' | 'guess' | 'result' | 'score';
const DOTS: Record<Mode, Step[]> = { duo: ['say', 'p2', 'guess'], solo: ['say', 'p2'], intro: ['say', 'p2'] };

/** Rounds in a match. Even, so both players guess the same number of times. */
const ROUNDS = 6;
/** Playback speed of the backwards sound with "Slow" on. */
const SLOW_RATE = 0.65;

type Props = {
  mode: Mode;
  concept: Concept;
  names: Names;
  setNames: (n: Names) => void;
  onExit: () => void;
  /** Store screenshots only: opens the screen in a given state, without touching the microphone. */
  preset?: Preset;
};

export default function Game({ mode, concept, names, setNames, onExit, preset }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height, onLayout } = useSize();
  const { t, lang } = useSettings();
  const ads = useAds();
  /** "Anything" has no suggestions: player 1 picks the word and may type it. */
  const free = concept.words[lang].length === 0;
  const [sounds, setSounds] = useState<Sounds>(() => preset ? { orig: preset.orig ? 'shot' : null, origRev: preset.orig ? 'shot' : null, imit: preset.imit ? 'shot' : null } : EMPTY);
  const [recording, setRecording] = useState<Slot | null>(null);
  const [playing, setPlaying] = useState<keyof Sounds | null>(null);
  const [word, setWord] = useState<string | null>(preset?.word ?? null);
  /** Only a word player 1 actually looked at counts as the secret word. */
  const [wordSeen, setWordSeen] = useState(!!preset?.word);
  const [peek, setPeek] = useState(false);
  /** A fresh suggestion stays visible until it is tapped away; after that it takes a hold to see it. */
  const [shown, setShown] = useState(!!preset?.word);
  const [phase, setPhase] = useState<'play' | 'result' | 'score'>(preset?.phase ?? 'play');
  const [error, setError] = useState<string | null>(null);
  /** Round of the match, from 1. Player 1 says the word in odd rounds, player 2 in even ones. */
  const [round, setRound] = useState(preset?.round ?? 1);
  const [scores, setScores] = useState<[number, number]>(preset?.scores ?? [0, 0]);
  const [lastCorrect, setLastCorrect] = useState(!!preset?.lastCorrect);
  const [slow, setSlow] = useState(false);
  /**
   * The try-out asks for the microphone on the first tap, not when the screen opens; the
   * game screens ask on opening, so the recorder can be armed before the first tap.
   */
  const [micReady, setMicReady] = useState(mode !== 'intro');
  const [micDenied, setMicDenied] = useState(false);
  const [namesOpen, setNamesOpen] = useState(false);
  /** The sound to play when the current one ends: the original is followed by the copy. */
  const chain = useRef<keyof Sounds | null>(null);
  const chainTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const busy = useRef(false);
  /** Permission and recording mode are set up when the game opens, so Record starts instantly. */
  const ready = useRef<Promise<boolean> | null>(null);
  const silence = useRef<string | null>(null);
  /**
   * The recorder is started and paused as soon as a record screen shows. Measured on an iPhone 16:
   * preparing and starting on the tap took 400-675 ms and lost the start of the word, resuming a
   * paused recorder takes 30-40 ms. `skip` is how many seconds it recorded before the pause.
   */
  const armed = useRef<{ skip: number; uri: string | null } | null>(null);
  /** Seconds to cut from the start of the take that is running. */
  const skip = useRef(0);
  /** Arming and disarming run one after the other; Record waits for them. */
  const queue = useRef<Promise<void>>(Promise.resolve());
  const wantArmed = useRef(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const soundsRef = useRef(sounds);
  useEffect(() => { soundsRef.current = sounds; }, [sounds]);

  const recorder = useAudioRecorder(REC_OPTIONS);

  // Without keepAudioSessionActive, pause() shuts the audio session down 100 ms later
  // unless something is already playing, so a recording that loaded slowly played silently.
  const player = useAudioPlayer(null, { keepAudioSessionActive: true });
  const status = useAudioPlayerStatus(player);

  function setUpRecording() {
    ready.current = (async () => {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) return false;
      // Recording mode stays on for the whole game; sound still goes to the speaker.
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      // The audio session only stays switched on once this player has played something.
      // Without this, the first Record had to switch it on first and lost the start of the word.
      silence.current ??= await saveWav('silence', new Int16Array(4410), 44100);
      player.replace({ uri: silence.current });
      player.play();
      return true;
    })().catch(() => false);
    return ready.current;
  }

  useEffect(() => {
    if (preset) return;
    if (mode !== 'intro') setUpRecording();
    // Opened again from Settings, the try-out already has the microphone: no need to ask twice.
    else getRecordingPermissionsAsync().then(async p => { if (p.granted && await setUpRecording()) setMicReady(true); }).catch(() => {});
    return () => {
      if (chainTimer.current) clearTimeout(chainTimer.current);
      setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      deleteFiles([...Object.values(soundsRef.current), silence.current, armed.current?.uri ?? null]);
    };
    // Set up once when the game opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', s => setAppActive(s === 'active'));
    return () => sub.remove();
  }, []);

  function arm() {
    queue.current = queue.current.then(async () => {
      if (armed.current || !wantArmed.current) return;
      try {
        if (!(await (ready.current ?? setUpRecording()))) return;
        await recorder.prepareToRecordAsync();
        recorder.record();
        recorder.pause();
        const t = recorder.currentTime;
        armed.current = { skip: Number.isFinite(t) ? Math.min(Math.max(t, 0), 0.5) : 0, uri: recorder.uri };
      } catch {
        armed.current = null;
      }
    });
  }

  function disarm() {
    queue.current = queue.current.then(async () => {
      const a = armed.current;
      if (!a) return;
      armed.current = null;
      await recorder.stop().catch(() => {});
      deleteFiles([a.uri]);
    });
  }

  const tap = () => sfx.tap(concept.id, 0.5);

  // No theme sound on listen buttons: it would talk over the recording.
  function playUri(key: keyof Sounds, uri: string | null, then: keyof Sounds | null = null) {
    if (!uri) return;
    if (chainTimer.current) clearTimeout(chainTimer.current);
    chain.current = then;
    player.pause();
    setPlaying(key);
    player.replace({ uri });
    player.setPlaybackRate(key === 'origRev' && slow ? SLOW_RATE : 1);
    player.play();
  }
  /** The original, then the copy flipped back. */
  const playBoth = () => { if (!recording) playUri('orig', soundsRef.current.orig, 'imit'); };

  useEffect(() => {
    if (!status.didJustFinish || !chain.current) return;
    const next = chain.current;
    chain.current = null;
    chainTimer.current = setTimeout(() => playUri(next, soundsRef.current[next]), 400);
    // Only when a sound ends.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.didJustFinish]);
  const play = (key: keyof Sounds) => { if (!recording) playUri(key, sounds[key]); };

  /** Runs on touch-down. The screen switches to "recording" at once; the mic follows within a moment. */
  async function startRecord(slot: Slot) {
    if (busy.current || recording) return;
    busy.current = true;
    setError(null);
    setMicDenied(false);
    if (!micReady) {
      // The try-out's first tap only asks for the microphone; arming follows, and the next tap records.
      const ok = await setUpRecording();
      if (ok) setMicReady(true);
      else { setError(t.errMic); setMicDenied(true); ready.current = null; }
      busy.current = false;
      return;
    }
    setRecording(slot);
    try {
      // No button sound here: it would end up at the start of the recording.
      Keyboard.dismiss();
      player.pause();
      setPlaying(null);
      await queue.current;
      const a = armed.current;
      armed.current = null;
      skip.current = 0;
      if (a) {
        try {
          recorder.record();
          if (recorder.isRecording) { skip.current = a.skip; return; }
        } catch {}
        deleteFiles([a.uri]);
      }
      // Not armed (first moments of the screen, or resuming failed): the slow way.
      const ok = await (ready.current ?? setUpRecording());
      if (!ok) { setError(t.errMic); setMicDenied(true); setRecording(null); ready.current = null; return; }
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      setError(t.errStart);
      setRecording(null);
    } finally {
      busy.current = false;
    }
  }

  async function stopRecord() {
    const slot = recording;
    if (busy.current || !slot) return;
    busy.current = true;
    setRecording(null);
    let uri: string | null = null;
    try {
      await recorder.stop();
      uri = recorder.uri;
      if (!uri) throw new Error('No recording');
      const wav = await readWav(uri);
      const sr = wav.sampleRate;
      // Drop what the recorder picked up while it was being armed, before the tap.
      const take = wav.pcm.subarray(Math.min(wav.pcm.length, Math.round(skip.current * sr)));
      if (take.length < sr * 0.25) { setError(t.errShort); return; }
      const pcm = trimSilence(take, sr);

      if (slot === 'p1') {
        const [orig, origRev] = await Promise.all([saveWav('orig', pcm, sr), saveWav('rev', reversed(pcm), sr)]);
        deleteFiles(Object.values(soundsRef.current));
        setSounds({ orig, origRev, imit: null });
        setPhase('play');
        // The try-out goes straight to its point: your own voice, backwards.
        if (mode === 'intro') playUri('origRev', origRev);
      } else {
        const imit = await saveWav('imit', reversed(pcm), sr);
        deleteFiles([soundsRef.current.imit]);
        setSounds(s => ({ ...s, imit }));
        if (mode !== 'duo') {
          // Nobody has to guess: the original and the copy play one after the other.
          if (mode === 'solo') ads.roundFinished();
          playUri('orig', soundsRef.current.orig, 'imit');
        } else {
          // Straight to the fun part: player 2 hears their copy flipped back.
          playUri('imit', imit);
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setError(t.errRead);
    } finally {
      deleteFiles([uri]);
      busy.current = false;
    }
  }

  function suggest() {
    tap();
    const pool = concept.words[lang].filter(w => w !== word);
    setWord(pool[Math.floor(Math.random() * pool.length)]);
    setWordSeen(true);
    setShown(true);
  }

  function stopPlayback() {
    if (chainTimer.current) clearTimeout(chainTimer.current);
    chain.current = null;
    player.pause();
  }

  /** Back to step one with the same word, when the speaker wants another take. */
  function redoP1() {
    stopPlayback();
    deleteFiles(Object.values(sounds));
    setSounds(EMPTY);
    setPhase('play');
    setError(null);
  }

  /** Back to listen-and-record, so the backwards sound can be heard again first. */
  function redoP2() {
    stopPlayback();
    deleteFiles([sounds.imit]);
    setSounds(s => ({ ...s, imit: null }));
    setPhase('play');
    setError(null);
  }

  function reveal() {
    if (!sounds.orig) return;
    setPhase('result');
    ads.roundFinished();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    playUri('orig', sounds.orig, 'imit');
  }

  /** Player 1 says the word in odd rounds; the other one copies and guesses. */
  const speaker = ((round - 1) % 2) as 0 | 1;
  const guesser = (1 - speaker) as 0 | 1;
  const name = (i: 0 | 1) => names[i].trim() || (i === 0 ? t.player1 : t.player2);

  function judge(correct: boolean) {
    stopPlayback();
    if (correct) setScores(sc => (guesser === 0 ? [sc[0] + 1, sc[1]] : [sc[0], sc[1] + 1]));
    setLastCorrect(correct);
    setPhase('score');
    // The score screen is quiet: nothing is playing or recording.
    roundPlayed();
    Haptics.notificationAsync(correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
  }

  /** Stops whatever is running and empties the round. */
  function clearRound() {
    if (recording) { recorder.stop().catch(() => {}); setRecording(null); }
    stopPlayback();
    // No sound here: the next screen is a record button, and a sound reads as "recording has started".
    deleteFiles(Object.values(sounds));
    setSounds(EMPTY);
    setWord(null);
    setWordSeen(false);
    setShown(false);
    setPhase('play');
    setError(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }

  /** The next round; after the last one a new match starts. */
  function nextRound() {
    ads.beforeNextRound();
    clearRound();
    // Solo rounds count when the player moves on; on their result screen the sounds are still playing.
    if (mode === 'solo') roundPlayed();
    if (mode !== 'duo') return;
    if (round >= ROUNDS) { setRound(1); setScores([0, 0]); }
    else setRound(round + 1);
  }

  const isPlaying = (k: keyof Sounds) => playing === k && status.playing;
  const step: Step = !sounds.orig ? 'say'
    : !sounds.imit ? 'p2'
    : mode !== 'duo' ? 'result'
    : phase === 'play' ? 'guess' : phase;
  /** Two buttons side by side, listen and the main one; they stay put while recording. */
  const duo = step === 'p2';
  const view = recording ? 'rec' : step;
  const accent = concept.accent;
  /** The suggested or typed word, when the speaker actually saw it. */
  const known = wordSeen && word?.trim() ? word.trim() : null;

  // Keep the recorder armed while a record button is on screen, and let go of it otherwise:
  // an ad or a trip to the background can take the audio session away.
  const shouldArm = !preset && (step === 'say' || step === 'p2') && micReady && !recording && !ads.showing && appActive;
  useEffect(() => {
    wantArmed.current = shouldArm;
    if (shouldArm) arm();
    else if (!recording) disarm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldArm, recording, sounds.orig]);

  // The text fades in on every step change; the button never moves, so a thumb can stay on it.
  const fade = useState(() => new Animated.Value(1))[0];
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [view, fade]);

  /** Leaving in the middle of a round asks first; a round nobody has recorded for, or a finished one, does not. */
  function exit() {
    const leave = () => { sfx.whoosh(); if (mode !== 'intro') ads.beforeNextRound(); onExit(); };
    const midRound = mode !== 'intro' && (!!recording || step === 'p2' || step === 'guess' || (mode === 'duo' && step === 'result'));
    if (!midRound) { leave(); return; }
    Alert.alert(t.exitTitle, t.exitText, [
      { text: t.exitNo, style: 'cancel' },
      { text: t.exitYes, style: 'destructive', onPress: leave },
    ]);
  }

  /** Whose turn it is, in a two-player game. */
  const who = mode !== 'duo' ? null
    : recording ? (recording === 'p1' ? speaker : guesser)
    : step === 'say' ? speaker
    : step === 'p2' || step === 'guess' ? guesser : null;
  /** The result and score screens have their own layout; these two lookups are for the others. */
  const act = view === 'result' || view === 'score' ? 'say' : view;
  const text = {
    rec: [t.recTitle, t.recSub],
    say: mode === 'intro' ? [t.introTitle, micReady ? t.introReady : t.introSub]
      : mode === 'solo' ? [t.soloSayTitle, t.soloSaySub]
      : [free ? t.sayTitleFree : t.sayTitle, fill(t.saySub, { p: name(guesser) })],
    p2: mode === 'intro' ? [t.introP2Title, t.introP2Sub]
      : mode === 'solo' ? [t.soloP2Title, t.soloP2Sub]
      : [Platform.OS === 'ios' && Platform.isPad ? t.p2TitlePad : t.p2Title, t.p2Sub],
    guess: [t.guessTitle, t.guessSub],
  }[act];

  const main = {
    rec: { glyph: '⏹', color: C.rec, label: duo ? t.stop : t.tapToStop, onPress: stopRecord, instant: true },
    say: { glyph: '🎙️', color: C.rec, label: micReady ? t.tapToRecord : t.allowMic, onPress: () => startRecord('p1'), instant: true },
    p2: { glyph: '🎙️', color: C.rec, label: t.record, onPress: () => startRecord('p2'), instant: true },
    guess: { glyph: '🤫', color: C.win, label: t.showAnswer, onPress: reveal, instant: false },
  }[act];

  // Tablets and other wide windows get the same card, scaled up to fill the screen (k), and in
  // landscape the text and the buttons sit side by side. Phones keep k = 1.
  const wide = width >= 700;
  const landscape = wide && width > height;
  /** The try-out has no ads. */
  const banner = ads.enabled && mode !== 'intro';
  const room = height - insets.top - insets.bottom - 190 - (banner ? 60 : 0);
  /** Height of card plus title at k = 1. */
  const need = landscape ? 370 : 560;
  const k = wide ? Math.min(Math.max(room / need, 1), 1.5) : 1;
  const tall = wide ? room >= need : height >= 800;
  const dot = DOTS[mode].indexOf(step);
  const final = round >= ROUNDS;
  const size = (tall ? 156 : 128) * k;
  const styles = useMemo(() => makeStyles(k), [k]);

  return (
    <View style={styles.fill} onLayout={onLayout}>
      <Wallpaper colors={concept.colors} stickers={concept.stickers} theme={concept.id === 'karisik' ? 'picker' : concept.id} />
      <ScrollView
        style={styles.fill}
        alwaysBounceVertical={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { maxWidth: (landscape ? 640 : 480) * k, paddingTop: insets.top + 8, paddingBottom: banner ? 12 : insets.bottom + 20 }]}
      >
        <View style={styles.top}>
          <Pressable
            onPress={exit}
            style={styles.chip}
            accessibilityRole="button"
            accessibilityLabel={mode === 'intro' ? t.skip : t.backToConcepts}
          >
            <Text style={styles.chipText} numberOfLines={1}>{mode === 'intro' ? `${t.skip}  ›` : `‹  ${concept.emoji} ${concept.title[lang]}`}</Text>
          </Pressable>
          <View style={styles.topRight}>
            {/* Only mid-round: before it there is nothing to restart, after it the main button moves on. */}
            {mode !== 'intro' && (step === 'p2' || step === 'guess') && (
              <Pressable onPress={clearRound} style={styles.chip} hitSlop={6} accessibilityRole="button" accessibilityLabel={t.restartRound}>
                <Text style={styles.chipText} numberOfLines={1}>{t.restartRound}</Text>
              </Pressable>
            )}
            <SettingsButton accent={accent} />
          </View>
        </View>

        {mode === 'duo' ? (
          // Score and round; a tap opens the optional player names.
          <Pressable onPress={() => setNamesOpen(true)} style={styles.scores} accessibilityRole="button" accessibilityLabel={t.names}>
            <ScoreChip styles={styles} label={name(0)} score={scores[0]} on={who === 0} />
            <View style={styles.roundTag}>
              <Text style={styles.roundText} numberOfLines={1}>{fill(t.roundOf, { a: round, b: ROUNDS })}</Text>
            </View>
            <ScoreChip styles={styles} label={name(1)} score={scores[1]} on={who === 1} />
          </Pressable>
        ) : (
          // Skip the big title when it would not fit (small phones).
          tall && <Text style={styles.logo} numberOfLines={1} adjustsFontSizeToFit>{t.appName}</Text>
        )}

        <View style={styles.middle}>
          {step === 'result' && !recording ? (
            <Animated.View style={[styles.card, { opacity: fade }]}>
              <View style={styles.resHead}>
                {known && mode !== 'intro' && <Text style={styles.sub}>{t.secretWord}</Text>}
                <Text style={[styles.bigTitle, { color: accent }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>
                  {mode === 'intro' ? t.introDoneTitle : known ?? (mode === 'solo' ? t.soloResult : t.resultUnknown)}
                </Text>
                {mode === 'intro' && <Text style={styles.sub}>{t.introDoneSub}</Text>}
              </View>
              <SoundRow styles={styles} color={C.rec} active={isPlaying('orig')} onPress={() => play('orig')}
                label={mode !== 'duo' ? t.saidSolo : fill(t.said, { p: name(speaker) })} />
              <SoundRow styles={styles} color={C.rev} active={isPlaying('imit')} onPress={() => play('imit')}
                label={mode !== 'duo' ? t.copiedSolo : fill(t.copied, { p: name(guesser) })} />
              {mode !== 'duo' ? (
                <View style={styles.pair}>
                  <Button style={styles.flex} scale={k} outline label={t.tryAgain} color={accent} onPress={redoP2} />
                  <Button style={styles.flex} scale={k} label={mode === 'intro' ? t.startGame : t.newWord} color={accent} onPress={mode === 'intro' ? onExit : nextRound} />
                </View>
              ) : (
                <>
                  <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>{fill(t.didGuess, { p: name(guesser) })}</Text>
                  <View style={styles.pair}>
                    <Button style={styles.flex} scale={k} height={64} label={`✓ ${t.yes}`} color={C.play} textColor="#06231F" onPress={() => judge(true)} />
                    <Button style={styles.flex} scale={k} height={64} outline label={`✕ ${t.no}`} color={ink} onPress={() => judge(false)} />
                  </View>
                </>
              )}
            </Animated.View>
          ) : step === 'score' ? (
            <Animated.View style={[styles.card, { opacity: fade }]}>
              <View style={styles.resHead}>
                <Text style={[styles.bigTitle, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                  {lastCorrect ? `🎉 ${fill(t.gotIt, { p: name(guesser) })}` : fill(t.missed, { p: name(guesser) })}
                </Text>
                {known && <Text style={styles.sub} numberOfLines={1} adjustsFontSizeToFit>{fill(t.wordWas, { p: known })}</Text>}
              </View>
              <View style={styles.pair}>
                {([0, 1] as const).map(i => (
                  <View key={i} style={[styles.box, lastCorrect && i === guesser && { borderColor: accent }]}>
                    <Text style={styles.sub} numberOfLines={1}>{name(i)}</Text>
                    <Text style={styles.boxNum}>{scores[i]}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.next} numberOfLines={2} adjustsFontSizeToFit>
                {!final ? fill(t.nextSpeaker, { p: name(guesser) })
                  : scores[0] === scores[1] ? t.matchDraw
                  : fill(t.matchWon, { p: name(scores[0] > scores[1] ? 0 : 1) })}
              </Text>
              <Button scale={k} height={68} label={final ? t.newMatch : t.nextRound} color={accent} onPress={nextRound} />
              <View style={styles.extras}>
                <Pill scale={k} label={`🔊 ${t.listenAgain}`} color={accent} active={isPlaying('orig') || isPlaying('imit')} onPress={playBoth} />
              </View>
            </Animated.View>
          ) : (
          <View style={[styles.card, landscape && styles.cardRow]}>
            {/* Fixed height, so the button below stays in the same place on every step. */}
            <Animated.View style={[styles.head, landscape && styles.side, { opacity: fade }]}>
              {who !== null && (
                <View style={[styles.who, { backgroundColor: accent }]}>
                  <Text style={styles.whoText}>{name(who)}</Text>
                </View>
              )}
              <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>{text[0]}</Text>
              <Text style={[styles.sub, error && styles.error]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>{error ?? text[1]}</Text>

              {step === 'say' && mode !== 'intro' && (
                // Stays in place (dimmed) while recording, so nothing jumps under the finger.
                <View style={[styles.wordRow, !!recording && styles.dim]} pointerEvents={recording ? 'none' : 'auto'}>
                  {free ? (
                    <TextInput
                      value={word ?? ''}
                      onChangeText={v => { setWord(v); setWordSeen(!!v.trim()); }}
                      placeholder={t.freeInput}
                      placeholderTextColor="#8A94B8"
                      secureTextEntry
                      allowFontScaling={false}
                      autoCorrect={false}
                      returnKeyType="done"
                      style={[styles.input, { borderColor: accent }]}
                    />
                  ) : (
                    <>
                      {word ? (
                        <Pressable
                          onPressIn={() => { if (!shown) setPeek(true); }}
                          onPressOut={() => setPeek(false)}
                          onPress={() => setShown(false)}
                          style={[styles.peek, { backgroundColor: accent }]}
                          accessibilityRole="button"
                          accessibilityLabel={shown ? `${word}, ${t.tapToHide}` : t.holdToSee}
                        >
                          <Text style={styles.peekText} numberOfLines={1} adjustsFontSizeToFit>{shown || peek ? word : t.holdToSee}</Text>
                        </Pressable>
                      ) : null}
                      <Pressable onPress={suggest} style={[styles.small, { borderColor: accent }, !word && { flex: 1 }]} accessibilityRole="button" accessibilityLabel={t.suggest}>
                        <Text style={[styles.smallText, { color: accent }]}>{word ? '🎲' : t.suggest}</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              )}
            </Animated.View>

            <View style={[styles.actions, landscape && styles.actionsSide]}>
            {/* Same height with one button or two; the record button keeps its key so a touch that starts a take cannot also stop it. */}
            <View style={[styles.buttons, { height: size + 34 * k }]}>
              {duo && (
                <BigButton key="listen" size={size - 28 * k} scale={k} glyph="⏪" color={C.rev} label={t.listen}
                  disabled={!!recording} active={isPlaying('origRev')} onPress={() => play('origRev')} />
              )}
              <BigButton
                key="main"
                size={duo ? size - 28 * k : size}
                scale={k}
                glyph={main.glyph}
                color={main.color}
                label={main.label}
                instant={main.instant}
                live={!!recording}
                onPress={main.onPress}
              />
            </View>

            <View style={styles.extras}>
              {micDenied ? (
                <Pill scale={k} label={`⚙️ ${t.openSettings}`} color={accent} onPress={() => { Linking.openSettings().catch(() => {}); }} />
              ) : (
                <>
                  {view === 'p2' && <>
                    <Pill scale={k} label={`🐢 ${t.slow}`} color={accent} active={slow} onPress={() => setSlow(v => !v)} />
                    <Pill scale={k} label={`↩️ ${t.p1Redo}`} color={accent} onPress={redoP1} />
                  </>}
                  {view === 'guess' && <>
                    <Pill scale={k} label={`▶️ ${t.hearCopy}`} color={accent} active={isPlaying('imit')} onPress={() => play('imit')} />
                    <Pill scale={k} label={`↩️ ${t.tryAgain}`} color={accent} onPress={redoP2} />
                  </>}
                </>
              )}
            </View>

            <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {DOTS[mode].map((s, i) => (
                <View key={s} style={[styles.dot, i < dot && { backgroundColor: accent, opacity: 0.45 }, i === dot && { backgroundColor: accent, width: 26 }]} />
              ))}
            </View>
            </View>
          </View>
          )}
        </View>
      </ScrollView>
      {banner && <BannerSlot bottomInset={insets.bottom} />}
      <NamesSheet open={namesOpen} onClose={() => setNamesOpen(false)} names={names} setNames={setNames} accent={accent} />
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

/** One player's name and points in the row above the card; lit while it is their turn. */
function ScoreChip({ styles, label, score, on }: { styles: Styles; label: string; score: number; on: boolean }) {
  return (
    <View style={[styles.score, on && styles.scoreOn]}>
      <Text style={[styles.scoreName, on && styles.scoreTextOn]} numberOfLines={1}>{label}</Text>
      <Text style={[styles.scoreNum, on && styles.scoreTextOn]}>{score}</Text>
    </View>
  );
}

/** A recording on the result screen: tap to hear it, outlined while it plays. */
function SoundRow({ styles, label, color, active, onPress }: { styles: Styles; label: string; color: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
      style={[styles.row, active && { borderColor: color }]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <View style={[styles.rowIcon, { backgroundColor: color }]}>
        <Text style={styles.rowGlyph}>{active ? '🔊' : '▶️'}</Text>
      </View>
      <Text style={styles.rowLabel} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (k: number) => StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 16, gap: 12, width: '100%', alignSelf: 'center' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chip: { flexShrink: 1, minHeight: 44, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 4 },
  topRight: { flexDirection: 'row', gap: 8, marginLeft: 8 },
  scores: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // Dark enough to read on every wallpaper.
  score: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    height: 44 * k, borderRadius: 22 * k, paddingHorizontal: 14 * k, backgroundColor: 'rgba(10,12,40,0.5)',
  },
  scoreOn: { backgroundColor: '#fff' },
  scoreName: { flexShrink: 1, fontFamily: font.bold, fontSize: 15 * k, lineHeight: 22 * k, color: '#fff' },
  scoreNum: { fontFamily: font.black, fontSize: 20 * k, lineHeight: 28 * k, color: '#fff' },
  scoreTextOn: { color: ink },
  roundTag: { height: 30 * k, borderRadius: 15 * k, paddingHorizontal: 10 * k, justifyContent: 'center', backgroundColor: 'rgba(10,12,40,0.5)' },
  roundText: { fontFamily: font.bold, fontSize: 13 * k, lineHeight: 20 * k, color: '#fff' },
  chipText: { fontFamily: font.bold, fontSize: 16, lineHeight: 26, color: ink },
  logo: {
    fontFamily: font.black, fontSize: 50 * k, lineHeight: 64 * k, color: '#fff', textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 0,
  },
  middle: { flexGrow: 1, justifyContent: 'center' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 30 * k, paddingHorizontal: 18 * k, paddingVertical: 16 * k, gap: 12 * k,
    shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 8 },
  },
  // Landscape tablets: text on the left, buttons on the right.
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 24 * k, paddingHorizontal: 28 * k },
  side: { flex: 1 },
  head: { height: 184 * k, alignItems: 'center', justifyContent: 'center', gap: 4 * k },
  actions: { gap: 12 * k },
  actionsSide: { flex: 1.3 },
  who: { borderRadius: 999, paddingHorizontal: 14 * k, paddingVertical: 1, marginBottom: 2 },
  whoText: { fontFamily: font.black, fontSize: 15 * k, lineHeight: 24 * k, color: '#fff' },
  title: { fontFamily: font.black, fontSize: 25 * k, lineHeight: 31 * k, color: ink, textAlign: 'center' },
  sub: { fontFamily: font.medium, fontSize: 15 * k, lineHeight: 21 * k, color: '#5A6690', textAlign: 'center' },
  error: { fontFamily: font.bold, color: '#C8002A' },
  wordRow: { flexDirection: 'row', gap: 8, height: 40 * k, alignSelf: 'stretch', marginTop: 6 * k },
  dim: { opacity: 0.3 },
  input: {
    flex: 1, borderWidth: 2, borderRadius: 14 * k, paddingHorizontal: 14, height: 40 * k,
    fontFamily: font.bold, fontSize: 16 * k, color: ink,
  },
  small: { borderWidth: 2, borderRadius: 999, paddingHorizontal: 14 * k, height: 40 * k, alignItems: 'center', justifyContent: 'center' },
  smallText: { fontFamily: font.bold, fontSize: 15 * k, lineHeight: 24 * k },
  peek: { flex: 1, borderRadius: 999, paddingHorizontal: 14, height: 40 * k, alignItems: 'center', justifyContent: 'center' },
  peekText: { fontFamily: font.bold, fontSize: 15 * k, lineHeight: 24 * k, color: '#fff' },
  // Always takes its row, even when a step has no extra actions.
  buttons: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20 * k },
  extras: { flexDirection: 'row', gap: 8, height: 40 * k },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D5DAEA' },
  // Result and score screens.
  flex: { flex: 1 },
  resHead: { alignItems: 'center', paddingVertical: 4 * k },
  bigTitle: { fontFamily: font.black, fontSize: 34 * k, lineHeight: 42 * k, textAlign: 'center' },
  pair: { flexDirection: 'row', gap: 10 * k },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12 * k, height: 60 * k, borderRadius: 18 * k,
    borderWidth: 2, borderColor: '#D5DAEA', backgroundColor: '#fff', paddingHorizontal: 10 * k,
  },
  rowIcon: { width: 40 * k, height: 40 * k, borderRadius: 20 * k, alignItems: 'center', justifyContent: 'center' },
  rowGlyph: { fontSize: 18 * k, lineHeight: 24 * k },
  rowLabel: { flex: 1, fontFamily: font.black, fontSize: 17 * k, lineHeight: 24 * k, color: ink },
  box: { flex: 1, alignItems: 'center', borderRadius: 20 * k, borderWidth: 2, borderColor: '#EEF1FA', backgroundColor: '#EEF1FA', paddingVertical: 8 * k, paddingHorizontal: 8 },
  boxNum: { fontFamily: font.black, fontSize: 40 * k, lineHeight: 48 * k, color: ink },
  next: { fontFamily: font.bold, fontSize: 16 * k, lineHeight: 22 * k, color: ink, textAlign: 'center' },
});
