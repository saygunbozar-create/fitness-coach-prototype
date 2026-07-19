-- Kardiyo & Adım: daily cardio session + step count

create table public.cardio_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  date date not null default current_date,
  cardio_type text not null default '',
  duration_minutes numeric not null default 0,
  distance_km numeric not null default 0,
  steps int not null default 0,
  calories numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (client_id, date)
);

alter table public.cardio_logs enable row level security;

create policy "cardio_logs_trainer" on public.cardio_logs
  for all using (public.is_trainer_of_client(client_id)) with check (public.is_trainer_of_client(client_id));
create policy "cardio_logs_client" on public.cardio_logs
  for all using (public.is_owner_client(client_id)) with check (public.is_owner_client(client_id));
