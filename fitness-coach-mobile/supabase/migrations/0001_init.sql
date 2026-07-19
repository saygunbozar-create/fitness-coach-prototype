-- Fitness Coach — initial schema, RLS policies, and signup-linking trigger

create extension if not exists pgcrypto;

-- ============================================================
-- TABLES
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('trainer', 'client')),
  name text not null,
  trainer_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  email text not null,
  name text not null,
  goal text not null default 'Yağ Yakımı',
  start_weight numeric not null default 0,
  kcal_target numeric not null default 0,
  tdee numeric not null default 0,
  macro_p numeric not null default 0,
  macro_k numeric not null default 0,
  macro_y numeric not null default 0,
  pr numeric not null default 0,
  status text not null default 'pending' check (status in ('pending', 'active')),
  created_at timestamptz not null default now(),
  unique (trainer_id, email)
);

create table public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  date date not null default current_date,
  weight numeric not null,
  created_at timestamptz not null default now(),
  unique (client_id, date)
);

create table public.workout_days (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  day_key text not null,
  label text not null,
  sort_order int not null default 0,
  unique (client_id, day_key)
);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_day_id uuid not null references public.workout_days (id) on delete cascade,
  ex text not null,
  grp text not null default '',
  set_count int not null default 3,
  rep_count int not null default 10,
  kg numeric not null default 0,
  sort_order int not null default 0
);

create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  date date not null default current_date,
  set_count int not null,
  rep_count int not null,
  kg numeric not null,
  done boolean not null default false,
  unique (workout_exercise_id, date)
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  sort_order int not null default 0
);

create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals (id) on delete cascade,
  food text not null,
  unit text not null default 'porsiyon',
  kcal numeric not null default 0,
  p numeric not null default 0,
  k numeric not null default 0,
  y numeric not null default 0,
  default_qty numeric not null default 1,
  sort_order int not null default 0
);

create table public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  meal_item_id uuid not null references public.meal_items (id) on delete cascade,
  date date not null default current_date,
  qty numeric not null,
  unique (meal_item_id, date)
);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  date date not null default current_date,
  uyku int not null,
  enerji int not null,
  aclik int not null,
  stres int not null,
  motivasyon int not null,
  unique (client_id, date)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  date date not null default current_date,
  amount numeric not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

-- ============================================================
-- HELPER FUNCTIONS (used by RLS policies)
-- ============================================================

create function public.is_trainer_of_client(p_client_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.clients
    where id = p_client_id and trainer_id = auth.uid()
  );
$$;

create function public.is_owner_client(p_client_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.clients
    where id = p_client_id and profile_id = auth.uid()
  );
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.weight_logs enable row level security;
alter table public.workout_days enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_logs enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.meal_logs enable row level security;
alter table public.checkins enable row level security;
alter table public.payments enable row level security;

-- profiles: users see their own profile; trainers see their clients' profiles
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());
create policy "profiles_select_as_trainer" on public.profiles
  for select using (trainer_id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- clients: trainer manages their own client rows; linked client can read their own row
create policy "clients_all_as_trainer" on public.clients
  for all using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());
create policy "clients_select_own" on public.clients
  for select using (profile_id = auth.uid());

-- generic pattern for client-scoped child tables: trainer full access, client read/write own logs
create policy "weight_logs_trainer" on public.weight_logs
  for all using (public.is_trainer_of_client(client_id)) with check (public.is_trainer_of_client(client_id));
create policy "weight_logs_client" on public.weight_logs
  for all using (public.is_owner_client(client_id)) with check (public.is_owner_client(client_id));

create policy "workout_days_trainer" on public.workout_days
  for all using (public.is_trainer_of_client(client_id)) with check (public.is_trainer_of_client(client_id));
create policy "workout_days_client_read" on public.workout_days
  for select using (public.is_owner_client(client_id));

create policy "workout_exercises_trainer" on public.workout_exercises
  for all using (public.is_trainer_of_client((select client_id from public.workout_days where id = workout_day_id)))
  with check (public.is_trainer_of_client((select client_id from public.workout_days where id = workout_day_id)));
create policy "workout_exercises_client_read" on public.workout_exercises
  for select using (public.is_owner_client((select client_id from public.workout_days where id = workout_day_id)));

create policy "workout_logs_trainer" on public.workout_logs
  for all using (public.is_trainer_of_client((select client_id from public.workout_days wd join public.workout_exercises we on we.workout_day_id = wd.id where we.id = workout_exercise_id)))
  with check (public.is_trainer_of_client((select client_id from public.workout_days wd join public.workout_exercises we on we.workout_day_id = wd.id where we.id = workout_exercise_id)));
create policy "workout_logs_client" on public.workout_logs
  for all using (public.is_owner_client((select client_id from public.workout_days wd join public.workout_exercises we on we.workout_day_id = wd.id where we.id = workout_exercise_id)))
  with check (public.is_owner_client((select client_id from public.workout_days wd join public.workout_exercises we on we.workout_day_id = wd.id where we.id = workout_exercise_id)));

create policy "meals_trainer" on public.meals
  for all using (public.is_trainer_of_client(client_id)) with check (public.is_trainer_of_client(client_id));
create policy "meals_client_read" on public.meals
  for select using (public.is_owner_client(client_id));

create policy "meal_items_trainer" on public.meal_items
  for all using (public.is_trainer_of_client((select client_id from public.meals where id = meal_id)))
  with check (public.is_trainer_of_client((select client_id from public.meals where id = meal_id)));
create policy "meal_items_client_read" on public.meal_items
  for select using (public.is_owner_client((select client_id from public.meals where id = meal_id)));

create policy "meal_logs_trainer" on public.meal_logs
  for all using (public.is_trainer_of_client((select client_id from public.meals m join public.meal_items mi on mi.meal_id = m.id where mi.id = meal_item_id)))
  with check (public.is_trainer_of_client((select client_id from public.meals m join public.meal_items mi on mi.meal_id = m.id where mi.id = meal_item_id)));
create policy "meal_logs_client" on public.meal_logs
  for all using (public.is_owner_client((select client_id from public.meals m join public.meal_items mi on mi.meal_id = m.id where mi.id = meal_item_id)))
  with check (public.is_owner_client((select client_id from public.meals m join public.meal_items mi on mi.meal_id = m.id where mi.id = meal_item_id)));

create policy "checkins_trainer" on public.checkins
  for all using (public.is_trainer_of_client(client_id)) with check (public.is_trainer_of_client(client_id));
create policy "checkins_client" on public.checkins
  for all using (public.is_owner_client(client_id)) with check (public.is_owner_client(client_id));

create policy "payments_trainer" on public.payments
  for all using (public.is_trainer_of_client(client_id)) with check (public.is_trainer_of_client(client_id));
create policy "payments_client_read" on public.payments
  for select using (public.is_owner_client(client_id));

-- ============================================================
-- SIGNUP LINKING TRIGGER
-- Trainer adds a pending client row by email BEFORE the client signs up.
-- When that email creates an auth user with role='client' in its metadata,
-- this trigger creates their profile and links it to the matching client row.
-- ============================================================

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(new.raw_user_meta_data ->> 'role', 'client');
  v_name text := coalesce(new.raw_user_meta_data ->> 'name', new.email);
  v_client_id uuid;
  v_trainer_id uuid;
begin
  if v_role = 'client' then
    select id, trainer_id into v_client_id, v_trainer_id
    from public.clients
    where email = new.email and profile_id is null
    limit 1;

    insert into public.profiles (id, role, name, trainer_id)
    values (new.id, 'client', v_name, v_trainer_id);

    if v_client_id is not null then
      update public.clients
      set profile_id = new.id, status = 'active'
      where id = v_client_id;
    end if;
  else
    insert into public.profiles (id, role, name)
    values (new.id, 'trainer', v_name);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
