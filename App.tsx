import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Baloo2_500Medium, Baloo2_700Bold, Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2';
import Home from './src/Home';
import Game from './src/Game';
import type { Names } from './src/NamesSheet';
import { SettingsProvider, useSettings } from './src/settings';
import { AdsProvider } from './src/ads';
import { CONCEPTS, MIX, type Concept } from './src/concepts';
import { SHOTS, loadShot, type Shot } from './src/shot';

// Keep the splash up until the fonts are in, so there's no blank frame in between.
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 300, fade: true });

export default function App() {
  const [fontsLoaded] = useFonts({ Baloo2_500Medium, Baloo2_700Bold, Baloo2_800ExtraBold });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hide();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <AdsProvider>
          <StatusBar style="light" />
          <Screens />
        </AdsProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

function Screens() {
  const { introSeen, setIntroSeen } = useSettings();
  const [concept, setConcept] = useState<Concept>(MIX);
  const [mode, setMode] = useState<'duo' | 'solo' | null>(null);
  /** Kept here, so the names survive a trip back to the home screen. */
  const [names, setNames] = useState<Names>(['', '']);
  /** Store screenshots: undefined while loading, null in a normal build. */
  const [shot, setShot] = useState<Shot | null | undefined>(SHOTS ? undefined : null);
  useEffect(() => { loadShot().then(setShot); }, []);

  if (shot === undefined) return null;
  if (shot) {
    const c = [MIX, ...CONCEPTS].find(x => x.id === shot.concept) ?? MIX;
    return shot.screen === 'game'
      ? <Game mode={shot.mode ?? 'duo'} concept={c} names={names} setNames={setNames} onExit={() => {}} preset={shot.preset ?? {}} />
      : <Home concept={c} onConcept={() => {}} onPlay={() => {}} />;
  }

  // The try-out shows on first launch, and again when Settings asks for it; it ends on the home screen.
  if (!introSeen) {
    return <Game key="intro" mode="intro" concept={MIX} names={names} setNames={setNames} onExit={() => { setMode(null); setIntroSeen(true); }} />;
  }
  return mode
    ? <Game key={`${mode}-${concept.id}`} mode={mode} concept={concept} names={names} setNames={setNames} onExit={() => setMode(null)} />
    : <Home concept={concept} onConcept={setConcept} onPlay={setMode} />;
}
