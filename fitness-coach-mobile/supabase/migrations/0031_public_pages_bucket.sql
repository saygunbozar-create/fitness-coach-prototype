-- Gizlilik politikası gibi herkese açık, statik sayfaları barındırmak için
-- public bir Storage bucket. Dosyaları Supabase Dashboard > Storage arayüzünden
-- elle yüklüyoruz (bu proje SQL migration'ları dışında CLI erişimi yok).

insert into storage.buckets (id, name, public)
values ('public-pages', 'public-pages', true)
on conflict (id) do nothing;

create policy "public_pages_read" on storage.objects
  for select
  using (bucket_id = 'public-pages');
