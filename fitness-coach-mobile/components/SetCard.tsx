import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C, nf } from '../lib/theme';
import type { ExerciseSession, SetRow } from '../lib/queries';
import type { WorkoutExercise } from '../lib/types';

export type ExerciseWithSets = WorkoutExercise & { sets: SetRow[] };

export function SetCard({
  exercise,
  editMode,
  readOnly,
  history,
  onToggleSet,
  onAdjustLog,
  onAdjustTarget,
  onAddSet,
  onDeleteSet,
  onRename,
  onDeleteExercise,
}: {
  exercise: ExerciseWithSets;
  editMode: boolean;
  readOnly?: boolean;
  history?: ExerciseSession[];
  onToggleSet: (set: SetRow) => void;
  onAdjustLog: (set: SetRow, field: 'rep' | 'kg', delta: number) => void;
  onAdjustTarget: (set: SetRow, field: 'rep' | 'kg', delta: number) => void;
  onAddSet: () => void;
  onDeleteSet: (set: SetRow) => void;
  onRename: () => void;
  onDeleteExercise: () => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const vol = exercise.sets.reduce((a, s) => a + s.repCount * s.kg, 0);
  const lastSession = history && history.length > 0 ? history[0] : null;
  const bestKgLast = lastSession ? Math.max(...lastSession.sets.map((s) => s.kg)) : 0;

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.nameWrap}>
          <Text style={styles.name}>{exercise.ex}</Text>
          {exercise.grp ? <Text style={styles.grp}>{exercise.grp}</Text> : null}
        </View>
        {editMode ? (
          <View style={styles.editActions}>
            <Pressable disabled={readOnly} onPress={onRename} hitSlop={8}>
              <Text style={[styles.editIcon, readOnly && styles.miniBtnOff]}>✎</Text>
            </Pressable>
            <Pressable disabled={readOnly} onPress={onDeleteExercise} hitSlop={8}>
              <Text style={[styles.editIcon, { color: readOnly ? C.greyD : C.red }]}>🗑</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.vol}>{nf(vol)} kg</Text>
        )}
      </View>

      {exercise.sets.map((s) => (
        <View key={s.setId} style={!editMode && styles.setBlock}>
          <View style={styles.setRow}>
            <Text style={styles.setLabel}>Set {s.setNumber}</Text>
            {editMode ? (
              <>
                <View style={styles.miniStepper}>
                  <Pressable disabled={readOnly} onPress={() => onAdjustTarget(s, 'rep', -1)} hitSlop={8}>
                    <Text style={[styles.miniBtn, readOnly && styles.miniBtnOff]}>−</Text>
                  </Pressable>
                  <Text style={styles.miniVal}>{s.templateRepCount} tekrar</Text>
                  <Pressable disabled={readOnly} onPress={() => onAdjustTarget(s, 'rep', 1)} hitSlop={8}>
                    <Text style={[styles.miniBtn, readOnly && styles.miniBtnOff]}>+</Text>
                  </Pressable>
                </View>
                <View style={styles.miniStepper}>
                  <Pressable disabled={readOnly} onPress={() => onAdjustTarget(s, 'kg', -2.5)} hitSlop={8}>
                    <Text style={[styles.miniBtn, readOnly && styles.miniBtnOff]}>−</Text>
                  </Pressable>
                  <Text style={styles.miniVal}>{nf(s.templateKg, 1)} kg</Text>
                  <Pressable disabled={readOnly} onPress={() => onAdjustTarget(s, 'kg', 2.5)} hitSlop={8}>
                    <Text style={[styles.miniBtn, readOnly && styles.miniBtnOff]}>+</Text>
                  </Pressable>
                </View>
                <Pressable disabled={readOnly} onPress={() => onDeleteSet(s)} hitSlop={8}>
                  <Text style={[styles.setDelete, readOnly && styles.miniBtnOff]}>✕</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.miniStepper}>
                  <Pressable disabled={readOnly} onPress={() => onAdjustLog(s, 'rep', -1)} hitSlop={8}>
                    <Text style={[styles.miniBtn, readOnly && styles.miniBtnOff]}>−</Text>
                  </Pressable>
                  <Text style={styles.miniVal}>{s.repCount} tekrar</Text>
                  <Pressable disabled={readOnly} onPress={() => onAdjustLog(s, 'rep', 1)} hitSlop={8}>
                    <Text style={[styles.miniBtn, readOnly && styles.miniBtnOff]}>+</Text>
                  </Pressable>
                </View>
                <View style={styles.miniStepper}>
                  <Pressable disabled={readOnly} onPress={() => onAdjustLog(s, 'kg', -2.5)} hitSlop={8}>
                    <Text style={[styles.miniBtn, readOnly && styles.miniBtnOff]}>−</Text>
                  </Pressable>
                  <Text style={styles.miniVal}>{nf(s.kg, 1)} kg</Text>
                  <Pressable disabled={readOnly} onPress={() => onAdjustLog(s, 'kg', 2.5)} hitSlop={8}>
                    <Text style={[styles.miniBtn, readOnly && styles.miniBtnOff]}>+</Text>
                  </Pressable>
                </View>
                <Pressable disabled={readOnly} onPress={() => onToggleSet(s)} hitSlop={8}>
                  <View style={[styles.dot, s.done && styles.dotOn]}>{s.done ? <Text style={styles.dotMark}>✓</Text> : null}</View>
                </Pressable>
              </>
            )}
          </View>
          {!editMode && (
            <Text style={styles.hedefText}>
              Hedef: {s.templateRepCount} tekrar · {nf(s.templateKg, 1)} kg
            </Text>
          )}
        </View>
      ))}

      {editMode && !readOnly && (
        <Pressable style={styles.addSet} onPress={onAddSet}>
          <Text style={styles.addSetText}>+ Set Ekle</Text>
        </Pressable>
      )}

      {!editMode && lastSession && (
        <Pressable onPress={() => setShowHistory((v) => !v)} style={styles.lastRow}>
          <Text style={styles.lastText}>
            Geçen sefer ({lastSession.date.slice(5)}): {lastSession.sets.length} set · en ağır {nf(bestKgLast, 1)} kg
          </Text>
          {history!.length > 1 && <Text style={styles.lastToggle}>{showHistory ? 'Gizle' : `+${history!.length - 1} daha`}</Text>}
        </Pressable>
      )}

      {!editMode && showHistory && history && history.length > 1 && (
        <View style={styles.history}>
          {history.slice(1, 6).map((session) => (
            <View key={session.date} style={styles.historyRow}>
              <Text style={styles.historyDate}>{session.date.slice(5)}</Text>
              <Text style={styles.historyValue}>
                {session.sets.map((s) => `${s.rep_count}×${nf(s.kg, 1)}`).join(', ')}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.card2, borderRadius: 12, padding: 12, marginBottom: 10 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 },
  nameWrap: { flexShrink: 1 },
  name: { fontSize: 13, fontWeight: '700', color: C.white },
  grp: { fontSize: 10, color: C.blue, marginTop: 2 },
  vol: { fontSize: 13, fontWeight: '800', color: C.lime },
  editActions: { flexDirection: 'row', gap: 14 },
  editIcon: { fontSize: 13, color: C.lime },
  setBlock: { paddingVertical: 2 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  setLabel: { fontSize: 10, fontWeight: '700', color: C.greyD, width: 34 },
  hedefText: { fontSize: 9.5, color: C.greyD, marginLeft: 40, marginBottom: 4 },
  miniStepper: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'space-between', backgroundColor: C.card, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  miniBtn: { fontSize: 14, fontWeight: '900', color: C.lime, width: 16, textAlign: 'center' },
  miniBtnOff: { color: C.greyD },
  miniVal: { fontSize: 10.5, fontWeight: '700', color: C.white },
  setDelete: { fontSize: 11, color: C.red, paddingHorizontal: 2 },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.greyD, alignItems: 'center', justifyContent: 'center' },
  dotOn: { backgroundColor: C.lime, borderColor: C.lime },
  dotMark: { fontSize: 11, fontWeight: '900', color: C.bg },
  addSet: { borderWidth: 1, borderColor: C.edge, borderStyle: 'dashed', borderRadius: 8, paddingVertical: 7, alignItems: 'center', marginTop: 4 },
  addSetText: { fontSize: 10.5, color: C.greyD, fontWeight: '700' },
  lastRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  lastText: { fontSize: 10, color: C.greyD, flexShrink: 1 },
  lastToggle: { fontSize: 10, color: C.lime, fontWeight: '700', marginLeft: 8 },
  history: { backgroundColor: C.card, borderRadius: 8, padding: 8, marginTop: 6, gap: 4 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between' },
  historyDate: { fontSize: 10, color: C.greyD },
  historyValue: { fontSize: 10, color: C.grey, fontWeight: '600' },
});
