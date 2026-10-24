// Synthesizes the short themed button sounds into assets/sfx/*.wav.
// Run with: node scripts/make-sfx.mjs [name ...]
import { mkdirSync, writeFileSync } from 'node:fs';

const SR = 22050;
const OUT = new URL('../assets/sfx/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const TAU = Math.PI * 2;
const sine = p => Math.sin(p);
const square = p => (Math.sin(p) >= 0 ? 1 : -1);
const saw = p => ((p / TAU) % 1) * 2 - 1;
const noise = () => Math.random() * 2 - 1;

/** Renders `dur` seconds; fn(t, i) returns a sample in -1..1. */
function render(dur, fn) {
  const n = Math.floor(dur * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = fn(i / SR, i);
  return out;
}

/** Oscillator with a frequency that may change over time. */
function osc(wave, freqAt) {
  let phase = 0;
  return t => {
    phase += (TAU * freqAt(t)) / SR;
    return wave(phase);
  };
}

const env = (t, dur, attack = 0.005, release = 0.05) =>
  Math.min(1, t / attack, Math.max(0, (dur - t) / release));
const decay = (t, k) => Math.exp(-t * k);

function concat(...parts) {
  const n = parts.reduce((s, p) => s + p.length, 0);
  const out = new Float32Array(n);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
const silence = d => new Float32Array(Math.floor(d * SR));

// Optional names to write only some sounds: node scripts/make-sfx.mjs whoosh
const ONLY = process.argv.slice(2);

function save(name, samples, gain = 0.8) {
  if (ONLY.length && !ONLY.includes(name)) return;
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const k = peak ? gain / peak : 0;
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((s, i) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s * k)) * 32767), 44 + i * 2));
  writeFileSync(new URL(`${name}.wav`, OUT), buf);
}

// Football: referee whistle (trilled high tone).
const whistle = dur => {
  const o = osc(sine, t => 2900 + 120 * Math.sin(TAU * 32 * t));
  return render(dur, t => o(t) * (0.75 + 0.25 * Math.sin(TAU * 32 * t)) * env(t, dur, 0.01, 0.04) + noise() * 0.04 * env(t, dur));
};
save('futbol-tap', whistle(0.22));
save('futbol-win', concat(whistle(0.16), silence(0.07), whistle(0.16), silence(0.07), whistle(0.6)));

// Halloween: wobbly ghost "wooo" and a descending spooky theremin.
{
  const d = 0.5, o = osc(sine, t => 420 - 220 * (t / d) + 18 * Math.sin(TAU * 7 * t));
  save('cadilar-tap', render(d, t => o(t) * env(t, d, 0.06, 0.2)));
  const notes = [659, 622, 587, 554, 523, 392];
  save('cadilar-win', concat(...notes.map((f, i) => {
    const nd = i === notes.length - 1 ? 0.7 : 0.16, on = osc(sine, t => f + 10 * Math.sin(TAU * 6 * t));
    return render(nd, t => (on(t) + 0.3 * square(TAU * f * t)) * env(t, nd, 0.01, 0.06) * (0.7 + 0.3 * Math.sin(TAU * 9 * t)));
  })));
}

// Celebrities: sparkle chime and applause.
{
  const chime = (f, d) => render(d, t => (sine(TAU * f * t) + 0.4 * sine(TAU * f * 2 * t)) * decay(t, 14) * env(t, d, 0.002, 0.03));
  save('unluler-tap', concat(chime(1568, 0.08), chime(2093, 0.22)));
  const d = 1.4, claps = Array.from({ length: 70 }, () => [Math.random() * (d - 0.1), 0.6 + Math.random() * 0.4]);
  let lp = 0;
  save('unluler-win', render(d, t => {
    let s = 0;
    for (const [at, a] of claps) if (t >= at && t < at + 0.03) s += a * decay(t - at, 120);
    const n = noise() * s;
    lp += 0.5 * (n - lp); // soften the hiss a little
    return (n - lp * 0.6) * env(t, d, 0.05, 0.4);
  }));
}

// Car brands: double horn beep and an engine "vroom".
{
  const beep = d => render(d, t => (square(TAU * 415 * t) + square(TAU * 523 * t)) * 0.5 * env(t, d, 0.005, 0.02));
  save('arabalar-tap', concat(beep(0.09), silence(0.04), beep(0.12)));
  const d = 1.0, o = osc(saw, t => 55 + 150 * Math.pow(t / d, 0.6) + 6 * Math.sin(TAU * 25 * t));
  let lp = 0;
  save('arabalar-win', render(d, t => {
    const s = o(t) + noise() * 0.25;
    lp += 0.25 * (s - lp);
    return lp * env(t, d, 0.03, 0.25);
  }));
}

// Animals: bird chirp and a rising slide whistle.
{
  const chirp = d => { const o = osc(sine, t => 2200 + 1800 * (t / d)); return render(d, t => o(t) * env(t, d, 0.004, 0.02)); };
  save('hayvanlar-tap', concat(chirp(0.07), silence(0.03), chirp(0.09)));
  const d = 0.7, o = osc(sine, t => 600 + 1300 * (t / d) + 25 * Math.sin(TAU * 8 * t));
  save('hayvanlar-win', render(d, t => o(t) * env(t, d, 0.02, 0.1)));
}

// Food: bubble pop and a "yum" bell.
{
  const d = 0.1, o = osc(sine, t => 280 + 900 * (t / d));
  save('yemekler-tap', render(d, t => o(t) * decay(t, 25) * env(t, d, 0.002, 0.02)));
  const bell = (f, d) => render(d, t => (sine(TAU * f * t) + 0.5 * sine(TAU * f * 2.01 * t) + 0.25 * sine(TAU * f * 3 * t)) * decay(t, 5) * env(t, d, 0.002, 0.05));
  save('yemekler-win', concat(bell(784, 0.18), bell(1175, 0.8)));
}

// Anything: curious "bip-boop" and a ta-da fanfare.
{
  const blip = (f, d) => render(d, t => (0.6 * square(TAU * f * t) + sine(TAU * f * t)) * decay(t, 18) * env(t, d, 0.003, 0.02));
  save('diger-tap', concat(blip(660, 0.08), blip(990, 0.12)));
  const note = (f, d) => render(d, t => (sine(TAU * f * t) + 0.35 * saw(TAU * f * t) + 0.2 * sine(TAU * f * 2 * t)) * decay(t, 2.5) * env(t, d, 0.01, 0.05));
  save('diger-win', concat(note(523, 0.12), note(659, 0.12), note(784, 0.12), note(1047, 0.7)));
}

// Generic: soft descending two-note chime for "new game" and "back" (kept under the old name).
{
  const pluck = (f, d) => render(d, t =>
    (sine(TAU * f * t) + 0.35 * sine(TAU * f * 2 * t) + 0.1 * sine(TAU * f * 3 * t)) * decay(t, 14) * env(t, d, 0.004, 0.04));
  const high = pluck(784, 0.3), low = pluck(523, 0.32);
  // The low note starts 90 ms in and rings over the tail of the high one.
  const gap = Math.floor(0.09 * SR);
  const mix = new Float32Array(gap + low.length);
  mix.set(high.subarray(0, mix.length));
  low.forEach((s, i) => { mix[gap + i] += s; });
  save('whoosh', mix, 0.45);
}

console.log('sfx written');
