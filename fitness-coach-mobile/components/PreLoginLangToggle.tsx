import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LANGUAGES, useLanguage } from '../lib/i18n';
import { setPreLoginLang } from '../lib/preLoginLang';
import { C } from '../lib/theme';

// Giriş öncesi ekranların dil düğmesi. Cihaz dili algılaması her zaman kullanıcının okumak
// istediği dili vermiyor (ör. cihazı İngilizce ama Türkçe okumak isteyen bir danışan), o yüzden
// elle seçim burada. Kod TR/EN ile sınırlı değil — LANGUAGES'tan besleniyor, Arapça o listeye
// eklendiği gün üçüncü düğme kendiliğinden çıkar.
export function PreLoginLangToggle() {
  const lang = useLanguage();

  return (
    <View style={styles.row}>
      {LANGUAGES.map((l) => {
        const on = lang === l.code;
        return (
          <Pressable
            key={l.code}
            onPress={() => setPreLoginLang(l.code)}
            style={[styles.chip, on && styles.chipOn]}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={l.label}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{l.code.toUpperCase()}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, alignSelf: 'flex-end', marginBottom: 18 },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.edge,
  },
  chipOn: { backgroundColor: C.lime, borderColor: C.lime },
  chipText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: C.greyD },
  chipTextOn: { color: C.bg },
});
