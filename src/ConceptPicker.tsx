import { useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Wallpaper from './Wallpaper';
import SettingsButton from './SettingsSheet';
import { CONCEPTS, PICKER_COLORS, PICKER_STICKERS, type Concept } from './concepts';
import { useSettings } from './settings';
import { font } from './ui';
import { sfx } from './sfx';

export default function ConceptPicker({ onPick }: { onPick: (c: Concept) => void }) {
  const insets = useSafeAreaInsets();
  const { t } = useSettings();
  return (
    <View style={styles.fill}>
      <Wallpaper colors={PICKER_COLORS} stickers={PICKER_STICKERS} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.top}>
          <SettingsButton accent={PICKER_COLORS[0]} />
        </View>
        <Text style={styles.logo} numberOfLines={1} adjustsFontSizeToFit>{t.appName}</Text>
        <Text style={styles.sub}>{t.tagline}</Text>
        <View style={styles.grid}>
          {CONCEPTS.map(c => <ConceptCard key={c.id} concept={c} onPress={() => onPick(c)} />)}
        </View>
      </ScrollView>
    </View>
  );
}

function ConceptCard({ concept, onPress }: { concept: Concept; onPress: () => void }) {
  const { lang } = useSettings();
  const scale = useState(() => new Animated.Value(1))[0];
  const to = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 14 }).start();
  return (
    <Animated.View style={[styles.cardWrap, { transform: [{ scale }] }]}>
      <Pressable
        onPressIn={() => to(0.93)}
        onPressOut={() => to(1)}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); sfx.tap(concept.id); onPress(); }}
        accessibilityRole="button"
        accessibilityLabel={concept.title[lang]}
      >
        <LinearGradient colors={concept.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
          <Text style={styles.cardEmoji}>{concept.emoji}</Text>
          <Text style={styles.cardTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{concept.title[lang]}</Text>
          <Text style={styles.cardExtra}>{concept.stickers.slice(0, 3).join(' ')}</Text>
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
});
