import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { showAlert } from '../../lib/alert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthField } from '../../components/AuthField';
import { EmptyClientState } from '../../components/EmptyClientState';
import { NotebookFrame } from '../../components/NotebookFrame';
import { LessonBook } from '../../components/LessonBook';
import { Panel } from '../../components/Panel';
import { PrChart } from '../../components/PrChart';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAuth } from '../../lib/auth';
import {
  useAddPrLog,
  useAddWorkoutDay,
  useAddWorkoutProgram,
  useAssignLessonDay,
  useClient,
  useDeletePrLog,
  useDeleteWorkoutDay,
  useDeleteWorkoutProgram,
  useLessonDayWorkout,
  usePrLogs,
  useProgramLessons,
  useSessionHistory,
  useToggleLessonComplete,
  useToggleWorkoutProgramShared,
  useUpdateWorkoutDay,
  useUpdateWorkoutDayNotes,
  useUpdateWorkoutProgram,
  useWorkout,
  useWorkoutDaysList,
  useWorkoutLogsForDate,
  useWorkoutPrograms,
  type ProgramLessonWithDay,
} from '../../lib/queries';
import { useSelectedClient } from '../../lib/selectedClient';
import { C, nf } from '../../lib/theme';
import type { WorkoutLog } from '../../lib/types';

function formatTrDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

const TR_MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
function formatTrDateShort(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${parseInt(d, 10)} ${TR_MONTHS_SHORT[parseInt(m, 10) - 1]}`;
}

function onErr(title: string) {
  return (e: any) => showAlert(title, e.message ?? 'Bir hata oluştu.');
}

// Program Geçmişi'nde tek bir günün (bir derse atanmış workout_day) not + egzersiz/set özetini
// gösterir. Aynı tarihte birden fazla ders varsa her biri için ayrı bir bölüm olarak render edilir
// (kendi useLessonDayWorkout sorgusuyla), böylece hiçbir günün detayı gizlenmez.
function HistoryDaySection({
  clientId,
  dayId,
  logDate,
  label,
  notes,
}: {
  clientId: string | undefined;
  dayId: string;
  logDate: string;
  label: string;
  notes: string | null;
}) {
  const q = useLessonDayWorkout(clientId, dayId, logDate);
  const exercises = q.data ?? [];
  return (
    <View style={styles.historyDaySection}>
      <Text style={styles.historyDaySectionTitle}>{label}</Text>
      {notes ? <Text style={styles.historyNotesText}>{notes}</Text> : null}
      {q.isLoading ? (
        <ActivityIndicator color={C.lime} />
      ) : exercises.length === 0 ? (
        notes ? null : <Text style={styles.empty}>Bu günde egzersiz yok.</Text>
      ) : (
        exercises.map((ex) => (
          <View key={ex.id} style={styles.historyExerciseRow}>
            <Text style={styles.historyExerciseName}>{ex.ex}</Text>
            <Text style={styles.historyExerciseStat}>{ex.sets.map((s) => `${s.repCount}×${nf(s.kg, 1)}`).join(', ')} kg</Text>
          </View>
        ))
      )}
    </View>
  );
}

export default function AntrenmanScreen() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const isTrainer = profile?.role === 'trainer';
  const { selectedClientId } = useSelectedClient();
  const clientQuery = useClient(selectedClientId ?? undefined);
  const programsQuery = useWorkoutPrograms(selectedClientId ?? undefined);
  const addProgram = useAddWorkoutProgram(selectedClientId ?? undefined);
  const updateProgram = useUpdateWorkoutProgram(selectedClientId ?? undefined);
  const deleteProgram = useDeleteWorkoutProgram(selectedClientId ?? undefined);
  const toggleProgramShared = useToggleWorkoutProgramShared(selectedClientId ?? undefined);

  const [programId, setProgramId] = useState<string | null>(null);
  const programs = programsQuery.data ?? [];
  const selectedProgram = programs.find((p) => p.id === programId) ?? programs[0];

  const workoutQuery = useWorkout(selectedClientId ?? undefined, selectedProgram?.id);
  const workoutDaysListQuery = useWorkoutDaysList(selectedClientId ?? undefined);
  const addDay = useAddWorkoutDay(selectedClientId ?? undefined);
  const updateDay = useUpdateWorkoutDay(selectedClientId ?? undefined);
  const updateDayNotes = useUpdateWorkoutDayNotes(selectedClientId ?? undefined);
  const deleteDay = useDeleteWorkoutDay(selectedClientId ?? undefined);
  const assignLessonDayFromBook = useAssignLessonDay(selectedClientId ?? undefined);
  const prLogsQuery = usePrLogs(selectedClientId ?? undefined);
  const addPrLog = useAddPrLog(selectedClientId ?? undefined);
  const deletePrLog = useDeletePrLog(selectedClientId ?? undefined);
  const sessionHistoryQuery = useSessionHistory(selectedClientId ?? undefined);
  // program_lessons ile aynı önbellek anahtarını (clients.id) kullanmak için — LessonBook da
  // aynı hook'u client.id ile çağırıyor; selectedClientId (profile id) kullanılırsa Program
  // Geçmişi'ndeki geri alma işlemi Ders Defteri'ni güncellemez.
  const toggleLessonComplete = useToggleLessonComplete(clientQuery.data?.id);
  // Ders Defteri (LessonBook) program_lessons sorgusunu clients.id (profile id değil) ile
  // önbelleğe alıyor — burada da aynı id kullanılmazsa "Dersi Bitir" sonrası invalidateQueries
  // bu sorguyu hiç tetiklemez ve Program Geçmişi güncel kalmaz.
  const lessonHistoryQuery = useProgramLessons(clientQuery.data?.id, selectedProgram?.id);

  const [dayId, setDayId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [addingProgram, setAddingProgram] = useState(false);
  const [newProgramName, setNewProgramName] = useState('');
  const [renamingProgramId, setRenamingProgramId] = useState<string | null>(null);
  const [programNameDraft, setProgramNameDraft] = useState('');
  const [addingDay, setAddingDay] = useState(false);
  const [newDayKey, setNewDayKey] = useState('');
  const [newDayLabel, setNewDayLabel] = useState('');
  const [renamingDay, setRenamingDay] = useState(false);
  const [dayNameDraft, setDayNameDraft] = useState({ day_key: '', label: '' });
  const [notesDraft, setNotesDraft] = useState('');
  const [prDraft, setPrDraft] = useState({ exercise: '', weight: '', reps: '1' });
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [expandedHistoryDate, setExpandedHistoryDate] = useState<string | null>(null);

  const historyLogsQuery = useWorkoutLogsForDate(selectedClientId ?? undefined, expandedHistoryDate ?? undefined);

  // Danışan değişince önceki danışana ait seçim/modal state'i taşınmasın — aksi halde yanlış
  // danışanın günü/programı bir an için (veya kalıcı olarak) ekranda kalabilir.
  useEffect(() => {
    setProgramId(null);
    setDayId(null);
    setEditMode(false);
    setAddingProgram(false);
    setRenamingProgramId(null);
    setAddingDay(false);
    setRenamingDay(false);
    setExpandedExercise(null);
    setExpandedHistoryDate(null);
  }, [selectedClientId]);

  const days = workoutQuery.data ?? [];
  const activeDay = days.find((d) => d.id === dayId) ?? days[0];

  // Gün değişince not taslağını o günün kayıtlı notuyla eşitle — aksi halde önceki günün
  // yazılmamış taslağı yanlışlıkla yeni güne "sızabilir".
  useEffect(() => {
    setNotesDraft(activeDay?.notes ?? '');
  }, [activeDay?.id, activeDay?.notes]);

  const bestByExercise = useMemo(() => {
    const logs = prLogsQuery.data ?? [];
    const best = new Map<string, (typeof logs)[number]>();
    for (const log of logs) {
      const current = best.get(log.exercise);
      if (!current || log.weight > current.weight) best.set(log.exercise, log);
    }
    return Array.from(best.values()).sort((a, b) => b.weight - a.weight);
  }, [prLogsQuery.data]);

  const logsByExercise = useMemo(() => {
    const map = new Map<string, { date: string; weight: number; reps: number; id: string }[]>();
    for (const log of prLogsQuery.data ?? []) {
      const arr = map.get(log.exercise) ?? [];
      arr.push(log);
      map.set(log.exercise, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.date.localeCompare(b.date));
    return map;
  }, [prLogsQuery.data]);

  const dayLabelById = useMemo(
    () => new Map((workoutDaysListQuery.data ?? []).map((d) => [d.id, d.label])),
    [workoutDaysListQuery.data]
  );
  const dayNotesById = useMemo(
    () => new Map((workoutDaysListQuery.data ?? []).map((d) => [d.id, d.notes])),
    [workoutDaysListQuery.data]
  );

  // "Program Geçmişi": Ödemeler'deki "Seans Kullan" ile eklenen seanslar + Ders Defteri'nde
  // "Dersi Bitir"/"Uygulandı" ile tamamlanan dersler aynı listede, tarihe göre birleşik gösterilir.
  // Tarih anahtarı olarak completed_at (UTC) yerine log_date kullanılıyor — gece yarısına yakın
  // saatlerde günün kaymasını önlemek için (bkz. daha önceki UTC tarih hatası).
  // Her tamamlanan dersin kendi kaydı (ProgramLessonWithDay) saklanıyor — sadece görüntü metni
  // değil — böylece "geri al" işlemi hangi dersi hedefleyeceğini bilir.
  const historyEntries = useMemo(() => {
    type Entry = { id: string; date: string; time: string | null; workout_day_id: string | null; lessons: ProgramLessonWithDay[] };
    const map = new Map<string, Entry>();
    for (const s of sessionHistoryQuery.data ?? []) {
      map.set(s.date, { id: s.id, date: s.date, time: s.time, workout_day_id: s.workout_day_id, lessons: [] });
    }
    for (const l of lessonHistoryQuery.data ?? []) {
      if (!l.completed || !l.log_date) continue;
      const existing = map.get(l.log_date);
      if (existing) {
        existing.lessons.push(l);
        // Dersin kendi günü her zaman önceliklidir — aynı tarihte bir "Seans Kullan" kaydı zaten
        // varsa (farklı veya boş bir workout_day_id ile), onun günü değil dersin atanmış günü
        // gösterilmeli; aksi halde detay paneli yanlış/boş bir güne bakar.
        existing.workout_day_id = l.workout_day_id;
      } else {
        map.set(l.log_date, { id: `lesson-${l.id}`, date: l.log_date, time: null, workout_day_id: l.workout_day_id, lessons: [l] });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date) || (b.time ?? '').localeCompare(a.time ?? ''));
  }, [sessionHistoryQuery.data, lessonHistoryQuery.data]);

  const expandedEntry = useMemo(
    () => historyEntries.find((x) => x.date === expandedHistoryDate) ?? null,
    [historyEntries, expandedHistoryDate]
  );
  // Ders Defteri'nden gelen (workout_day_id bilinen) kayıtlar için, sadece "done=true"
  // işaretlenmiş setleri değil o günün tüm egzersiz/set planını gösteriyoruz — eğitmen dersi
  // danışan tek tek seti işaretlemeden de "Dersi Bitir" ile kapatabiliyor, o durumda
  // historyLogsQuery boş dönerdi ("egzersiz detayı gözükmüyor" sorunu buradan geliyordu).
  const expandedDayWorkoutQuery = useLessonDayWorkout(
    clientQuery.data?.id,
    expandedEntry?.workout_day_id ?? undefined,
    expandedHistoryDate ?? undefined
  );

  if (isTrainer && !selectedClientId) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Antrenman" />
        <EmptyClientState />
      </View>
    );
  }

  if (clientQuery.isLoading || programsQuery.isLoading || !clientQuery.data) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={C.lime} size="large" />
      </View>
    );
  }

  const client = clientQuery.data;

  // Gün değiştirmeden/modalı kapatmadan önce kaydedilmemiş not varsa sessizce kaydet — aksi
  // halde yazılan not "Kaydet"e basılmadan gün sekmesi değiştirildiğinde kaybolurdu.
  function flushNotesDraft() {
    if (activeDay && notesDraft !== (activeDay.notes ?? '')) {
      updateDayNotes.mutate({ id: activeDay.id, notes: notesDraft });
    }
  }

  function selectDay(id: string) {
    flushNotesDraft();
    setDayId(id);
    setRenamingDay(false);
  }

  function closeEditModal() {
    flushNotesDraft();
    setEditMode(false);
    setAddingDay(false);
    setNewDayKey('');
    setNewDayLabel('');
    setRenamingDay(false);
  }

  function selectProgram(id: string) {
    setProgramId(id);
    setDayId(null);
    setAddingDay(false);
    setRenamingDay(false);
  }

  // Ders Defteri'nde bir derse "Program Yaz" ile doğrudan yeni bir gün oluşturup o dersi ona
  // atar, ardından düzenleme moduna geçip o günün not ekranını açar — trainer önce ayrıca
  // "Programı düzenle"ye gidip bir gün oluşturmak zorunda kalmasın diye.
  function quickAddExerciseForLesson(lessonId: string, lessonNumber: number) {
    if (!selectedProgram) return;
    const label = `Ders ${lessonNumber}`;
    addDay.mutate(
      { program_id: selectedProgram.id, day_key: label.slice(0, 12), label, sort_order: days.length },
      {
        onSuccess: (day) => {
          assignLessonDayFromBook.mutate(
            { id: lessonId, program_id: selectedProgram.id, workout_day_id: day.id, log_date: null },
            {
              onSuccess: () => {
                setEditMode(true);
                selectDay(day.id);
              },
              onError: onErr('Derse atanamadı'),
            }
          );
        },
        onError: onErr('Gün oluşturulamadı'),
      }
    );
  }

  if (!isTrainer && programs.length === 0) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Antrenman" clientName={client.name} />
        <View style={styles.notSharedWrap}>
          <Text style={styles.notSharedTitle}>Program henüz paylaşılmadı</Text>
          <Text style={styles.notSharedText}>Antrenörün bir programı seninle paylaştığında burada görünecek.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Antrenman" clientName={client.name} showPill={isTrainer} />
      <ScrollView contentContainerStyle={styles.content}>
        {isTrainer && (
          <Pressable style={styles.editToggle} onPress={() => setEditMode(true)} hitSlop={10}>
            <Text style={styles.editToggleText}>✎ Programı düzenle</Text>
          </Pressable>
        )}

        <View style={styles.programList}>
          {programs.map((p) =>
            renamingProgramId === p.id ? (
              <View key={p.id} style={styles.addDayCard}>
                <AuthField label="Program Adı" value={programNameDraft} onChangeText={setProgramNameDraft} placeholder="Ör. Yaz Programı" />
                <View style={styles.rowGap}>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton
                      label="Kaydet"
                      loading={updateProgram.isPending}
                      disabled={!programNameDraft.trim()}
                      onPress={() =>
                        updateProgram.mutate(
                          { id: p.id, name: programNameDraft.trim() },
                          { onSuccess: () => setRenamingProgramId(null), onError: onErr('Kaydedilemedi') }
                        )
                      }
                    />
                  </View>
                  <Pressable style={styles.cancelBtn} onPress={() => setRenamingProgramId(null)} hitSlop={8}>
                    <Text style={styles.cancelBtnText}>Vazgeç</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                key={p.id}
                style={[styles.programRow, p.id === selectedProgram?.id && styles.programRowOn]}
                onPress={() => selectProgram(p.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.programRowText, p.id === selectedProgram?.id && styles.programRowTextOn]}>{p.name}</Text>
                  {isTrainer && <Text style={styles.programRowSub}>{p.shared ? 'Danışanla paylaşıldı' : 'Paylaşılmadı'}</Text>}
                </View>
                {isTrainer && (
                  <>
                    <Pressable
                      style={styles.programIconBtn}
                      onPress={() => {
                        setProgramNameDraft(p.name);
                        setRenamingProgramId(p.id);
                      }}
                      hitSlop={6}
                    >
                      <Text style={styles.programIconBtnText}>✎</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.programIconBtn, p.shared && styles.programIconBtnOn]}
                      onPress={() => toggleProgramShared.mutate({ id: p.id, shared: !p.shared }, { onError: onErr('Güncellenemedi') })}
                      hitSlop={6}
                    >
                      <Text style={[styles.programIconBtnText, p.shared && { color: C.bg }]}>{p.shared ? '✓' : '📤'}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.programIconBtn}
                      onPress={() =>
                        showAlert('Programı Sil', `"${p.name}" silinsin mi? İçindeki tüm günler ve egzersizler de silinir.`, [
                          { text: 'Vazgeç', style: 'cancel' },
                          {
                            text: 'Sil',
                            style: 'destructive',
                            onPress: () => {
                              deleteProgram.mutate(p.id, {
                                onSuccess: () => {
                                  if (p.id === selectedProgram?.id) {
                                    setProgramId(null);
                                    setDayId(null);
                                    setRenamingDay(false);
                                  }
                                },
                                onError: (e: any) => {
                                  if (e?.code === '23503') {
                                    showAlert(
                                      'Program Silinemedi',
                                      'Bu programın Ders Defteri\'nde kayıtlı dersleri var. Programı silmeden önce Ders Defteri\'ndeki o programa ait dersleri silmen gerekiyor — böylece tamamlanmış ders geçmişin yanlışlıkla kaybolmaz.'
                                    );
                                  } else {
                                    onErr('Silinemedi')(e);
                                  }
                                },
                              });
                            },
                          },
                        ])
                      }
                      hitSlop={6}
                    >
                      <Text style={[styles.programIconBtnText, { color: C.red }]}>🗑</Text>
                    </Pressable>
                  </>
                )}
              </Pressable>
            )
          )}

          {isTrainer && !addingProgram && (
            <Pressable style={styles.addProgramBtn} onPress={() => setAddingProgram(true)}>
              <Text style={styles.addProgramBtnText}>+ Yeni Program</Text>
            </Pressable>
          )}

          {isTrainer && addingProgram && (
            <View style={styles.addDayCard}>
              <AuthField label="Program Adı" value={newProgramName} onChangeText={setNewProgramName} placeholder="Ör. Yaz Programı" />
              <View style={styles.rowGap}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    label="Program Ekle"
                    loading={addProgram.isPending}
                    disabled={!newProgramName.trim()}
                    onPress={() =>
                      addProgram.mutate(
                        { name: newProgramName.trim(), sort_order: Math.max(0, ...programs.map((p) => p.sort_order)) + 1 },
                        {
                          onSuccess: (created) => {
                            setNewProgramName('');
                            setAddingProgram(false);
                            selectProgram(created.id);
                          },
                          onError: onErr('Program eklenemedi'),
                        }
                      )
                    }
                  />
                </View>
                <Pressable style={styles.cancelBtn} onPress={() => setAddingProgram(false)} hitSlop={8}>
                  <Text style={styles.cancelBtnText}>Vazgeç</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {selectedProgram && !editMode && (
          <LessonBook
            key={selectedProgram.id}
            clientId={client.id}
            programId={selectedProgram.id}
            isTrainer={isTrainer}
            days={workoutDaysListQuery.data?.filter((d) => d.program_id === selectedProgram.id) ?? []}
            onQuickAddExercise={quickAddExerciseForLesson}
          />
        )}

        {selectedProgram && (
          <Modal visible={editMode} animationType="slide" onRequestClose={closeEditModal}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalSheet}>
                <View style={[styles.modalHeader, { paddingTop: insets.top + 14 }]}>
                  <Text style={styles.modalHeaderText}>{selectedProgram.name}</Text>
                  <Pressable onPress={closeEditModal} hitSlop={10}>
                    <Text style={styles.modalCloseText}>✕ Kapat</Text>
                  </Pressable>
                </View>
                <NotebookFrame contentContainerStyle={[styles.modalScroll, { paddingBottom: insets.bottom + 16 }]}>
                  <View style={styles.dayTabs}>
                    {days.map((d) => (
                      <View key={d.id} style={styles.dayTabWrap}>
                        <Pressable
                          onPress={() => selectDay(d.id)}
                          style={[styles.dayTab, activeDay && d.id === activeDay.id && { backgroundColor: C.lime, borderColor: C.lime }]}
                        >
                          <Text style={[styles.dayTabText, activeDay && d.id === activeDay.id && { color: C.bg }]}>{d.day_key}</Text>
                        </Pressable>
                        <Pressable
                          style={styles.dayDelete}
                          onPress={() =>
                            showAlert('Günü Sil', `"${d.label}" silinsin mi? İçindeki tüm egzersizler ve setler de silinir.`, [
                              { text: 'Vazgeç', style: 'cancel' },
                              { text: 'Sil', style: 'destructive', onPress: () => deleteDay.mutate(d.id, { onError: onErr('Gün silinemedi') }) },
                            ])
                          }
                        >
                          <Text style={styles.dayDeleteText}>✕</Text>
                        </Pressable>
                      </View>
                    ))}
                    {!addingDay && (
                      <Pressable style={styles.dayTabAdd} onPress={() => setAddingDay(true)}>
                        <Text style={styles.dayTabAddText}>+ Gün</Text>
                      </Pressable>
                    )}
                  </View>

                  {addingDay && (
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
                                { program_id: selectedProgram.id, day_key: newDayKey.trim(), label: newDayLabel.trim(), sort_order: days.length },
                                {
                                  onSuccess: () => {
                                    setNewDayKey('');
                                    setNewDayLabel('');
                                    setAddingDay(false);
                                  },
                                  onError: onErr('Gün eklenemedi'),
                                }
                              );
                            }}
                          />
                        </View>
                        <Pressable
                          style={styles.cancelBtn}
                          onPress={() => {
                            setAddingDay(false);
                            setNewDayKey('');
                            setNewDayLabel('');
                          }}
                          hitSlop={8}
                        >
                          <Text style={styles.cancelBtnText}>Vazgeç</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}

                  {!activeDay ? (
                    <Text style={styles.empty}>Bu programda henüz gün yok.</Text>
                  ) : (
                    <>
                      {!renamingDay && (
                        <Pressable
                          style={styles.renameDayBtn}
                          onPress={() => {
                            setDayNameDraft({ day_key: activeDay.day_key, label: activeDay.label });
                            setRenamingDay(true);
                          }}
                        >
                          <Text style={styles.renameDayBtnText}>✎ Gün adını düzenle ({activeDay.label})</Text>
                        </Pressable>
                      )}
                      {renamingDay && (
                        <View style={styles.addDayCard}>
                          <AuthField label="Gün Kısaltması" value={dayNameDraft.day_key} onChangeText={(v) => setDayNameDraft((s) => ({ ...s, day_key: v }))} />
                          <AuthField label="Gün Başlığı" value={dayNameDraft.label} onChangeText={(v) => setDayNameDraft((s) => ({ ...s, label: v }))} />
                          <View style={styles.rowGap}>
                            <View style={{ flex: 1 }}>
                              <PrimaryButton
                                label="Kaydet"
                                loading={updateDay.isPending}
                                disabled={!dayNameDraft.day_key.trim() || !dayNameDraft.label.trim()}
                                onPress={() =>
                                  updateDay.mutate(
                                    { id: activeDay.id, day_key: dayNameDraft.day_key.trim(), label: dayNameDraft.label.trim() },
                                    { onSuccess: () => setRenamingDay(false), onError: onErr('Kaydedilemedi') }
                                  )
                                }
                              />
                            </View>
                            <Pressable style={styles.cancelBtn} onPress={() => setRenamingDay(false)} hitSlop={8}>
                              <Text style={styles.cancelBtnText}>Vazgeç</Text>
                            </Pressable>
                          </View>
                        </View>
                      )}

                      <TextInput
                        style={styles.notesInput}
                        value={notesDraft}
                        onChangeText={setNotesDraft}
                        multiline
                        placeholder="Bu gün için serbest not yaz…"
                        placeholderTextColor={C.greyD}
                        textAlignVertical="top"
                      />
                      <PrimaryButton
                        label="Kaydet"
                        loading={updateDayNotes.isPending}
                        onPress={() => updateDayNotes.mutate({ id: activeDay.id, notes: notesDraft }, { onError: onErr('Not kaydedilemedi') })}
                      />
                    </>
                  )}
                </NotebookFrame>
              </View>
            </View>
          </Modal>
        )}

        <Panel title="PR & Güç Takibi" right={`${bestByExercise.length} egzersiz`}>
          {bestByExercise.length === 0 ? (
            <Text style={styles.empty}>Henüz PR kaydı yok.</Text>
          ) : (
            bestByExercise.map((log) => {
              const expanded = expandedExercise === log.exercise;
              const history = logsByExercise.get(log.exercise) ?? [];
              return (
                <View key={log.id}>
                  <Pressable
                    style={styles.prRow}
                    onPress={() => {
                      const next = expanded ? null : log.exercise;
                      setExpandedExercise(next);
                      if (next) setPrDraft((s) => ({ ...s, exercise: log.exercise }));
                    }}
                  >
                    <View>
                      <Text style={styles.prExercise}>{log.exercise}</Text>
                      <Text style={styles.prMeta}>
                        {log.date} · {log.reps} tekrar · {history.length} kayıt
                      </Text>
                    </View>
                    <View style={styles.prRight}>
                      <Text style={styles.prWeight}>{nf(log.weight, 1)} kg</Text>
                      <Text style={styles.prExpandHint}>{expanded ? 'Kapat ▲' : 'Detay ▼'}</Text>
                    </View>
                  </Pressable>

                  {expanded && (
                    <View style={styles.prExpanded}>
                      <PrChart points={history.map((h) => ({ date: formatTrDate(h.date), weight: h.weight }))} />
                      {history
                        .slice()
                        .reverse()
                        .map((h) => (
                          <View key={h.id} style={styles.prHistoryRow}>
                            <Text style={styles.prHistoryText}>
                              {formatTrDate(h.date)} · {nf(h.weight, 1)} kg · {h.reps} tekrar
                            </Text>
                            {isTrainer && (
                              <Pressable onPress={() => deletePrLog.mutate(h.id, { onError: onErr('Silinemedi') })} hitSlop={8}>
                                <Text style={styles.prDelete}>Sil</Text>
                              </Pressable>
                            )}
                          </View>
                        ))}
                    </View>
                  )}
                </View>
              );
            })
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
                { onSuccess: () => setPrDraft({ exercise: '', weight: '', reps: '1' }), onError: onErr('PR kaydedilemedi') }
              );
            }}
          />
        </Panel>

        <Panel title="Program Geçmişi" right={`${historyEntries.length} kayıt`}>
          {historyEntries.length === 0 ? (
            <Text style={styles.empty}>
              Henüz tamamlanan seans/ders yok. Seans eklemek için Ödemeler ekranındaki "Seans Kullan" bölümünü, ya da Ders
              Defteri'nde bir dersi bitirebilirsin.
            </Text>
          ) : (
            <>
              <Text style={styles.historyHint}>Ne yapıldığını görmek için bir tarihe dokun.</Text>
              <View style={styles.dateChipRow}>
                {(showAllHistory ? historyEntries : historyEntries.slice(0, 14)).map((s) => {
                  const on = expandedHistoryDate === s.date;
                  return (
                    <Pressable
                      key={s.id}
                      style={[styles.dateChip, on && styles.dateChipOn]}
                      onPress={() => setExpandedHistoryDate((v) => (v === s.date ? null : s.date))}
                    >
                      <Text style={[styles.dateChipText, on && styles.dateChipTextOn]}>{formatTrDateShort(s.date)}</Text>
                      {s.time ? <Text style={[styles.dateChipTime, on && styles.dateChipTextOn]}>{s.time.slice(0, 5)}</Text> : null}
                    </Pressable>
                  );
                })}
              </View>
              {historyEntries.length > 14 && (
                <Pressable onPress={() => setShowAllHistory((v) => !v)} hitSlop={8}>
                  <Text style={styles.showMore}>{showAllHistory ? 'Daha az göster' : `Tümünü göster (${historyEntries.length})`}</Text>
                </Pressable>
              )}

              {expandedHistoryDate && (
                <View style={styles.historyDetail}>
                  <Text style={styles.historyDetailTitle}>
                    {formatTrDate(expandedHistoryDate)}
                    {expandedEntry && expandedEntry.lessons.length === 0
                      ? ` — ${expandedEntry.workout_day_id ? dayLabelById.get(expandedEntry.workout_day_id) ?? 'Program' : 'Antrenman'}`
                      : ''}
                  </Text>
                  {/* Not/egzersiz detayı: birden fazla ders varken her gün ayrı bölümde (aşağıda)
                      gösterildiği için, tek notu burada SADECE ders yokken (Seans Kullan kaydı) basıyoruz. */}
                  {expandedEntry &&
                  expandedEntry.lessons.length === 0 &&
                  expandedEntry.workout_day_id &&
                  dayNotesById.get(expandedEntry.workout_day_id) ? (
                    <Text style={styles.historyNotesText}>{dayNotesById.get(expandedEntry.workout_day_id)}</Text>
                  ) : null}
                  {isTrainer && expandedEntry && expandedEntry.lessons.length > 0 && (
                    <View style={styles.historyLessonUndoRow}>
                      {expandedEntry.lessons.map((l) => (
                        <Pressable
                          key={l.id}
                          style={styles.historyLessonUndoBtn}
                          onPress={() =>
                            showAlert(
                              'Dersi Geri Al',
                              `Ders ${l.lesson_number} tamamlanmamış olarak işaretlenip Ders Defteri'ne geri alınsın mı?`,
                              [
                                { text: 'Vazgeç', style: 'cancel' },
                                {
                                  text: 'Geri Al',
                                  style: 'destructive',
                                  onPress: () =>
                                    toggleLessonComplete.mutate(
                                      { id: l.id, program_id: l.program_id, completed: false },
                                      { onError: onErr('Geri alınamadı') }
                                    ),
                                },
                              ]
                            )
                          }
                        >
                          <Text style={styles.historyLessonUndoText}>Ders {l.lesson_number} — Geri Al</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  {expandedEntry && expandedEntry.lessons.length > 0 ? (
                    // Aynı tarihte tamamlanmış her ders GÜNÜnü ayrı bölümde göster — aynı gün birden
                    // fazla ders varsa hepsinin egzersiz/notu görünür (yalnız sonuncusu değil).
                    (() => {
                      const byDay = new Map<string, number[]>();
                      for (const l of expandedEntry.lessons) {
                        if (!l.workout_day_id) continue;
                        const arr = byDay.get(l.workout_day_id) ?? [];
                        arr.push(l.lesson_number);
                        byDay.set(l.workout_day_id, arr);
                      }
                      if (byDay.size === 0) return <Text style={styles.empty}>Bu derslere gün atanmamış.</Text>;
                      return Array.from(byDay.entries()).map(([dayId, nums]) => (
                        <HistoryDaySection
                          key={dayId}
                          clientId={clientQuery.data?.id}
                          dayId={dayId}
                          logDate={expandedHistoryDate}
                          label={`${nums.sort((a, b) => a - b).map((n) => `Ders ${n}`).join(', ')} · ${dayLabelById.get(dayId) ?? 'Gün'}`}
                          notes={dayNotesById.get(dayId) ?? null}
                        />
                      ));
                    })()
                  ) : expandedEntry?.workout_day_id ? (
                    expandedDayWorkoutQuery.isLoading ? (
                      <ActivityIndicator color={C.lime} />
                    ) : (expandedDayWorkoutQuery.data ?? []).length === 0 ? (
                      dayNotesById.get(expandedEntry.workout_day_id) ? null : (
                        <Text style={styles.empty}>Bu günde henüz egzersiz yok.</Text>
                      )
                    ) : (
                      expandedDayWorkoutQuery.data!.map((ex) => (
                        <View key={ex.id} style={styles.historyExerciseRow}>
                          <Text style={styles.historyExerciseName}>{ex.ex}</Text>
                          <Text style={styles.historyExerciseStat}>
                            {ex.sets.map((s) => `${s.repCount}×${nf(s.kg, 1)}`).join(', ')} kg
                          </Text>
                        </View>
                      ))
                    )
                  ) : historyLogsQuery.isLoading ? (
                    <ActivityIndicator color={C.lime} />
                  ) : (historyLogsQuery.data ?? []).length === 0 ? (
                    <Text style={styles.empty}>Bu tarihte kayıtlı egzersiz detayı bulunamadı.</Text>
                  ) : (
                    Array.from(
                      (historyLogsQuery.data ?? []).reduce((map, { log, exercise }) => {
                        const list = map.get(exercise.ex) ?? [];
                        list.push(log);
                        map.set(exercise.ex, list);
                        return map;
                      }, new Map<string, WorkoutLog[]>())
                    ).map(([exName, sets]) => (
                      <View key={exName} style={styles.historyExerciseRow}>
                        <Text style={styles.historyExerciseName}>{exName}</Text>
                        <Text style={styles.historyExerciseStat}>
                          {sets
                            .sort((a, b) => a.set_number - b.set_number)
                            .map((s) => `${s.rep_count}×${nf(s.kg, 1)}`)
                            .join(', ')}{' '}
                          kg
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              )}
            </>
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
  notSharedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  notSharedTitle: { fontSize: 16, fontWeight: '800', color: C.white, marginBottom: 8, textAlign: 'center' },
  notSharedText: { fontSize: 13, color: C.grey, textAlign: 'center', lineHeight: 19 },
  programList: { marginBottom: 14, gap: 8 },
  programRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.edge,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  programRowOn: { borderColor: C.lime },
  programRowText: { fontSize: 14, fontWeight: '700', color: C.white },
  programRowTextOn: { color: C.lime },
  programRowSub: { fontSize: 10, color: C.greyD, marginTop: 2 },
  programIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.edge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  programIconBtnOn: { backgroundColor: C.lime, borderColor: C.lime },
  programIconBtnText: { fontSize: 12, color: C.lime },
  addProgramBtn: { borderWidth: 2, borderColor: C.edge, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 11, alignItems: 'center' },
  addProgramBtnText: { fontSize: 12, color: C.greyD, fontWeight: '700' },
  dayTabs: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  dayTabWrap: { flex: 1, minWidth: 60, position: 'relative' },
  dayTab: { paddingVertical: 9, borderRadius: 12, alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.edge },
  dayTabText: { fontSize: 15, fontFamily: 'Kalam_700Bold', color: C.grey },
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
  renameDayBtn: { alignSelf: 'flex-start', marginBottom: 10 },
  renameDayBtnText: { fontSize: 11, fontWeight: '700', color: C.lime },
  cancelBtn: { alignSelf: 'center', paddingHorizontal: 10 },
  cancelBtnText: { fontSize: 12, fontWeight: '700', color: C.greyD },
  modalOverlay: { flex: 1, backgroundColor: C.bg },
  modalSheet: { flex: 1, backgroundColor: C.bg },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.edge,
  },
  modalHeaderText: { fontSize: 19, fontFamily: 'Kalam_700Bold', color: C.lime },
  modalCloseText: { fontSize: 12, fontWeight: '700', color: C.grey },
  modalScroll: { padding: 16 },
  notesInput: {
    minHeight: 300,
    color: C.white,
    fontSize: 17,
    lineHeight: 30,
    fontFamily: 'Kalam_400Regular',
    marginBottom: 14,
  },
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
  prExpandHint: { color: C.greyD, fontSize: 10, fontWeight: '700' },
  prExpanded: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.edge, padding: 10, marginTop: -4, marginBottom: 8 },
  prHistoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: C.edge,
  },
  prHistoryText: { color: C.grey, fontSize: 11 },
  prForm: { flexDirection: 'row', gap: 8, marginTop: 4 },
  historyHint: { fontSize: 10, color: C.greyD, marginBottom: 8 },
  dateChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  dateChip: {
    borderWidth: 1,
    borderColor: C.edge,
    borderRadius: 10,
    backgroundColor: C.card2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  dateChipOn: { backgroundColor: C.lime, borderColor: C.lime },
  dateChipText: { fontSize: 11, fontWeight: '700', color: C.white },
  dateChipTextOn: { color: C.bg },
  dateChipTime: { fontSize: 9, color: C.greyD, marginTop: 1 },
  historyDetail: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.edge, padding: 12, marginBottom: 8 },
  historyDetailTitle: { fontSize: 12, fontWeight: '800', color: C.white, marginBottom: 8 },
  historyExerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: C.edge,
  },
  historyExerciseName: { fontSize: 12, color: C.white, fontWeight: '600' },
  historyExerciseStat: { fontSize: 12, color: C.grey },
  historyDaySection: { marginTop: 10, borderTopWidth: 1, borderTopColor: C.edge, paddingTop: 8 },
  historyDaySectionTitle: { fontSize: 12, fontWeight: '800', color: C.lime, marginBottom: 6 },
  historyNotesText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Kalam_400Regular',
    color: C.white,
    backgroundColor: C.card2,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  historyLessonUndoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  historyLessonUndoBtn: { borderWidth: 1, borderColor: C.red, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  historyLessonUndoText: { fontSize: 11, fontWeight: '700', color: C.red },
  showMore: { color: C.lime, fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 4 },
});
