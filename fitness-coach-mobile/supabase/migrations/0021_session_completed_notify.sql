-- Eğitmen bir seansı "tamamlandı" olarak işaretleyip kaydettiğinde (Ödemeler > Seans Kullan),
-- danışana bildirim + push gönderir. Atlanan seanslar için bildirim gönderilmez.

create or replace function public.notify_client_on_session_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_profile uuid;
  v_client_name text;
begin
  if new.status <> 'tamamlandi' then
    return new;
  end if;

  select profile_id, name into v_client_profile, v_client_name from public.clients where id = new.client_id;
  if v_client_profile is not null then
    perform public.send_notification(
      v_client_profile,
      'session_completed',
      'Seans Tamamlandı',
      to_char(new.date, 'DD.MM.YYYY') || ' tarihli seansın tamamlandı olarak işaretlendi.',
      new.client_id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_session_log_insert on public.session_logs;
create trigger on_session_log_insert
  after insert on public.session_logs
  for each row execute function public.notify_client_on_session_log();
