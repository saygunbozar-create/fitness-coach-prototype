-- Eğitmenin haftalık ders takvimi: Panel ekranına eklenen, elle girilen ders kayıtları.
-- Ders başlamadan 1 saat önce eğitmene "kiminle dersin var" bildirimi + push gönderir.

create table public.lesson_schedule (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  date date not null,
  time time not null,
  notified boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.lesson_schedule enable row level security;

create index if not exists lesson_schedule_trainer_date_idx on public.lesson_schedule (trainer_id, date);

create policy "lesson_schedule_trainer" on public.lesson_schedule
  for all using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.send_lesson_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select ls.id, ls.trainer_id, c.name as client_name
    from public.lesson_schedule ls
    join public.clients c on c.id = ls.client_id
    where ls.notified = false
      -- ls.date/ls.time trainer'ın yerel (Türkiye) saatiyle girildiği için "at time zone" ile
      -- gerçek UTC ana çeviriyoruz — düz karşılaştırma sunucunun UTC current_date/now()'ıyla
      -- gece yarısına yakın saatlerde yanlış gün/saat karşılaştırması yapardı.
      and ((ls.date + ls.time) at time zone 'Europe/Istanbul') between (now() + interval '55 minutes') and (now() + interval '60 minutes')
  loop
    perform public.send_notification(
      r.trainer_id,
      'lesson_reminder',
      'Ders Hatırlatıcısı',
      r.client_name || ' ile 1 saat sonra dersin var.',
      null
    );
    update public.lesson_schedule set notified = true where id = r.id;
  end loop;
end;
$$;

select cron.unschedule(jobid) from cron.job where jobname = 'lesson-reminders';

select cron.schedule(
  'lesson-reminders',
  '*/5 * * * *',
  $$select public.send_lesson_reminders();$$
);
