import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { STRINGS, type Lang, type Strings } from './i18n';
import { sfx } from './sfx';

type Settings = {
  lang: Lang;
  sound: boolean;
  t: Strings;
  setLang: (l: Lang) => void;
  setSound: (on: boolean) => void;
  /** False until the one-time try-out has been finished or skipped; Settings can open it again. */
  introSeen: boolean;
  setIntroSeen: (seen: boolean) => void;
};

const KEY = 'tersten.settings';
const deviceLang = (): Lang => (getLocales()[0]?.languageCode === 'tr' ? 'tr' : 'en');

const SettingsContext = createContext<Settings | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(deviceLang);
  const [sound, setSound] = useState(true);
  const [introSeen, setIntroSeen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then(raw => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (saved.lang === 'tr' || saved.lang === 'en') setLang(saved.lang);
        if (typeof saved.sound === 'boolean') setSound(saved.sound);
        if (saved.introSeen === true) setIntroSeen(true);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    sfx.setEnabled(sound);
    if (loaded) AsyncStorage.setItem(KEY, JSON.stringify({ lang, sound, introSeen })).catch(() => {});
  }, [lang, sound, introSeen, loaded]);

  const value = useMemo(() => ({ lang, sound, t: STRINGS[lang], setLang, setSound, introSeen, setIntroSeen }), [lang, sound, introSeen]);
  if (!loaded) return null;
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const s = useContext(SettingsContext);
  if (!s) throw new Error('useSettings must be used inside SettingsProvider');
  return s;
}
