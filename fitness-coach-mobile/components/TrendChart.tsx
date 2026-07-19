import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { C } from '../lib/theme';

export type TrendPoint = { date: string; value: number };

export function TrendChart({
  points,
  h = 150,
  color = C.lime,
  formatValue = (v: number) => String(v),
  formatDate = (d: string) => d.slice(5),
}: {
  points: TrendPoint[];
  h?: number;
  color?: string;
  formatValue?: (v: number) => string;
  formatDate?: (d: string) => string;
}) {
  const w = 320;
  if (points.length < 2) {
    return (
      <View style={[styles.empty, { height: h }]}>
        <Text style={styles.emptyText}>Grafik için en az 2 kayıt gerekli.</Text>
      </View>
    );
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min || 1) * 0.15;
  const lo = min - pad;
  const hi = max + pad;
  const X = (i: number) => 14 + (i / (points.length - 1)) * (w - 28);
  const Y = (v: number) => h - 24 - ((v - lo) / (hi - lo || 1)) * (h - 44);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${X(i)},${Y(p.value)}`).join(' ');

  return (
    <View>
      <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
        {[0.25, 0.5, 0.75].map((f) => (
          <Line key={f} x1={14} x2={w - 14} y1={20 + f * (h - 44)} y2={20 + f * (h - 44)} stroke={C.edge} strokeWidth={1} />
        ))}
        <Path d={path} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" />
        {points.map((p, i) => (
          <Circle key={i} cx={X(i)} cy={Y(p.value)} r={4} fill={color} />
        ))}
      </Svg>
      <View style={styles.labels}>
        <Text style={styles.labelText}>{formatDate(points[0].date)}</Text>
        <Text style={styles.labelText}>
          {formatValue(min)}–{formatValue(max)}
        </Text>
        <Text style={styles.labelText}>{formatDate(points[points.length - 1].date)}</Text>
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
