-- Takviye Planı + Alışveriş Listesi

create table public.supplement_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  dose text not null default '',
  timing text not null default '',
  sort_order int not null default 0
);

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  quantity text not null default '',
  checked boolean not null default false,
  sort_order int not null default 0
);

alter table public.supplement_items enable row level security;
alter table public.shopping_items enable row level security;

create policy "supplement_items_trainer" on public.supplement_items
  for all using (public.is_trainer_of_client(client_id)) with check (public.is_trainer_of_client(client_id));
create policy "supplement_items_client" on public.supplement_items
  for all using (public.is_owner_client(client_id)) with check (public.is_owner_client(client_id));

create policy "shopping_items_trainer" on public.shopping_items
  for all using (public.is_trainer_of_client(client_id)) with check (public.is_trainer_of_client(client_id));
create policy "shopping_items_client" on public.shopping_items
  for all using (public.is_owner_client(client_id)) with check (public.is_owner_client(client_id));
