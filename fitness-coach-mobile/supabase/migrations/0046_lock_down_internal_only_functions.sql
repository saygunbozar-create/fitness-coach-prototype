-- Bu fonksiyonlar sadece trigger'lar veya pg_cron tarafından dahili çağrılmak üzere
-- yazıldı (uygulama kodu hiçbirini .rpc() ile çağırmıyor), ama SECURITY DEFINER
-- oldukları için varsayılan olarak PUBLIC'e (dolayısıyla anon/authenticated'e) EXECUTE
-- izni gitmişti. is_owner_client/is_trainer_of_client ve delete_own_account bilinçli
-- olarak genel kullanıma açık kalıyor (kendi auth.uid()'sine göre güvenli davranıyorlar).
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.link_client_on_insert() from public;
revoke execute on function public.prevent_lesson_client_field_tamper() from public;
revoke execute on function public.prevent_profile_privilege_escalation() from public;
revoke execute on function public.notify_client_on_nutrition_note() from public;
revoke execute on function public.notify_client_on_package() from public;
revoke execute on function public.notify_client_on_payment() from public;
revoke execute on function public.notify_client_on_payment_paid() from public;
revoke execute on function public.notify_client_on_program_share() from public;
revoke execute on function public.notify_client_on_session_log() from public;
revoke execute on function public.notify_trainer_on_checkin() from public;
revoke execute on function public.notify_trainer_on_lesson_completed() from public;
revoke execute on function public.send_birthday_notifications() from public;
revoke execute on function public.send_checkin_reminders() from public;
revoke execute on function public.send_lesson_reminders() from public;
revoke execute on function public.send_payment_reminders() from public;
revoke execute on function public.send_survey_reminders() from public;
