-- Haftalık check-in artık Cumartesi'den Cumartesi'ye çalışıyor (uygulama tarafında kilitleniyor).
-- Her Cumartesi sabahı, hesabı bağlı her danışana check-in hatırlatma bildirimi + push gönderir.

create or replace function public.send_checkin_reminders()
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
      'checkin_reminder',
      'Haftalık Check-in Zamanı',
      'Bugün Cumartesi! Haftalık check-in''ini göndermeyi unutma.',
      r.client_id
    );
  end loop;
end;
$$;

select cron.unschedule(jobid) from cron.job where jobname = 'checkin-reminder-saturday';

select cron.schedule(
  'checkin-reminder-saturday',
  '0 8 * * 6',
  $$select public.send_checkin_reminders();$$
);
