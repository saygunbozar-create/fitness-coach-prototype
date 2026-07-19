-- Seans Takvimi yeniden tasarımı: bir günde birden fazla ders işlenebilsin diye
-- session_logs artık (client_id, date) üzerinde benzersiz değil; saat de eklendi.

do $$
declare
  con_name text;
begin
  select conname into con_name
  from pg_constraint
  where conrelid = 'public.session_logs'::regclass and contype = 'u';
  if con_name is not null then
    execute format('alter table public.session_logs drop constraint %I', con_name);
  end if;
end $$;

alter table public.session_logs add column if not exists time time;

-- Beslenme Notları: antrenörün danışana bıraktığı notlar

create table public.nutrition_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

alter table public.nutrition_notes enable row level security;

create policy "nutrition_notes_trainer" on public.nutrition_notes
  for all using (public.is_trainer_of_client(client_id)) with check (public.is_trainer_of_client(client_id));
create policy "nutrition_notes_client_read" on public.nutrition_notes
  for select using (public.is_owner_client(client_id));

create or replace function public.notify_client_on_nutrition_note()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_profile uuid;
begin
  select profile_id into v_client_profile from public.clients where id = new.client_id;
  if v_client_profile is not null then
    perform public.send_notification(
      v_client_profile,
      'nutrition_note',
      'Antrenöründen Yeni Not',
      left(new.note, 120),
      new.client_id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_nutrition_note_insert on public.nutrition_notes;
create trigger on_nutrition_note_insert
  after insert on public.nutrition_notes
  for each row execute function public.notify_client_on_nutrition_note();

-- Ayarlar ekranı danışana kendi antrenörünün adını gösterebilsin diye:
-- mevcut profiles RLS'i sadece "kendi profilin" ve "antrenörsen danışanının profili"
-- yönünü kapsıyordu, tersi (danışanın antrenörünü görmesi) eksikti.
drop policy if exists "profiles_select_own_trainer" on public.profiles;
create policy "profiles_select_own_trainer" on public.profiles
  for select using (id in (select trainer_id from public.clients where profile_id = auth.uid()));
