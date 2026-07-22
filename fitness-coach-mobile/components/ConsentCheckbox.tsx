import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { C } from '../lib/theme';

const LEGAL_BASE_URL = 'https://coachbook-roan.vercel.app/legal';

export function ConsentCheckbox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onToggle} hitSlop={8}>
      <View style={[styles.box, checked && styles.boxOn]}>{checked ? <Text style={styles.mark}>✓</Text> : null}</View>
      <Text style={styles.text}>
        <Text
          style={styles.link}
          onPress={(e) => {
            e.stopPropagation();
            Linking.openURL(`${LEGAL_BASE_URL}/kvkk-aydinlatma-metni.html`);
          }}
        >
          KVKK Aydınlatma Metni
        </Text>
        ,{' '}
        <Text
          style={styles.link}
          onPress={(e) => {
            e.stopPropagation();
            Linking.openURL(`${LEGAL_BASE_URL}/privacy-policy.html`);
          }}
        >
          Gizlilik Politikası
        </Text>{' '}
        ve{' '}
        <Text
          style={styles.link}
          onPress={(e) => {
            e.stopPropagation();
            Linking.openURL(`${LEGAL_BASE_URL}/kullanim-sartlari.html`);
          }}
        >
          Kullanım Şartları
        </Text>
        'nı okudum, kabul ediyorum.
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 20 },
  box: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: C.greyD,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  boxOn: { backgroundColor: C.lime, borderColor: C.lime },
  mark: { color: C.bg, fontSize: 12, fontWeight: '900' },
  text: { flex: 1, color: C.grey, fontSize: 12, lineHeight: 18 },
  link: { color: C.lime, fontWeight: '600' },
});
