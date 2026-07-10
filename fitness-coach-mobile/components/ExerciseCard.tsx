import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C, nf } from '../lib/theme';
import { Stepper } from './Stepper';
import type { WorkoutLog } from '../lib/types';

export type ExerciseRow = { ex: string; grp: string; set: number; rep: number; kg: number; done: boolean };

export function ExerciseCard({
  row,
  history,
  onToggle,
  onUpdate,
}: {
  row: ExerciseRow;
  history?: WorkoutLog[];
  onToggle: () => void;
  onUpdate: (field: 'set' | 'rep' | 'kg', delta: number) => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const vol = row.set * row.rep * row.kg;
  const last = history && history.length > 0 ? history[0] : null;

  return (
    <View style={[styles.card, row.done && { opacity: 0.65 }]}>
      <View style={styles.top}>
        <Pressable style={styles.nameWrap} onPress={onToggle} hitSlop={6}>
          <View style={[styles.chk, row.done && { backgroundColor: C.lime, borderColor: C.lime }]}>
            {row.done ? <Text style={styles.chkMark}>✓</Text> : null}
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text style={[styles.name, row.done && { textDecorationLine: 'line-through' }]}>{row.ex}</Text>
            <Text style={styles.grp}>{row.grp}</Text>
          </View>
        </Pressable>
        <Text style={styles.vol}>{nf(vol)} kg</Text>
      </View>

      {last && (
        <Pressable onPress={() => setShowHistory((v) => !v)} style={styles.lastRow}>
          <Text style={styles.lastText}>
            Geçen sefer: {last.set_count}×{last.rep_count} @ {nf(last.kg, 1)} kg ({last.date.slice(5)})
          </Text>
          {history && history.length > 1 && <Text style={styles.lastToggle}>{showHistory ? 'Gizle' : `+${history.length - 1} daha`}</Text>}
        </Pressable>
      )}

      {showHistory && history && history.length > 1 && (
        <View style={styles.history}>
          {history.slice(1, 6).map((h) => (
            <View key={h.id} style={styles.historyRow}>
              <Text style={styles.historyDate}>{h.date}</Text>
              <Text style={styles.historyValue}>
                {h.set_count}×{h.rep_count} @ {nf(h.kg, 1)} kg
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.steppers}>
        <Stepper label="Set" value={row.set} onChange={(d) => onUpdate('set', d)} step={1} />
        <Stepper label="Tekrar" value={row.rep} onChange={(d) => onUpdate('rep', d)} step={1} />
        <Stepper label="kg" value={row.kg} onChange={(d) => onUpdate('kg', d)} step={2.5} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.card2, borderRadius: 12, padding: 11, marginBottom: 10 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9, gap: 8 },
  nameWrap: { flexDirection: 'row', alignItems: 'center', gap: 9, flexShrink: 1 },
  chk: {
    width: 23,
    height: 23,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.greyD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chkMark: { fontSize: 12, fontWeight: '900', color: C.bg },
  name: { fontSize: 13, fontWeight: '700', color: C.white },
  grp: { fontSize: 11, color: C.greyD },
  vol: { fontSize: 13, fontWeight: '800', color: C.lime },
  steppers: { flexDirection: 'row', gap: 7 },
  lastRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  lastText: { fontSize: 10, color: C.greyD, flexShrink: 1 },
  lastToggle: { fontSize: 10, color: C.lime, fontWeight: '700', marginLeft: 8 },
  history: { backgroundColor: C.card, borderRadius: 8, padding: 8, marginBottom: 8, gap: 4 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between' },
  historyDate: { fontSize: 10, color: C.greyD },
  historyValue: { fontSize: 10, color: C.grey, fontWeight: '600' },
});
