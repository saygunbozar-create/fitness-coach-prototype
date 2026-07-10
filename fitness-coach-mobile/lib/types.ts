export type Role = 'trainer' | 'client';

export type Profile = {
  id: string;
  role: Role;
  name: string;
  trainer_id: string | null;
};

export type Client = {
  id: string;
  trainer_id: string;
  profile_id: string | null;
  email: string;
  name: string;
  goal: string;
  start_weight: number;
  kcal_target: number;
  tdee: number;
  macro_p: number;
  macro_k: number;
  macro_y: number;
  pr: number;
  status: 'pending' | 'active';
};

export type WeightLog = { id: string; client_id: string; date: string; weight: number };

export type WorkoutDay = { id: string; client_id: string; day_key: string; label: string; sort_order: number };

export type WorkoutExercise = {
  id: string;
  workout_day_id: string;
  ex: string;
  grp: string;
  set_count: number;
  rep_count: number;
  kg: number;
  sort_order: number;
};

export type WorkoutLog = {
  id: string;
  workout_exercise_id: string;
  date: string;
  set_count: number;
  rep_count: number;
  kg: number;
  done: boolean;
};

export type Meal = { id: string; client_id: string; name: string; sort_order: number };

export type MealItem = {
  id: string;
  meal_id: string;
  food: string;
  unit: string;
  kcal: number;
  p: number;
  k: number;
  y: number;
  default_qty: number;
  sort_order: number;
};

export type MealLog = { id: string; meal_item_id: string; date: string; qty: number };

export type Checkin = {
  id: string;
  client_id: string;
  date: string;
  uyku: number;
  enerji: number;
  aclik: number;
  stres: number;
  motivasyon: number;
};

export type Payment = { id: string; client_id: string; date: string; amount: number; note: string; paid: boolean };

export type Measurement = {
  id: string;
  client_id: string;
  date: string;
  chest: number | null;
  waist: number | null;
  hip: number | null;
  arm: number | null;
  thigh: number | null;
  calf: number | null;
};

export type ProgressPhoto = { id: string; client_id: string; date: string; storage_path: string; note: string };

export type PrLog = { id: string; client_id: string; exercise: string; date: string; weight: number; reps: number };

export type SupplementItem = { id: string; client_id: string; name: string; dose: string; timing: string; sort_order: number };

export type ShoppingItem = { id: string; client_id: string; name: string; quantity: string; checked: boolean; sort_order: number };

export type InjuryLog = { id: string; client_id: string; date: string; body_part: string; severity: number; note: string };

export type LibraryExercise = { id: string; trainer_id: string; name: string; grp: string };

export type LibraryFood = { id: string; trainer_id: string; food: string; unit: string; kcal: number; p: number; k: number; y: number };

export type ClientPackage = {
  id: string;
  client_id: string;
  name: string;
  total_sessions: number;
  start_date: string;
  note: string;
};

export type PeriodizationPhase = {
  id: string;
  client_id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  note: string;
};

export type SessionLog = {
  id: string;
  client_id: string;
  date: string;
  workout_day_id: string | null;
  status: 'tamamlandi' | 'atlandi';
  note: string;
};

export type CardioLog = {
  id: string;
  client_id: string;
  date: string;
  cardio_type: string;
  duration_minutes: number;
  distance_km: number;
  steps: number;
  calories: number;
};

export type AppNotification = {
  id: string;
  profile_id: string;
  type: string;
  title: string;
  body: string;
  client_id: string | null;
  read: boolean;
  created_at: string;
};
