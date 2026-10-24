import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
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
import { GameButton, Icon, font, ink } from './ui';
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

export default function Game({ concept, onExit }: { concept: Concept; onExit: () => void }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
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
  const [heardRev, setHeardRev] = useState(false);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const busy = useRef(false);
  /** Permission and recording mode are set up when the game opens, so Record starts instantly. */
  const ready = useRef<Promise<boolean> | null>(null);
  const soundsRef = useRef(sounds);
  useEffect(() => { soundsRef.current = sounds; }, [sounds]);

  const recorder = useAudioRecorder(REC_OPTIONS);

  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  function setUpRecording() {
    ready.current = (async () => {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) return false;
      // Recording mode stays on for the whole game; sound still goes to the speaker.
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      return true;
    })().catch(() => false);
    return ready.current;
  }

  useEffect(() => {
    setUpRecording();
    return () => {
      setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      if (revealTimer.current) clearTimeout(revealTimer.current);
      deleteFiles(Object.values(soundsRef.current));
    };
    // Set up once when the game opens.
  }, []);

  const tap = () => sfx.tap(concept.id, 0.5);

  // No theme sound on listen buttons: it would talk over the recording.
  function play(key: keyof Sounds) {
    const uri = sounds[key];
    if (!uri || recording) return;
    player.pause();
    setPlaying(key);
    if (key === 'origRev') setHeardRev(true);
    player.replace({ uri });
    player.play();
  }

  async function toggleRecord(slot: Slot) {
    if (busy.current) return;
    if (recording === slot) return stopRecord(slot);
    if (recording) return;
    busy.current = true;
    setError(null);
    try {
      // No button sound here: it would end up at the start of the recording.
      player.pause();
      const ok = await (ready.current ?? setUpRecording());
      if (!ok) { setError(t.errMic); ready.current = null; return; }
      // A fresh prepare for every take (~50 ms): reusing one prepared in the
      // background sometimes produced an empty file.
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(slot);
    } catch {
      setError(t.errStart);
    } finally {
      busy.current = false;
    }
  }

  async function stopRecord(slot: Slot) {
    busy.current = true;
    setRecording(null);
    let uri: string | null = null;
    try {
      await recorder.stop();
      uri = recorder.uri;
      tap();
      if (!uri) throw new Error('No recording');
      const wav = await readWav(uri);
      const sr = wav.sampleRate;
      if (wav.pcm.length < sr * 0.25) { setError(t.errShort); return; }
      const pcm = trimSilence(wav.pcm, sr);

      if (slot === 'p1') {
        const [orig, origRev] = await Promise.all([saveWav('orig', pcm, sr), saveWav('rev', reversed(pcm), sr)]);
        deleteFiles(Object.values(soundsRef.current));
        setSounds({ orig, origRev, imit: null });
        setHeardRev(false);
        setRevealed(false);
      } else {
        const imit = await saveWav('imit', reversed(pcm), sr);
        deleteFiles([soundsRef.current.imit]);
        setSounds(s => ({ ...s, imit }));
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

  function reveal() {
    if (!sounds.orig) return;
    setRevealed(true);
    ads.roundFinished();
    setPlaying('orig');
    const fanfare = sfx.win(concept.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Play player 1's voice once the fanfare is over.
    const uri = sounds.orig;
    revealTimer.current = setTimeout(() => { player.replace({ uri }); player.play(); }, fanfare ? 1300 : 0);
  }

  function newGame() {
    ads.beforeNextRound();
    if (recording) { recorder.stop().catch(() => {}); setRecording(null); }
    if (revealTimer.current) clearTimeout(revealTimer.current);
    player.pause();
    sfx.whoosh();
    deleteFiles(Object.values(sounds));
    setSounds(EMPTY);
    setWord(null);
    setWordSeen(false);
    setRevealed(false);
    setHeardRev(false);
    setError(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }

  const isPlaying = (k: keyof Sounds) => playing === k && status.playing;
  const p1Done = !!sounds.orig;
  const p2Done = !!sounds.imit;

  // What the player should do next, used for the hint and the pulsing button.
  const step = !p1Done ? 'p1rec' : !heardRev && !p2Done ? 'p2listen' : !p2Done ? 'p2rec' : !revealed ? 'p2play' : 'done';
  const hint = error ?? (
    recording ? t.hintRecording
    : step === 'p1rec' ? (free ? t.hintP1Free : t.hintP1)
    : step === 'p2listen' ? t.hintP2Listen
    : step === 'p2rec' ? t.hintP2Rec
    : step === 'p2play' ? t.hintP2Play
    : t.hintDone
  );

  return (
    <View style={styles.fill}>
      <Wallpaper colors={concept.colors} stickers={concept.stickers} theme={concept.id} />
      <ScrollView style={styles.fill} contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: ads.enabled ? 12 : insets.bottom + 20 }]}>
        <View style={styles.top}>
          <Pressable onPress={() => { sfx.whoosh(); ads.beforeNextRound(); onExit(); }} style={styles.chip} accessibilityRole="button" accessibilityLabel={t.backToConcepts}>
            <Text style={styles.chipText} numberOfLines={1}>‹  {concept.emoji} {concept.title[lang]}</Text>
          </Pressable>
          <View style={styles.topRight}>
            <Pressable onPress={newGame} style={[styles.round, { borderColor: concept.accent }]} hitSlop={6}
              accessibilityRole="button" accessibilityLabel={t.newGame}>
              <Text style={styles.roundIcon}>🔁</Text>
            </Pressable>
            <SettingsButton accent={concept.accent} />
          </View>
        </View>

        {/* Skip the big title when it would not fit (small phones, or room taken by the banner). */}
        {height >= (ads.enabled ? 900 : 750) && <Text style={styles.logo} numberOfLines={1} adjustsFontSizeToFit>{t.appName}</Text>}

        <View style={[styles.hintBox, error && styles.hintError]}>
          <Text style={styles.hint} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>{hint}</Text>
        </View>

        <View style={[styles.card, p1Done && !recording && styles.done]}>
          <CardTitle n={1} color={concept.accent} title={t.player1} sub={p1Done ? t.p1Saved : t.p1Sub} />
          {free ? (
            <TextInput
              value={word ?? ''}
              onChangeText={v => { setWord(v); setWordSeen(!!v.trim()); }}
              placeholder={t.freeInput}
              placeholderTextColor="#8A94B8"
              secureTextEntry
              autoCorrect={false}
              style={[styles.input, { borderColor: concept.accent }]}
            />
          ) : (
          <View style={styles.wordRow}>
            {word ? (
              <Pressable
                onPressIn={() => { setPeek(true); setWordSeen(true); }}
                onPressOut={() => setPeek(false)}
                style={[styles.peek, { backgroundColor: concept.accent }]}
                accessibilityRole="button"
                accessibilityLabel={t.holdToSee}
              >
                <Text style={styles.peekText} numberOfLines={1} adjustsFontSizeToFit>{peek ? word : t.holdToSee}</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={suggest} style={[styles.small, { borderColor: concept.accent }, !word && { flex: 1 }]} accessibilityRole="button">
              <Text style={[styles.smallText, { color: concept.accent }]}>{word ? '🎲' : t.suggest}</Text>
            </Pressable>
          </View>
          )}
          <View style={styles.row}>
            <GameButton
              label={recording === 'p1' ? t.stop : p1Done ? t.rerecord : t.record}
              icon={<Icon glyph={recording === 'p1' ? '⏹' : '🎙️'} />}
              color={C.rec}
              live={recording === 'p1'}
              next={step === 'p1rec' && !recording}
              disabled={recording === 'p2'}
              onPress={() => toggleRecord('p1')}
            />
          </View>
        </View>

        <View style={[styles.card, !p1Done && styles.locked]} pointerEvents={p1Done ? 'auto' : 'none'}>
          <CardTitle n={2} color={concept.accent} title={t.player2} sub={t.p2Sub} />
          <View style={styles.row}>
            <GameButton step={1} label={t.listenReversed} icon={<Icon glyph="⏪" />} color={C.rev}
              disabled={!p1Done || !!recording} next={step === 'p2listen'}
              active={isPlaying('origRev')} onPress={() => play('origRev')} />
            <GameButton step={2} label={recording === 'p2' ? t.stop : t.record} icon={<Icon glyph={recording === 'p2' ? '⏹' : '🎙️'} />}
              color={C.rec} live={recording === 'p2'} next={step === 'p2rec' && !recording}
              disabled={!p1Done || recording === 'p1'} onPress={() => toggleRecord('p2')} />
            <GameButton step={3} label={t.listen} icon={<Icon glyph="▶️" />} color={C.play}
              disabled={!p2Done || !!recording} next={step === 'p2play'}
              active={isPlaying('imit')} onPress={() => play('imit')} />
          </View>
        </View>

        {/* Always rendered so nothing moves when the answer becomes available. */}
        <View style={[styles.card, !p2Done && styles.locked]} pointerEvents={p2Done ? 'auto' : 'none'}>
          <View style={styles.answerSlot}>
            {revealed ? (
              <View style={styles.answer}>
                <Text style={styles.answerLabel}>{wordSeen ? t.secretWord : t.originalPlaying}</Text>
                <Text style={[styles.answerWord, { color: concept.accent }]} numberOfLines={1} adjustsFontSizeToFit>{wordSeen && word ? `🎉 ${word.trim()}` : '🔊'}</Text>
                <View style={styles.answerActions}>
                  <Pressable onPress={() => play('orig')} style={[styles.pill, { borderColor: concept.accent }]} accessibilityRole="button">
                    <Text style={[styles.pillText, { color: concept.accent }]} numberOfLines={1} adjustsFontSizeToFit>{t.listenAgain}</Text>
                  </Pressable>
                  <Pressable onPress={newGame} style={[styles.pill, { borderColor: concept.accent, backgroundColor: concept.accent }]} accessibilityRole="button">
                    <Text style={[styles.pillText, { color: '#fff' }]} numberOfLines={1} adjustsFontSizeToFit>{t.newGame}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <GameButton label={t.showAnswer} icon={<Icon glyph="🤫" />} color={C.win} disabled={!p2Done || !!recording} onPress={reveal} />
            )}
          </View>
        </View>

      </ScrollView>
      <BannerSlot bottomInset={insets.bottom} />
    </View>
  );
}

function CardTitle({ n, color, title, sub }: { n: number; color: string; title: string; sub: string }) {
  return (
    <View style={styles.titleRow}>
      <View style={[styles.badge, { backgroundColor: color }]}><Text style={styles.badgeText}>{n}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{sub}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 12, maxWidth: 480, width: '100%', alignSelf: 'center' },
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
    fontFamily: font.black, fontSize: 50, lineHeight: 64, color: '#fff', textAlign: 'center', transform: [{ scaleX: -1 }],
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 0,
  },
  // Fixed height for two lines, so a longer message never pushes the cards down.
  hintBox: { backgroundColor: 'rgba(0,0,0,0.28)', borderRadius: 16, paddingHorizontal: 14, height: 62, justifyContent: 'center' },
  hintError: { backgroundColor: 'rgba(200,0,40,0.75)' },
  hint: { fontFamily: font.bold, fontSize: 16, lineHeight: 24, color: '#fff', textAlign: 'center' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 26, padding: 14, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 8 },
  },
  done: { opacity: 0.85 },
  locked: { opacity: 0.55 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: font.black, color: '#fff', fontSize: 18, lineHeight: 26 },
  title: { fontFamily: font.black, fontSize: 19, lineHeight: 28, color: ink },
  sub: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: '#5A6690' },
  row: { flexDirection: 'row', gap: 10 },
  wordRow: { flexDirection: 'row', gap: 8, height: 40 },
  input: {
    borderWidth: 2, borderRadius: 14, paddingHorizontal: 14, height: 40,
    fontFamily: font.bold, fontSize: 16, color: ink,
  },
  small: { borderWidth: 2, borderRadius: 999, paddingHorizontal: 14, height: 40, alignItems: 'center', justifyContent: 'center' },
  smallText: { fontFamily: font.bold, fontSize: 15, lineHeight: 24 },
  peek: { flex: 1, borderRadius: 999, paddingHorizontal: 14, height: 40, alignItems: 'center', justifyContent: 'center' },
  peekText: { fontFamily: font.bold, fontSize: 15, lineHeight: 24, color: '#fff' },
  answerSlot: { height: 92, justifyContent: 'center' },
  answer: { alignItems: 'center' },
  answerLabel: { fontFamily: font.bold, fontSize: 14, lineHeight: 20, color: '#5A6690' },
  answerWord: { fontFamily: font.black, fontSize: 26, lineHeight: 36, textAlign: 'center' },
  answerActions: { flexDirection: 'row', gap: 8, alignSelf: 'stretch', marginTop: 2 },
  pill: { flex: 1, height: 34, borderRadius: 999, borderWidth: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  pillText: { fontFamily: font.bold, fontSize: 15, lineHeight: 22 },
});
