-- 1) Pasif (araya vermiş) danışanlar hâlâ haftalık check-in / aylık anket hatırlatması alıyordu —
--    is_active kontrolü eklenmemişti (bu bayrak, hatırlatma fonksiyonlarından SONRA eklendi).
create or replace function public.send_checkin_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select c.id as client_id, c.profile_id as client_profile_id
    from public.clients c
    where c.profile_id is not null
      and c.is_active = true
      and not exists (select 1 from public.checkins ck where ck.client_id = c.id and ck.date = current_date)
  loop
    perform public.send_notification(
      r.client_profile_id,
      'checkin_reminder',
      'Haftalık Check-in Zamanı',
      'Bugün Cumartesi! Haftalık check-in''ini göndermeyi unutma.',
      r.client_id
    );
  end loop;
end;
$$;

create or replace function public.send_survey_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select c.id as client_id, c.profile_id as client_profile_id
    from public.clients c
    where c.profile_id is not null
      and c.is_active = true
      and not exists (
        select 1 from public.wellness_surveys ws
        where ws.client_id = c.id and ws.period = date_trunc('month', current_date)::date
      )
  loop
    perform public.send_notification(
      r.client_profile_id,
      'survey_reminder',
      'Aylık Değerlendirme Anketi',
      'Yeni ay başladı! Aylık değerlendirme anketini doldurmayı unutma.',
      r.client_id
    );
  end loop;
end;
$$;

-- 2) Bir seans kaydını silip düzelterek tekrar eklemek (yanlış tarih girmek gibi), danışana iki
--    kez "Seans Tamamlandı" bildirimi gönderiyordu. Aynı danışana kısa süre önce (son 5 dakika
--    içinde) zaten bir seans bildirimi gittiyse tekrar göndermiyoruz.
create or replace function public.notify_client_on_session_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_profile uuid;
begin
  if new.status <> 'tamamlandi' then
    return new;
  end if;

  select profile_id into v_client_profile from public.clients where id = new.client_id;
  if v_client_profile is not null then
    if exists (
      select 1 from public.notifications n
      where n.profile_id = v_client_profile
        and n.type = 'session_completed'
        and n.created_at > now() - interval '5 minutes'
    ) then
      return new;
    end if;
    perform public.send_notification(
      v_client_profile,
      'session_completed',
      'Seans Tamamlandı',
      to_char(new.date, 'DD.MM.YYYY') || ' tarihli seansın tamamlandı olarak işaretlendi.',
      new.client_id
    );
  end if;
  return new;
end;
$$;

-- 3) supplement_items/shopping_items danışan politikaları "for all" idi; uygulama arayüzünde
--    danışan sadece alışveriş listesindeki bir ürünü işaretleyebiliyor (ekleme/silme antrenöre
--    özel, takviye planına danışan hiç dokunmuyor). 0014/0017'deki aynı düzeltme deseni.

drop policy if exists "supplement_items_client" on public.supplement_items;
create policy "supplement_items_client" on public.supplement_items
  for select using (public.is_owner_client(client_id));

drop policy if exists "shopping_items_client" on public.shopping_items;
create policy "shopping_items_client_read" on public.shopping_items
  for select using (public.is_owner_client(client_id));
create policy "shopping_items_client_update" on public.shopping_items
  for update to authenticated
  using (public.is_owner_client(client_id))
  with check (public.is_owner_client(client_id));
