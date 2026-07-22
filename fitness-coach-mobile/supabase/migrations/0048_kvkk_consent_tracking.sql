-- Kayıt formundaki "Gizlilik Politikası / Kullanım Şartları / KVKK Aydınlatma Metni'ni
-- okudum, kabul ediyorum" onay kutusunun ne zaman işaretlendiğini kayıt altına alır —
-- sadece arayüzde zorunlu tutmak (kullanıcı checkbox'ı işaretlemeden "Kayıt Ol" pasif)
-- KVKK denetiminde açık rızanın kanıtı için yeterli değil, bu yüzden veritabanında da
-- bir zaman damgası tutuyoruz.

alter table public.profiles add column if not exists consent_accepted_at timestamptz;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_role text := coalesce(new.raw_user_meta_data ->> 'role', 'client');
  v_name text := coalesce(new.raw_user_meta_data ->> 'name', new.email);
  v_consent boolean := coalesce((new.raw_user_meta_data ->> 'consent')::boolean, false);
  v_consent_at timestamptz := case when v_consent then now() else null end;
  v_client_id uuid;
  v_trainer_id uuid;
begin
  if v_role = 'client' then
    select id, trainer_id into v_client_id, v_trainer_id
    from public.clients
    where lower(email) = lower(new.email) and profile_id is null
    limit 1;

    insert into public.profiles (id, role, name, trainer_id, consent_accepted_at)
    values (new.id, 'client', v_name, v_trainer_id, v_consent_at);

    if v_client_id is not null then
      update public.clients
      set profile_id = new.id, status = 'active'
      where id = v_client_id;
    end if;
  else
    insert into public.profiles (id, role, name, consent_accepted_at)
    values (new.id, 'trainer', v_name, v_consent_at);
  end if;

  return new;
end;
$function$;
