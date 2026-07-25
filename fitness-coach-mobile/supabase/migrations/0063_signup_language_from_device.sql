-- Yeni kayıt olan bir kullanıcı, kayıt ekranlarında cihaz diline göre (İngilizce/Türkçe)
-- doğru dili görüyordu ama profil oluşturulunca profiles.language her zaman 'tr' varsayılanına
-- düşüyor, kullanıcı uygulamaya girer girmez diller karışıyordu. signUpTrainer/signUpClient artık
-- signUp metadata'sında `language` (cihazdan tespit edilen) gönderiyor — bu trigger onu okuyup
-- profile satırına yazıyor. Metadata'da yoksa (eski istemci sürümleri) mevcut 'tr' varsayılanı
-- kolonun kendi default'undan geliyor.

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
  v_language text := case
    when new.raw_user_meta_data ->> 'language' in ('tr', 'en', 'ar') then new.raw_user_meta_data ->> 'language'
    else 'tr'
  end;
  v_client_id uuid;
  v_trainer_id uuid;
begin
  if v_role = 'client' then
    select id, trainer_id into v_client_id, v_trainer_id
    from public.clients
    where lower(email) = lower(new.email) and profile_id is null
    limit 1;

    insert into public.profiles (id, role, name, trainer_id, consent_accepted_at, language)
    values (new.id, 'client', v_name, v_trainer_id, v_consent_at, v_language);

    if v_client_id is not null then
      update public.clients
      set profile_id = new.id, status = 'active'
      where id = v_client_id;
    end if;
  else
    insert into public.profiles (id, role, name, consent_accepted_at, language)
    values (new.id, 'trainer', v_name, v_consent_at, v_language);
  end if;

  return new;
end;
$function$;
