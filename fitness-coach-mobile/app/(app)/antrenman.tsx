import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AuthField } from '../../components/AuthField';
import { ExerciseCard } from '../../components/ExerciseCard';
import { ExerciseEditRow } from '../../components/ExerciseEditRow';
import { Panel } from '../../components/Panel';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAuth } from '../../lib/auth';
import {
  useAddExercise,
  useAddWorkoutDay,
  useClient,
  useDeleteExercise,
  useDeleteWorkoutDay,
  useUpdateExercise,
  useUpdateWorkoutLog,
  useWorkout,
} from '../../lib/queries';
import { useSelectedClient } from '../../lib/selectedClient';
import { C, nf } from '../../lib/theme';

export default function AntrenmanScreen() {
  const { profile } = useAuth();
  const isTrainer = profile?.role === 'trainer';
  const { selectedClientId } = useSelectedClient();
  const clientQuery = useClient(selectedClientId ?? undefined);
  const workoutQuery = useWorkout(selectedClientId ?? undefined);
  const updateLog = useUpdateWorkoutLog(selectedClientId ?? undefined);
  const addDay = useAddWorkoutDay(selectedClientId ?? undefined);
  const deleteDay = useDeleteWorkoutDay(selectedClientId ?? undefined);
  const addExercise = useAddExercise(selectedClientId ?? undefined);
  const updateExercise = useUpdateExercise(selectedClientId ?? undefined);
  const deleteExercise = useDeleteExercise(selectedClientId ?? undefined);

  const [dayId, setDayId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [addingDay, setAddingDay] = useState(false);
  const [newDayKey, setNewDayKey] = useState('');
  const [newDayLabel, setNewDayLabel] = useState('');
  const [addingExercise, setAddingExercise] = useState(false);

  const days = workoutQuery.data ?? [];
  const activeDay = days.find((d) => d.id === dayId) ?? days[0];

  const dayVol = useMemo(() => {
    if (!activeDay) return 0;
    return activeDay.exercises.reduce((a, r) => {
      const log = r.todayLog;
      const set = log?.set_count ?? r.set_count;
      const rep = log?.rep_count ?? r.rep_count;
      const kg = log?.kg ?? r.kg;
      return a + set * rep * kg;
    }, 0);
  }, [activeDay]);

  if (clientQuery.isLoading || workoutQuery.isLoading || !clientQuery.data) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={C.lime} size="large" />
      </View>
    );
  }

  const client = clientQuery.data;

  function selectDay(id: string) {
    setDayId(id);
    setAddingExercise(false);
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Antrenman" clientName={client.name} showPill={isTrainer} />
      <ScrollView contentContainerStyle={styles.content}>
        {isTrainer && (
          <Pressable style={styles.editToggle} onPress={() => setEditMode((v) => !v)}>
            <Text style={[styles.editToggleText, editMode && { color: C.lime }]}>
              {editMode ? '✓ Programı düzenliyorsun' : '✎ Programı düzenle'}
            </Text>
          </Pressable>
        )}

        <View style={styles.dayTabs}>
          {days.map((d) => (
            <View key={d.id} style={styles.dayTabWrap}>
              <Pressable
                onPress={() => selectDay(d.id)}
                style={[styles.dayTab, activeDay && d.id === activeDay.id && { backgroundColor: C.lime, borderColor: C.lime }]}
              >
                <Text style={[styles.dayTabText, activeDay && d.id === activeDay.id && { color: C.bg }]}>{d.day_key}</Text>
              </Pressable>
              {editMode && (
                <Pressable style={styles.dayDelete} onPress={() => deleteDay.mutate(d.id)}>
                  <Text style={styles.dayDeleteText}>✕</Text>
                </Pressable>
              )}
            </View>
          ))}
          {editMode && !addingDay && (
            <Pressable style={styles.dayTabAdd} onPress={() => setAddingDay(true)}>
              <Text style={styles.dayTabAddText}>+ Gün</Text>
            </Pressable>
          )}
        </View>

        {editMode && addingDay && (
          <View style={styles.addDayCard}>
            <AuthField label="Gün Kısaltması" value={newDayKey} onChangeText={setNewDayKey} placeholder="Ör. Per" />
            <AuthField label="Gün Başlığı" value={newDayLabel} onChangeText={setNewDayLabel} placeholder="Ör. OMUZ & KARIN" />
            <View style={styles.rowGap}>
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  label="Gün Ekle"
                  loading={addDay.isPending}
                  disabled={!newDayKey.trim() || !newDayLabel.trim()}
                  onPress={() => {
                    addDay.mutate(
                      { day_key: newDayKey.trim(), label: newDayLabel.trim(), sort_order: days.length },
                      {
                        onSuccess: () => {
                          setNewDayKey('');
                          setNewDayLabel('');
                          setAddingDay(false);
                        },
                      }
                    );
                  }}
                />
              </View>
            </View>
          </View>
        )}

        {!activeDay ? (
          <Text style={styles.empty}>Bu danışan için henüz antrenman programı yok.</Text>
        ) : (
          <Panel title={activeDay.label} right="Hacim = Set × Tekrar × kg">
            {activeDay.exercises.map((r) => {
              if (editMode) {
                return (
                  <ExerciseEditRow
                    key={r.id}
                    initial={{ ex: r.ex, grp: r.grp, set_count: r.set_count, rep_count: r.rep_count, kg: r.kg }}
                    saving={updateExercise.isPending || deleteExercise.isPending}
                    onSave={(v) => updateExercise.mutate({ id: r.id, ...v })}
                    onDelete={() => deleteExercise.mutate(r.id)}
                  />
                );
              }
              const log = r.todayLog;
              const row = {
                ex: r.ex,
                grp: r.grp,
                set: log?.set_count ?? r.set_count,
                rep: log?.rep_count ?? r.rep_count,
                kg: log?.kg ?? r.kg,
                done: log?.done ?? false,
              };
              return (
                <ExerciseCard
                  key={r.id}
                  row={row}
                  onToggle={() => updateLog.mutate({ exercise: r, currentLog: log, patch: { done: !row.done } })}
                  onUpdate={(field, delta) => {
                    const current = field === 'set' ? row.set : field === 'rep' ? row.rep : row.kg;
                    const next = Math.max(0, current + delta);
                    const patchField = field === 'set' ? 'set_count' : field === 'rep' ? 'rep_count' : 'kg';
                    updateLog.mutate({ exercise: r, currentLog: log, patch: { [patchField]: next } as any });
                  }}
                />
              );
            })}

            {editMode && addingExercise && (
              <ExerciseEditRow
                initial={null}
                saving={addExercise.isPending}
                onSave={(v) =>
                  addExercise.mutate(
                    { workout_day_id: activeDay.id, sort_order: activeDay.exercises.length, ...v },
                    { onSuccess: () => setAddingExercise(false) }
                  )
                }
                onCancel={() => setAddingExercise(false)}
              />
            )}

            {editMode && !addingExercise && (
              <Pressable style={styles.addExerciseBtn} onPress={() => setAddingExercise(true)}>
                <Text style={styles.addExerciseText}>+ Egzersiz Ekle</Text>
              </Pressable>
            )}

            {!editMode && (
              <View style={styles.totalBar}>
                <Text style={styles.totalLabel}>Gün Toplamı</Text>
                <Text style={styles.totalValue}>{nf(dayVol)} kg</Text>
              </View>
            )}
          </Panel>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  loading: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingTop: 4 },
  empty: { color: C.grey, padding: 16 },
  editToggle: { alignSelf: 'flex-start', marginBottom: 12 },
  editToggleText: { fontSize: 12, fontWeight: '700', color: C.greyD },
  dayTabs: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  dayTabWrap: { flex: 1, minWidth: 60, position: 'relative' },
  dayTab: { paddingVertical: 9, borderRadius: 12, alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.edge },
  dayTabText: { fontSize: 13, fontWeight: '700', color: C.grey },
  dayDelete: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDeleteText: { color: C.bg, fontSize: 10, fontWeight: '900' },
  dayTabAdd: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: C.edge, borderStyle: 'dashed' },
  dayTabAddText: { fontSize: 12, fontWeight: '700', color: C.lime },
  addDayCard: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.edge, padding: 14, marginBottom: 14 },
  rowGap: { flexDirection: 'row', gap: 8 },
  addExerciseBtn: { borderWidth: 2, borderColor: C.edge, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  addExerciseText: { fontSize: 13, color: C.greyD, fontWeight: '600' },
  totalBar: {
    marginTop: 4,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: C.lime,
  },
  totalLabel: { fontWeight: '800', color: C.bg, fontSize: 13 },
  totalValue: { fontWeight: '800', color: C.bg },
});
