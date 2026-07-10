import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import type {
  CardioLog,
  Checkin,
  Client,
  InjuryLog,
  LibraryExercise,
  LibraryFood,
  Meal,
  MealItem,
  MealLog,
  Measurement,
  Payment,
  PeriodizationPhase,
  PrLog,
  ProgressPhoto,
  SessionLog,
  ShoppingItem,
  SupplementItem,
  WeightLog,
  WorkoutDay,
  WorkoutExercise,
  WorkoutLog,
} from './types';

const todayStr = () => new Date().toISOString().slice(0, 10);

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

async function seedClientDefaults(clientId: string) {
  for (const [i, day] of DEFAULT_WORKOUT.entries()) {
    const { data: dayRow, error: dayErr } = await supabase
      .from('workout_days')
      .insert({ client_id: clientId, day_key: day.day_key, label: day.label, sort_order: i })
      .select()
      .single();
    if (dayErr) throw dayErr;
    const rows = day.rows.map((r, j) => ({ ...r, workout_day_id: dayRow.id, sort_order: j }));
    const { error: exErr } = await supabase.from('workout_exercises').insert(rows);
    if (exErr) throw exErr;
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
    }) => {
      if (!trainerId) throw new Error('trainerId eksik');
      const { data, error } = await supabase
        .from('clients')
        .insert({ ...input, trainer_id: trainerId })
        .select()
        .single();
      if (error) throw error;
      await seedClientDefaults(data.id);
      return data as Client;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients', trainerId] }),
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
    mutationFn: async (weight: number) => {
      if (!clientId) throw new Error('clientId eksik');
      const { error } = await supabase
        .from('weight_logs')
        .upsert({ client_id: clientId, date: todayStr(), weight }, { onConflict: 'client_id,date' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['weight_logs', clientId] }),
  });
}

// ---------- Workout ----------

export type WorkoutDayWithRows = WorkoutDay & { exercises: (WorkoutExercise & { todayLog: WorkoutLog | null })[] };

export function useWorkout(clientId: string | undefined) {
  return useQuery({
    queryKey: ['workout', clientId, todayStr()],
    queryFn: async () => {
      const { data: days, error: daysErr } = await supabase
        .from('workout_days')
        .select('*')
        .eq('client_id', clientId)
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
      const { data: logs, error: logErr } = await supabase
        .from('workout_logs')
        .select('*')
        .in('workout_exercise_id', exIds.length ? exIds : ['00000000-0000-0000-0000-000000000000'])
        .eq('date', todayStr());
      if (logErr) throw logErr;

      const logByExId = new Map((logs as WorkoutLog[]).map((l) => [l.workout_exercise_id, l]));
      return (days as WorkoutDay[]).map((d) => ({
        ...d,
        exercises: (exercises as WorkoutExercise[])
          .filter((e) => e.workout_day_id === d.id)
          .map((e) => ({ ...e, todayLog: logByExId.get(e.id) ?? null })),
      })) as WorkoutDayWithRows[];
    },
    enabled: !!clientId,
  });
}

export function useUpdateWorkoutLog(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      exercise: WorkoutExercise;
      currentLog: WorkoutLog | null;
      patch: Partial<Pick<WorkoutLog, 'set_count' | 'rep_count' | 'kg' | 'done'>>;
    }) => {
      const base = input.currentLog ?? {
        set_count: input.exercise.set_count,
        rep_count: input.exercise.rep_count,
        kg: input.exercise.kg,
        done: false,
      };
      const next = { ...base, ...input.patch };
      const { error } = await supabase.from('workout_logs').upsert(
        {
          workout_exercise_id: input.exercise.id,
          date: todayStr(),
          set_count: next.set_count,
          rep_count: next.rep_count,
          kg: next.kg,
          done: next.done,
        },
        { onConflict: 'workout_exercise_id,date' }
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout', clientId, todayStr()] }),
  });
}

// ---------- Workout program editing (trainer) ----------

export function useAddWorkoutDay(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { day_key: string; label: string; sort_order: number }) => {
      if (!clientId) throw new Error('clientId eksik');
      const { error } = await supabase.from('workout_days').insert({ client_id: clientId, ...input });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout', clientId] }),
  });
}

export function useDeleteWorkoutDay(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dayId: string) => {
      const { error } = await supabase.from('workout_days').delete().eq('id', dayId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout', clientId] }),
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
      const { error } = await supabase.from('workout_exercises').insert(input);
      if (error) throw error;
      if (trainerId && input.ex.trim()) {
        await supabase
          .from('exercise_library')
          .upsert({ trainer_id: trainerId, name: input.ex.trim(), grp: input.grp }, { onConflict: 'trainer_id,name' });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout', clientId] });
      qc.invalidateQueries({ queryKey: ['exercise_library', trainerId] });
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

export function useUpdateExercise(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      ex: string;
      grp: string;
      set_count: number;
      rep_count: number;
      kg: number;
    }) => {
      const { id, ...patch } = input;
      const { error } = await supabase.from('workout_exercises').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout', clientId] }),
  });
}

export function useDeleteExercise(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (exerciseId: string) => {
      const { error } = await supabase.from('workout_exercises').delete().eq('id', exerciseId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout', clientId] }),
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

      const qtyByItemId = new Map((logs as MealLog[]).map((l) => [l.meal_item_id, l.qty]));
      return (meals as Meal[]).map((m) => ({
        ...m,
        items: (items as MealItem[])
          .filter((i) => i.meal_id === m.id)
          .map((i) => ({ ...i, todayQty: qtyByItemId.get(i.id) ?? i.default_qty })),
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
    mutationFn: async (input: { name: string; sort_order: number }) => {
      if (!clientId) throw new Error('clientId eksik');
      const { error } = await supabase.from('meals').insert({ client_id: clientId, ...input });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meals', clientId] }),
  });
}

export function useDeleteMeal(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mealId: string) => {
      const { error } = await supabase.from('meals').delete().eq('id', mealId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meals', clientId] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meals', clientId] }),
  });
}

export function useDeleteMealItem(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mealItemId: string) => {
      const { error } = await supabase.from('meal_items').delete().eq('id', mealItemId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meals', clientId] }),
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
        .gte('date', since.toISOString().slice(0, 10))
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
    mutationFn: async (input: { chest: number; waist: number; hip: number; arm: number; thigh: number; calf: number }) => {
      if (!clientId) throw new Error('clientId eksik');
      const { error } = await supabase
        .from('measurements')
        .upsert({ client_id: clientId, date: todayStr(), ...input }, { onConflict: 'client_id,date' });
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
      const arraybuffer = await fetch(input.uri).then((res) => res.arrayBuffer());
      const { error: uploadErr } = await supabase.storage
        .from('progress-photos')
        .upload(path, arraybuffer, { contentType: input.mimeType ?? 'image/jpeg' });
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
      await supabase.storage.from('progress-photos').remove([photo.storage_path]);
      const { error } = await supabase.from('progress_photos').delete().eq('id', photo.id);
      if (error) throw error;
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
      const { data, error } = await supabase
        .from('cardio_logs')
        .select('*')
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(days);
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

// ---------- Periyodizasyon ----------

export function usePeriodizationPhases(clientId: string | undefined) {
  return useQuery({
    queryKey: ['periodization_phases', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('periodization_phases')
        .select('*')
        .eq('client_id', clientId)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data as PeriodizationPhase[];
    },
    enabled: !!clientId,
  });
}

export function useAddPeriodizationPhase(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; start_date: string; end_date: string | null; note: string }) => {
      if (!clientId) throw new Error('clientId eksik');
      const { error } = await supabase.from('periodization_phases').insert({ client_id: clientId, ...input });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['periodization_phases', clientId] }),
  });
}

export function useDeletePeriodizationPhase(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('periodization_phases').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['periodization_phases', clientId] }),
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
        .gte('date', since.toISOString().slice(0, 10))
        .order('date');
      if (error) throw error;
      return data as SessionLog[];
    },
    enabled: !!clientId,
  });
}

export function useSetSessionStatus(clientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { date: string; status: 'tamamlandi' | 'atlandi'; workout_day_id: string | null }) => {
      if (!clientId) throw new Error('clientId eksik');
      const { error } = await supabase
        .from('session_logs')
        .upsert({ client_id: clientId, ...input }, { onConflict: 'client_id,date' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['session_logs', clientId] }),
  });
}
