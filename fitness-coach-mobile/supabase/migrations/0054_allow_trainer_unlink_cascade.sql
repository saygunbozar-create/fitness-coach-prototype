-- Trainer kendi hesabını silerken, bağlı danışanların profiles.trainer_id'si
-- ON DELETE SET NULL ile NULL'a düşüyor. Eskiden bu tetikleyici trainer_id'deki HER
-- değişikliği (NULL'a düşüşü de) reddediyordu, bu yüzden bağlı bir danışanı olan bir
-- eğitmen kendi hesabını asla silemiyordu. Artık sadece BAŞKA bir trainer_id'ye geçişi
-- (yetki yükseltme/spoofing) engelliyor, NULL'a düşmesine izin veriyor.
create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  if new.role is distinct from old.role then
    raise exception 'profiles.role is not editable';
  end if;
  if new.trainer_id is distinct from old.trainer_id and new.trainer_id is not null then
    raise exception 'profiles.trainer_id is not editable';
  end if;
  return new;
end;
$$;
