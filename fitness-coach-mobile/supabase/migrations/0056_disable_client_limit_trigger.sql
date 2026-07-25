-- Paket/danışan sınırı sistemi henüz taslak aşamasında (fiyatlar ve paket sayısı netleşmedi).
-- Tabloyu ve fonksiyonu koruyoruz ama gerçek kullanıcıları etkilememesi için sınır kontrolünü
-- devre dışı bırakıyoruz. Geri açmak için: bu dosyadaki create trigger'ı tekrar çalıştır.
drop trigger if exists clients_enforce_limit on public.clients;
