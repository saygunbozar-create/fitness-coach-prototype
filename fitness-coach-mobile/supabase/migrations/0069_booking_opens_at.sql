-- Antrenör, rezervasyon sisteminin ne zaman açılacağını belirleyebilsin.
-- NULL = kapı yok, randevu almak her zaman açık (mevcut davranış, bozulmuyor).
-- Değer varsa: o an gelene kadar DANIŞAN randevu alamaz.
alter table public.profiles
  add column if not exists booking_opens_at timestamptz;

comment on column public.profiles.booking_opens_at is
  'Antrenörün rezervasyon sisteminin açılacağı an. NULL = her zaman açık. Sadece danışan tarafını kısıtlar; antrenör kendi elle ders eklemeye devam edebilir.';

-- Kapı SUNUCU tarafında zorlanıyor. Sadece arayüzde gizlemek yetmez: danışan
-- /rest/v1/lesson_schedule'a doğrudan POST atarak kapıyı atlayabilirdi.
-- Antrenörün kendi eklediği dersler (lesson_schedule_trainer politikası) etkilenmiyor —
-- antrenör açılıştan önce de programını kurabilmeli.
drop policy if exists lesson_schedule_client_insert on public.lesson_schedule;

create policy lesson_schedule_client_insert on public.lesson_schedule
  for insert
  with check (
    booked_by_client = true
    and is_owner_client(client_id)
    and trainer_id = (select clients.trainer_id from clients where clients.id = lesson_schedule.client_id)
    and coalesce(
      (select p.booking_opens_at from profiles p where p.id = lesson_schedule.trainer_id) <= now(),
      true
    )
  );
