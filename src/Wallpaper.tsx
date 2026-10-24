import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G, Line, Path, Polygon, Rect } from 'react-native-svg';
import type { ConceptId } from './concepts';

type Props = {
  colors: [string, string, string];
  stickers: string[];
  theme?: ConceptId | 'picker';
};

/** A small seeded random, so every concept always gets the same wallpaper. */
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

export default function Wallpaper({ colors, stickers, theme = 'picker' }: Props) {
  const { width: w, height: h } = useWindowDimensions();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={colors} style={StyleSheet.absoluteFill} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} />
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Decor theme={theme} w={w} h={h} />
      </Svg>
      <Stickers stickers={stickers} w={w} h={h} seed={theme.length * 977 + stickers.length} />
    </View>
  );
}

function Decor({ theme, w, h }: { theme: Props['theme']; w: number; h: number }) {
  const rand = rng(42);
  switch (theme) {
    case 'futbol': {
      // Mowed pitch stripes with the halfway line and centre circle.
      const stripe = h / 9;
      return (
        <G>
          {Array.from({ length: 9 }, (_, i) =>
            i % 2 ? <Rect key={i} x={0} y={i * stripe} width={w} height={stripe} fill="#fff" opacity={0.07} /> : null,
          )}
          <G stroke="#fff" strokeWidth={4} opacity={0.35} fill="none">
            <Line x1={0} y1={h / 2} x2={w} y2={h / 2} />
            <Circle cx={w / 2} cy={h / 2} r={w * 0.22} />
            <Circle cx={w / 2} cy={h / 2} r={5} fill="#fff" />
            <Rect x={w * 0.2} y={-4} width={w * 0.6} height={h * 0.12} />
            <Rect x={w * 0.2} y={h * 0.88} width={w * 0.6} height={h * 0.12 + 4} />
          </G>
        </G>
      );
    }
    case 'cadilar': {
      const stars = Array.from({ length: 40 }, () => [rand() * w, rand() * h * 0.6, rand() * 1.8 + 0.6]);
      return (
        <G>
          {stars.map(([x, y, r], i) => <Circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity={0.7} />)}
          <Circle cx={w * 0.78} cy={h * 0.13} r={w * 0.16} fill="#FFE9A8" opacity={0.95} />
          <Circle cx={w * 0.72} cy={h * 0.11} r={w * 0.03} fill="#E8CF85" />
          <Circle cx={w * 0.83} cy={h * 0.16} r={w * 0.02} fill="#E8CF85" />
          {/* Spider web in the top-left corner */}
          <G stroke="#fff" strokeWidth={1.5} opacity={0.35} fill="none">
            {[0, 18, 36, 54, 72, 90].map(a => {
              const r = (a * Math.PI) / 180;
              return <Line key={a} x1={0} y1={0} x2={Math.cos(r) * w * 0.45} y2={Math.sin(r) * w * 0.45} />;
            })}
            {[0.12, 0.22, 0.32, 0.42].map(k => <Path key={k} d={`M ${w * k} 0 Q ${w * k * 0.75} ${w * k * 0.75} 0 ${w * k}`} />)}
          </G>
          {/* Hills with gravestones */}
          <Path d={`M0 ${h * 0.86} Q ${w * 0.3} ${h * 0.78} ${w * 0.6} ${h * 0.85} T ${w} ${h * 0.82} V ${h} H 0 Z`} fill="#12052A" opacity={0.8} />
          <Rect x={w * 0.18} y={h * 0.8} width={26} height={34} rx={12} fill="#12052A" opacity={0.8} />
          <Rect x={w * 0.7} y={h * 0.79} width={22} height={30} rx={10} fill="#12052A" opacity={0.8} />
        </G>
      );
    }
    case 'unluler': {
      // Spotlight beams from the top and sparkles.
      const sparkles = Array.from({ length: 16 }, () => [rand() * w, rand() * h, rand() * 6 + 4]);
      return (
        <G>
          <Polygon points={`${w * 0.15},0 ${w * 0.25},0 ${w * 0.65},${h} ${-w * 0.25},${h}`} fill="#fff" opacity={0.1} />
          <Polygon points={`${w * 0.75},0 ${w * 0.85},0 ${w * 1.25},${h} ${w * 0.35},${h}`} fill="#fff" opacity={0.1} />
          {sparkles.map(([x, y, s], i) => (
            <Path key={i} d={`M${x} ${y - s} L${x + s * 0.3} ${y - s * 0.3} L${x + s} ${y} L${x + s * 0.3} ${y + s * 0.3} L${x} ${y + s} L${x - s * 0.3} ${y + s * 0.3} L${x - s} ${y} L${x - s * 0.3} ${y - s * 0.3} Z`} fill="#FFF3B0" opacity={0.8} />
          ))}
        </G>
      );
    }
    case 'arabalar': {
      // A tilted chequered flag band and speed lines.
      const size = 22;
      const cols = Math.ceil((w * 1.6) / size);
      return (
        <G>
          <G transform={`rotate(-12 ${w / 2} ${h * 0.2})`} opacity={0.22}>
            {Array.from({ length: cols * 3 }, (_, i) => {
              const c = i % cols, r = Math.floor(i / cols);
              return (c + r) % 2 ? null : <Rect key={i} x={-w * 0.3 + c * size} y={h * 0.16 + r * size} width={size} height={size} fill="#fff" />;
            })}
          </G>
          <G stroke="#fff" strokeLinecap="round" opacity={0.18}>
            {Array.from({ length: 14 }, (_, i) => {
              const y = h * 0.4 + rand() * h * 0.55, x = rand() * w * 0.6, len = 60 + rand() * 140;
              return <Line key={i} x1={x} y1={y} x2={x + len} y2={y} strokeWidth={3 + rand() * 5} />;
            })}
          </G>
        </G>
      );
    }
    case 'hayvanlar': {
      // Savanna: big sun and rolling hills.
      return (
        <G>
          <Circle cx={w * 0.25} cy={h * 0.14} r={w * 0.2} fill="#FFF4C2" opacity={0.5} />
          <Circle cx={w * 0.25} cy={h * 0.14} r={w * 0.13} fill="#FFF4C2" opacity={0.6} />
          <Path d={`M0 ${h * 0.78} Q ${w * 0.35} ${h * 0.68} ${w * 0.7} ${h * 0.76} T ${w} ${h * 0.74} V ${h} H 0 Z`} fill="#8A3B0E" opacity={0.35} />
          <Path d={`M0 ${h * 0.88} Q ${w * 0.4} ${h * 0.8} ${w} ${h * 0.9} V ${h} H 0 Z`} fill="#6B2C08" opacity={0.4} />
        </G>
      );
    }
    case 'yemekler': {
      const dots = Array.from({ length: 30 }, () => [rand() * w, rand() * h, rand() * 16 + 6]);
      return <G>{dots.map(([x, y, r], i) => <Circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity={0.12} />)}</G>;
    }
    case 'diger': {
      // Colourful confetti pieces.
      const palette = ['#FFE14D', '#FF5DA2', '#7CFFB2', '#FFFFFF', '#FF9F1C'];
      const bits = Array.from({ length: 45 }, () => [rand() * w, rand() * h, rand() * 10 + 6, rand() * 180]);
      return (
        <G>
          {bits.map(([x, y, s, a], i) => (
            <Rect key={i} x={x} y={y} width={s} height={s * 0.45} rx={2} fill={palette[i % palette.length]} opacity={0.5}
              transform={`rotate(${a} ${x} ${y})`} />
          ))}
        </G>
      );
    }
    default: {
      // Picker: soft confetti blobs.
      const blobs = Array.from({ length: 22 }, () => [rand() * w, rand() * h, rand() * 30 + 10]);
      return <G>{blobs.map(([x, y, r], i) => <Circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity={0.1} />)}</G>;
    }
  }
}

function Stickers({ stickers, w, h, seed }: { stickers: string[]; w: number; h: number; seed: number }) {
  const items = useMemo(() => {
    const rand = rng(seed);
    const cols = 4, rows = 7;
    return Array.from({ length: cols * rows }, (_, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      return {
        key: i,
        emoji: stickers[(i + r) % stickers.length],
        x: (c + 0.15 + rand() * 0.6) * (w / cols) - 20,
        y: (r + 0.1 + rand() * 0.7) * (h / rows) - 20,
        size: 26 + rand() * 22,
        rotate: `${Math.round(rand() * 50 - 25)}deg`,
        delay: rand() * 2000,
      };
    });
  }, [stickers, w, h, seed]);

  return (
    <>
      {items.map(it => (
        <Floating key={it.key} delay={it.delay} left={it.x} top={it.y} rotate={it.rotate}>
          <Text style={{ fontSize: it.size, opacity: 0.3 }}>{it.emoji}</Text>
        </Floating>
      ))}
    </>
  );
}

type FloatingProps = { delay: number; left: number; top: number; rotate: string; children: ReactNode };

function Floating({ delay, left, top, rotate, children }: FloatingProps) {
  const t = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 2600, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, delay]);
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  return <Animated.View style={{ position: 'absolute', left, top, transform: [{ rotate }, { translateY }] }}>{children}</Animated.View>;
}
