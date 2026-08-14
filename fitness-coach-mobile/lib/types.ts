export type Role = 'trainer' | 'client';

export type Profile = {
  id: string;
  role: Role;
  name: string;
  trainer_id: string | null;
  consent_accepted_at: string | null;
  plan_tier: string;
  brand_name: string | null;
  language: string;
  // Apple/Google Takvim aboneliği için kişiye özel gizli anahtar (bkz. migration 0067).
  // Adresin kendisi kimlik doğrulama görevi görüyor, o yüzden paylaşılmamalı; Ayarlar'dan
  // yenilenince eski adres anında geçersiz olur.
  calendar_token: string;
  // Rezervasyon sisteminin açılacağı an (migration 0069). NULL = her zaman açık.
  // Sadece danışanı kısıtlar; antrenör açılıştan önce de elle ders ekleyebilir.
  booking_opens_at: string | null;
};

export type PlanTier = {
  tier: string;
  label: string;
  client_limit: number | null;
  sort_order: number;
};

export type Message = {
  id: string;
  trainer_id: string;
  client_id: string;
  sender_role: Role;
  body: string;
  created_at: string;
};

export type IntakeForm = {
  id: string;
  client_id: string;
  parq_answers: Record<string, boolean>;
  health_notes: string;
  waiver_signature_name: string;
  submitted_at: string;
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
  is_active: boolean;
  birthday: string | null;
  height: number;
  gender: string;
  // Eğitmenin danışan eklerken seçtiği dil: başlangıç şablonunun dilini ve danışan kaydolduğunda
  // profiles.language'in başlangıç değerini belirler (bkz. migration 0065).
  language: string;
};

export type WeightLog = { id: string; client_id: string; date: string; weight: number };

export type WorkoutProgram = { id: string; client_id: string; name: string; shared: boolean; sort_order: number; created_at: string };

export type WorkoutDay = {
  id: string;
  client_id: string;
  program_id: string;
  day_key: string;
  label: string;
  sort_order: number;
  notes: string | null;
};

export type WorkoutExercise = {
  id: string;
  workout_day_id: string;
  ex: string;
  grp: string;
  sort_order: number;
};

export type WorkoutSet = {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  rep_count: number;
  kg: number;
};

export type WorkoutLog = {
  id: string;
  workout_exercise_id: string;
  date: string;
  set_number: number;
  rep_count: number;
  kg: number;
  done: boolean;
};

export type ProgramLesson = {
  id: string;
  client_id: string;
  program_id: string;
  lesson_number: number;
  workout_day_id: string | null;
  log_date: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
};

export type Meal = { id: string; client_id: string; name: string; sort_order: number; plan_date: string | null };

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
  shoulder: number | null;
  arm_left: number | null;
  arm_right: number | null;
  thigh_left: number | null;
  thigh_right: number | null;
  calf: number | null;
  // Eski tek taraflı alanlar — artık yazılmıyor, sadece eski kayıtlarda okunabilir kalsın diye tipte duruyor.
  arm: number | null;
  thigh: number | null;
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

export type SessionLog = {
  id: string;
  client_id: string;
  date: string;
  time: string | null;
  workout_day_id: string | null;
  status: 'tamamlandi' | 'atlandi';
  note: string;
};

export type NutritionNote = {
  id: string;
  client_id: string;
  note: string;
  created_at: string;
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

export type WellnessSurvey = {
  id: string;
  client_id: string;
  period: string;
  name: string;
  answers: Record<string, number>;
  comment: string;
  created_at: string;
  updated_at: string;
};

export type LessonScheduleEntry = {
  id: string;
  trainer_id: string;
  client_id: string;
  date: string;
  time: string;
  notified: boolean;
  created_at: string;
  booked_by_client: boolean;
  // Danışanın önerdiği yeni tarih/saat — antrenör onaylayana kadar randevu taşınmaz
  // (bkz. migration 0066). Onaylanınca date/time'a taşınır ve bu alanlar temizlenir.
  pending_date: string | null;
  pending_time: string | null;
  pending_requested_at: string | null;
};

export type RescheduleRequest = LessonScheduleEntry & { client_name: string | null };

export type AvailabilityRule = {
  id: string;
  trainer_id: string;
  days_of_week: number[]; // 1=Pazartesi .. 7=Pazar
  start_time: string;
  end_time: string;
  session_minutes: number;
  start_date: string;
  end_date: string;
  created_at: string;
};

export type AvailabilityException = {
  id: string;
  trainer_id: string;
  date: string;
  start_time: string;
  end_time: string;
  note: string;
  created_at: string;
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
