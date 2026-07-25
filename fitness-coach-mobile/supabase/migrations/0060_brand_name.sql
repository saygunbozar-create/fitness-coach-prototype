-- Marka özelleştirme v1: eğitmen kendi işletme adını girebilir, danışanına "Coachbook" yerine
-- bu görünür (sadece isim — renk/logo bu aşamada kapsam dışı, RLS/veri modeli aynı kalır çünkü
-- profiles_update_own zaten kendi satırını güncellemeye izin veriyor).
alter table public.profiles add column brand_name text;
