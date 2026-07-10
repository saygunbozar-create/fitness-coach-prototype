import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { C, nf } from '../lib/theme';

export function PrChart({ points, h = 140 }: { points: { date: string; weight: number }[]; h?: number }) {
  const w = 320;
  if (points.length < 2) {
    return (
      <View style={[styles.empty, { height: h }]}>
        <Text style={styles.emptyText}>Grafik için en az 2 kayıt gerekli.</Text>
      </View>
    );
  }

  const weights = points.map((p) => p.weight);
  const min = Math.min(...weights) - 1;
  const max = Math.max(...weights) + 1;
  const X = (i: number) => 14 + (i / (points.length - 1)) * (w - 28);
  const Y = (v: number) => h - 24 - ((v - min) / (max - min || 1)) * (h - 44);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${X(i)},${Y(p.weight)}`).join(' ');

  return (
    <View>
      <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
        {[0.25, 0.5, 0.75].map((f) => (
          <Line key={f} x1={14} x2={w - 14} y1={20 + f * (h - 44)} y2={20 + f * (h - 44)} stroke={C.edge} strokeWidth={1} />
        ))}
        <Path d={path} fill="none" stroke={C.lime} strokeWidth={3} strokeLinecap="round" />
        {points.map((p, i) => (
          <Circle key={i} cx={X(i)} cy={Y(p.weight)} r={4} fill={C.lime} />
        ))}
      </Svg>
      <View style={styles.labels}>
        <Text style={styles.labelText}>{points[0].date}</Text>
        <Text style={styles.labelText}>
          {nf(min + 1, 1)}–{nf(max - 1, 1)} kg
        </Text>
        <Text style={styles.labelText}>{points[points.length - 1].date}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -18, paddingHorizontal: 4 },
  labelText: { fontSize: 10, color: C.greyD },
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 11, color: C.greyD },
});
