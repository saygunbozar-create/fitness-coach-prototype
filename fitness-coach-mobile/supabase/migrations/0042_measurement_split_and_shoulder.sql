-- Vücut ölçümleri: kol ve bacak artık sol/sağ ayrı giriliyor, omuz ölçüsü eklendi.
-- Eski "arm"/"thigh" (tek taraflı) kolonlarına dokunulmuyor — geçmiş kayıtlar kaybolmasın diye
-- kalıyor, ama uygulama artık onları okumuyor/yazmıyor, sadece yeni sol/sağ alanları kullanıyor.

alter table public.measurements add column if not exists shoulder numeric;
alter table public.measurements add column if not exists arm_left numeric;
alter table public.measurements add column if not exists arm_right numeric;
alter table public.measurements add column if not exists thigh_left numeric;
alter table public.measurements add column if not exists thigh_right numeric;
