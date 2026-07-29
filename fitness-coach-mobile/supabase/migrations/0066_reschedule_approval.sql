-- Danışanın randevu değiştirme isteği artık doğrudan uygulanmıyor, ANTRENÖRÜN ONAYINA gidiyor.
-- Önceden lesson_schedule_client_reschedule politikası danışanın kendi (booked_by_client=true)
-- satırının date/time'ını serbestçe güncellemesine izin veriyordu.
--
-- Yaklaşım: aynı satırda "önerilen" tarih/saat tutuluyor (pending_*). Onaylanınca gerçek
-- date/time'a taşınıp temizleniyor, reddedilince sadece temizleniyor. Ayrı bir tablo yerine bunu
-- seçtik çünkü bir randevunun aynı anda en fazla bir bekleyen değişikliği olabilir.
alter table public.lesson_schedule
  add column if not exists pending_date date,
  add column if not exists pending_time time,
  add column if not exists pending_requested_at timestamptz;

-- RLS sütun bazında kısıtlama yapamıyor: yukarıdaki UPDATE politikası danışanın date/time'ı da
-- değiştirmesine teknik olarak izin vermeye devam ediyor. Bu yüzden asıl kuralı bir tetikleyiciyle
-- uyguluyoruz (projede prevent_profile_privilege_escalation ile aynı desen).
-- auth.uid() null ise çağrı servis rolü/cron demektir (ör. send_lesson_reminders'ın notified
-- bayrağını güncellemesi) — onlara dokunmuyoruz.
create or replace function public.enforce_reschedule_approval()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null or auth.uid() = new.trainer_id then
    return new;
  end if;

  if new.date is distinct from old.date or new.time is distinct from old.time then
    raise exception 'Randevu saatini yalnızca antrenör değiştirebilir. Değişiklik talebi oluşturun.';
  end if;

  return new;
end;
$function$;

drop trigger if exists lesson_schedule_reschedule_guard on public.lesson_schedule;
create trigger lesson_schedule_reschedule_guard
  before update on public.lesson_schedule
  for each row execute function public.enforce_reschedule_approval();

-- Danışan bir değişiklik talep ettiğinde antrenöre bildirim gönder.
create or replace function public.notify_trainer_on_reschedule_request()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_client_name text;
begin
  -- Sadece YENİ bir talep oluştuğunda (boştan doluya geçiş) tetiklen; onay/red sırasında değil.
  if new.pending_date is null or (old.pending_date is not null and old.pending_time = new.pending_time and old.pending_date = new.pending_date) then
    return new;
  end if;

  select name into v_client_name from public.clients where id = new.client_id;

  perform public.send_notification(
    new.trainer_id,
    'reschedule_request',
    'Randevu değişiklik talebi',
    coalesce(v_client_name, 'Danışan') || ' randevusunu ' ||
      to_char(new.pending_date, 'DD.MM.YYYY') || ' ' || to_char(new.pending_time, 'HH24:MI') ||
      ' olarak değiştirmek istiyor.',
    new.client_id
  );

  return new;
end;
$function$;

drop trigger if exists lesson_schedule_notify_reschedule on public.lesson_schedule;
create trigger lesson_schedule_notify_reschedule
  after update on public.lesson_schedule
  for each row execute function public.notify_trainer_on_reschedule_request();

-- Bu iki fonksiyon da sadece tetikleyici içinden çağrılmalı (bkz. 0046/0061 dersleri):
-- RETURNS trigger olduğu için Postgres bunları doğrudan çağırmayı zaten reddediyor, ama
-- projedeki kalıba uyup yetkiyi açıkça geri alıyoruz.
revoke execute on function public.enforce_reschedule_approval() from public, anon, authenticated;
revoke execute on function public.notify_trainer_on_reschedule_request() from public, anon, authenticated;
