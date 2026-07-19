-- Check-in ve anket hatırlatmaları, danışan o gün/ay için işlemi zaten yapmış olsa bile
-- gönderiliyordu (payment hatırlatıcısındaki "zaten yapıldıysa gönderme" deseninin aksine).
-- İkisini de o günkü/o aydaki kaydı zaten varsa atlayacak şekilde yeniden tanımlıyoruz.

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
      and not exists (select 1 from public.checkins ck where ck.client_id = c.id and ck.date = current_date)
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
      and not exists (
        select 1 from public.wellness_surveys ws
        where ws.client_id = c.id and ws.period = date_trunc('month', current_date)::date
      )
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
