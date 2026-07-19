-- Güvenlik düzeltmesi: danışan hesapları paket, seans takvimi ve periyodizasyon
-- kayıtlarını doğrudan ekleyip silebiliyordu (RLS "for all" idi), oysa uygulama
-- arayüzünde bu işlemler sadece antrenöre açık. Danışan artık bu üç tabloda
-- sadece kendi kayıtlarını görebiliyor; ekleme/güncelleme/silme antrenöre özel.

drop policy if exists "client_packages_client" on public.client_packages;
create policy "client_packages_client" on public.client_packages
  for select using (public.is_owner_client(client_id));

drop policy if exists "session_logs_client" on public.session_logs;
create policy "session_logs_client" on public.session_logs
  for select using (public.is_owner_client(client_id));

drop policy if exists "periodization_phases_client" on public.periodization_phases;
create policy "periodization_phases_client" on public.periodization_phases
  for select using (public.is_owner_client(client_id));
