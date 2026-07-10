-- Egzersiz & Besin Kütüphanesi: trainer-owned reusable lists, auto-populated
-- as exercises/food items are added while building client programs.

create table public.exercise_library (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  grp text not null default '',
  created_at timestamptz not null default now(),
  unique (trainer_id, name)
);

create table public.food_library (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  food text not null,
  unit text not null default 'porsiyon',
  kcal numeric not null default 0,
  p numeric not null default 0,
  k numeric not null default 0,
  y numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (trainer_id, food)
);

alter table public.exercise_library enable row level security;
alter table public.food_library enable row level security;

create policy "exercise_library_owner" on public.exercise_library
  for all using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());

create policy "food_library_owner" on public.food_library
  for all using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());
