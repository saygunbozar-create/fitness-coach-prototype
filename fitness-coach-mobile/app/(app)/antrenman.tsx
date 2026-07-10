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
  useAddPeriodizationPhase,
  useAddPrLog,
  useAddWorkoutDay,
  useClient,
  useDeleteExercise,
  useDeletePeriodizationPhase,
  useDeletePrLog,
  useDeleteWorkoutDay,
  useExerciseLibrary,
  usePeriodizationPhases,
  usePrLogs,
  useSessionLogs,
  useSetSessionStatus,
  useUpdateExercise,
  useUpdateWorkoutLog,
  useWorkout,
} from '../../lib/queries';
import { useSelectedClient } from '../../lib/selectedClient';
import { C, nf } from '../../lib/theme';
import type { SessionLog } from '../../lib/types';

export default function AntrenmanScreen() {
  const { profile } = useAuth();
  const isTrainer = profile?.role === 'trainer';
  const { selectedClientId } = useSelectedClient();
  const clientQuery = useClient(selectedClientId ?? undefined);
  const workoutQuery = useWorkout(selectedClientId ?? undefined);
  const updateLog = useUpdateWorkoutLog(selectedClientId ?? undefined);
  const addDay = useAddWorkoutDay(selectedClientId ?? undefined);
  const deleteDay = useDeleteWorkoutDay(selectedClientId ?? undefined);
  const addExercise = useAddExercise(selectedClientId ?? undefined, isTrainer ? profile?.id : undefined);
  const updateExercise = useUpdateExercise(selectedClientId ?? undefined);
  const deleteExercise = useDeleteExercise(selectedClientId ?? undefined);
  const prLogsQuery = usePrLogs(selectedClientId ?? undefined);
  const addPrLog = useAddPrLog(selectedClientId ?? undefined);
  const deletePrLog = useDeletePrLog(selectedClientId ?? undefined);
  const exerciseLibraryQuery = useExerciseLibrary(isTrainer ? profile?.id : undefined);
  const sessionLogsQuery = useSessionLogs(selectedClientId ?? undefined);
  const setSessionStatus = useSetSessionStatus(selectedClientId ?? undefined);
  const phasesQuery = usePeriodizationPhases(selectedClientId ?? undefined);
  const addPhase = useAddPeriodizationPhase(selectedClientId ?? undefined);
  const deletePhase = useDeletePeriodizationPhase(selectedClientId ?? undefined);

  const [dayId, setDayId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [addingDay, setAddingDay] = useState(false);
  const [newDayKey, setNewDayKey] = useState('');
  const [newDayLabel, setNewDayLabel] = useState('');
  const [addingExercise, setAddingExercise] = useState(false);
  const [prDraft, setPrDraft] = useState({ exercise: '', weight: '', reps: '1' });
  const [addingPhase, setAddingPhase] = useState(false);
  const [phaseDraft, setPhaseDraft] = useState({ name: '', weeks: '', note: '' });

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

  const bestByExercise = useMemo(() => {
    const logs = prLogsQuery.data ?? [];
    const best = new Map<string, (typeof logs)[number]>();
    for (const log of logs) {
      const current = best.get(log.exercise);
      if (!current || log.weight > current.weight) best.set(log.exercise, log);
    }
    return Array.from(best.values()).sort((a, b) => b.weight - a.weight);
  }, [prLogsQuery.data]);

  const last14Days = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return d.toISOString().slice(0, 10);
    });
  }, []);

  const sessionByDate = useMemo(() => {
    const map = new Map<string, SessionLog>();
    (sessionLogsQuery.data ?? []).forEach((s) => map.set(s.date, s));
    return map;
  }, [sessionLogsQuery.data]);

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
          <Pressable
            style={[styles.editToggle, editMode && styles.editToggleOn]}
            onPress={() => setEditMode((v) => !v)}
            hitSlop={10}
          >
            <Text style={[styles.editToggleText, editMode && { color: C.bg }]}>
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
                suggestions={exerciseLibraryQuery.data}
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

        <Panel title="PR & Güç Takibi" right={`${bestByExercise.length} egzersiz`}>
          {bestByExercise.length === 0 ? (
            <Text style={styles.empty}>Henüz PR kaydı yok.</Text>
          ) : (
            bestByExercise.map((log) => (
              <View key={log.id} style={styles.prRow}>
                <View>
                  <Text style={styles.prExercise}>{log.exercise}</Text>
                  <Text style={styles.prMeta}>
                    {log.date} · {log.reps} tekrar
                  </Text>
                </View>
                <View style={styles.prRight}>
                  <Text style={styles.prWeight}>{nf(log.weight, 1)} kg</Text>
                  {isTrainer && (
                    <Pressable onPress={() => deletePrLog.mutate(log.id)} hitSlop={8}>
                      <Text style={styles.prDelete}>Sil</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))
          )}

          <View style={styles.prForm}>
            <View style={{ flex: 2 }}>
              <AuthField label="Egzersiz" value={prDraft.exercise} onChangeText={(v) => setPrDraft((s) => ({ ...s, exercise: v }))} placeholder="Ör. Squat" />
            </View>
            <View style={{ flex: 1 }}>
              <AuthField label="kg" value={prDraft.weight} onChangeText={(v) => setPrDraft((s) => ({ ...s, weight: v }))} keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <AuthField label="Tekrar" value={prDraft.reps} onChangeText={(v) => setPrDraft((s) => ({ ...s, reps: v }))} keyboardType="number-pad" />
            </View>
          </View>
          <PrimaryButton
            label="PR Kaydet"
            loading={addPrLog.isPending}
            disabled={!prDraft.exercise.trim() || !prDraft.weight}
            onPress={() => {
              const weight = parseFloat(prDraft.weight.replace(',', '.'));
              const reps = parseInt(prDraft.reps, 10) || 1;
              if (Number.isNaN(weight)) return;
              addPrLog.mutate(
                { exercise: prDraft.exercise.trim(), weight, reps },
                { onSuccess: () => setPrDraft({ exercise: '', weight: '', reps: '1' }) }
              );
            }}
          />
        </Panel>

        <Panel title="Seans Takvimi" right="Son 14 gün">
          <View style={styles.calendarGrid}>
            {last14Days.map((date) => {
              const session = sessionByDate.get(date);
              const color = session?.status === 'tamamlandi' ? C.lime : session?.status === 'atlandi' ? C.red : C.edge;
              return (
                <Pressable
                  key={date}
                  style={[styles.calendarDay, { borderColor: color, backgroundColor: session ? `${color}22` : C.card2 }]}
                  onPress={() => {
                    const nextStatus = !session ? 'tamamlandi' : session.status === 'tamamlandi' ? 'atlandi' : 'tamamlandi';
                    setSessionStatus.mutate({ date, status: nextStatus, workout_day_id: activeDay?.id ?? null });
                  }}
                >
                  <Text style={[styles.calendarDayText, { color: session ? color : C.greyD }]}>{date.slice(8, 10)}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.calendarLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: C.lime }]} />
              <Text style={styles.legendText}>Tamamlandı</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: C.red }]} />
              <Text style={styles.legendText}>Atlandı</Text>
            </View>
            <Text style={styles.legendHint}>Bir güne dokun: tamamlandı → atlandı → tamamlandı</Text>
          </View>
        </Panel>

        <Panel title="Periyodizasyon" right={`${(phasesQuery.data ?? []).length} blok`}>
          {(phasesQuery.data ?? []).length === 0 ? (
            <Text style={styles.empty}>Henüz bir antrenman bloğu tanımlanmadı.</Text>
          ) : (
            (phasesQuery.data ?? []).map((phase) => (
              <View key={phase.id} style={styles.phaseRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.prExercise}>{phase.name}</Text>
                  <Text style={styles.prMeta}>
                    {phase.start_date}
                    {phase.end_date ? ` – ${phase.end_date}` : ' – süresiz'}
                  </Text>
                  {phase.note ? <Text style={styles.prMeta}>{phase.note}</Text> : null}
                </View>
                {isTrainer && (
                  <Pressable onPress={() => deletePhase.mutate(phase.id)} hitSlop={8}>
                    <Text style={styles.prDelete}>Sil</Text>
                  </Pressable>
                )}
              </View>
            ))
          )}

          {isTrainer && !addingPhase && (
            <Pressable style={styles.addExerciseBtn} onPress={() => setAddingPhase(true)}>
              <Text style={styles.addExerciseText}>+ Blok Ekle</Text>
            </Pressable>
          )}

          {isTrainer && addingPhase && (
            <View style={styles.addDayCard}>
              <AuthField label="Blok Adı" value={phaseDraft.name} onChangeText={(v) => setPhaseDraft((s) => ({ ...s, name: v }))} placeholder="Ör. Hipertrofi Bloğu" />
              <AuthField
                label="Süre (hafta, opsiyonel)"
                value={phaseDraft.weeks}
                onChangeText={(v) => setPhaseDraft((s) => ({ ...s, weeks: v }))}
                keyboardType="number-pad"
                placeholder="Ör. 6"
              />
              <AuthField label="Not" value={phaseDraft.note} onChangeText={(v) => setPhaseDraft((s) => ({ ...s, note: v }))} placeholder="Ör. Ağırlık artışına odak" />
              <View style={styles.rowGap}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    label="Blok Ekle"
                    loading={addPhase.isPending}
                    disabled={!phaseDraft.name.trim()}
                    onPress={() => {
                      const weeks = parseInt(phaseDraft.weeks, 10);
                      const start = new Date();
                      const startStr = start.toISOString().slice(0, 10);
                      let endStr: string | null = null;
                      if (!Number.isNaN(weeks) && weeks > 0) {
                        const end = new Date(start);
                        end.setDate(end.getDate() + weeks * 7);
                        endStr = end.toISOString().slice(0, 10);
                      }
                      addPhase.mutate(
                        { name: phaseDraft.name.trim(), start_date: startStr, end_date: endStr, note: phaseDraft.note.trim() },
                        { onSuccess: () => { setPhaseDraft({ name: '', weeks: '', note: '' }); setAddingPhase(false); } }
                      );
                    }}
                  />
                </View>
              </View>
            </View>
          )}
        </Panel>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  loading: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingTop: 4 },
  empty: { color: C.grey, padding: 16 },
  editToggle: {
    alignSelf: 'flex-start',
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: C.edge,
    backgroundColor: C.card,
  },
  editToggleOn: { backgroundColor: C.lime, borderColor: C.lime },
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
  prRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.card2,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  prExercise: { color: C.white, fontWeight: '700', fontSize: 13 },
  prMeta: { color: C.greyD, fontSize: 11, marginTop: 2 },
  prRight: { alignItems: 'flex-end', gap: 4 },
  prWeight: { color: C.lime, fontWeight: '800', fontSize: 14 },
  prDelete: { color: C.red, fontSize: 11, fontWeight: '700' },
  prForm: { flexDirection: 'row', gap: 8, marginTop: 4 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  calendarDay: { width: 38, height: 38, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  calendarDayText: { fontSize: 11, fontWeight: '700' },
  calendarLegend: { gap: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: C.grey },
  legendHint: { fontSize: 10, color: C.greyD, marginTop: 4 },
  phaseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: C.card2,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
});
