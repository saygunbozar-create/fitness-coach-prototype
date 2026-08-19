-- Danışan randevu değişikliği talep ettiğinde antrenöre bildirim gidiyordu ama SONUÇ
-- danışana hiç dönmüyordu: onaylandı mı reddedildi mi bilmeden bekliyordu.
--
-- Bekleyen talep kapandığı anda (pending_* doluyken boşaldığında) devreye giriyor ve
-- sonucu tarihin taşınıp taşınmadığından anlıyor:
--   yeni tarih/saat == eski pending_* ise ONAYLANMIŞ, aksi halde REDDEDİLMİŞ.
create or replace function public.notify_client_on_reschedule_result()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_profile uuid;
  v_onaylandi boolean;
begin
  -- Sadece "bekleyen talep vardı, artık yok" geçişi ilgilendiriyor.
  if old.pending_date is null or new.pending_date is not null then
    return new;
  end if;

  -- Danışan henüz kendi hesabını açmadıysa bildirilecek bir profil yok.
  select profile_id into v_profile from public.clients where id = new.client_id;
  if v_profile is null then
    return new;
  end if;

  v_onaylandi := (new.date = old.pending_date and new.time = old.pending_time);

  if v_onaylandi then
    perform public.send_notification(
      v_profile,
      'reschedule_approved',
      'Randevu değişikliğin onaylandı',
      'Randevun ' || to_char(new.date, 'DD.MM.YYYY') || ' ' || to_char(new.time, 'HH24:MI') ||
        ' olarak güncellendi.',
      new.client_id
    );
  else
    perform public.send_notification(
      v_profile,
      'reschedule_rejected',
      'Randevu değişikliği onaylanmadı',
      'Randevun ' || to_char(new.date, 'DD.MM.YYYY') || ' ' || to_char(new.time, 'HH24:MI') ||
        ' saatinde kaldı.',
      new.client_id
    );
  end if;

  return new;
end;
$function$;

drop trigger if exists lesson_schedule_notify_reschedule_result on public.lesson_schedule;
create trigger lesson_schedule_notify_reschedule_result
  after update on public.lesson_schedule
  for each row execute function public.notify_client_on_reschedule_result();

revoke execute on function public.notify_client_on_reschedule_result() from public, anon, authenticated;
