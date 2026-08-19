-- Danışan kendi randevusunu aldığında antrenöre bildirim gitsin.
-- SADECE booked_by_client = true olanlarda: antrenörün kendi elle eklediği ders için
-- kendine bildirim göndermek anlamsız olurdu.
create or replace function public.notify_trainer_on_booking()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_client_name text;
begin
  if not new.booked_by_client then
    return new;
  end if;

  select name into v_client_name from public.clients where id = new.client_id;

  perform public.send_notification(
    new.trainer_id,
    'booking',
    'Yeni randevu',
    coalesce(v_client_name, 'Danışan') || ' ' ||
      to_char(new.date, 'DD.MM.YYYY') || ' ' || to_char(new.time, 'HH24:MI') ||
      ' için randevu aldı.',
    new.client_id
  );

  return new;
end;
$function$;

-- Tetikleyici sadece INSERT'te. Randevu SAATİ değiştiğinde bildirim
-- notify_trainer_on_reschedule_request üzerinden zaten gidiyor, ikisi çakışmasın.
drop trigger if exists lesson_schedule_notify_booking on public.lesson_schedule;
create trigger lesson_schedule_notify_booking
  after insert on public.lesson_schedule
  for each row execute function public.notify_trainer_on_booking();

-- Bu fonksiyon yalnızca tetikleyiciden çağrılıyor; doğrudan API'den çağrılabilmesine gerek yok.
-- (Trigger fonksiyonları zaten trigger dışında çalıştırılamıyor ama yetkileri de kapatıyoruz —
-- projedeki yerleşik desen bu, bkz. migration 0046/0061.)
revoke execute on function public.notify_trainer_on_booking() from public, anon, authenticated;
