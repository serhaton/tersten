import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Store screenshots only (scripts/screenshots). A build made with EXPO_PUBLIC_SHOTS=1 opens on the
 * screen described by the `tersten.shot` storage key, which the capture script writes before launch.
 */
export const SHOTS = process.env.EXPO_PUBLIC_SHOTS === '1';

export type Preset = {
  /** The word has been recorded. */
  orig?: boolean;
  /** The copy has been recorded. */
  imit?: boolean;
  phase?: 'play' | 'result' | 'score';
  round?: number;
  scores?: [number, number];
  word?: string;
  lastCorrect?: boolean;
};

export type Shot = {
  screen: 'home' | 'game';
  concept: string;
  mode?: 'duo' | 'solo';
  /** Home screen with the settings sheet open. */
  settings?: boolean;
  preset?: Preset;
};

export const shotState = { settingsOpen: false };

export async function loadShot(): Promise<Shot | null> {
  if (!SHOTS) return null;
  try {
    const raw = await AsyncStorage.getItem('tersten.shot');
    const shot = raw ? (JSON.parse(raw) as Shot) : null;
    shotState.settingsOpen = !!shot?.settings;
    return shot;
  } catch {
    return null;
  }
}
