-- Periyodizasyon: named training phases/blocks over a date range
-- Seans Takvimi: per-day session adherence (tamamlandı/atlandı), derived
-- from the trainer/client marking a calendar day rather than inferred from
-- individual exercise logs.

create table public.periodization_phases (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  start_date date not null default current_date,
  end_date date,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table public.session_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  date date not null default current_date,
  workout_day_id uuid references public.workout_days (id) on delete set null,
  status text not null check (status in ('tamamlandi', 'atlandi')),
  note text not null default '',
  unique (client_id, date)
);

alter table public.periodization_phases enable row level security;
alter table public.session_logs enable row level security;

create policy "periodization_phases_trainer" on public.periodization_phases
  for all using (public.is_trainer_of_client(client_id)) with check (public.is_trainer_of_client(client_id));
create policy "periodization_phases_client" on public.periodization_phases
  for all using (public.is_owner_client(client_id)) with check (public.is_owner_client(client_id));

create policy "session_logs_trainer" on public.session_logs
  for all using (public.is_trainer_of_client(client_id)) with check (public.is_trainer_of_client(client_id));
create policy "session_logs_client" on public.session_logs
  for all using (public.is_owner_client(client_id)) with check (public.is_owner_client(client_id));
