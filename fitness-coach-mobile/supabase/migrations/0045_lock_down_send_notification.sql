-- send_notification() SECURITY DEFINER olduğu için RLS'i atlıyor, ve parametrelerinde
-- (p_profile_id, p_client_id) hiçbir çağıran-yetkisi kontrolü yok. Supabase'in kendi
-- security advisor'ı bunu "anon/authenticated rolü doğrudan çağırabilir" diye işaretledi.
-- Uygulama kodu bunu hiç doğrudan çağırmıyor (sadece diğer trigger fonksiyonları
-- internal olarak çağırıyor) — dolayısıyla PostgREST/REST API üzerinden dışarıya açık
-- olması hiçbir işe yaramıyor, sadece herhangi bir giriş yapmış kullanıcının rastgele
-- bir profile_id'ye sahte bildirim (push dahil) gönderebilmesine izin veriyordu.
revoke execute on function public.send_notification(uuid, text, text, text, uuid) from public;
