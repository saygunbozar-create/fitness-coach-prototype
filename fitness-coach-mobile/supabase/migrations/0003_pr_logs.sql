-- PR & Güç Takibi: per-exercise 1RM history

create table public.pr_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  exercise text not null,
  date date not null default current_date,
  weight numeric not null,
  reps int not null default 1,
  created_at timestamptz not null default now(),
  unique (client_id, exercise, date)
);

alter table public.pr_logs enable row level security;

create policy "pr_logs_trainer" on public.pr_logs
  for all using (public.is_trainer_of_client(client_id)) with check (public.is_trainer_of_client(client_id));
create policy "pr_logs_client" on public.pr_logs
  for all using (public.is_owner_client(client_id)) with check (public.is_owner_client(client_id));
