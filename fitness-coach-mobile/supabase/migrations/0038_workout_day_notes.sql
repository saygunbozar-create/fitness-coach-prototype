-- "Programı Düzenle" ekranında eğitmen artık her gün için yapılandırılmış egzersiz
-- kartları yerine (veya onlarla birlikte) serbest metin bir not da yazabiliyor —
-- ikisi bağımsız, birbirini silmiyor, eğitmen istediği günde istediğini kullanır.

alter table public.workout_days add column if not exists notes text;
