import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { C } from '../lib/theme';

export function PrimaryButton({ label, onPress, loading, disabled }: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean }) {
  return (
    <Pressable style={[styles.btn, disabled && { opacity: 0.5 }]} onPress={onPress} disabled={disabled || loading}>
      {loading ? <ActivityIndicator color={C.bg} /> : <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { backgroundColor: C.lime, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  label: { color: C.bg, fontWeight: '800', fontSize: 14 },
});
