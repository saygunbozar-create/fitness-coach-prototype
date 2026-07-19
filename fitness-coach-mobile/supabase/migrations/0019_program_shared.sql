-- Antrenman programı artık antrenör danışanla açıkça "paylaşana" kadar danışan tarafında
-- gizli kalır (uygulama tarafında kontrol edilir, mevcut RLS zaten trainer=yazar/client=okur).

alter table public.clients add column if not exists program_shared boolean not null default false;
