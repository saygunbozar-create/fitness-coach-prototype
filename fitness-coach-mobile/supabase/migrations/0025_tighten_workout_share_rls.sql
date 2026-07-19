-- Güvenlik düzeltmesi (bug audit): paylaşım kontrolü sadece workout_programs.shared
-- üzerinde uygulanıyordu; workout_days/workout_exercises/workout_sets/workout_logs'un
-- danışan-okuma politikaları buna hiç bakmıyordu. Yani bir danışan, doğrudan API
-- çağrısıyla paylaşılmamış bir programın gün/egzersiz/set içeriğini okuyabilir
-- (hatta workout_logs "for all" olduğu için yazabilirdi de). Artık dördü de ilgili
-- programın shared=true olmasını da şart koşuyor.

drop policy if exists "workout_days_client_read" on public.workout_days;
create policy "workout_days_client_read" on public.workout_days
  for select using (
    public.is_owner_client(client_id)
    and exists (select 1 from public.workout_programs wp where wp.id = program_id and wp.shared = true)
  );

drop policy if exists "workout_exercises_client_read" on public.workout_exercises;
create policy "workout_exercises_client_read" on public.workout_exercises
  for select using (
    public.is_owner_client((select client_id from public.workout_days where id = workout_day_id))
    and exists (
      select 1 from public.workout_days wd
      join public.workout_programs wp on wp.id = wd.program_id
      where wd.id = workout_day_id and wp.shared = true
    )
  );

drop policy if exists "workout_sets_client_read" on public.workout_sets;
create policy "workout_sets_client_read" on public.workout_sets
  for select using (
    public.is_owner_client((select wd.client_id from public.workout_days wd join public.workout_exercises we on we.workout_day_id = wd.id where we.id = workout_exercise_id))
    and exists (
      select 1 from public.workout_exercises we
      join public.workout_days wd on wd.id = we.workout_day_id
      join public.workout_programs wp on wp.id = wd.program_id
      where we.id = workout_exercise_id and wp.shared = true
    )
  );

drop policy if exists "workout_logs_client" on public.workout_logs;
create policy "workout_logs_client" on public.workout_logs
  for all using (
    public.is_owner_client((select wd.client_id from public.workout_days wd join public.workout_exercises we on we.workout_day_id = wd.id where we.id = workout_exercise_id))
    and exists (
      select 1 from public.workout_exercises we
      join public.workout_days wd on wd.id = we.workout_day_id
      join public.workout_programs wp on wp.id = wd.program_id
      where we.id = workout_exercise_id and wp.shared = true
    )
  )
  with check (
    public.is_owner_client((select wd.client_id from public.workout_days wd join public.workout_exercises we on we.workout_day_id = wd.id where we.id = workout_exercise_id))
    and exists (
      select 1 from public.workout_exercises we
      join public.workout_days wd on wd.id = we.workout_day_id
      join public.workout_programs wp on wp.id = wd.program_id
      where we.id = workout_exercise_id and wp.shared = true
    )
  );
