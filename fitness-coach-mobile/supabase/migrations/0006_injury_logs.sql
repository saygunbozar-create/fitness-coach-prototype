-- Sakatlık & Mobilite: dated notes about pain/mobility issues

create table public.injury_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  date date not null default current_date,
  body_part text not null,
  severity int not null default 3,
  note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.injury_logs enable row level security;

create policy "injury_logs_trainer" on public.injury_logs
  for all using (public.is_trainer_of_client(client_id)) with check (public.is_trainer_of_client(client_id));
create policy "injury_logs_client" on public.injury_logs
  for all using (public.is_owner_client(client_id)) with check (public.is_owner_client(client_id));
