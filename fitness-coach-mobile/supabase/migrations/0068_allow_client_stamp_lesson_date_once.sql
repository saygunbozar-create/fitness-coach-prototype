-- Ders içeriği, derse gün atandığı güne değil seansın yapıldığı güne kaydedilmeli.
-- Bunun için log_date artık ilk set kaydedildiğinde damgalanıyor (bkz. useUpdateLessonSetLog).
-- Ama set kaydını DANIŞAN yapıyor ve prevent_lesson_client_field_tamper danışanın log_date
-- değiştirmesini tümden yasaklıyordu — yani damgalama hata fırlatıp set kaydını da bozacaktı.
--
-- Tetikleyiciyi mümkün olan en dar şekilde gevşetiyoruz: danışan log_date'i YALNIZCA
--   (a) daha önce hiç yazılmamışsa ve
--   (b) bugünün tarihine
-- yazabilir. Yani seansı bir kez "bugün yaptım" diye sabitleyebiliyor; sonradan tarihi
-- değiştiremiyor, geçmişe/geleceğe tarih atamıyor. Diğer alanlar (workout_day_id,
-- lesson_number, program_id, client_id) danışana kapalı kalmaya devam ediyor.
create or replace function public.prevent_lesson_client_field_tamper()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if public.is_owner_client(new.client_id) and not public.is_trainer_of_client(new.client_id) then
    if new.workout_day_id is distinct from old.workout_day_id
      or new.lesson_number is distinct from old.lesson_number
      or new.program_id is distinct from old.program_id
      or new.client_id is distinct from old.client_id then
      raise exception 'clients may only change completed/completed_at on program_lessons';
    end if;

    if new.log_date is distinct from old.log_date
       and not (old.log_date is null and new.log_date = current_date) then
      raise exception 'clients may only stamp log_date once, and only with today''s date';
    end if;
  end if;
  return new;
end;
$function$;
