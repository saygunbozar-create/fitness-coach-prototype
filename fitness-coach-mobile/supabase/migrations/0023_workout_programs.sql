-- Antrenman programları artık isimlendirilebilir, birden fazla olabilir ve HER BİRİ ayrı ayrı
-- danışanla paylaşılabilir — tek client.program_shared bayrağının yerini alıyor.

create table public.workout_programs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null default 'Program',
  shared boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.workout_programs enable row level security;

create policy "workout_programs_trainer" on public.workout_programs
  for all using (public.is_trainer_of_client(client_id)) with check (public.is_trainer_of_client(client_id));
create policy "workout_programs_client_read" on public.workout_programs
  for select using (public.is_owner_client(client_id) and shared = true);

alter table public.workout_days add column if not exists program_id uuid references public.workout_programs (id) on delete cascade;

-- Mevcut günleri (varsa) tek bir "Programım" altında topla; eski paylaşım durumunu koru.
insert into public.workout_programs (client_id, name, shared)
select distinct c.id, 'Programım', coalesce(c.program_shared, false)
from public.clients c
where exists (select 1 from public.workout_days wd where wd.client_id = c.id and wd.program_id is null);

update public.workout_days wd
set program_id = wp.id
from public.workout_programs wp
where wp.client_id = wd.client_id and wd.program_id is null;

alter table public.workout_days alter column program_id set not null;

alter table public.clients drop column if exists program_shared;

-- Bir program paylaşıldığında (shared false->true) danışana bildirim + push gönderir.
create or replace function public.notify_client_on_program_share()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_profile uuid;
begin
  if new.shared = true and (old.shared is distinct from new.shared) then
    select profile_id into v_client_profile from public.clients where id = new.client_id;
    if v_client_profile is not null then
      perform public.send_notification(
        v_client_profile,
        'program_shared',
        'Yeni Antrenman Programı',
        '"' || new.name || '" adlı program seninle paylaşıldı.',
        new.client_id
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_workout_program_share on public.workout_programs;
create trigger on_workout_program_share
  after update on public.workout_programs
  for each row execute function public.notify_client_on_program_share();
