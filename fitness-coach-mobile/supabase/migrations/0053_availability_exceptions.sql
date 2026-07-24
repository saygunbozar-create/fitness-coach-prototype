-- Antrenörün haftalık müsaitlik kuralına (availability_rules) tek seferlik/geçici istisnalar
-- tanımlamasını sağlar — "Perşembe 12:00-16:00 vardiyam var, o saatler kapalı olsun" gibi.
-- Kuralı silmeden, sadece belirli bir tarih+saat aralığını randevu ızgarasından çıkarır.

create table availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  constraint availability_exceptions_time_check check (start_time < end_time)
);

alter table availability_exceptions enable row level security;

create policy availability_exceptions_trainer on availability_exceptions
  for all using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());

-- Danışan, boş saatleri hesaplarken hangi aralıkların kapatıldığını görebilsin.
create policy availability_exceptions_client_select on availability_exceptions
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.trainer_id = availability_exceptions.trainer_id)
  );
