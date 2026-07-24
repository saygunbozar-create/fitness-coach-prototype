-- Danışan kendi aldığı randevuyu (booked_by_client=true olan satırları) başka boş bir saate
-- taşıyabilsin — "sadece antrenör iptal etsin" kararı korunuyor: bu, satırı silmiyor/yeni
-- randevu oluşturmuyor, sadece tarih/saatini güncelliyor, ve sadece daha önce kendisinin
-- rezervasyonla aldığı satırlarda çalışıyor (elle eklenmiş bir dersi taşıyamaz).
create policy lesson_schedule_client_reschedule on lesson_schedule
  for update
  using (is_owner_client(client_id) and booked_by_client = true)
  with check (
    is_owner_client(client_id)
    and booked_by_client = true
    and trainer_id = (select trainer_id from clients where id = lesson_schedule.client_id)
  );
