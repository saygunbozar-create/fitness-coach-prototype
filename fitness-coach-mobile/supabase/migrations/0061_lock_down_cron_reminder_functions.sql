-- Bulundu: send_birthday_notifications/send_checkin_reminders/send_lesson_reminders/
-- send_payment_reminders/send_survey_reminders — argümansız, cron için yazılmış SECURITY
-- DEFINER fonksiyonlar — "revoke ... from public" (migration 0046) PUBLIC pseudo-rolünü
-- kapattı ama Supabase projelerinde public şemadaki her yeni fonksiyona otomatik uygulanan
-- ALTER DEFAULT PRIVILEGES kaydı yüzünden anon/authenticated rollerine AYRI VE DOĞRUDAN
-- EXECUTE hakkı hâlâ duruyordu (pg_default_acl'de doğrulandı) — yani herkes anon key'iyle
-- doğrudan /rest/v1/rpc/send_birthday_notifications gibi bir çağrı yapıp tüm kullanıcılara
-- bildirim spam'i attırabiliyordu (send_birthday_notifications'da hiç "zaten gönderildi"
-- koruması da yok, her çağrıda tekrar tekrar gönderiyor). get_taken_slots/is_owner_client/
-- is_trainer_of_client/delete_own_account kasıtlı olarak public bırakıldı (kendi kendini
-- veya çağrıyı içeride doğruluyorlar) — onlara dokunulmadı.
revoke execute on function public.send_birthday_notifications() from anon, authenticated;
revoke execute on function public.send_checkin_reminders() from anon, authenticated;
revoke execute on function public.send_lesson_reminders() from anon, authenticated;
revoke execute on function public.send_payment_reminders() from anon, authenticated;
revoke execute on function public.send_survey_reminders() from anon, authenticated;
