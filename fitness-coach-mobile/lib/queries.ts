import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { localDateStr } from './theme';
import type {
  AppNotification,
  CardioLog,
  Checkin,
  NutritionNote,
  Client,
  ClientPackage,
  InjuryLog,
  LessonScheduleEntry,
  LibraryExercise,
  LibraryFood,
  Meal,
  MealItem,
  MealLog,
  Measurement,
  Payment,
  PrLog,
  Profile,
  ProgramLesson,
  ProgressPhoto,
  SessionLog,
  ShoppingItem,
  SupplementItem,
  WeightLog,
  WellnessSurvey,
  WorkoutDay,
  WorkoutExercise,
  WorkoutLog,
  WorkoutProgram,
  WorkoutSet,
} from './types';

const todayStr = localDateStr;

// ---------- Profiles ----------

export function useProfileById(profileId: string | undefined | null) {
  return useQuery({
    queryKey: ['profile', profileId],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', profileId).single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!profileId,
  });
}

export function useUpdateOwnName(profileId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!profileId) throw new Error('profileId eksik');
      const { error } = await supabase.from('profiles').update({ name }).eq('id', profileId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', profileId] }),
  });
}

// ---------- Clients ----------

export function useClients(trainerId: string | undefined) {
  return useQuery({
    queryKey: ['clients', trainerId],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*').eq('trainer_id', trainerId).order('created_at');
      if (error) throw error;
      return data as Client[];
    },
    enabled: !!trainerId,
  });
}

export function useClient(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*').eq('id', clientId).single();
      if (error) throw error;
      return data as Client;
    },
    enabled: !!clientId,
  });
}

export function useClientByProfile(profileId: string | undefined) {
  return useQuery({
    queryKey: ['client-by-profile', profileId],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*').eq('profile_id', profileId).single();
      if (error) throw error;
      return data as Client;
    },
    enabled: !!profileId,
  });
}

const DEFAULT_WORKOUT = [
  {
    day_key: 'Pzt',
    label: 'GÖĞÜS & TRICEPS',
    rows: [
      { ex: 'Bench Press', grp: 'Göğüs', set_count: 4, rep_count: 8, kg: 60 },
      { ex: 'Incline DB Press', grp: 'Göğüs (Üst)', set_count: 4, rep_count: 10, kg: 22 },
      { ex: 'Cable Fly', grp: 'Göğüs', set_count: 3, rep_count: 12, kg: 12 },
      { ex: 'Dips', grp: 'Göğüs/Triceps', set_count: 3, rep_count: 10, kg: 0 },
      { ex: 'Triceps Pushdown', grp: 'Triceps', set_count: 3, rep_count: 12, kg: 20 },
    ],
  },
  {
    day_key: 'Sal',
    label: 'SIRT & BICEPS',
    rows: [
      { ex: 'Barbell Row', grp: 'Sırt', set_count: 4, rep_count: 8, kg: 50 },
      { ex: 'Lat Pulldown', grp: 'Sırt (Kanat)', set_count: 4, rep_count: 10, kg: 45 },
      { ex: 'Seated Cable Row', grp: 'Sırt (Orta)', set_count: 3, rep_count: 12, kg: 40 },
      { ex: 'Barbell Curl', grp: 'Biceps', set_count: 3, rep_count: 10, kg: 25 },
    ],
  },
  {
    day_key: 'Çar',
    label: 'BACAK',
    rows: [
      { ex: 'Squat', grp: 'Bacak', set_count: 4, rep_count: 8, kg: 70 },
      { ex: 'Romanian Deadlift', grp: 'Bacak (Arka)', set_count: 4, rep_count: 10, kg: 55 },
      { ex: 'Leg Press', grp: 'Bacak', set_count: 3, rep_count: 12, kg: 110 },
      { ex: 'Calf Raise', grp: 'Baldır', set_count: 4, rep_count: 15, kg: 50 },
    ],
  },
];

const DEFAULT_MEALS = [
  {
    name: 'Kahvaltı',
    items: [
      { food: 'Yumurta (haşlanmış)', unit: 'adet', kcal: 70, p: 6, k: 1, y: 5, default_qty: 3 },
      { food: 'Yulaf Ezmesi 60 g', unit: 'porsiyon', kcal: 230, p: 8, k: 40, y: 4, default_qty: 1 },
      { food: 'Muz', unit: 'adet', kcal: 105, p: 1, k: 27, y: 0, default_qty: 1 },
    ],
  },
  {
    name: 'Öğle Yemeği',
    items: [
      { food: 'Tavuk Göğsü (ızgara) 100 g', unit: 'porsiyon', kcal: 165, p: 31, k: 0, y: 4, default_qty: 1.8 },
      { food: 'Basmati Pirinç 100 g', unit: 'porsiyon', kcal: 130, p: 3, k: 28, y: 0, default_qty: 1.5 },
      { food: 'Yeşil Salata + Zeytinyağı', unit: 'porsiyon', kcal: 120, p: 2, k: 6, y: 10, default_qty: 1 },
    ],
  },
  {
    name: 'Akşam Yemeği',
    items: [
      { food: 'Somon (fırın) 120 g', unit: 'porsiyon', kcal: 230, p: 25, k: 0, y: 14, default_qty: 1 },
      { food: 'Kinoa 100 g', unit: 'porsiyon', kcal: 120, p: 4, k: 21, y: 2, default_qty: 1 },
      { food: 'Buharda Sebze', unit: 'porsiyon', kcal: 60, p: 3, k: 10, y: 0, default_qty: 1 },
    ],
  },
];

// Returns an error message if seeding partially failed, or null on full success. Never throws:
// the client row is already committed by the time this runs, so a mid-seed failure should not
// make the whole "add client" action look like it failed (that leaves an invisible client behind
// and a retry hits the trainer_id/email unique constraint with a confusing raw Postgres error).
async function seedClientDefaults(clientId: string): Promise<string | null> {
  try {
    const { data: programRow, error: programErr } = await supabase
      .from('workout_programs')
      .insert({ client_id: clientId, name: 'Programım' })
      .select()
      .single();
    if (programErr) throw programErr;

    for (const [i, day] of DEFAULT_WORKOUT.entries()) {
      const { data: dayRow, error: dayErr } = await supabase
        .from('workout_days')
        .insert({ client_id: clientId, program_id: programRow.id, day_key: day.day_key, label: day.label, sort_order: i })
        .select()
        .single();
      if (dayErr) throw dayErr;
      for (const [j, r] of day.rows.entries()) {
        const { data: exRow, error: exErr } = await supabase
          .from('workout_exercises')
          .insert({ workout_day_id: dayRow.id, ex: r.ex, grp: r.grp, sort_order: j })
          .select()
          .single();
        if (exErr) throw exErr;
        const sets = Array.from({ length: Math.max(1, r.set_count) }, (_, k) => ({
          workout_exercise_id: exRow.id,
          set_number: k + 1,
          rep_count: r.rep_count,
          kg: r.kg,
        }));
        const { error: setsErr } = await supabase.from('workout_sets').insert(sets);
        if (setsErr) throw setsErr;
      }
    }

    for (const [i, meal] of DEFAULT_MEALS.entries()) {
      const { data: mealRow, error: mealErr } = await supabase
        .from('meals')
        .insert({ client_id: clientId, name: meal.name, sort_order: i })
        .select()
        .single();
      if (mealErr) throw mealErr;
      const items = meal.items.map((it, j) => ({ ...it, meal_id: mealRow.id, sort_order: j }));
      const { error: itemErr } = await supabase.from('meal_items').insert(items);
      if (itemErr) throw itemErr;
    }
    return null;
  } catch (e: any) {
    return e?.message ?? 'Varsayılan program/beslenme planı eklenemedi.';
  }
}

export function useAddClient(trainerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      email: string;
      goal: string;
      start_weight: number;
      kcal_target: number;
      tdee: number;
      macro_p: number;
      macro_k: number;
      macro_y: number;
      pr: number;
      birthday: string | null;
      height: number;
      gender: string;
    }) => {
      if (!trainerId) throw new Error('trainerId eksik');
      const { data, error } = await supabase
        .from('clients')
        .insert({ ...input, trainer_id: trainerId })
        .select()
        .single();
      if (error) throw error;
      const seedError = await seedClientDefaults(data.id);
      return { client: data as Client, seedError };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients', trainerId] }),
  });
}

export function useUpdateClient(trainerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name: string;
      email: string;
      goal: string;
      start_weight: number;
      kcal_target: number;
      tdee: number;
      macro_p: number;
      macro_k: number;
      macro_y: number;
      pr: number;
      birthday: string | null;
      height: number;
      gender: string;
    }) => {
      const { id, ...patch } = input;
      const { error } = await supabase.from('clients').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ['clients', trainerId] });
      qc.invalidateQueries({ queryKey: ['client', input.id] });
    },
  });
}

export function useToggleClientActive(trainerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { clientId: string; active: boolean }) => {
      const { error } = await supabase.from('clients').update({ is_active: input.active }).eq('id', input.clientId);
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ['clients', trainerId] });
      qc.invalidateQueries({ queryKey: ['client', input.clientId] });
    },
  });
}

export function useDeleteClient(trainerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients', trainerId] }),
  });
}

// ---------- Weight logs ----------

export function useWeightLogs(clientId: string | undefined) {
  return useQuery({
    queryKey: ['weight_logs', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from('weight_logs').select('*').eq('client_id', clientId).order('date');
      if (error) throw error;
      return data as WeightLog[];
    },
    enabled: !!clientId,
  });
}

export function useLogWeight(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { weight: number; date?: string }) => {
      if (!clientId) throw new Error('clientId eksik');
      const { error } = await supabase
        .from('weight_logs')
        .upsert({ client_id: clientId, date: input.date ?? todayStr(), weight: input.weight }, { onConflict: 'client_id,date' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['weight_logs', clientId] }),
  });
}

// ---------- Antrenman Programları ----------

export function useWorkoutPrograms(clientId: string | undefined) {
  return useQuery({
    queryKey: ['workout_programs', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from('workout_programs').select('*').eq('client_id', clientId).order('sort_order');
      if (error) throw error;
      return data as WorkoutProgram[];
    },
    enabled: !!clientId,
  });
}

export function useAddWorkoutProgram(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; sort_order: number }) => {
      if (!clientId) throw new Error('clientId eksik');
      const { data, error } = await supabase
        .from('workout_programs')
        .insert({ client_id: clientId, ...input })
        .select()
        .single();
      if (error) throw error;
      return data as WorkoutProgram;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout_programs', clientId] }),
  });
}

export function useUpdateWorkoutProgram(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name: string }) => {
      const { error } = await supabase.from('workout_programs').update({ name: input.name }).eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout_programs', clientId] }),
  });
}

export function useDeleteWorkoutProgram(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workout_programs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout_programs', clientId] }),
  });
}

export function useToggleWorkoutProgramShared(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; shared: boolean }) => {
      const { error } = await supabase.from('workout_programs').update({ shared: input.shared }).eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout_programs', clientId] }),
  });
}

// ---------- Workout ----------

// "Set Kartları": her egzersizin her seti kendi tekrar/kg hedefine sahip. `sets` şablonu
// (workout_sets) ile o günkü gerçekleşen değeri (workout_logs, set_number ile eşleşir) birleştirilir —
// log yoksa şablon değeri gösterilir (henüz o gün işlenmemiş demektir).
export type SetRow = {
  setId: string;
  setNumber: number;
  templateRepCount: number;
  templateKg: number;
  repCount: number;
  kg: number;
  done: boolean;
};
export type WorkoutDayWithRows = WorkoutDay & { exercises: (WorkoutExercise & { sets: SetRow[] })[] };

// Tüm programlardaki günlerin (id -> label) haritasını döner — geçmişte tamamlanan bir seansın
// hangi güne ait olduğunu göstermek için, seçili programdan bağımsız olarak kullanılır.
export function useWorkoutDaysList(clientId: string | undefined) {
  return useQuery({
    queryKey: ['workout_days_list', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from('workout_days').select('*').eq('client_id', clientId);
      if (error) throw error;
      return data as WorkoutDay[];
    },
    enabled: !!clientId,
  });
}

export function useWorkout(clientId: string | undefined, programId: string | undefined) {
  return useQuery({
    queryKey: ['workout', clientId, programId, todayStr()],
    queryFn: async () => {
      const { data: days, error: daysErr } = await supabase
        .from('workout_days')
        .select('*')
        .eq('client_id', clientId)
        .eq('program_id', programId)
        .order('sort_order');
      if (daysErr) throw daysErr;

      const dayIds = days.map((d) => d.id);
      const { data: exercises, error: exErr } = await supabase
        .from('workout_exercises')
        .select('*')
        .in('workout_day_id', dayIds.length ? dayIds : ['00000000-0000-0000-0000-000000000000'])
        .order('sort_order');
      if (exErr) throw exErr;

      const exIds = exercises.map((e) => e.id);
      const { data: setsTpl, error: setsErr } = await supabase
        .from('workout_sets')
        .select('*')
        .in('workout_exercise_id', exIds.length ? exIds : ['00000000-0000-0000-0000-000000000000'])
        .order('set_number');
      if (setsErr) throw setsErr;

      const { data: logs, error: logErr } = await supabase
        .from('workout_logs')
        .select('*')
        .in('workout_exercise_id', exIds.length ? exIds : ['00000000-0000-0000-0000-000000000000'])
        .eq('date', todayStr());
      if (logErr) throw logErr;

      const logByKey = new Map((logs as WorkoutLog[]).map((l) => [`${l.workout_exercise_id}:${l.set_number}`, l]));
      const setsByExId = new Map<string, WorkoutSet[]>();
      for (const s of setsTpl as WorkoutSet[]) {
        const list = setsByExId.get(s.workout_exercise_id) ?? [];
        list.push(s);
        setsByExId.set(s.workout_exercise_id, list);
      }

      return (days as WorkoutDay[]).map((d) => ({
        ...d,
        exercises: (exercises as WorkoutExercise[])
          .filter((e) => e.workout_day_id === d.id)
          .map((e) => ({
            ...e,
            sets: (setsByExId.get(e.id) ?? []).map((s) => {
              const log = logByKey.get(`${e.id}:${s.set_number}`);
              return {
                setId: s.id,
                setNumber: s.set_number,
                templateRepCount: s.rep_count,
                templateKg: s.kg,
                repCount: log?.rep_count ?? s.rep_count,
                kg: log?.kg ?? s.kg,
                done: log?.done ?? false,
              };
            }),
          })),
      })) as WorkoutDayWithRows[];
    },
    enabled: !!clientId && !!programId,
  });
}

// Geçmiş antrenmanları tarih bazında gruplar — her tarih için o gün işlenen setlerin listesi.
// "Geçen sefer" özeti ve genişletilebilir set geçmişi için kullanılır.
export type ExerciseSession = { date: string; sets: WorkoutLog[] };

export function useExerciseHistory(clientId: string | undefined, exerciseIds: string[]) {
  const key = exerciseIds.slice().sort().join(',');
  return useQuery({
    queryKey: ['exercise_history', clientId, key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .in('workout_exercise_id', exerciseIds)
        .lt('date', todayStr())
        .order('date', { ascending: false })
        .order('set_number', { ascending: true });
      if (error) throw error;
      const byExercise = new Map<string, Map<string, WorkoutLog[]>>();
      for (const log of data as WorkoutLog[]) {
        const dateMap = byExercise.get(log.workout_exercise_id) ?? new Map<string, WorkoutLog[]>();
        const list = dateMap.get(log.date) ?? [];
        list.push(log);
        dateMap.set(log.date, list);
        byExercise.set(log.workout_exercise_id, dateMap);
      }
      const result = new Map<string, ExerciseSession[]>();
      for (const [exId, dateMap] of byExercise) {
        const sessions = Array.from(dateMap.entries())
          .map(([date, sets]) => ({ date, sets }))
          .sort((a, b) => b.date.localeCompare(a.date));
        result.set(exId, sessions);
      }
      return result;
    },
    enabled: !!clientId && exerciseIds.length > 0,
  });
}

// Bir tarihte tamamlanmış olarak işaretlenmiş tüm egzersizleri (gün/grup adıyla birlikte) döner —
// "Program Geçmişi" panelinde bir tarih seçildiğinde o gün ne yapıldığını göstermek için kullanılır.
export function useWorkoutLogsForDate(clientId: string | undefined, date: string | undefined) {
  return useQuery({
    queryKey: ['workout_logs_for_date', clientId, date],
    queryFn: async () => {
      const { data: days, error: daysErr } = await supabase.from('workout_days').select('id').eq('client_id', clientId);
      if (daysErr) throw daysErr;
      const dayIds = days.map((d) => d.id);
      const { data: exercises, error: exErr } = await supabase
        .from('workout_exercises')
        .select('*')
        .in('workout_day_id', dayIds.length ? dayIds : ['00000000-0000-0000-0000-000000000000']);
      if (exErr) throw exErr;
      const exIds = exercises.map((e) => e.id);
      const { data: logs, error: logErr } = await supabase
        .from('workout_logs')
        .select('*')
        .in('workout_exercise_id', exIds.length ? exIds : ['00000000-0000-0000-0000-000000000000'])
        .eq('date', date)
        .eq('done', true);
      if (logErr) throw logErr;
      const exById = new Map((exercises as WorkoutExercise[]).map((e) => [e.id, e]));
      return (logs as WorkoutLog[])
        .map((l) => ({ log: l, exercise: exById.get(l.workout_exercise_id) }))
        .filter((r): r is { log: WorkoutLog; exercise: WorkoutExercise } => !!r.exercise);
    },
    enabled: !!clientId && !!date,
  });
}

export function useUpdateSetLog(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      exerciseId: string;
      setNumber: number;
      current: { repCount: number; kg: number; done: boolean };
      patch: Partial<{ repCount: number; kg: number; done: boolean }>;
    }) => {
      const next = { ...input.current, ...input.patch };
      const { error } = await supabase.from('workout_logs').upsert(
        {
          workout_exercise_id: input.exerciseId,
          date: todayStr(),
          set_number: input.setNumber,
          rep_count: next.repCount,
          kg: next.kg,
          done: next.done,
        },
        { onConflict: 'workout_exercise_id,date,set_number' }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout', clientId] });
      // Bu set, Ders Defteri/Program Geçmişi'nin okuduğu aynı workout_logs tarih aralığına
      // düşebilir (nadir ama mümkün) — o sorguları da tazeleyelim.
      qc.invalidateQueries({ queryKey: ['workout_logs_for_date'] });
      qc.invalidateQueries({ queryKey: ['lesson_day_workout'] });
    },
  });
}

// ---------- Workout program editing (trainer) ----------

export function useAddWorkoutDay(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { program_id: string; day_key: string; label: string; sort_order: number }) => {
      if (!clientId) throw new Error('clientId eksik');
      const { data, error } = await supabase.from('workout_days').insert({ client_id: clientId, ...input }).select().single();
      if (error) throw error;
      return data as WorkoutDay;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout', clientId] });
      qc.invalidateQueries({ queryKey: ['workout_days_list', clientId] });
    },
  });
}

export function useUpdateWorkoutDay(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; day_key: string; label: string }) => {
      const { id, ...patch } = input;
      const { error } = await supabase.from('workout_days').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout', clientId] });
      qc.invalidateQueries({ queryKey: ['workout_days_list', clientId] });
    },
  });
}

export function useUpdateWorkoutDayNotes(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; notes: string }) => {
      const { error } = await supabase.from('workout_days').update({ notes: input.notes }).eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout', clientId] });
      qc.invalidateQueries({ queryKey: ['workout_days_list', clientId] });
    },
  });
}

export function useDeleteWorkoutDay(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dayId: string) => {
      const { error } = await supabase.from('workout_days').delete().eq('id', dayId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout', clientId] });
      qc.invalidateQueries({ queryKey: ['workout_days_list', clientId] });
    },
  });
}

export function useAddExercise(clientId: string | undefined, trainerId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      workout_day_id: string;
      ex: string;
      grp: string;
      set_count: number;
      rep_count: number;
      kg: number;
      sort_order: number;
    }) => {
      const { data: ex, error } = await supabase
        .from('workout_exercises')
        .insert({ workout_day_id: input.workout_day_id, ex: input.ex, grp: input.grp, sort_order: input.sort_order })
        .select()
        .single();
      if (error) throw error;
      const sets = Array.from({ length: Math.max(1, input.set_count) }, (_, i) => ({
        workout_exercise_id: ex.id,
        set_number: i + 1,
        rep_count: input.rep_count,
        kg: input.kg,
      }));
      const { error: setsErr } = await supabase.from('workout_sets').insert(sets);
      if (setsErr) throw setsErr;
      if (trainerId && input.ex.trim()) {
        await supabase
          .from('exercise_library')
          .upsert({ trainer_id: trainerId, name: input.ex.trim(), grp: input.grp }, { onConflict: 'trainer_id,name' });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout', clientId] });
      qc.invalidateQueries({ queryKey: ['exercise_library', trainerId] });
      qc.invalidateQueries({ queryKey: ['lesson_day_workout'] });
      qc.invalidateQueries({ queryKey: ['workout_logs_for_date'] });
    },
  });
}

export function useExerciseLibrary(trainerId: string | undefined) {
  return useQuery({
    queryKey: ['exercise_library', trainerId],
    queryFn: async () => {
      const { data, error } = await supabase.from('exercise_library').select('*').eq('trainer_id', trainerId).order('name');
      if (error) throw error;
      return data as LibraryExercise[];
    },
    enabled: !!trainerId,
  });
}

const DEFAULT_EXERCISE_LIBRARY: { name: string; grp: string }[] = [
  { name: 'Bench Press', grp: 'Göğüs' },
  { name: 'Incline DB Press', grp: 'Göğüs (Üst)' },
  { name: 'Cable Fly', grp: 'Göğüs' },
  { name: 'Dips', grp: 'Göğüs/Triceps' },
  { name: 'Push-up', grp: 'Göğüs' },
  { name: 'Barbell Row', grp: 'Sırt' },
  { name: 'Lat Pulldown', grp: 'Sırt (Kanat)' },
  { name: 'Seated Cable Row', grp: 'Sırt (Orta)' },
  { name: 'Pull-up', grp: 'Sırt' },
  { name: 'Deadlift', grp: 'Sırt/Bacak' },
  { name: 'Squat', grp: 'Bacak' },
  { name: 'Romanian Deadlift', grp: 'Bacak (Arka)' },
  { name: 'Leg Press', grp: 'Bacak' },
  { name: 'Leg Curl', grp: 'Bacak (Arka)' },
  { name: 'Leg Extension', grp: 'Bacak (Ön)' },
  { name: 'Calf Raise', grp: 'Baldır' },
  { name: 'Lunge', grp: 'Bacak' },
  { name: 'Overhead Press', grp: 'Omuz' },
  { name: 'Lateral Raise', grp: 'Omuz' },
  { name: 'Front Raise', grp: 'Omuz' },
  { name: 'Face Pull', grp: 'Omuz (Arka)' },
  { name: 'Arnold Press', grp: 'Omuz' },
  { name: 'Barbell Curl', grp: 'Biceps' },
  { name: 'Hammer Curl', grp: 'Biceps' },
  { name: 'Cable Curl', grp: 'Biceps' },
  { name: 'Triceps Pushdown', grp: 'Triceps' },
  { name: 'Skull Crusher', grp: 'Triceps' },
  { name: 'Plank', grp: 'Karın' },
  { name: 'Crunch', grp: 'Karın' },
  { name: 'Hanging Leg Raise', grp: 'Karın' },
  { name: 'Cable Crunch', grp: 'Karın' },
  { name: 'Russian Twist', grp: 'Karın' },
];

export function useSeedExerciseLibrary(trainerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!trainerId) throw new Error('trainerId eksik');
      const rows = DEFAULT_EXERCISE_LIBRARY.map((e) => ({ trainer_id: trainerId, name: e.name, grp: e.grp }));
      const { error } = await supabase.from('exercise_library').upsert(rows, { onConflict: 'trainer_id,name' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercise_library', trainerId] }),
  });
}

export function useUpdateExercise(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; ex: string; grp: string }) => {
      const { id, ...patch } = input;
      const { error } = await supabase.from('workout_exercises').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout', clientId] });
      qc.invalidateQueries({ queryKey: ['lesson_day_workout'] });
    },
  });
}

export function useDeleteExercise(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (exerciseId: string) => {
      const { error } = await supabase.from('workout_exercises').delete().eq('id', exerciseId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout', clientId] });
      qc.invalidateQueries({ queryKey: ['lesson_day_workout'] });
      qc.invalidateQueries({ queryKey: ['workout_logs_for_date'] });
    },
  });
}

export function useAddSet(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { workout_exercise_id: string; rep_count: number; kg: number }) => {
      // set_number is picked here (not passed in) so a deleted set's number is never reused —
      // workout_logs history for that exercise can reference set numbers no longer present in
      // the current workout_sets template, and reusing one would silently resurrect old log data.
      const [{ data: setRows, error: setErr }, { data: logRows, error: logErr }] = await Promise.all([
        supabase
          .from('workout_sets')
          .select('set_number')
          .eq('workout_exercise_id', input.workout_exercise_id)
          .order('set_number', { ascending: false })
          .limit(1),
        supabase
          .from('workout_logs')
          .select('set_number')
          .eq('workout_exercise_id', input.workout_exercise_id)
          .order('set_number', { ascending: false })
          .limit(1),
      ]);
      if (setErr) throw setErr;
      if (logErr) throw logErr;
      const nextSetNumber = Math.max(setRows?.[0]?.set_number ?? 0, logRows?.[0]?.set_number ?? 0) + 1;
      const { error } = await supabase
        .from('workout_sets')
        .insert({ workout_exercise_id: input.workout_exercise_id, set_number: nextSetNumber, rep_count: input.rep_count, kg: input.kg });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout', clientId] });
      qc.invalidateQueries({ queryKey: ['lesson_day_workout'] });
    },
  });
}

export function useUpdateSetTarget(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; rep_count: number; kg: number }) => {
      const { id, ...patch } = input;
      const { error } = await supabase.from('workout_sets').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout', clientId] });
      qc.invalidateQueries({ queryKey: ['lesson_day_workout'] });
    },
  });
}

export function useDeleteSet(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workout_sets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout', clientId] });
      qc.invalidateQueries({ queryKey: ['lesson_day_workout'] });
    },
  });
}

// Başka bir günün egzersiz + set şablonlarını hedef güne kopyalar (mevcutların yanına eklenir,
// üzerine yazmaz) — aynı antrenmanı elle tekrar yazmamak için.
export function useCopyDayExercises(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { from_day_id: string; to_day_id: string }) => {
      const { data: exercises, error: exErr } = await supabase
        .from('workout_exercises')
        .select('*')
        .eq('workout_day_id', input.from_day_id)
        .order('sort_order');
      if (exErr) throw exErr;
      if (!exercises.length) return;

      const exIds = exercises.map((e) => e.id);
      const { data: sets, error: setsErr } = await supabase
        .from('workout_sets')
        .select('*')
        .in('workout_exercise_id', exIds)
        .order('set_number');
      if (setsErr) throw setsErr;

      const setsByExId = new Map<string, WorkoutSet[]>();
      for (const s of sets as WorkoutSet[]) {
        const list = setsByExId.get(s.workout_exercise_id) ?? [];
        list.push(s);
        setsByExId.set(s.workout_exercise_id, list);
      }

      for (const ex of exercises as WorkoutExercise[]) {
        const { data: newEx, error: insErr } = await supabase
          .from('workout_exercises')
          .insert({ workout_day_id: input.to_day_id, ex: ex.ex, grp: ex.grp, sort_order: ex.sort_order })
          .select()
          .single();
        if (insErr) throw insErr;
        const srcSets = setsByExId.get(ex.id) ?? [];
        if (srcSets.length) {
          const { error: setInsErr } = await supabase.from('workout_sets').insert(
            srcSets.map((s) => ({ workout_exercise_id: newEx.id, set_number: s.set_number, rep_count: s.rep_count, kg: s.kg }))
          );
          if (setInsErr) throw setInsErr;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout', clientId] });
      qc.invalidateQueries({ queryKey: ['lesson_day_workout'] });
    },
  });
}

// ---------- Ders Defteri ----------
// Program → Gün sekmesi → "bugünün antrenmanı" akışının yerini alan, sabit sayıda
// numaralı ders (sayfa) modeli. Her ders bir güne (workout_day) ve sabit bir tarihe
// (log_date) bağlanır; loglama mevcut workout_logs tablosunu, sadece todayStr() yerine
// o dersin log_date'ini kullanarak paylaşır.

export type ProgramLessonWithDay = ProgramLesson & { day_label: string | null };

export function useProgramLessons(clientId: string | undefined, programId: string | undefined) {
  return useQuery({
    queryKey: ['program_lessons', clientId, programId],
    queryFn: async () => {
      const { data: lessons, error } = await supabase
        .from('program_lessons')
        .select('*')
        .eq('program_id', programId)
        .order('lesson_number');
      if (error) throw error;

      const dayIds = Array.from(
        new Set((lessons as ProgramLesson[]).map((l) => l.workout_day_id).filter((id): id is string => !!id))
      );
      let dayLabelById = new Map<string, string>();
      if (dayIds.length) {
        const { data: days, error: daysErr } = await supabase.from('workout_days').select('id, label').in('id', dayIds);
        if (daysErr) throw daysErr;
        dayLabelById = new Map((days as { id: string; label: string }[]).map((d) => [d.id, d.label]));
      }
      return (lessons as ProgramLesson[]).map((l) => ({
        ...l,
        day_label: l.workout_day_id ? dayLabelById.get(l.workout_day_id) ?? null : null,
      })) as ProgramLessonWithDay[];
    },
    enabled: !!clientId && !!programId,
  });
}

export function useCreateProgramLessons(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { program_id: string; count: number }) => {
      if (!clientId) throw new Error('clientId eksik');
      const { data: existing, error: existErr } = await supabase
        .from('program_lessons')
        .select('lesson_number')
        .eq('program_id', input.program_id)
        .order('lesson_number', { ascending: false })
        .limit(1);
      if (existErr) throw existErr;
      const start = (existing?.[0]?.lesson_number ?? 0) + 1;
      const rows = Array.from({ length: input.count }, (_, i) => ({
        client_id: clientId,
        program_id: input.program_id,
        lesson_number: start + i,
      }));
      const { error } = await supabase.from('program_lessons').insert(rows);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['program_lessons', clientId, vars.program_id] }),
  });
}

export function useAssignLessonDay(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; program_id: string; workout_day_id: string; log_date: string | null }) => {
      const patch: { workout_day_id: string; log_date?: string } = { workout_day_id: input.workout_day_id };
      if (!input.log_date) patch.log_date = todayStr();
      const { error } = await supabase.from('program_lessons').update(patch).eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['program_lessons', clientId, vars.program_id] }),
  });
}

export function useToggleLessonComplete(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; program_id: string; completed: boolean }) => {
      const { error } = await supabase
        .from('program_lessons')
        .update({ completed: input.completed, completed_at: input.completed ? new Date().toISOString() : null })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['program_lessons', clientId, vars.program_id] }),
  });
}

export function useDeleteProgramLesson(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; program_id: string }) => {
      const { error } = await supabase.from('program_lessons').delete().eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['program_lessons', clientId, vars.program_id] }),
  });
}

// Bir günün egzersiz + set şablonlarını, verilen sabit log_date'e ait workout_logs ile
// birleştirir — useWorkout'un tek-güne indirgenmiş hâli (SetCard'ın beklediği
// WorkoutExercise & { sets: SetRow[] } biçimini birebir döner).
export function useLessonDayWorkout(clientId: string | undefined, dayId: string | undefined, logDate: string | undefined) {
  return useQuery({
    queryKey: ['lesson_day_workout', clientId, dayId, logDate],
    queryFn: async () => {
      const { data: exercises, error: exErr } = await supabase
        .from('workout_exercises')
        .select('*')
        .eq('workout_day_id', dayId)
        .order('sort_order');
      if (exErr) throw exErr;

      const exIds = exercises.map((e) => e.id);
      const { data: setsTpl, error: setsErr } = await supabase
        .from('workout_sets')
        .select('*')
        .in('workout_exercise_id', exIds.length ? exIds : ['00000000-0000-0000-0000-000000000000'])
        .order('set_number');
      if (setsErr) throw setsErr;

      const { data: logs, error: logErr } = await supabase
        .from('workout_logs')
        .select('*')
        .in('workout_exercise_id', exIds.length ? exIds : ['00000000-0000-0000-0000-000000000000'])
        .eq('date', logDate);
      if (logErr) throw logErr;

      const logByKey = new Map((logs as WorkoutLog[]).map((l) => [`${l.workout_exercise_id}:${l.set_number}`, l]));
      const setsByExId = new Map<string, WorkoutSet[]>();
      for (const s of setsTpl as WorkoutSet[]) {
        const list = setsByExId.get(s.workout_exercise_id) ?? [];
        list.push(s);
        setsByExId.set(s.workout_exercise_id, list);
      }

      return (exercises as WorkoutExercise[]).map((e) => ({
        ...e,
        sets: (setsByExId.get(e.id) ?? []).map((s) => {
          const log = logByKey.get(`${e.id}:${s.set_number}`);
          return {
            setId: s.id,
            setNumber: s.set_number,
            templateRepCount: s.rep_count,
            templateKg: s.kg,
            repCount: log?.rep_count ?? s.rep_count,
            kg: log?.kg ?? s.kg,
            done: log?.done ?? false,
          };
        }),
      })) as (WorkoutExercise & { sets: SetRow[] })[];
    },
    enabled: !!clientId && !!dayId && !!logDate,
  });
}

// useUpdateSetLog ile aynı, sadece todayStr() yerine dersin sabit log_date'i kullanılır.
export function useUpdateLessonSetLog(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      exerciseId: string;
      date: string;
      setNumber: number;
      current: { repCount: number; kg: number; done: boolean };
      patch: Partial<{ repCount: number; kg: number; done: boolean }>;
    }) => {
      const next = { ...input.current, ...input.patch };
      const { error } = await supabase.from('workout_logs').upsert(
        {
          workout_exercise_id: input.exerciseId,
          date: input.date,
          set_number: input.setNumber,
          rep_count: next.repCount,
          kg: next.kg,
          done: next.done,
        },
        { onConflict: 'workout_exercise_id,date,set_number' }
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lesson_day_workout', clientId] }),
  });
}

// ---------- Nutrition ----------

export type MealWithItems = Meal & { items: (MealItem & { todayQty: number })[] };

export function useMeals(clientId: string | undefined) {
  return useQuery({
    queryKey: ['meals', clientId, todayStr()],
    queryFn: async () => {
      const { data: meals, error: mealsErr } = await supabase
        .from('meals')
        .select('*')
        .eq('client_id', clientId)
        .is('plan_date', null)
        .order('sort_order');
      if (mealsErr) throw mealsErr;

      const mealIds = meals.map((m) => m.id);
      const { data: items, error: itemsErr } = await supabase
        .from('meal_items')
        .select('*')
        .in('meal_id', mealIds.length ? mealIds : ['00000000-0000-0000-0000-000000000000'])
        .order('sort_order');
      if (itemsErr) throw itemsErr;

      const itemIds = items.map((i) => i.id);
      const { data: logs, error: logsErr } = await supabase
        .from('meal_logs')
        .select('*')
        .in('meal_item_id', itemIds.length ? itemIds : ['00000000-0000-0000-0000-000000000000'])
        .eq('date', todayStr());
      if (logsErr) throw logsErr;

      // No log for today means "not marked eaten yet" — starts at 0, not the planned default_qty,
      // so the daily macro totals reflect what was actually logged rather than the whole plan.
      const qtyByItemId = new Map((logs as MealLog[]).map((l) => [l.meal_item_id, l.qty]));
      return (meals as Meal[]).map((m) => ({
        ...m,
        items: (items as MealItem[])
          .filter((i) => i.meal_id === m.id)
          .map((i) => ({ ...i, todayQty: qtyByItemId.get(i.id) ?? 0 })),
      })) as MealWithItems[];
    },
    enabled: !!clientId,
  });
}

export function useUpdateMealQty(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { mealItemId: string; qty: number }) => {
      const { error } = await supabase
        .from('meal_logs')
        .upsert({ meal_item_id: input.mealItemId, date: todayStr(), qty: input.qty }, { onConflict: 'meal_item_id,date' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meals', clientId, todayStr()] }),
  });
}

// ---------- Nutrition program editing (trainer) ----------

export function useAddMeal(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; sort_order: number; plan_date?: string }) => {
      if (!clientId) throw new Error('clientId eksik');
      const { error } = await supabase.from('meals').insert({ client_id: clientId, ...input });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meals', clientId] });
      qc.invalidateQueries({ queryKey: ['meals_month', clientId] });
    },
  });
}

export function useDeleteMeal(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mealId: string) => {
      const { error } = await supabase.from('meals').delete().eq('id', mealId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meals', clientId] });
      qc.invalidateQueries({ queryKey: ['meals_month', clientId] });
    },
  });
}

export function useAddMealItem(clientId: string | undefined, trainerId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      meal_id: string;
      food: string;
      unit: string;
      kcal: number;
      p: number;
      k: number;
      y: number;
      default_qty: number;
      sort_order: number;
    }) => {
      const { error } = await supabase.from('meal_items').insert(input);
      if (error) throw error;
      if (trainerId && input.food.trim()) {
        await supabase.from('food_library').upsert(
          { trainer_id: trainerId, food: input.food.trim(), unit: input.unit, kcal: input.kcal, p: input.p, k: input.k, y: input.y },
          { onConflict: 'trainer_id,food' }
        );
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meals', clientId] });
      qc.invalidateQueries({ queryKey: ['meals_month', clientId] });
      qc.invalidateQueries({ queryKey: ['food_library', trainerId] });
    },
  });
}

export function useFoodLibrary(trainerId: string | undefined) {
  return useQuery({
    queryKey: ['food_library', trainerId],
    queryFn: async () => {
      const { data, error } = await supabase.from('food_library').select('*').eq('trainer_id', trainerId).order('food');
      if (error) throw error;
      return data as LibraryFood[];
    },
    enabled: !!trainerId,
  });
}

const DEFAULT_FOOD_LIBRARY: { food: string; unit: string; kcal: number; p: number; k: number; y: number }[] = [
  { food: 'Yumurta (haşlanmış)', unit: 'adet', kcal: 70, p: 6, k: 1, y: 5 },
  { food: 'Yulaf Ezmesi 60 g', unit: 'porsiyon', kcal: 230, p: 8, k: 40, y: 4 },
  { food: 'Tavuk Göğsü (ızgara) 100 g', unit: 'porsiyon', kcal: 165, p: 31, k: 0, y: 4 },
  { food: 'Pirinç (pişmiş) 100 g', unit: 'porsiyon', kcal: 130, p: 3, k: 28, y: 0 },
  { food: 'Somon (fırın) 120 g', unit: 'porsiyon', kcal: 230, p: 25, k: 0, y: 14 },
  { food: 'Yoğurt (yağsız) 200 g', unit: 'porsiyon', kcal: 120, p: 12, k: 16, y: 0 },
  { food: 'Muz', unit: 'adet', kcal: 105, p: 1, k: 27, y: 0 },
  { food: 'Elma', unit: 'adet', kcal: 95, p: 0, k: 25, y: 0 },
  { food: 'Badem 15 g', unit: 'porsiyon', kcal: 90, p: 3, k: 3, y: 8 },
  { food: 'Beyaz Peynir 30 g', unit: 'porsiyon', kcal: 80, p: 6, k: 1, y: 6 },
  { food: 'Tam Buğday Ekmek', unit: 'dilim', kcal: 80, p: 3, k: 15, y: 1 },
  { food: 'Süt (yağsız) 250 ml', unit: 'porsiyon', kcal: 90, p: 9, k: 12, y: 0 },
  { food: 'Protein Tozu (whey)', unit: 'ölçek', kcal: 120, p: 24, k: 3, y: 1 },
  { food: 'Zeytinyağı', unit: 'yemek kaşığı', kcal: 120, p: 0, k: 0, y: 14 },
  { food: 'Kinoa (pişmiş) 100 g', unit: 'porsiyon', kcal: 120, p: 4, k: 21, y: 2 },
  { food: 'Ton Balığı (suda) 100 g', unit: 'porsiyon', kcal: 116, p: 26, k: 0, y: 1 },
  { food: 'Avokado', unit: 'adet', kcal: 240, p: 3, k: 12, y: 22 },
  { food: 'Brokoli (buharda) 100 g', unit: 'porsiyon', kcal: 35, p: 2, k: 7, y: 0 },
  { food: 'Tatlı Patates 150 g', unit: 'porsiyon', kcal: 130, p: 2, k: 30, y: 0 },
  { food: 'Mercimek (pişmiş) 100 g', unit: 'porsiyon', kcal: 116, p: 9, k: 20, y: 0 },
];

export function useSeedFoodLibrary(trainerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!trainerId) throw new Error('trainerId eksik');
      const rows = DEFAULT_FOOD_LIBRARY.map((f) => ({ trainer_id: trainerId, ...f }));
      const { error } = await supabase.from('food_library').upsert(rows, { onConflict: 'trainer_id,food' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['food_library', trainerId] }),
  });
}

export function useUpdateMealItem(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      food: string;
      unit: string;
      kcal: number;
      p: number;
      k: number;
      y: number;
      default_qty: number;
    }) => {
      const { id, ...patch } = input;
      const { error } = await supabase.from('meal_items').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meals', clientId] });
      qc.invalidateQueries({ queryKey: ['meals_month', clientId] });
    },
  });
}

export function useDeleteMealItem(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mealItemId: string) => {
      const { error } = await supabase.from('meal_items').delete().eq('id', mealItemId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meals', clientId] });
      qc.invalidateQueries({ queryKey: ['meals_month', clientId] });
    },
  });
}

export type MealWithPlannedTotals = Meal & { items: MealItem[]; kcal: number; p: number; k: number; y: number };

// Aylık Beslenme Planı: takvim ayına ait meals satırlarını (plan_date dolu) besinleriyle
// birlikte tek seferde çeker; günlere göre gruplama bileşende yapılır.
export function useMonthlyMealPlan(clientId: string | undefined, year: number, month: number) {
  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const monthEnd = localDateStr(new Date(year, month + 1, 0));
  return useQuery({
    queryKey: ['meals_month', clientId, year, month],
    queryFn: async () => {
      const { data: meals, error: mealsErr } = await supabase
        .from('meals')
        .select('*')
        .eq('client_id', clientId)
        .not('plan_date', 'is', null)
        .gte('plan_date', monthStart)
        .lte('plan_date', monthEnd)
        .order('sort_order');
      if (mealsErr) throw mealsErr;

      const mealIds = meals.map((m) => m.id);
      const { data: items, error: itemsErr } = await supabase
        .from('meal_items')
        .select('*')
        .in('meal_id', mealIds.length ? mealIds : ['00000000-0000-0000-0000-000000000000'])
        .order('sort_order');
      if (itemsErr) throw itemsErr;

      return (meals as Meal[]).map((m) => {
        const mealItems = (items as MealItem[]).filter((i) => i.meal_id === m.id);
        const totals = mealItems.reduce(
          (a, i) => ({
            kcal: a.kcal + i.kcal * i.default_qty,
            p: a.p + i.p * i.default_qty,
            k: a.k + i.k * i.default_qty,
            y: a.y + i.y * i.default_qty,
          }),
          { kcal: 0, p: 0, k: 0, y: 0 }
        );
        return { ...m, items: mealItems, ...totals } as MealWithPlannedTotals;
      });
    },
    enabled: !!clientId,
  });
}

// ---------- Check-ins ----------

export function useLatestCheckin(clientId: string | undefined) {
  return useQuery({
    queryKey: ['checkin', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checkins')
        .select('*')
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Checkin | null;
    },
    enabled: !!clientId,
  });
}

export function useCheckinsInRange(clientId: string | undefined, days: number) {
  return useQuery({
    queryKey: ['checkins_range', clientId, days],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data, error } = await supabase
        .from('checkins')
        .select('*')
        .eq('client_id', clientId)
        .gte('date', localDateStr(since))
        .order('date');
      if (error) throw error;
      return data as Checkin[];
    },
    enabled: !!clientId,
  });
}

export function useSaveCheckin(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Checkin, 'id' | 'client_id' | 'date'>) => {
      if (!clientId) throw new Error('clientId eksik');
      const { error } = await supabase
        .from('checkins')
        .upsert({ client_id: clientId, date: todayStr(), ...input }, { onConflict: 'client_id,date' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checkin', clientId] }),
  });
}

// ---------- Payments ----------

export function usePayments(clientId: string | undefined) {
  return useQuery({
    queryKey: ['payments', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from('payments').select('*').eq('client_id', clientId).order('date', { ascending: false });
      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!clientId,
  });
}

export function useAddPayment(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { date: string; amount: number; note: string; paid: boolean }) => {
      if (!clientId) throw new Error('clientId eksik');
      const { error } = await supabase.from('payments').insert({ client_id: clientId, ...input });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments', clientId] }),
  });
}

export function useUpdatePayment(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; date: string; amount: number; note: string }) => {
      const { id, ...patch } = input;
      const { error } = await supabase.from('payments').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments', clientId] }),
  });
}

export function useTogglePaymentPaid(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; paid: boolean }) => {
      const { error } = await supabase.from('payments').update({ paid: input.paid }).eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments', clientId] }),
  });
}

export function useDeletePayment(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('payments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments', clientId] }),
  });
}

// ---------- Measurements & Photos ----------

export function useMeasurements(clientId: string | undefined) {
  return useQuery({
    queryKey: ['measurements', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from('measurements').select('*').eq('client_id', clientId).order('date');
      if (error) throw error;
      return data as Measurement[];
    },
    enabled: !!clientId,
  });
}

export function useLogMeasurement(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      chest: number | null;
      waist: number | null;
      hip: number | null;
      shoulder: number | null;
      arm_left: number | null;
      arm_right: number | null;
      thigh_left: number | null;
      thigh_right: number | null;
      calf: number | null;
      date?: string;
    }) => {
      if (!clientId) throw new Error('clientId eksik');
      const { date, ...rest } = input;
      const { error } = await supabase
        .from('measurements')
        .upsert({ client_id: clientId, date: date ?? todayStr(), ...rest }, { onConflict: 'client_id,date' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['measurements', clientId] }),
  });
}

export function useProgressPhotos(clientId: string | undefined) {
  return useQuery({
    queryKey: ['progress_photos', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progress_photos')
        .select('*')
        .eq('client_id', clientId)
        .order('date', { ascending: false });
      if (error) throw error;
      const photos = data as ProgressPhoto[];
      if (!photos.length) return [];
      const { data: signed, error: signErr } = await supabase.storage
        .from('progress-photos')
        .createSignedUrls(
          photos.map((p) => p.storage_path),
          3600
        );
      if (signErr) throw signErr;
      return photos.map((p, i) => ({ ...p, url: signed[i]?.signedUrl ?? null }));
    },
    enabled: !!clientId,
  });
}

export function useUploadProgressPhoto(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { uri: string; mimeType?: string; note?: string }) => {
      if (!clientId) throw new Error('clientId eksik');
      const ext = input.mimeType?.split('/')[1] ?? input.uri.split('.').pop() ?? 'jpg';
      const path = `${clientId}/${Date.now()}.${ext}`;
      // Local file:// URIs are unreliable with fetch().arrayBuffer() on native; read via File instead.
      const uploadable =
        Platform.OS === 'web' ? await fetch(input.uri).then((res) => res.arrayBuffer()) : await new File(input.uri).arrayBuffer();
      const { error: uploadErr } = await supabase.storage
        .from('progress-photos')
        .upload(path, uploadable, { contentType: input.mimeType ?? 'image/jpeg' });
      if (uploadErr) throw uploadErr;
      const { error } = await supabase
        .from('progress_photos')
        .insert({ client_id: clientId, date: todayStr(), storage_path: path, note: input.note ?? '' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['progress_photos', clientId] }),
  });
}

export function useDeleteProgressPhoto(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (photo: ProgressPhoto) => {
      // Önce DB satırını sil: storage silme başarısız olursa sadece kullanılmayan bir dosya
      // kalır (zararsız); sıra ters olsaydı, dosyası silinmiş ama satırı duran bir kayıt
      // kalırdı ve UI o fotoğraf için kırık bir imza URL'i göstermeye çalışırdı.
      const { error } = await supabase.from('progress_photos').delete().eq('id', photo.id);
      if (error) throw error;
      await supabase.storage.from('progress-photos').remove([photo.storage_path]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['progress_photos', clientId] }),
  });
}

// ---------- PR & Güç Takibi ----------

export function usePrLogs(clientId: string | undefined) {
  return useQuery({
    queryKey: ['pr_logs', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pr_logs')
        .select('*')
        .eq('client_id', clientId)
        .order('date', { ascending: false });
      if (error) throw error;
      return data as PrLog[];
    },
    enabled: !!clientId,
  });
}

export function useAddPrLog(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { exercise: string; weight: number; reps: number }) => {
      if (!clientId) throw new Error('clientId eksik');
      const { error } = await supabase
        .from('pr_logs')
        .upsert({ client_id: clientId, date: todayStr(), ...input }, { onConflict: 'client_id,exercise,date' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pr_logs', clientId] }),
  });
}

export function useDeletePrLog(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pr_logs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pr_logs', clientId] }),
  });
}

// ---------- Kardiyo & Adım ----------

export function useCardioLogs(clientId: string | undefined, days = 7) {
  return useQuery({
    queryKey: ['cardio_logs', clientId, days],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - (days - 1));
      const { data, error } = await supabase
        .from('cardio_logs')
        .select('*')
        .eq('client_id', clientId)
        .gte('date', localDateStr(since))
        .order('date', { ascending: false });
      if (error) throw error;
      return data as CardioLog[];
    },
    enabled: !!clientId,
  });
}

export function useLogCardio(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { cardio_type: string; duration_minutes: number; distance_km: number; steps: number; calories: number }) => {
      if (!clientId) throw new Error('clientId eksik');
      const { error } = await supabase
        .from('cardio_logs')
        .upsert({ client_id: clientId, date: todayStr(), ...input }, { onConflict: 'client_id,date' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cardio_logs', clientId] }),
  });
}

// ---------- Takviye Planı ----------

export function useSupplementItems(clientId: string | undefined) {
  return useQuery({
    queryKey: ['supplement_items', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from('supplement_items').select('*').eq('client_id', clientId).order('sort_order');
      if (error) throw error;
      return data as SupplementItem[];
    },
    enabled: !!clientId,
  });
}

export function useAddSupplementItem(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; dose: string; timing: string; sort_order: number }) => {
      if (!clientId) throw new Error('clientId eksik');
      const { error } = await supabase.from('supplement_items').insert({ client_id: clientId, ...input });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['supplement_items', clientId] }),
  });
}

export function useDeleteSupplementItem(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('supplement_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['supplement_items', clientId] }),
  });
}

// ---------- Alışveriş Listesi ----------

export function useShoppingItems(clientId: string | undefined) {
  return useQuery({
    queryKey: ['shopping_items', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from('shopping_items').select('*').eq('client_id', clientId).order('sort_order');
      if (error) throw error;
      return data as ShoppingItem[];
    },
    enabled: !!clientId,
  });
}

export function useAddShoppingItem(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; quantity: string; sort_order: number }) => {
      if (!clientId) throw new Error('clientId eksik');
      const { error } = await supabase.from('shopping_items').insert({ client_id: clientId, ...input });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping_items', clientId] }),
  });
}

export function useToggleShoppingItem(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; checked: boolean }) => {
      const { error } = await supabase.from('shopping_items').update({ checked: input.checked }).eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping_items', clientId] }),
  });
}

export function useDeleteShoppingItem(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shopping_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping_items', clientId] }),
  });
}

// ---------- Sakatlık & Mobilite ----------

export function useInjuryLogs(clientId: string | undefined) {
  return useQuery({
    queryKey: ['injury_logs', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('injury_logs')
        .select('*')
        .eq('client_id', clientId)
        .order('date', { ascending: false });
      if (error) throw error;
      return data as InjuryLog[];
    },
    enabled: !!clientId,
  });
}

export function useAddInjuryLog(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { body_part: string; severity: number; note: string }) => {
      if (!clientId) throw new Error('clientId eksik');
      const { error } = await supabase.from('injury_logs').insert({ client_id: clientId, date: todayStr(), ...input });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['injury_logs', clientId] }),
  });
}

export function useDeleteInjuryLog(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('injury_logs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['injury_logs', clientId] }),
  });
}

// ---------- Seans Takvimi ----------

export function useSessionLogs(clientId: string | undefined, days = 14) {
  return useQuery({
    queryKey: ['session_logs', clientId, days],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data, error } = await supabase
        .from('session_logs')
        .select('*')
        .eq('client_id', clientId)
        .gte('date', localDateStr(since))
        .order('date')
        .order('time', { ascending: true, nullsFirst: true });
      if (error) throw error;
      return data as SessionLog[];
    },
    enabled: !!clientId,
  });
}

export function useSessionHistory(clientId: string | undefined) {
  return useQuery({
    queryKey: ['session_history', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_logs')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'tamamlandi')
        .order('date', { ascending: false })
        .order('time', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as SessionLog[];
    },
    enabled: !!clientId,
  });
}

export function useAddSessionLog(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { date: string; time: string | null; status: 'tamamlandi' | 'atlandi'; workout_day_id: string | null }) => {
      if (!clientId) throw new Error('clientId eksik');
      const { error } = await supabase.from('session_logs').insert({ client_id: clientId, ...input });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session_logs', clientId] });
      qc.invalidateQueries({ queryKey: ['session_history', clientId] });
      qc.invalidateQueries({ queryKey: ['completed_sessions_since', clientId] });
      // Ödemeler'den seans eklenince Panel'in haftalık takvimi/raporu da tazelensin — bunlar
      // trainerId ile önbelleğe alındığı ve bu hook trainerId almadığı için önek eşleşmesiyle
      // (tüm trainer'lar) geniş invalidate ediyoruz; tek eğitmenli kullanımda zararsız.
      qc.invalidateQueries({ queryKey: ['session_logs_week'] });
      qc.invalidateQueries({ queryKey: ['weekly_completed_sessions'] });
    },
  });
}

export function useDeleteSessionLog(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('session_logs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session_logs', clientId] });
      qc.invalidateQueries({ queryKey: ['session_history', clientId] });
      qc.invalidateQueries({ queryKey: ['completed_sessions_since', clientId] });
      qc.invalidateQueries({ queryKey: ['session_logs_week'] });
      qc.invalidateQueries({ queryKey: ['weekly_completed_sessions'] });
    },
  });
}

// ---------- Paket Takip ----------

export function usePackages(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client_packages', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_packages')
        .select('*')
        .eq('client_id', clientId)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data as ClientPackage[];
    },
    enabled: !!clientId,
  });
}

export function useAddPackage(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; total_sessions: number; note: string }) => {
      if (!clientId) throw new Error('clientId eksik');
      const { error } = await supabase.from('client_packages').insert({ client_id: clientId, ...input });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client_packages', clientId] }),
  });
}

export function useDeletePackage(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('client_packages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client_packages', clientId] }),
  });
}

export function useCompletedSessionsSince(clientId: string | undefined, sinceDate: string | undefined) {
  return useQuery({
    queryKey: ['completed_sessions_since', clientId, sinceDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_logs')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'tamamlandi')
        .gte('date', sinceDate)
        .order('date', { ascending: false });
      if (error) throw error;
      return data as SessionLog[];
    },
    enabled: !!clientId && !!sinceDate,
  });
}

// ---------- Bildirimler ----------

export function useNotifications(profileId: string | undefined) {
  return useQuery({
    queryKey: ['notifications', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as AppNotification[];
    },
    enabled: !!profileId,
    refetchInterval: 60_000,
  });
}

export function useUnreadNotificationCount(profileId: string | undefined) {
  return useQuery({
    queryKey: ['notifications_unread_count', profileId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', profileId)
        .eq('read', false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!profileId,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead(profileId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', profileId] });
      qc.invalidateQueries({ queryKey: ['notifications_unread_count', profileId] });
    },
  });
}

export function useMarkAllNotificationsRead(profileId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!profileId) throw new Error('profileId eksik');
      const { error } = await supabase.from('notifications').update({ read: true }).eq('profile_id', profileId).eq('read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', profileId] });
      qc.invalidateQueries({ queryKey: ['notifications_unread_count', profileId] });
    },
  });
}

// ---------- Beslenme Notları ----------

export function useNutritionNotes(clientId: string | undefined) {
  return useQuery({
    queryKey: ['nutrition_notes', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nutrition_notes')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as NutritionNote[];
    },
    enabled: !!clientId,
  });
}

export function useAddNutritionNote(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (note: string) => {
      if (!clientId) throw new Error('clientId eksik');
      const { error } = await supabase.from('nutrition_notes').insert({ client_id: clientId, note });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nutrition_notes', clientId] }),
  });
}

export function useDeleteNutritionNote(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('nutrition_notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nutrition_notes', clientId] }),
  });
}

// ---------- Aylık Değerlendirme Anketi ----------

export function useWellnessSurveys(clientId: string | undefined) {
  return useQuery({
    queryKey: ['wellness_surveys', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wellness_surveys')
        .select('*')
        .eq('client_id', clientId)
        .order('period', { ascending: false });
      if (error) throw error;
      return data as WellnessSurvey[];
    },
    enabled: !!clientId,
  });
}

export function useSaveWellnessSurvey(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { period: string; name: string; answers: Record<string, number>; comment: string }) => {
      if (!clientId) throw new Error('clientId eksik');
      const { error } = await supabase
        .from('wellness_surveys')
        .upsert({ client_id: clientId, updated_at: new Date().toISOString(), ...input }, { onConflict: 'client_id,period' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wellness_surveys', clientId] }),
  });
}

// ---------- Haftalık Ders Takvimi ----------

export type LessonScheduleEntryWithClient = LessonScheduleEntry & { clientName: string };

export function useLessonSchedule(trainerId: string | undefined, weekStart: string, weekEnd: string) {
  return useQuery({
    queryKey: ['lesson_schedule', trainerId, weekStart, weekEnd],
    queryFn: async () => {
      const { data: entries, error } = await supabase
        .from('lesson_schedule')
        .select('*')
        .eq('trainer_id', trainerId)
        .gte('date', weekStart)
        .lte('date', weekEnd)
        .order('date')
        .order('time');
      if (error) throw error;
      const clientIds = Array.from(new Set((entries as LessonScheduleEntry[]).map((e) => e.client_id)));
      const { data: clients, error: clErr } = await supabase
        .from('clients')
        .select('id, name')
        .in('id', clientIds.length ? clientIds : ['00000000-0000-0000-0000-000000000000']);
      if (clErr) throw clErr;
      const nameById = new Map((clients as { id: string; name: string }[]).map((c) => [c.id, c.name]));
      return (entries as LessonScheduleEntry[]).map((e) => ({ ...e, clientName: nameById.get(e.client_id) ?? '—' })) as LessonScheduleEntryWithClient[];
    },
    enabled: !!trainerId,
  });
}

export function useAddLessonEntry(trainerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { client_id: string; date: string; time: string }) => {
      if (!trainerId) throw new Error('trainerId eksik');
      const { error } = await supabase.from('lesson_schedule').insert({ trainer_id: trainerId, ...input });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lesson_schedule', trainerId] }),
  });
}

export function useDeleteLessonEntry(trainerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lesson_schedule').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lesson_schedule', trainerId] }),
  });
}

// Haftalık Ders Takvimi'nde her ders satırının yanında hızlı "Seans Kullan" butonu göstermek için:
// trainer'ın o haftaki TÜM danışanlarının tamamlanmış seanslarını tek sorguda getirir, ekranda
// client_id+date eşleşmesiyle "zaten kullanıldı mı" kontrolü yapılır.
export function useSessionLogsForWeek(trainerId: string | undefined, weekStart: string, weekEnd: string) {
  return useQuery({
    queryKey: ['session_logs_week', trainerId, weekStart, weekEnd],
    queryFn: async () => {
      const { data: clients, error: clErr } = await supabase.from('clients').select('id').eq('trainer_id', trainerId);
      if (clErr) throw clErr;
      const clientIds = (clients as { id: string }[]).map((c) => c.id);
      if (clientIds.length === 0) return [];
      const { data, error } = await supabase
        .from('session_logs')
        .select('*')
        .in('client_id', clientIds)
        .eq('status', 'tamamlandi')
        .gte('date', weekStart)
        .lte('date', weekEnd);
      if (error) throw error;
      return data as SessionLog[];
    },
    enabled: !!trainerId,
  });
}

// Ders takvimindeki bir satırdan tek dokunuşla seansı "tamamlandı" işaretler — Ödemeler'deki
// paket sayacı aynı session_logs tablosundan beslendiği için otomatik düşer.
export function useLogSessionFromSchedule(trainerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { client_id: string; date: string; time: string | null }) => {
      const { error } = await supabase
        .from('session_logs')
        .insert({ client_id: input.client_id, date: input.date, time: input.time, status: 'tamamlandi', workout_day_id: null });
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ['session_logs', input.client_id] });
      qc.invalidateQueries({ queryKey: ['session_history', input.client_id] });
      qc.invalidateQueries({ queryKey: ['completed_sessions_since', input.client_id] });
      qc.invalidateQueries({ queryKey: ['session_logs_week', trainerId] });
      qc.invalidateQueries({ queryKey: ['weekly_completed_sessions', trainerId] });
    },
  });
}

export function useUnlogSessionFromSchedule(trainerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; client_id: string }) => {
      const { error } = await supabase.from('session_logs').delete().eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ['session_logs', input.client_id] });
      qc.invalidateQueries({ queryKey: ['session_history', input.client_id] });
      qc.invalidateQueries({ queryKey: ['completed_sessions_since', input.client_id] });
      qc.invalidateQueries({ queryKey: ['session_logs_week', trainerId] });
      qc.invalidateQueries({ queryKey: ['weekly_completed_sessions', trainerId] });
    },
  });
}

// ---------- Eğitmen Raporu (tüm danışanlar genelinde toplu istatistik) ----------

export function useWeeklyCompletedSessionCount(trainerId: string | undefined, weekStart: string, weekEnd: string) {
  return useQuery({
    queryKey: ['weekly_completed_sessions', trainerId, weekStart, weekEnd],
    queryFn: async () => {
      const { data: clients, error: clErr } = await supabase.from('clients').select('id').eq('trainer_id', trainerId);
      if (clErr) throw clErr;
      const clientIds = (clients as { id: string }[]).map((c) => c.id);
      if (clientIds.length === 0) return 0;
      const { count, error } = await supabase
        .from('session_logs')
        .select('id', { count: 'exact', head: true })
        .in('client_id', clientIds)
        .eq('status', 'tamamlandi')
        .gte('date', weekStart)
        .lte('date', weekEnd);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!trainerId,
  });
}

export type MonthlyPaymentsSummary = { total: number; paid: number; pending: number };

export function useMonthlyPaymentsSummary(trainerId: string | undefined, monthStart: string, monthEnd: string) {
  return useQuery({
    queryKey: ['monthly_payments_summary', trainerId, monthStart, monthEnd],
    queryFn: async () => {
      const { data: clients, error: clErr } = await supabase.from('clients').select('id').eq('trainer_id', trainerId);
      if (clErr) throw clErr;
      const clientIds = (clients as { id: string }[]).map((c) => c.id);
      if (clientIds.length === 0) return { total: 0, paid: 0, pending: 0 } as MonthlyPaymentsSummary;
      const { data, error } = await supabase
        .from('payments')
        .select('amount, paid')
        .in('client_id', clientIds)
        .gte('date', monthStart)
        .lte('date', monthEnd);
      if (error) throw error;
      const rows = data as { amount: number; paid: boolean }[];
      const paid = rows.filter((r) => r.paid).reduce((a, r) => a + r.amount, 0);
      const pending = rows.filter((r) => !r.paid).reduce((a, r) => a + r.amount, 0);
      return { total: paid + pending, paid, pending } as MonthlyPaymentsSummary;
    },
    enabled: !!trainerId,
  });
}

// ---------- Hesap Silme ----------

export function useDeleteOwnAccount() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('delete_own_account');
      if (error) throw error;
    },
  });
}
