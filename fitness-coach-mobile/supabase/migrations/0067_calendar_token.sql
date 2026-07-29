-- Apple/Google Takvim aboneliği için kişiye özel gizli adres.
-- Takvim uygulamaları istek başlığı (Authorization) gönderemiyor, dolayısıyla kimlik doğrulama
-- adresin kendisindeki tahmin edilemez token ile yapılıyor. Bu yüzden token bir "taşıyıcı sır":
-- adresi ele geçiren kişi o kişinin ders saatlerini görebilir. Riski sınırlamak için:
--   • gen_random_uuid() (122 bit entropi) — tahmin edilemez
--   • kullanıcı Ayarlar'dan yenileyebilir; yenilenince eski adres anında geçersiz olur
-- Beslediği içerik bilinçli olarak asgari: sadece tarih/saat ve karşı tarafın adı. Sağlık formu,
-- ölçüm, ödeme gibi hiçbir hassas veri takvime gitmiyor.
alter table public.profiles
  add column if not exists calendar_token uuid not null default gen_random_uuid();

create unique index if not exists profiles_calendar_token_key on public.profiles (calendar_token);

-- Kullanıcı kendi token'ını yenileyebilsin. profiles_update_own politikası zaten kendi satırının
-- güncellenmesine izin veriyor ve prevent_profile_privilege_escalation yalnızca role/trainer_id'yi
-- koruyor, dolayısıyla ek bir politika gerekmiyor — bu fonksiyon sadece yeni değeri üretmek için.
create or replace function public.regenerate_calendar_token()
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_new uuid := gen_random_uuid();
begin
  if auth.uid() is null then
    raise exception 'Oturum gerekli';
  end if;
  update public.profiles set calendar_token = v_new where id = auth.uid();
  return v_new;
end;
$function$;

-- Bu fonksiyon SADECE giriş yapmış kullanıcı içindir ve kendi satırından başkasına dokunamaz
-- (where id = auth.uid()), o yüzden authenticated'a açık bırakıyoruz; anon'dan geri alıyoruz.
revoke execute on function public.regenerate_calendar_token() from public, anon;
grant execute on function public.regenerate_calendar_token() to authenticated;
