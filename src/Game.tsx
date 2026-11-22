import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  AudioQuality,
  IOSOutputFormat,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  type RecordingOptions,
} from 'expo-audio';
import Wallpaper from './Wallpaper';
import SettingsButton from './SettingsSheet';
import type { Concept } from './concepts';
import { sfx } from './sfx';
import { useSettings } from './settings';
import { BannerSlot, useAds } from './ads';
import { BigButton, Pill, font, ink, useSize } from './ui';
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

/** The game is one step per screen: player 1 says, player 2 listens and copies, guess, done. */
type Step = 'say' | 'p2' | 'guess' | 'done';
const DOTS: Step[] = ['say', 'p2', 'guess'];

export default function Game({ concept, onExit }: { concept: Concept; onExit: () => void }) {
  const insets = useSafeAreaInsets();
  const { width, height, onLayout } = useSize();
  const { t, lang } = useSettings();
  const ads = useAds();
  /** "Anything" has no suggestions: player 1 picks the word and may type it. */
  const free = concept.words[lang].length === 0;
  const [sounds, setSounds] = useState<Sounds>(EMPTY);
  const [recording, setRecording] = useState<Slot | null>(null);
  const [playing, setPlaying] = useState<keyof Sounds | null>(null);
  const [word, setWord] = useState<string | null>(null);
  /** Only a word player 1 actually looked at counts as the secret word. */
  const [wordSeen, setWordSeen] = useState(false);
  const [peek, setPeek] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setUpRecording();
    return () => {
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
  function playUri(key: keyof Sounds, uri: string | null) {
    if (!uri) return;
    player.pause();
    setPlaying(key);
    player.replace({ uri });
    player.play();
  }
  const play = (key: keyof Sounds) => { if (!recording) playUri(key, sounds[key]); };

  /** Runs on touch-down. The screen switches to "recording" at once; the mic follows within a moment. */
  async function startRecord(slot: Slot) {
    if (busy.current || recording) return;
    busy.current = true;
    setError(null);
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
      if (!ok) { setError(t.errMic); setRecording(null); ready.current = null; return; }
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
        setRevealed(false);
      } else {
        const imit = await saveWav('imit', reversed(pcm), sr);
        deleteFiles([soundsRef.current.imit]);
        setSounds(s => ({ ...s, imit }));
        // Straight to the fun part: player 2 hears their copy flipped back.
        playUri('imit', imit);
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
    setWordSeen(false);
  }

  /** Back to step one with the same word, when player 1 wants another take. */
  function redoP1() {
    player.pause();
    deleteFiles(Object.values(sounds));
    setSounds(EMPTY);
    setError(null);
  }

  /** Back to listen-and-record, so player 2 can hear the backwards sound again first. */
  function redoP2() {
    player.pause();
    deleteFiles([sounds.imit]);
    setSounds(s => ({ ...s, imit: null }));
    setError(null);
  }

  function reveal() {
    if (!sounds.orig) return;
    setRevealed(true);
    ads.roundFinished();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    playUri('orig', sounds.orig);
  }

  function newGame() {
    ads.beforeNextRound();
    if (recording) { recorder.stop().catch(() => {}); setRecording(null); }
    player.pause();
    sfx.whoosh();
    deleteFiles(Object.values(sounds));
    setSounds(EMPTY);
    setWord(null);
    setWordSeen(false);
    setRevealed(false);
    setError(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }

  const isPlaying = (k: keyof Sounds) => playing === k && status.playing;
  const step: Step = !sounds.orig ? 'say' : !sounds.imit ? 'p2' : revealed ? 'done' : 'guess';
  /** Player 2 gets two buttons side by side, listen and record; they stay put while recording. */
  const duo = step === 'p2';
  const view = recording ? 'rec' : step;
  const accent = concept.accent;

  // Keep the recorder armed while a record button is on screen, and let go of it otherwise:
  // an ad or a trip to the background can take the audio session away.
  const shouldArm = (step === 'say' || step === 'p2') && !recording && !ads.showing && appActive;
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

  const who = recording ? (recording === 'p1' ? 1 : 2) : step === 'say' ? 1 : step === 'done' ? null : 2;
  const text = {
    rec: [t.recTitle, t.recSub],
    say: [free ? t.sayTitleFree : t.sayTitle, t.saySub],
    p2: [Platform.OS === 'ios' && Platform.isPad ? t.p2TitlePad : t.p2Title, t.p2Sub],
    guess: [t.guessTitle, t.guessSub],
    done: [wordSeen && word?.trim() ? `🎉 ${word.trim()}` : `🔊 ${t.originalPlaying}`, t.doneSub],
  }[view];

  const main = {
    rec: { glyph: '⏹', color: C.rec, label: duo ? t.stop : t.tapToStop, onPress: stopRecord, instant: true },
    say: { glyph: '🎙️', color: C.rec, label: t.tapToRecord, onPress: () => startRecord('p1'), instant: true },
    p2: { glyph: '🎙️', color: C.rec, label: t.record, onPress: () => startRecord('p2'), instant: true },
    guess: { glyph: '🤫', color: C.win, label: t.showAnswer, onPress: reveal, instant: false },
    done: { glyph: '🔁', color: accent, label: t.newGame, onPress: newGame, instant: false },
  }[view];

  // Tablets and other wide windows get the same card, scaled up to fill the screen (k), and in
  // landscape the text and the buttons sit side by side. Phones keep k = 1.
  const wide = width >= 700;
  const landscape = wide && width > height;
  const room = height - insets.top - insets.bottom - 190 - (ads.enabled ? 60 : 0);
  /** Height of card plus title at k = 1. */
  const need = landscape ? 370 : 560;
  const k = wide ? Math.min(Math.max(room / need, 1), 1.5) : 1;
  const tall = wide ? room >= need : height >= 800;
  const dot = step === 'done' ? DOTS.length - 1 : DOTS.indexOf(step);
  const size = (tall ? 156 : 128) * k;
  const styles = useMemo(() => makeStyles(k), [k]);

  return (
    <View style={styles.fill} onLayout={onLayout}>
      <Wallpaper colors={concept.colors} stickers={concept.stickers} theme={concept.id} />
      <ScrollView
        style={styles.fill}
        alwaysBounceVertical={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { maxWidth: (landscape ? 640 : 480) * k, paddingTop: insets.top + 8, paddingBottom: ads.enabled ? 12 : insets.bottom + 20 }]}
      >
        <View style={styles.top}>
          <Pressable onPress={() => { sfx.whoosh(); ads.beforeNextRound(); onExit(); }} style={styles.chip} accessibilityRole="button" accessibilityLabel={t.backToConcepts}>
            <Text style={styles.chipText} numberOfLines={1}>‹  {concept.emoji} {concept.title[lang]}</Text>
          </Pressable>
          <View style={styles.topRight}>
            {/* Only mid-round: before it there is nothing to restart, after it the main button does it. */}
            {(step === 'p2' || step === 'guess') && (
              <Pressable onPress={newGame} style={[styles.round, { borderColor: accent }]} hitSlop={6}
                accessibilityRole="button" accessibilityLabel={t.newGame}>
                <Text style={styles.roundIcon}>🔁</Text>
              </Pressable>
            )}
            <SettingsButton accent={accent} />
          </View>
        </View>

        {/* Skip the big title when it would not fit (small phones). */}
        {tall && <Text style={styles.logo} numberOfLines={1} adjustsFontSizeToFit>{t.appName}</Text>}

        <View style={styles.middle}>
          <View style={[styles.card, landscape && styles.cardRow]}>
            {/* Fixed height, so the button below stays in the same place on every step. */}
            <Animated.View style={[styles.head, landscape && styles.side, { opacity: fade }]}>
              {who ? (
                <View style={[styles.who, { backgroundColor: accent }]}>
                  <Text style={styles.whoText}>{who === 1 ? t.player1 : t.player2}</Text>
                </View>
              ) : wordSeen && word?.trim() ? (
                <Text style={styles.sub}>{t.secretWord}</Text>
              ) : null}
              <Text style={[styles.title, view === 'done' && { color: accent }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>{text[0]}</Text>
              <Text style={[styles.sub, error && styles.error]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>{error ?? text[1]}</Text>

              {step === 'say' && (
                // Stays in place (dimmed) while recording, so nothing jumps under the finger.
                <View style={[styles.wordRow, !!recording && styles.dim]} pointerEvents={recording ? 'none' : 'auto'}>
                  {free ? (
                    <TextInput
                      value={word ?? ''}
                      onChangeText={v => { setWord(v); setWordSeen(!!v.trim()); }}
                      placeholder={t.freeInput}
                      placeholderTextColor="#8A94B8"
                      secureTextEntry
                      autoCorrect={false}
                      returnKeyType="done"
                      style={[styles.input, { borderColor: accent }]}
                    />
                  ) : (
                    <>
                      {word ? (
                        <Pressable
                          onPressIn={() => { setPeek(true); setWordSeen(true); }}
                          onPressOut={() => setPeek(false)}
                          style={[styles.peek, { backgroundColor: accent }]}
                          accessibilityRole="button"
                          accessibilityLabel={t.holdToSee}
                        >
                          <Text style={styles.peekText} numberOfLines={1} adjustsFontSizeToFit>{peek ? word : t.holdToSee}</Text>
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
              {view === 'p2' && <Pill scale={k} label={`↩️ ${t.p1Redo}`} color={accent} onPress={redoP1} />}
              {view === 'guess' && <>
                <Pill scale={k} label={`▶️ ${t.hearCopy}`} color={accent} active={isPlaying('imit')} onPress={() => play('imit')} />
                <Pill scale={k} label={`↩️ ${t.tryAgain}`} color={accent} onPress={redoP2} />
              </>}
              {view === 'done' && <>
                <Pill scale={k} label={`🔊 ${t.original}`} color={accent} active={isPlaying('orig')} onPress={() => play('orig')} />
                <Pill scale={k} label={`▶️ ${t.hearCopy}`} color={accent} active={isPlaying('imit')} onPress={() => play('imit')} />
              </>}
            </View>

            <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {DOTS.map((s, i) => (
                <View key={s} style={[styles.dot, i < dot && { backgroundColor: accent, opacity: 0.45 }, i === dot && { backgroundColor: accent, width: 26 }]} />
              ))}
            </View>
            </View>
          </View>
        </View>
      </ScrollView>
      <BannerSlot bottomInset={insets.bottom} />
    </View>
  );
}

const makeStyles = (k: number) => StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 16, gap: 12, width: '100%', alignSelf: 'center' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chip: { flexShrink: 1, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 4 },
  topRight: { flexDirection: 'row', gap: 8, marginLeft: 8 },
  round: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 3, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  roundIcon: { fontSize: 20, lineHeight: 26 },
  chipText: { fontFamily: font.bold, fontSize: 16, lineHeight: 26, color: ink },
  logo: {
    fontFamily: font.black, fontSize: 50 * k, lineHeight: 64 * k, color: '#fff', textAlign: 'center', transform: [{ scaleX: -1 }],
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
});
