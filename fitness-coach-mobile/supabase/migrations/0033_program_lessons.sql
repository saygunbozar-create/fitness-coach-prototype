-- Ders Defteri: bir program için sabit sayıda numaralı "ders" (Antrenman ekranındaki
-- gün-sekmesi tabanlı "bugünün antrenmanı" akışının yerini alır). Eğitmen her derse bir
-- gün şablonu atar; danışan o dersi loglar ve "Uygulandı" ile arşive düşürür.

create table public.program_lessons (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  program_id uuid not null references public.workout_programs (id) on delete cascade,
  lesson_number int not null,
  workout_day_id uuid references public.workout_days (id) on delete set null,
  log_date date,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (program_id, lesson_number)
);

alter table public.program_lessons enable row level security;

create policy "program_lessons_trainer" on public.program_lessons
  for all using (public.is_trainer_of_client(client_id)) with check (public.is_trainer_of_client(client_id));
create policy "program_lessons_client_read" on public.program_lessons
  for select using (public.is_owner_client(client_id));
create policy "program_lessons_client_update" on public.program_lessons
  for update using (public.is_owner_client(client_id)) with check (public.is_owner_client(client_id));

-- Danışan bir dersi "Uygulandı" işaretlediğinde eğitmene bildirim + push.
create or replace function public.notify_trainer_on_lesson_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trainer_id uuid;
  v_client_name text;
begin
  if new.completed = true and old.completed = false then
    select c.trainer_id, c.name into v_trainer_id, v_client_name
    from public.clients c where c.id = new.client_id;
    if v_trainer_id is not null then
      perform public.send_notification(
        v_trainer_id,
        'lesson_completed',
        'Ders Tamamlandı',
        coalesce(v_client_name, 'Bir danışan') || ' ' || new.lesson_number || '. dersi uyguladı olarak işaretledi.',
        new.client_id
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_lesson_completed on public.program_lessons;
create trigger on_lesson_completed
  after update of completed on public.program_lessons
  for each row execute function public.notify_trainer_on_lesson_completed();
