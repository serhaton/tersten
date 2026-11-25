import { Modal, Pressable, StyleSheet, TextInput } from 'react-native';
import { useSettings } from './settings';
import { Text, font, ink } from './ui';

export type Names = [string, string];

type Props = {
  open: boolean;
  onClose: () => void;
  /** Empty means the default, "Player 1" or "Player 2". */
  names: Names;
  setNames: (n: Names) => void;
  accent: string;
};

/** Optional names for the two players, opened from the score row. */
export default function NamesSheet({ open, onClose, names, setNames, accent }: Props) {
  const { t } = useSettings();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}
      supportedOrientations={['portrait', 'portrait-upside-down', 'landscape-left', 'landscape-right']}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>{t.names}</Text>
          <Text style={styles.sub}>{t.namesSub}</Text>
          {([0, 1] as const).map(i => (
            <TextInput
              key={i}
              value={names[i]}
              onChangeText={v => setNames(i === 0 ? [v, names[1]] : [names[0], v])}
              placeholder={i === 0 ? t.player1 : t.player2}
              placeholderTextColor="#8A94B8"
              accessibilityLabel={i === 0 ? t.player1 : t.player2}
              maxLength={12}
              allowFontScaling={false}
              autoCorrect={false}
              returnKeyType="done"
              style={[styles.input, { borderColor: accent }]}
            />
          ))}
          <Pressable onPress={onClose} style={[styles.done, { backgroundColor: accent }]} accessibilityRole="button">
            <Text style={styles.doneText}>{t.done}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Near the top, so the keyboard does not cover the fields.
  backdrop: { flex: 1, backgroundColor: 'rgba(10,12,40,0.55)', justifyContent: 'flex-start', padding: 24, paddingTop: 90 },
  sheet: { backgroundColor: '#fff', borderRadius: 28, padding: 20, gap: 12, maxWidth: 420, width: '100%', alignSelf: 'center' },
  title: { fontFamily: font.black, fontSize: 24, lineHeight: 34, color: ink },
  sub: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: '#5A6690', marginTop: -8 },
  input: { borderWidth: 2, borderRadius: 14, paddingHorizontal: 14, height: 48, fontFamily: font.bold, fontSize: 17, color: ink },
  done: { borderRadius: 16, paddingVertical: 10, alignItems: 'center', marginTop: 6 },
  doneText: { fontFamily: font.black, fontSize: 18, lineHeight: 26, color: '#fff' },
});
