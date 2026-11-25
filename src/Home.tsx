import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Wallpaper from './Wallpaper';
import SettingsButton from './SettingsSheet';
import { CONCEPTS, MIX, type Concept } from './concepts';
import { useSettings } from './settings';
import { Button, Text, font, ink, useSize } from './ui';
import { sfx } from './sfx';

type Props = {
  /** The word theme that is picked; its wallpaper is the background. */
  concept: Concept;
  onConcept: (c: Concept) => void;
  onPlay: (mode: 'duo' | 'solo') => void;
};

const THEMES = [MIX, ...CONCEPTS];

/** First screen: play straight away; the word theme is a choice underneath, not a gate. */
export default function Home({ concept, onConcept, onPlay }: Props) {
  const insets = useSafeAreaInsets();
  const { t, lang } = useSettings();
  const { width, onLayout } = useSize();
  // Tablets and other wide windows get the same screen, scaled up.
  const k = width >= 700 ? 1.35 : 1;
  const styles = useMemo(() => makeStyles(k), [k]);
  const accent = concept.accent;

  return (
    <View style={styles.fill} onLayout={onLayout}>
      {/* Keyed, so the stickers are laid out again for the new theme. */}
      <Wallpaper key={concept.id} colors={concept.colors} stickers={concept.stickers} theme={concept.id === 'karisik' ? 'picker' : concept.id} />
      <ScrollView alwaysBounceVertical={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.top}>
          <SettingsButton accent={accent} />
        </View>
        <View style={styles.body}>
          <Text style={styles.logo} numberOfLines={1} adjustsFontSizeToFit>{t.appName}</Text>
          <Text style={styles.sub}>{t.tagline}</Text>

          <View style={styles.card}>
            <Button label={`▶  ${t.play}`} color={accent} height={76} scale={k} onPress={() => onPlay('duo')} />
            <Text style={styles.hint}>{t.playSub}</Text>
            <Button label={t.solo} color={accent} outline height={52} scale={k} onPress={() => onPlay('solo')} />

            <View style={styles.line} />
            <Text style={styles.label}>{t.topic}</Text>
            <View style={styles.chips}>
              {THEMES.map(c => {
                const on = c.id === concept.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => { Haptics.selectionAsync(); sfx.tap(c.id, 0.5); onConcept(c); }}
                    style={[styles.chip, on && { backgroundColor: c.accent }]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={c.title[lang]}
                  >
                    <Text style={[styles.chipText, on && styles.chipOn]} numberOfLines={1}>{c.emoji} {c.title[lang]}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (k: number) => StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 16, alignItems: 'center' },
  top: { flexDirection: 'row', justifyContent: 'flex-end', width: '100%', maxWidth: 460 * k },
  body: { flexGrow: 1, justifyContent: 'center', width: '100%', maxWidth: 460 * k, alignItems: 'center', paddingBottom: 24 },
  logo: {
    fontFamily: font.black, fontSize: 60 * k, lineHeight: 70 * k, color: '#fff', textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 0,
  },
  sub: { fontFamily: font.medium, fontSize: 17 * k, lineHeight: 24 * k, color: '#fff', textAlign: 'center', marginBottom: 16 * k },
  card: {
    alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 30 * k, padding: 18 * k, gap: 10 * k,
    shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 8 },
  },
  hint: { fontFamily: font.medium, fontSize: 14 * k, lineHeight: 20 * k, color: '#5A6690', textAlign: 'center', marginTop: -4 },
  line: { height: 1, backgroundColor: '#E3E6F2', marginVertical: 4 * k },
  label: { fontFamily: font.bold, fontSize: 15 * k, lineHeight: 22 * k, color: '#5A6690' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 * k },
  chip: { height: 44 * k, borderRadius: 22 * k, paddingHorizontal: 14 * k, justifyContent: 'center', backgroundColor: '#EEF1FA' },
  chipText: { fontFamily: font.bold, fontSize: 16 * k, lineHeight: 24 * k, color: ink },
  chipOn: { color: '#fff' },
});
