import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { showAlert } from '../lib/alert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useAssignLessonDay,
  useCreateProgramLessons,
  useDeleteProgramLesson,
  useLessonDayWorkout,
  useProgramLessons,
  useToggleLessonComplete,
  useUpdateLessonSetLog,
  useUpdateWorkoutDayNotes,
  type ProgramLessonWithDay,
} from '../lib/queries';
import { C } from '../lib/theme';
import type { WorkoutDay } from '../lib/types';
import { AuthField } from './AuthField';
import { Panel } from './Panel';
import { PrimaryButton } from './PrimaryButton';
import { SetCard } from './SetCard';

const PAGE_SIZE = 5;

function onErr(title: string) {
  return (e: any) => showAlert(title, e.message ?? 'Bir hata oluştu.');
}

function LessonDetail({
  clientId,
  lesson,
  isTrainer,
  dayNotes,
  onComplete,
}: {
  clientId: string;
  lesson: ProgramLessonWithDay;
  isTrainer: boolean;
  dayNotes: string | null;
  onComplete: () => void;
}) {
  const workoutQuery = useLessonDayWorkout(clientId, lesson.workout_day_id ?? undefined, lesson.log_date ?? undefined);
  const updateSetLog = useUpdateLessonSetLog(clientId);
  const updateDayNotes = useUpdateWorkoutDayNotes(clientId);

  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(dayNotes ?? '');

  // Ders değişince (veya notu dışarıdan güncellenince) taslağı senkronize et — aksi halde
  // bir dersten diğerine geçince önceki dersin yazılmamış taslağı görünmeye devam edebilir.
  useEffect(() => {
    setNotesDraft(dayNotes ?? '');
    setEditingNotes(false);
  }, [lesson.workout_day_id, dayNotes]);

  if (workoutQuery.isLoading) {
    return <ActivityIndicator color={C.lime} style={{ marginVertical: 12 }} />;
  }

  const exercises = workoutQuery.data ?? [];

  return (
    <View style={styles.detail}>
      {isTrainer && lesson.workout_day_id && (
        <>
          {editingNotes ? (
            <View style={styles.notesEditWrap}>
              <TextInput
                style={styles.notesInput}
                value={notesDraft}
                onChangeText={setNotesDraft}
                multiline
                placeholder="Bu ders için not yaz…"
                placeholderTextColor={C.greyD}
                textAlignVertical="top"
              />
              <View style={styles.notesEditRow}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    label="Kaydet"
                    loading={updateDayNotes.isPending}
                    onPress={() =>
                      updateDayNotes.mutate(
                        { id: lesson.workout_day_id!, notes: notesDraft },
                        { onSuccess: () => setEditingNotes(false), onError: onErr('Not kaydedilemedi') }
                      )
                    }
                  />
                </View>
                <Pressable style={styles.notesCancelBtn} onPress={() => { setNotesDraft(dayNotes ?? ''); setEditingNotes(false); }} hitSlop={8}>
                  <Text style={styles.notesCancelText}>Vazgeç</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              {dayNotes ? <Text style={styles.dayNotesText}>{dayNotes}</Text> : null}
              <Pressable style={styles.editNotesBtn} onPress={() => setEditingNotes(true)}>
                <Text style={styles.editNotesBtnText}>{dayNotes ? '✎ Notu Düzenle' : '+ Not Ekle'}</Text>
              </Pressable>
            </>
          )}
        </>
      )}
      {!isTrainer && dayNotes ? <Text style={styles.dayNotesText}>{dayNotes}</Text> : null}
      {exercises.length === 0 ? (
        <Text style={styles.empty}>Bu günde henüz egzersiz yok.</Text>
      ) : (
        exercises.map((ex) => (
          <SetCard
            key={ex.id}
            exercise={ex}
            editMode={false}
            readOnly={isTrainer}
            onToggleSet={(set) =>
              updateSetLog.mutate(
                {
                  exerciseId: ex.id,
                  date: lesson.log_date!,
                  setNumber: set.setNumber,
                  current: { repCount: set.repCount, kg: set.kg, done: set.done },
                  patch: { done: !set.done },
                },
                { onError: onErr('Kaydedilemedi') }
              )
            }
            onAdjustLog={(set, field, delta) =>
              updateSetLog.mutate(
                {
                  exerciseId: ex.id,
                  date: lesson.log_date!,
                  setNumber: set.setNumber,
                  current: { repCount: set.repCount, kg: set.kg, done: set.done },
                  patch: field === 'rep' ? { repCount: Math.max(0, set.repCount + delta) } : { kg: Math.max(0, set.kg + delta) },
                },
                { onError: onErr('Kaydedilemedi') }
              )
            }
            onAdjustTarget={() => {}}
            onAddSet={() => {}}
            onDeleteSet={() => {}}
            onRename={() => {}}
            onDeleteExercise={() => {}}
          />
        ))
      )}

      <Pressable style={styles.completeBtn} onPress={onComplete}>
        <Text style={styles.completeBtnText}>{isTrainer ? 'Dersi Bitir' : 'Uygulandı'}</Text>
      </Pressable>
    </View>
  );
}

export function LessonBook({
  clientId,
  programId,
  isTrainer,
  days,
  onQuickAddExercise,
}: {
  clientId: string;
  programId: string;
  isTrainer: boolean;
  days: WorkoutDay[];
  onQuickAddExercise: (lessonId: string, lessonNumber: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const lessonsQuery = useProgramLessons(clientId, programId);
  const createLessons = useCreateProgramLessons(clientId);
  const assignDay = useAssignLessonDay(clientId);
  const toggleComplete = useToggleLessonComplete(clientId);
  const deleteLesson = useDeleteProgramLesson(clientId);

  const [countDraft, setCountDraft] = useState('20');
  const [page, setPage] = useState(0);
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);
  const [assigningLessonId, setAssigningLessonId] = useState<string | null>(null);

  const lessons = lessonsQuery.data ?? [];
  const active = lessons.filter((l) => !l.completed);

  const totalPages = Math.max(1, Math.ceil(active.length / PAGE_SIZE));

  useEffect(() => {
    if (page >= totalPages) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);

  const pageLessons = active.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const openLesson = openLessonId ? active.find((l) => l.id === openLessonId) ?? null : null;

  function selectLesson(id: string) {
    setOpenLessonId(id);
    setAssigningLessonId(null);
  }

  function closeModal() {
    setOpenLessonId(null);
    setAssigningLessonId(null);
  }

  return (
    <Panel title="Ders Defteri" right={`${active.length} aktif`}>
      {isTrainer && (
        <View style={styles.createRow}>
          <View style={{ flex: 1 }}>
            <AuthField label="Kaç ders eklensin?" value={countDraft} onChangeText={setCountDraft} keyboardType="number-pad" placeholder="Ör. 20" />
          </View>
          <PrimaryButton
            label="+ Ders Ekle"
            loading={createLessons.isPending}
            disabled={!parseInt(countDraft, 10)}
            onPress={() => {
              const count = parseInt(countDraft, 10);
              if (!count || count <= 0) return;
              createLessons.mutate({ program_id: programId, count }, { onError: onErr('Ders eklenemedi') });
            }}
          />
        </View>
      )}

      {lessonsQuery.isLoading ? (
        <ActivityIndicator color={C.lime} />
      ) : active.length === 0 ? (
        <Text style={styles.empty}>
          {isTrainer ? 'Henüz ders yok — yukarıdan ekleyebilirsin.' : 'Antrenörün henüz ders eklemedi.'}
        </Text>
      ) : (
        <>
          <View style={styles.grid}>
            {pageLessons.map((l) => (
              <Pressable key={l.id} style={styles.lessonBox} onPress={() => selectLesson(l.id)}>
                <Text style={styles.lessonBoxNum}>Ders {l.lesson_number}</Text>
                <Text style={styles.lessonBoxDay} numberOfLines={1}>
                  {l.day_label ?? 'Atanmadı'}
                </Text>
              </Pressable>
            ))}
          </View>

          {totalPages > 1 && (
            <View style={styles.pageRow}>
              <Pressable disabled={page === 0} onPress={() => setPage((p) => Math.max(0, p - 1))} hitSlop={8}>
                <Text style={[styles.pageBtn, page === 0 && styles.pageBtnOff]}>‹ Önceki</Text>
              </Pressable>
              <Text style={styles.pageLabel}>
                Sayfa {page + 1}/{totalPages}
              </Text>
              <Pressable disabled={page >= totalPages - 1} onPress={() => setPage((p) => Math.min(totalPages - 1, p + 1))} hitSlop={8}>
                <Text style={[styles.pageBtn, page >= totalPages - 1 && styles.pageBtnOff]}>Sonraki ›</Text>
              </Pressable>
            </View>
          )}
        </>
      )}

      <Modal visible={!!openLesson} animationType="slide" onRequestClose={closeModal}>
        {openLesson && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={[styles.modalHeader, { paddingTop: insets.top + 14 }]}>
                <Text style={styles.modalHeaderText}>Ders {openLesson.lesson_number}</Text>
                <View style={styles.modalHeaderActions}>
                  {isTrainer && (
                    <Pressable
                      onPress={() =>
                        showAlert('Dersi Sil', `Ders ${openLesson.lesson_number} silinsin mi?`, [
                          { text: 'Vazgeç', style: 'cancel' },
                          {
                            text: 'Sil',
                            style: 'destructive',
                            onPress: () => {
                              deleteLesson.mutate({ id: openLesson.id, program_id: programId }, { onError: onErr('Silinemedi') });
                              closeModal();
                            },
                          },
                        ])
                      }
                      hitSlop={8}
                      style={styles.deleteLessonBtn}
                    >
                      <Text style={styles.deleteLessonText}>Dersi Sil</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={closeModal} hitSlop={10}>
                    <Text style={styles.modalCloseText}>✕ Kapat</Text>
                  </Pressable>
                </View>
              </View>

              <ScrollView contentContainerStyle={[styles.modalScroll, { paddingBottom: insets.bottom + 16 }]}>
                {!openLesson.workout_day_id ? (
                  isTrainer ? (
                    assigningLessonId === openLesson.id ? (
                      <View style={styles.dayPickRow}>
                        {days.length === 0 ? (
                          <Text style={styles.empty}>Önce "Programı düzenle" ile en az bir gün oluştur.</Text>
                        ) : (
                          days.map((d) => (
                            <Pressable
                              key={d.id}
                              style={styles.dayPick}
                              onPress={() =>
                                assignDay.mutate(
                                  { id: openLesson.id, program_id: programId, workout_day_id: d.id, log_date: openLesson.log_date },
                                  { onError: onErr('Atanamadı') }
                                )
                              }
                            >
                              <Text style={styles.dayPickText}>{d.label}</Text>
                            </Pressable>
                          ))
                        )}
                      </View>
                    ) : (
                      <View style={styles.assignRow}>
                        <Pressable style={[styles.assignBtn, { flex: 1 }]} onPress={() => setAssigningLessonId(openLesson.id)}>
                          <Text style={styles.assignBtnText}>+ Gün Ata</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.assignBtn, { flex: 1 }]}
                          onPress={() => {
                            // Önce bu ders penceresini kapat, sonra not-defteri düzenleyicisini aç —
                            // aksi halde iki Modal üst üste biner (kafa karıştırıcı çift kapatma).
                            const id = openLesson.id;
                            const num = openLesson.lesson_number;
                            closeModal();
                            onQuickAddExercise(id, num);
                          }}
                        >
                          <Text style={styles.assignBtnText}>+ Program Yaz</Text>
                        </Pressable>
                      </View>
                    )
                  ) : (
                    <Text style={styles.empty}>Antrenörün bu ders için henüz bir program atamadı.</Text>
                  )
                ) : (
                  <LessonDetail
                    clientId={clientId}
                    lesson={openLesson}
                    isTrainer={isTrainer}
                    dayNotes={days.find((d) => d.id === openLesson.workout_day_id)?.notes ?? null}
                    onComplete={() =>
                      showAlert(
                        'Dersi Bitir',
                        `Ders ${openLesson.lesson_number} tamamlandı olarak işaretlenip Program Geçmişi'ne taşınsın mı?`,
                        [
                          { text: 'Vazgeç', style: 'cancel' },
                          {
                            text: 'Bitir',
                            onPress: () =>
                              toggleComplete.mutate(
                                { id: openLesson.id, program_id: programId, completed: true },
                                { onSuccess: closeModal, onError: onErr('Güncellenemedi') }
                              ),
                          },
                        ]
                      )
                    }
                  />
                )}
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>
    </Panel>
  );
}

const styles = StyleSheet.create({
  empty: { color: C.grey, padding: 8, fontSize: 12 },
  createRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  lessonBox: {
    width: '18%',
    minWidth: 56,
    borderWidth: 1,
    borderColor: C.edge,
    backgroundColor: C.card2,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  lessonBoxNum: { fontSize: 11, fontWeight: '800', color: C.white },
  lessonBoxDay: { fontSize: 9, color: C.greyD, marginTop: 2 },
  pageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  pageBtn: { fontSize: 12, fontWeight: '700', color: C.lime },
  pageBtnOff: { color: C.greyD },
  pageLabel: { fontSize: 11, color: C.greyD, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: C.bg },
  modalSheet: { flex: 1, backgroundColor: C.bg },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.edge,
  },
  modalHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  modalHeaderText: { fontSize: 16, fontWeight: '800', color: C.white },
  modalCloseText: { fontSize: 12, fontWeight: '700', color: C.grey },
  modalScroll: { padding: 16 },
  deleteLessonBtn: { borderWidth: 1, borderColor: C.red, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  deleteLessonText: { fontSize: 12, fontWeight: '700', color: C.red },
  assignRow: { flexDirection: 'row', gap: 8 },
  assignBtn: { borderWidth: 2, borderColor: C.edge, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  assignBtnText: { fontSize: 12, color: C.greyD, fontWeight: '700' },
  dayPickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayPick: { borderWidth: 1, borderColor: C.edge, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: C.card2 },
  dayPickText: { fontSize: 11, fontWeight: '700', color: C.grey },
  detail: { marginTop: 4 },
  dayNotesText: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Kalam_400Regular',
    color: C.white,
    backgroundColor: C.card2,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  completeBtn: { borderWidth: 1, borderColor: C.lime, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  completeBtnText: { fontSize: 13, fontWeight: '800', color: C.lime },
  editNotesBtn: { alignSelf: 'flex-start', marginBottom: 14 },
  editNotesBtnText: { fontSize: 12, fontWeight: '700', color: C.lime },
  notesEditWrap: { marginBottom: 14 },
  notesInput: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: C.edge,
    borderRadius: 12,
    backgroundColor: C.card2,
    color: C.white,
    fontFamily: 'Kalam_400Regular',
    fontSize: 16,
    lineHeight: 22,
    padding: 12,
    marginBottom: 10,
  },
  notesEditRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  notesCancelBtn: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, backgroundColor: C.card2, borderWidth: 1, borderColor: C.edge },
  notesCancelText: { fontSize: 13, fontWeight: '700', color: C.grey },
});
