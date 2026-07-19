-- Güvenlik düzeltmesi (bug audit): program_lessons (Ders Defteri), 0025'in
-- workout_days/exercises/sets/logs için eklediği "sadece paylaşılmış (shared=true)
-- programlar" kontrolünü hiç uygulamıyordu. Yani bir danışan, eğitmen henüz
-- paylaşmadığı bir programın derslerini doğrudan API çağrısıyla okuyabilir/
-- güncelleyebilirdi. Ayrıca update politikası hangi sütunların değişebileceğini
-- kısıtlamıyordu — danışan normalde sadece "completed" işaretlemeli, ama API'den
-- workout_day_id/log_date/lesson_number gibi alanları da değiştirebilirdi.

drop policy if exists "program_lessons_client_read" on public.program_lessons;
create policy "program_lessons_client_read" on public.program_lessons
  for select using (
    public.is_owner_client(client_id)
    and exists (select 1 from public.workout_programs wp where wp.id = program_id and wp.shared = true)
  );

drop policy if exists "program_lessons_client_update" on public.program_lessons;
create policy "program_lessons_client_update" on public.program_lessons
  for update using (
    public.is_owner_client(client_id)
    and exists (select 1 from public.workout_programs wp where wp.id = program_id and wp.shared = true)
  )
  with check (
    public.is_owner_client(client_id)
    and exists (select 1 from public.workout_programs wp where wp.id = program_id and wp.shared = true)
  );

create or replace function public.prevent_lesson_client_field_tamper()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_owner_client(new.client_id) and not public.is_trainer_of_client(new.client_id) then
    if new.workout_day_id is distinct from old.workout_day_id
      or new.log_date is distinct from old.log_date
      or new.lesson_number is distinct from old.lesson_number
      or new.program_id is distinct from old.program_id
      or new.client_id is distinct from old.client_id then
      raise exception 'clients may only change completed/completed_at on program_lessons';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists program_lessons_prevent_client_tamper on public.program_lessons;
create trigger program_lessons_prevent_client_tamper
  before update on public.program_lessons
  for each row execute function public.prevent_lesson_client_field_tamper();
