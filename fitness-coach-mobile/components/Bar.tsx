import { StyleSheet, Text, View } from 'react-native';
import { C, nf } from '../lib/theme';

export function Bar({
  label,
  val,
  target,
  unit,
  color,
}: {
  label: string;
  val: number;
  target: number;
  unit: string;
  color: string;
}) {
  const frac = target > 0 ? Math.min(val / target, 1) : 0;
  const over = val > target;
  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, over && { color: C.red }]}>
          {nf(val)} / {nf(target)} {unit}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${frac * 100}%`, backgroundColor: color }]} />
        {over && <View style={styles.overMark} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  top: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 11, color: C.grey },
  value: { fontSize: 11, fontWeight: '700', color: C.white },
  track: { height: 9, borderRadius: 99, backgroundColor: C.edge, overflow: 'visible' },
  fill: { height: 9, borderRadius: 99 },
  overMark: { position: 'absolute', top: 0, right: -8, width: 6, height: 9, borderRadius: 99, backgroundColor: C.red },
});
