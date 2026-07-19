-- "Set Kartları" tasarımı: her egzersiz artık tek bir set_count/rep_count/kg üçlüsü yerine,
-- her biri kendi tekrar/kg hedefi olan ayrı ayrı setlerden oluşuyor (drop set desteği dahil).

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  set_number int not null,
  rep_count int not null,
  kg numeric not null,
  unique (workout_exercise_id, set_number)
);

alter table public.workout_sets enable row level security;

drop policy if exists "workout_sets_trainer" on public.workout_sets;
create policy "workout_sets_trainer" on public.workout_sets
  for all using (public.is_trainer_of_client((select wd.client_id from public.workout_days wd join public.workout_exercises we on we.workout_day_id = wd.id where we.id = workout_exercise_id)))
  with check (public.is_trainer_of_client((select wd.client_id from public.workout_days wd join public.workout_exercises we on we.workout_day_id = wd.id where we.id = workout_exercise_id)));
drop policy if exists "workout_sets_client_read" on public.workout_sets;
create policy "workout_sets_client_read" on public.workout_sets
  for select using (public.is_owner_client((select wd.client_id from public.workout_days wd join public.workout_exercises we on we.workout_day_id = wd.id where we.id = workout_exercise_id)));

-- Mevcut egzersizlerin set_count'unu N tane şablon set satırına aç (workout_exercises.set_count
-- bu noktada henüz silinmedi, aşağıda backfill bittikten sonra siliniyor).
insert into public.workout_sets (workout_exercise_id, set_number, rep_count, kg)
select we.id, gs, we.rep_count, we.kg
from public.workout_exercises we, generate_series(1, greatest(we.set_count, 1)) gs
where not exists (select 1 from public.workout_sets ws where ws.workout_exercise_id = we.id)
  and we.set_count is not null;

-- workout_logs artık set bazlı: her satır tek bir setin o günkü gerçekleşen değerini tutuyor.
alter table public.workout_logs add column if not exists set_number int not null default 1;

-- ÖNEMLİ: Eski unique(workout_exercise_id, date) kısıtını, alttaki set_number>=2 satırlarını
-- eklemeden ÖNCE kaldırıyoruz — yoksa aynı (egzersiz, tarih) çifti için ikinci satır eklerken
-- "duplicate key" hatası alınır (bir önceki denemede olan hata buydu).
do $$
declare con_name text;
begin
  select conname into con_name
  from pg_constraint
  where conrelid = 'public.workout_logs'::regclass and contype = 'u';
  if con_name is not null then
    execute format('alter table public.workout_logs drop constraint %I', con_name);
  end if;
end $$;

-- Mevcut kayıtları (bir egzersiz/gün için tek satır) set_count kadar satıra aç; ilk set zaten
-- mevcut satırın kendisi (set_number=1 varsayılan), 2..set_count için yeni satırlar ekleniyor.
insert into public.workout_logs (workout_exercise_id, date, set_number, set_count, rep_count, kg, done)
select wl.workout_exercise_id, wl.date, gs, 1, wl.rep_count, wl.kg, wl.done
from public.workout_logs wl
join public.workout_exercises we on we.id = wl.workout_exercise_id
cross join lateral generate_series(2, greatest(we.set_count, 1)) gs
where we.set_count > 1
  and not exists (
    select 1 from public.workout_logs wl2
    where wl2.workout_exercise_id = wl.workout_exercise_id and wl2.date = wl.date and wl2.set_number = gs
  );

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.workout_logs'::regclass and conname = 'workout_logs_exercise_date_set_key'
  ) then
    alter table public.workout_logs add constraint workout_logs_exercise_date_set_key unique (workout_exercise_id, date, set_number);
  end if;
end $$;

alter table public.workout_exercises drop column if exists set_count;
alter table public.workout_exercises drop column if exists rep_count;
alter table public.workout_exercises drop column if exists kg;

alter table public.workout_logs drop column if exists set_count;
