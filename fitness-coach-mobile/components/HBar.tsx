import { StyleSheet, Text, View } from 'react-native';
import { C } from '../lib/theme';

export function HBar({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(max, 1)) * 100)) || 0;
  const low = value <= 4;
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: low ? C.red : C.lime }]} />
      </View>
      <Text style={[styles.value, low && { color: C.red }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  label: { width: 72, fontSize: 11, color: C.grey },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: C.card2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  value: { width: 20, fontSize: 12, fontWeight: '800', color: C.white, textAlign: 'right' },
});
