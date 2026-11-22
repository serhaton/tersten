import { useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Wallpaper from './Wallpaper';
import SettingsButton from './SettingsSheet';
import { CONCEPTS, PICKER_COLORS, PICKER_STICKERS, type Concept } from './concepts';
import { useSettings } from './settings';
import { font, useSize } from './ui';
import { sfx } from './sfx';

export default function ConceptPicker({ onPick }: { onPick: (c: Concept) => void }) {
  const insets = useSafeAreaInsets();
  const { t } = useSettings();
  // Tablets and other wide windows: four bigger cards in a row instead of two.
  const { width, onLayout } = useSize();
  const wide = width >= 700;
  return (
    <View style={styles.fill} onLayout={onLayout}>
      <Wallpaper colors={PICKER_COLORS} stickers={PICKER_STICKERS} />
      <ScrollView contentContainerStyle={[styles.content, wide && styles.wideContent, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
        <View style={[styles.top, wide && styles.wideBox]}>
          <SettingsButton accent={PICKER_COLORS[0]} />
        </View>
        <View style={[styles.body, wide && styles.wideBody]}>
        <Text style={[styles.logo, wide && styles.wideLogo]} numberOfLines={1} adjustsFontSizeToFit>{t.appName}</Text>
        <Text style={[styles.sub, wide && styles.wideSub]}>{t.tagline}</Text>
        <View style={[styles.grid, wide && styles.wideBox, wide && styles.wideGrid]}>
          {CONCEPTS.map(c => <ConceptCard key={c.id} concept={c} wide={wide} onPress={() => onPick(c)} />)}
        </View>
        </View>
      </ScrollView>
    </View>
  );
}

function ConceptCard({ concept, wide, onPress }: { concept: Concept; wide: boolean; onPress: () => void }) {
  const { lang } = useSettings();
  const scale = useState(() => new Animated.Value(1))[0];
  const to = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 14 }).start();
  return (
    <Animated.View style={[styles.cardWrap, wide && styles.wideCardWrap, { transform: [{ scale }] }]}>
      <Pressable
        onPressIn={() => to(0.93)}
        onPressOut={() => to(1)}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); sfx.tap(concept.id); onPress(); }}
        accessibilityRole="button"
        accessibilityLabel={concept.title[lang]}
      >
        <LinearGradient colors={concept.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, wide && styles.wideCard]}>
          <Text style={[styles.cardEmoji, wide && styles.wideCardEmoji]}>{concept.emoji}</Text>
          <Text style={[styles.cardTitle, wide && styles.wideCardTitle]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{concept.title[lang]}</Text>
          <Text style={[styles.cardExtra, wide && styles.wideCardExtra]}>{concept.stickers.slice(0, 3).join(' ')}</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: 16, alignItems: 'center' },
  top: { flexDirection: 'row', justifyContent: 'flex-end', width: '100%', maxWidth: 420 },
  logo: {
    fontFamily: font.black, fontSize: 56, lineHeight: 66, color: '#fff', transform: [{ scaleX: -1 }],
    textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 0,
  },
  sub: { fontFamily: font.medium, fontSize: 16, lineHeight: 24, color: '#fff', opacity: 0.95, textAlign: 'center', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, width: '100%', maxWidth: 420 },
  // Two equal columns; every card has the same fixed height.
  cardWrap: { width: '47%' },
  card: {
    borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10, height: 118, justifyContent: 'space-between',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.75)',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 6 },
  },
  cardEmoji: { fontSize: 34, lineHeight: 42 },
  cardTitle: { fontFamily: font.black, fontSize: 19, lineHeight: 28, color: '#fff' },
  cardExtra: { fontSize: 13, lineHeight: 18, opacity: 0.9 },
  body: { width: '100%', alignItems: 'center' },
  // Centred on the tall screen, a little above the middle.
  wideContent: { flexGrow: 1 },
  wideBody: { flexGrow: 1, justifyContent: 'center', paddingBottom: 60 },
  wideBox: { maxWidth: 920 },
  wideLogo: { fontSize: 88, lineHeight: 104 },
  wideSub: { fontSize: 22, lineHeight: 32, marginBottom: 28 },
  wideGrid: { gap: 16 },
  wideCardWrap: { width: '23%' },
  wideCard: { height: 168, borderRadius: 28, paddingHorizontal: 18, paddingVertical: 14 },
  wideCardEmoji: { fontSize: 48, lineHeight: 58 },
  wideCardTitle: { fontSize: 24, lineHeight: 34 },
  wideCardExtra: { fontSize: 17, lineHeight: 24 },
});
