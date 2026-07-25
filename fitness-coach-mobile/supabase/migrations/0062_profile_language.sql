-- Çoklu dil desteği (pilot): her kullanıcı (eğitmen/danışan) kendi arayüz dilini bağımsız
-- seçebilsin diye tek bir global ayar yerine profil bazlı bir kolon. Türkçe varsayılan.
alter table public.profiles add column language text not null default 'tr' check (language in ('tr', 'en', 'ar'));
