import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { C } from '../lib/theme';

export function LineChart({ proj, actual, h = 170 }: { proj: number[]; actual: number[]; h?: number }) {
  const w = 320;
  const all = [...proj, ...actual];
  const min = Math.min(...all) - 0.8;
  const max = Math.max(...all) + 0.8;
  const X = (i: number, n: number) => 14 + (i / (n - 1)) * (w - 28);
  const Y = (v: number) => h - 24 - ((v - min) / (max - min)) * (h - 44);
  const path = (arr: number[]) => arr.map((v, i) => `${i ? 'L' : 'M'}${X(i, proj.length)},${Y(v)}`).join(' ');

  return (
    <View>
      <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
        {[0.25, 0.5, 0.75].map((f) => (
          <Line key={f} x1={14} x2={w - 14} y1={20 + f * (h - 44)} y2={20 + f * (h - 44)} stroke={C.edge} strokeWidth={1} />
        ))}
        <Path d={path(proj)} fill="none" stroke={C.greyD} strokeWidth={2.5} strokeDasharray="5 5" />
        <Path d={path(actual)} fill="none" stroke={C.lime} strokeWidth={3.5} strokeLinecap="round" />
        {actual.map((v, i) => (
          <Circle key={i} cx={X(i, proj.length)} cy={Y(v)} r={4} fill={C.lime} />
        ))}
      </Svg>
      <View style={styles.labels}>
        <Text style={styles.labelText}>Başlangıç</Text>
        <Text style={styles.labelText}>Hafta {proj.length - 1}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -18, paddingHorizontal: 4 },
  labelText: { fontSize: 10, color: C.greyD },
});
