import { type ReactNode, useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

export const font = {
  medium: 'Baloo2_500Medium',
  bold: 'Baloo2_700Bold',
  black: 'Baloo2_800ExtraBold',
};

export const ink = '#1D2B5C';

type ButtonProps = {
  label: string;
  icon: ReactNode;
  color: string;
  onPress: () => void;
  disabled?: boolean;
  /** Pulses while a recording is running. */
  live?: boolean;
  /** Highlighted while its sound is playing. */
  active?: boolean;
  /** Marks the button the player should press next. */
  next?: boolean;
  /** Small step number in the corner. */
  step?: number;
  style?: ViewStyle;
};

export function GameButton({ label, icon, color, onPress, disabled, live, active, next, step, style }: ButtonProps) {
  const press = useState(() => new Animated.Value(1))[0];
  const pulse = useState(() => new Animated.Value(0))[0];
  const pulsing = live || (next && !disabled);

  useEffect(() => {
    if (!pulsing) { pulse.setValue(0); return; }
    const half = live ? 500 : 800;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: half, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: half, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulsing, live, pulse]);

  const to = (v: number) => Animated.spring(press, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 12 }).start();
  const grow = live ? 1.06 : 1.035;
  const scale = Animated.multiply(press, pulse.interpolate({ inputRange: [0, 1], outputRange: [1, grow] }));

  return (
    <Animated.View style={[styles.wrap, style, { transform: [{ scale }] }, disabled && styles.disabled]}>
      <Pressable
        disabled={disabled}
        onPressIn={() => to(0.92)}
        onPressOut={() => to(1)}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
        style={[styles.btn, { backgroundColor: color }, (active || (next && !disabled)) && styles.ring]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        {icon}
        <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
      </Pressable>
      {step !== undefined && (
        <View style={[styles.step, { borderColor: color }]}>
          <Text style={[styles.stepText, { color }]}>{step}</Text>
        </View>
      )}
    </Animated.View>
  );
}

export function Icon({ glyph }: { glyph: string }) {
  return <Text style={styles.icon}>{glyph}</Text>;
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  btn: {
    borderRadius: 20, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center',
    minHeight: 80, gap: 2,
    borderBottomWidth: 5, borderBottomColor: 'rgba(0,0,0,0.22)',
  },
  ring: { borderWidth: 3, borderColor: '#fff', borderBottomWidth: 5, borderBottomColor: 'rgba(0,0,0,0.22)' },
  disabled: { opacity: 0.35 },
  label: { color: '#fff', fontFamily: font.bold, fontSize: 16, lineHeight: 24 },
  icon: { fontSize: 24, lineHeight: 30 },
  step: {
    position: 'absolute', top: -7, left: -5, width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  stepText: { fontFamily: font.black, fontSize: 13, lineHeight: 18 },
});
