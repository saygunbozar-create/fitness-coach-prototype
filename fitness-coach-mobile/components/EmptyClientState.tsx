import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C } from '../lib/theme';

export function EmptyClientState() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Henüz bir danışanın yok</Text>
      <Text style={styles.sub}>Bu ekranı kullanabilmek için önce bir danışan eklemen gerekiyor.</Text>
      <Pressable style={styles.btn} onPress={() => router.push('/(app)/danisan')} hitSlop={8}>
        <Text style={styles.btnText}>Danışan Ekle</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 16, fontWeight: '800', color: C.white, marginBottom: 8, textAlign: 'center' },
  sub: { fontSize: 13, color: C.grey, textAlign: 'center', lineHeight: 19, marginBottom: 18 },
  btn: { backgroundColor: C.lime, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  btnText: { fontSize: 13, fontWeight: '800', color: C.bg },
});
