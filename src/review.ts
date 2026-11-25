import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const KEY = 'tersten.roundsPlayed';
/**
 * Finished rounds, counted across launches, after which the App Store rating prompt is asked for.
 * The first comes one round before the first full-screen ad (see ads.tsx), so the two never meet.
 * iOS itself shows the prompt at most three times a year, however often it is requested.
 */
const ASK_AT = [2, 12, 30];
/** Long enough for the result to be seen first. */
const DELAY = 1500;

/** Call when a round ends. Never throws and never blocks the game. */
export async function roundPlayed() {
  try {
    const n = (Number(await AsyncStorage.getItem(KEY)) || 0) + 1;
    await AsyncStorage.setItem(KEY, String(n));
    if (!ASK_AT.includes(n) || !(await StoreReview.isAvailableAsync())) return;
    setTimeout(() => { StoreReview.requestReview().catch(() => {}); }, DELAY);
  } catch {}
}
