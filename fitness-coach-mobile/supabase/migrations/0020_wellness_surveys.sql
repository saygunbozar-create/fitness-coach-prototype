-- Aylık Değerlendirme Anketi: her ay tek kayıt (client_id, period), Likert cevapları jsonb.
-- Her ayın 1'inde danışana anketi doldurması için hatırlatma bildirimi + push gönderir.

create table public.wellness_surveys (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  period date not null,
  name text not null default '',
  answers jsonb not null default '{}'::jsonb,
  comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, period)
);

alter table public.wellness_surveys enable row level security;

create policy "wellness_surveys_trainer" on public.wellness_surveys
  for all using (public.is_trainer_of_client(client_id)) with check (public.is_trainer_of_client(client_id));
create policy "wellness_surveys_client" on public.wellness_surveys
  for all using (public.is_owner_client(client_id)) with check (public.is_owner_client(client_id));

create or replace function public.send_survey_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select c.id as client_id, c.profile_id as client_profile_id
    from public.clients c
    where c.profile_id is not null
  loop
    perform public.send_notification(
      r.client_profile_id,
      'survey_reminder',
      'Aylık Değerlendirme Anketi',
      'Yeni ay başladı! Aylık değerlendirme anketini doldurmayı unutma.',
      r.client_id
    );
  end loop;
end;
$$;

select cron.unschedule(jobid) from cron.job where jobname = 'wellness-survey-monthly';

select cron.schedule(
  'wellness-survey-monthly',
  '0 8 1 * *',
  $$select public.send_survey_reminders();$$
);
