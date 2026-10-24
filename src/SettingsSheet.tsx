import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import type { Lang } from './i18n';
import { useSettings } from './settings';
import { font, ink } from './ui';

const LANGS: { id: Lang; label: string }[] = [
  { id: 'tr', label: '🇹🇷  Türkçe' },
  { id: 'en', label: '🇬🇧  English' },
];

/** Gear button that opens the settings sheet. */
export default function SettingsButton({ accent }: { accent: string }) {
  const [open, setOpen] = useState(false);
  const { t } = useSettings();
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={t.settings} hitSlop={8}>
        <LinearGradient colors={['#FFB224', '#FF3CAC', '#7B4BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gear}>
          {/* U+FE0E asks for the plain text gear, so it can be white. */}
          <Text style={styles.gearIcon}>{'\u2699\uFE0E'}</Text>
        </LinearGradient>
      </Pressable>
      <SettingsSheet open={open} onClose={() => setOpen(false)} accent={accent} />
    </>
  );
}

function SettingsSheet({ open, onClose, accent }: { open: boolean; onClose: () => void; accent: string }) {
  const { t, lang, setLang, sound, setSound } = useSettings();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>⚙️ {t.settings}</Text>

          <Text style={styles.label}>{t.language}</Text>
          <View style={styles.segment}>
            {LANGS.map(l => {
              const on = l.id === lang;
              return (
                <Pressable key={l.id} onPress={() => { Haptics.selectionAsync(); setLang(l.id); }}
                  style={[styles.option, on && { backgroundColor: accent }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                  <Text style={[styles.optionText, on && { color: '#fff' }]}>{l.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{sound ? '🔊' : '🔇'} {t.sounds}</Text>
              <Text style={styles.rowSub}>{t.soundsSub}</Text>
            </View>
            <Switch value={sound} onValueChange={v => { Haptics.selectionAsync(); setSound(v); }} trackColor={{ true: accent }} />
          </View>

          <Pressable onPress={onClose} style={[styles.done, { backgroundColor: accent }]} accessibilityRole="button">
            <Text style={styles.doneText}>{t.done}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  gear: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
  gearIcon: { fontSize: 32, lineHeight: 36, color: '#fff' },
  backdrop: { flex: 1, backgroundColor: 'rgba(10,12,40,0.55)', justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: '#fff', borderRadius: 28, padding: 20, gap: 12, maxWidth: 420, width: '100%', alignSelf: 'center' },
  title: { fontFamily: font.black, fontSize: 24, lineHeight: 34, color: ink },
  label: { fontFamily: font.bold, fontSize: 16, lineHeight: 24, color: ink },
  segment: { flexDirection: 'row', backgroundColor: '#EEF1FA', borderRadius: 16, padding: 4, gap: 4 },
  option: { flex: 1, borderRadius: 12, paddingVertical: 8, alignItems: 'center' },
  optionText: { fontFamily: font.bold, fontSize: 16, lineHeight: 24, color: ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  rowSub: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: '#5A6690' },
  done: { borderRadius: 16, paddingVertical: 10, alignItems: 'center', marginTop: 6 },
  doneText: { fontFamily: font.black, fontSize: 18, lineHeight: 26, color: '#fff' },
});
