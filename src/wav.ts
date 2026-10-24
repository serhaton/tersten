import { File, Paths } from 'expo-file-system';

/**
 * Reads a WAV file into mono int16 PCM. Walks the chunks because iOS adds
 * extra ones (like FLLR) before the audio data; keeps only the first channel.
 */
export async function readWav(uri: string): Promise<{ pcm: Int16Array; sampleRate: number }> {
  const bytes = await new File(uri).bytes();
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (at: number) => String.fromCharCode(v.getUint8(at), v.getUint8(at + 1), v.getUint8(at + 2), v.getUint8(at + 3));
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('Not a WAV file');

  let format = 1, channels = 1, sampleRate = 44100, bits = 16;
  let at = 12;
  while (at + 8 <= v.byteLength) {
    const id = tag(at);
    const size = v.getUint32(at + 4, true);
    const body = at + 8;
    if (id === 'fmt ') {
      format = v.getUint16(body, true);
      channels = v.getUint16(body + 2, true);
      sampleRate = v.getUint32(body + 4, true);
      bits = v.getUint16(body + 14, true);
    } else if (id === 'data') {
      const len = Math.min(size, v.byteLength - body);
      const step = (bits / 8) * channels;
      const n = Math.floor(len / step);
      const pcm = new Int16Array(n);
      const isFloat = format === 3 || (format === 0xfffe && bits === 32);
      for (let i = 0; i < n; i++) {
        const p = body + i * step;
        pcm[i] = isFloat
          ? Math.max(-32768, Math.min(32767, Math.round(v.getFloat32(p, true) * 32767)))
          : bits === 16 ? v.getInt16(p, true)
          : bits === 32 ? v.getInt32(p, true) >> 16
          : (v.getUint8(p) - 128) << 8;
      }
      return { pcm, sampleRate };
    }
    at = body + size + (size & 1);
  }
  throw new Error('WAV has no audio data');
}

/**
 * Cuts the silence before and after the word, so the reversed sound
 * starts right away instead of after the pause from pressing the button.
 */
export function trimSilence(pcm: Int16Array, sampleRate: number): Int16Array {
  const threshold = 900;
  const margin = Math.floor(sampleRate * 0.06);
  let start = 0;
  let end = pcm.length - 1;
  while (start < end && Math.abs(pcm[start]) < threshold) start++;
  while (end > start && Math.abs(pcm[end]) < threshold) end--;
  // Only a short blip was loud (a click, or a very quiet voice): keep it all.
  if (end - start < sampleRate * 0.3) return pcm;
  return pcm.slice(Math.max(0, start - margin), Math.min(pcm.length, end + margin));
}

export function reversed(pcm: Int16Array): Int16Array {
  return pcm.slice().reverse();
}

/** Wraps mono int16 PCM in a WAV container. */
export function toWav(pcm: Int16Array, sampleRate: number): Uint8Array {
  const dataSize = pcm.length * 2;
  const buf = new ArrayBuffer(44 + dataSize);
  const v = new DataView(buf);
  const text = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(at + i, s.charCodeAt(i));
  };
  text(0, 'RIFF');
  v.setUint32(4, 36 + dataSize, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  text(36, 'data');
  v.setUint32(40, dataSize, true);
  new Int16Array(buf, 44).set(pcm);
  return new Uint8Array(buf);
}

/** Writes a new WAV file to the cache and returns its URI. */
export async function saveWav(name: string, pcm: Int16Array, sampleRate: number): Promise<string> {
  const file = new File(Paths.cache, `tersten-${name}-${Date.now()}.wav`);
  await file.write(toWav(pcm, sampleRate));
  return file.uri;
}

export function deleteFiles(uris: (string | null)[]) {
  for (const uri of uris) {
    if (!uri) continue;
    try {
      new File(uri).delete();
    } catch {}
  }
}
