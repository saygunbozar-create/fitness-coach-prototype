-- Danışan profiline doğum günü eklenebiliyor. Doğum günü geldiğinde SADECE eğitmene bildirim
-- gidiyor (danışana bir şey gitmiyor — bu, eğitmenin danışanı hatırlaması içindir).
-- is_active (pasif/aktif) durumuna bakılmıyor: bu bir antrenman hatırlatması değil, ilişki
-- takibi amaçlı bir bildirim — danışan ara vermiş olsa bile eğitmen bilsin istiyoruz.

alter table public.clients add column if not exists birthday date;

create or replace function public.send_birthday_notifications()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select c.id as client_id, c.trainer_id, c.name as client_name
    from public.clients c
    where c.birthday is not null
      and extract(month from c.birthday) = extract(month from current_date)
      and extract(day from c.birthday) = extract(day from current_date)
  loop
    perform public.send_notification(
      r.trainer_id,
      'client_birthday',
      'Doğum Günü 🎉',
      coalesce(r.client_name, 'Bir danışanın') || ' bugün doğum günü!',
      r.client_id
    );
  end loop;
end;
$$;

select cron.unschedule(jobid) from cron.job where jobname = 'client-birthday-daily';

select cron.schedule(
  'client-birthday-daily',
  '0 7 * * *',
  $$select public.send_birthday_notifications();$$
);
