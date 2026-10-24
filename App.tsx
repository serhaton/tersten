import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Baloo2_500Medium, Baloo2_700Bold, Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2';
import ConceptPicker from './src/ConceptPicker';
import Game from './src/Game';
import { SettingsProvider } from './src/settings';
import { AdsProvider } from './src/ads';
import type { Concept } from './src/concepts';

export default function App() {
  const [concept, setConcept] = useState<Concept | null>(null);
  const [fontsLoaded] = useFonts({ Baloo2_500Medium, Baloo2_700Bold, Baloo2_800ExtraBold });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <AdsProvider>
          <StatusBar style="light" />
          {concept
            ? <Game key={concept.id} concept={concept} onExit={() => setConcept(null)} />
            : <ConceptPicker onPick={setConcept} />}
        </AdsProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
