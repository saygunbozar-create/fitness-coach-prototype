-- Aylık anket RLS'i "bu ay" kontrolünü UTC (current_date) ile yapıyordu; ama istemci period'u
-- CİHAZIN YEREL tarihinden (Türkiye, UTC+3) hesaplıyor. Ayın 1'inde gece 00:00-03:00 (yerel) arası
-- sunucu hâlâ önceki ayda olduğu için istemcinin gönderdiği period RLS kontrolüne takılıp kayıt
-- "row-level security policy" hatasıyla reddoluyordu (ayın son günü 21:00-24:00'te tersi). Kontrolü
-- Europe/Istanbul saatine çevirerek istemciyle hizalıyoruz (kod tabanının localDateStr deseniyle uyumlu).

drop policy if exists "wellness_surveys_client_write" on public.wellness_surveys;
create policy "wellness_surveys_client_write" on public.wellness_surveys
  for insert to authenticated
  with check (
    public.is_owner_client(client_id)
    and period = date_trunc('month', (now() at time zone 'Europe/Istanbul'))::date
  );

drop policy if exists "wellness_surveys_client_update" on public.wellness_surveys;
create policy "wellness_surveys_client_update" on public.wellness_surveys
  for update to authenticated
  using (
    public.is_owner_client(client_id)
    and period = date_trunc('month', (now() at time zone 'Europe/Istanbul'))::date
  )
  with check (
    public.is_owner_client(client_id)
    and period = date_trunc('month', (now() at time zone 'Europe/Istanbul'))::date
  );
