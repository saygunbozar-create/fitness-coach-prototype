-- Aylık Değerlendirme Anketi "sadece bu ay düzenlenebilir" kuralı sadece uygulama arayüzünde
-- vardı; danışan doğrudan API çağrısıyla geçmiş ayların cevaplarını değiştirebiliyordu.
-- Danışan politikasını, sadece içinde bulunulan ayın kaydını ekleyip güncelleyebilecek
-- şekilde daraltıyoruz (geçmiş ayları hâlâ okuyabilir, sadece yazamaz).

drop policy if exists "wellness_surveys_client" on public.wellness_surveys;

create policy "wellness_surveys_client_read" on public.wellness_surveys
  for select using (public.is_owner_client(client_id));

create policy "wellness_surveys_client_write" on public.wellness_surveys
  for insert to authenticated
  with check (public.is_owner_client(client_id) and period = date_trunc('month', current_date)::date);

create policy "wellness_surveys_client_update" on public.wellness_surveys
  for update to authenticated
  using (public.is_owner_client(client_id) and period = date_trunc('month', current_date)::date)
  with check (public.is_owner_client(client_id) and period = date_trunc('month', current_date)::date);
