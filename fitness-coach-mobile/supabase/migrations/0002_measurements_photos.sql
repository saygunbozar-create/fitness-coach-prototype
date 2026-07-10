-- Ölçüm & Fotoğraf: body measurements + progress photos (Supabase Storage)

create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  date date not null default current_date,
  chest numeric,
  waist numeric,
  hip numeric,
  arm numeric,
  thigh numeric,
  calf numeric,
  created_at timestamptz not null default now(),
  unique (client_id, date)
);

create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  date date not null default current_date,
  storage_path text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.measurements enable row level security;
alter table public.progress_photos enable row level security;

create policy "measurements_trainer" on public.measurements
  for all using (public.is_trainer_of_client(client_id)) with check (public.is_trainer_of_client(client_id));
create policy "measurements_client" on public.measurements
  for all using (public.is_owner_client(client_id)) with check (public.is_owner_client(client_id));

create policy "progress_photos_trainer" on public.progress_photos
  for all using (public.is_trainer_of_client(client_id)) with check (public.is_trainer_of_client(client_id));
create policy "progress_photos_client" on public.progress_photos
  for all using (public.is_owner_client(client_id)) with check (public.is_owner_client(client_id));

-- ============================================================
-- STORAGE: private bucket, path convention "<client_id>/<filename>"
-- ============================================================

insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

create policy "progress_photos_storage_trainer" on storage.objects
  for all
  using (bucket_id = 'progress-photos' and public.is_trainer_of_client(((storage.foldername(name))[1])::uuid))
  with check (bucket_id = 'progress-photos' and public.is_trainer_of_client(((storage.foldername(name))[1])::uuid));

create policy "progress_photos_storage_client" on storage.objects
  for all
  using (bucket_id = 'progress-photos' and public.is_owner_client(((storage.foldername(name))[1])::uuid))
  with check (bucket_id = 'progress-photos' and public.is_owner_client(((storage.foldername(name))[1])::uuid));
