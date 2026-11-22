import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, type LayoutChangeEvent, Pressable, StyleSheet, Text as RNText, type TextProps, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';

export const font = {
  medium: 'Baloo2_500Medium',
  bold: 'Baloo2_700Bold',
  black: 'Baloo2_800ExtraBold',
};

export const ink = '#1D2B5C';

/**
 * Text that ignores the system text size. Every screen has fixed-height cards sized to the
 * screen, so system scaling pushed text over the buttons and squeezed the theme cards.
 */
export function Text(props: TextProps) {
  return <RNText allowFontScaling={false} {...props} />;
}

/**
 * Size of the view that gets `onLayout`, starting from the window size. Measured rather than
 * taken from the window alone, so it is right in any iPad orientation, split or resized window.
 */
export function useSize() {
  const win = useWindowDimensions();
  const [measured, setMeasured] = useState<{ width: number; height: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setMeasured(m => (m && m.width === width && m.height === height ? m : { width, height }));
  };
  return { width: measured?.width ?? win.width, height: measured?.height ?? win.height, onLayout };
}

type BigButtonProps = {
  label: string;
  glyph: string;
  color: string;
  /** Diameter of the circle. */
  size: number;
  onPress: () => void;
  /** Pulses hard while a recording is running. */
  live?: boolean;
  /** Ringed while its sound is playing. */
  active?: boolean;
  /** Acts on touch-down instead of on release, for buttons that must not lag (record, stop). */
  instant?: boolean;
  disabled?: boolean;
  /** Text size multiplier for large screens. */
  scale?: number;
};

/** The one main action of the current step: a big round button with its label underneath. */
export function BigButton({ label, glyph, color, size, onPress, live, active, instant, disabled, scale: k = 1 }: BigButtonProps) {
  const press = useState(() => new Animated.Value(1))[0];
  const pulse = useState(() => new Animated.Value(0))[0];
  /** Set when touch-down already ran the action, so the release of the same touch does not run it again. */
  const fired = useRef(false);

  useEffect(() => {
    const half = live ? 450 : 900;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: half, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: half, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [live, pulse]);

  const to = (v: number) => Animated.spring(press, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 12 }).start();
  const fire = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); };
  const scale = Animated.multiply(press, pulse.interpolate({ inputRange: [0, 1], outputRange: [1, live ? 1.09 : 1.04] }));
  const halo = { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [live || active ? 0.45 : 0.18, 0] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, live || active ? 1.35 : 1.2] }) }] };

  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => { to(0.92); if (instant) { fired.current = true; fire(); } }}
      onPressOut={() => to(1)}
      // Screen readers activate without a touch-down, so the release still acts when touch-down did not.
      onPress={() => { if (fired.current) { fired.current = false; return; } fire(); }}
      style={[styles.big, disabled && styles.off]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={{ width: size, height: size }}>
        <Animated.View style={[styles.halo, { borderRadius: size / 2, backgroundColor: color }, halo]} />
        <Animated.View style={[styles.circle, { borderRadius: size / 2, backgroundColor: color, transform: [{ scale }] }]}>
          <Text style={{ fontSize: size * 0.4, lineHeight: size * 0.52 }}>{glyph}</Text>
        </Animated.View>
      </View>
      <Text style={[styles.bigLabel, { color, fontSize: 20 * k, lineHeight: 28 * k }]} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
    </Pressable>
  );
}

/** Small secondary action under the main button. */
export function Pill({ label, color, onPress, active, scale: k = 1 }: { label: string; color: string; onPress: () => void; active?: boolean; scale?: number }) {
  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
      style={({ pressed }) => [styles.pill, { borderColor: color, height: 40 * k }, (active || pressed) && { backgroundColor: color }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {({ pressed }) => (
        <Text style={[styles.pillText, { color: active || pressed ? '#fff' : color, fontSize: 15 * k, lineHeight: 22 * k }]} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  big: { alignItems: 'center', gap: 6, alignSelf: 'center', paddingHorizontal: 12 },
  off: { opacity: 0.3 },
  halo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  circle: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderWidth: 5, borderColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  bigLabel: { fontFamily: font.black, fontSize: 20, lineHeight: 28, textAlign: 'center' },
  pill: { flex: 1, height: 40, borderRadius: 999, borderWidth: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  pillText: { fontFamily: font.bold, fontSize: 15, lineHeight: 22 },
});
