-- Güvenlik düzeltmesi (bug audit):
-- 1) profiles_update_own politikasında WITH CHECK yoktu; bir danışan doğrudan API
--    çağrısıyla kendi role/trainer_id alanını değiştirip kendini eğitmene
--    yükseltebilir veya başka bir eğitmene bağlanabilirdi. Uygulama sadece "name"
--    alanını günceller, bu yüzden role/trainer_id değişikliğini bir trigger ile
--    tamamen engelliyoruz (kimden gelirse gelsin, meşru hiçbir akış bu alanları
--    UPDATE ile değiştirmiyor — sadece hesap oluşturulurken bir kez set ediliyor).
-- 2) pr_logs_client politikası "for all" idi; 0014 migration'ı aynı deseni
--    client_packages/session_logs/periodization_phases için "for select"e
--    çevirmişti ama pr_logs unutulmuştu. Danışan kendi PR geçmişini doğrudan
--    API ile silebiliyordu, oysa arayüzde silme butonu sadece eğitmene açık.

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    raise exception 'profiles.role is not editable';
  end if;
  if new.trainer_id is distinct from old.trainer_id then
    raise exception 'profiles.trainer_id is not editable';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_privilege_escalation on public.profiles;
create trigger profiles_prevent_privilege_escalation
  before update on public.profiles
  for each row execute function public.prevent_profile_privilege_escalation();

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "pr_logs_client" on public.pr_logs;
create policy "pr_logs_client" on public.pr_logs
  for select using (public.is_owner_client(client_id));
