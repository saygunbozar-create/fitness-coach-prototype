-- Rezervasyon sistemi: antrenör müsaitlik kuralları tanımlar, danışan boş bir saate
-- randevu alır, bu doğrudan lesson_schedule'a (mevcut Haftalık Ders Takvimi) düşer.

create table availability_rules (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references profiles(id) on delete cascade,
  days_of_week int[] not null, -- 1=Pazartesi .. 7=Pazar (app'teki mondayOfWeek() ile aynı gramer)
  start_time time not null,
  end_time time not null,
  session_minutes int not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  constraint availability_rules_days_check check (days_of_week <@ array[1,2,3,4,5,6,7] and cardinality(days_of_week) > 0),
  constraint availability_rules_time_check check (start_time < end_time),
  constraint availability_rules_date_check check (start_date <= end_date),
  constraint availability_rules_duration_check check (session_minutes > 0)
);

alter table availability_rules enable row level security;

create policy availability_rules_trainer on availability_rules
  for all using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());

-- Danışan, kendi antrenörünün kurallarını okuyabilsin (boş saatleri hesaplayabilmek için).
create policy availability_rules_client_select on availability_rules
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.trainer_id = availability_rules.trainer_id)
  );

-- Randevu ile mi elle mi eklendiğini ayırt etmek için (Panel'deki takvimde rozet olarak gösterilir).
alter table lesson_schedule add column booked_by_client boolean not null default false;

-- Aynı antrenörün aynı gün+saatinde iki ayrı kayıt olamaz — hem elle ekleme hem randevu bu
-- kısıtla korunuyor, iki danışan aynı saati alamaz.
alter table lesson_schedule add constraint lesson_schedule_unique_slot unique (trainer_id, date, time);

-- Danışan sadece kendi trainer_id'sine ait, kendi client_id'siyle ve booked_by_client=true
-- olarak satır ekleyebilir — antrenör adına elle ders eklenmiş gibi bir satır oluşturamaz.
create policy lesson_schedule_client_insert on lesson_schedule
  for insert with check (
    booked_by_client = true
    and is_owner_client(client_id)
    and trainer_id = (select trainer_id from clients where id = lesson_schedule.client_id)
  );

-- Danışan sadece KENDİ randevularını görebilsin ("Randevularım" listesi) — başka danışanların
-- randevu detaylarını (isim/saat) görmesin. Boş/dolu saat hesaplaması ayrı bir fonksiyonla yapılıyor.
create policy lesson_schedule_client_select_own on lesson_schedule
  for select using (is_owner_client(client_id));

-- Belirli bir gün için dolu saatleri döner — danışana SADECE saatleri verir, kimin aldığını
-- (client_id/isim) sızdırmaz. Çağıran ya o antrenörün bir danışanı ya da antrenörün kendisi olmalı.
create or replace function get_taken_slots(p_trainer_id uuid, p_date date)
returns table(slot_time time)
language sql
stable
security definer
set search_path = public
as $$
  select ls.time
  from lesson_schedule ls
  where ls.trainer_id = p_trainer_id
    and ls.date = p_date
    and (
      p_trainer_id = auth.uid()
      or exists (select 1 from clients c where c.trainer_id = p_trainer_id and c.profile_id = auth.uid())
    );
$$;

revoke execute on function get_taken_slots(uuid, date) from public;
grant execute on function get_taken_slots(uuid, date) to authenticated;
