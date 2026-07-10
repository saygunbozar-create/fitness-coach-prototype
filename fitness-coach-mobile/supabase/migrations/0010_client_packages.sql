-- Paket Takip: danışanın satın aldığı seans paketleri (ör. "12 Seanslık Paket")

create table public.client_packages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  total_sessions int not null,
  start_date date not null default current_date,
  note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.client_packages enable row level security;

create policy "client_packages_trainer" on public.client_packages
  for all using (public.is_trainer_of_client(client_id)) with check (public.is_trainer_of_client(client_id));
create policy "client_packages_client" on public.client_packages
  for all using (public.is_owner_client(client_id)) with check (public.is_owner_client(client_id));
