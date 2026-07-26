-- Eğitmen bir danışan eklerken artık o danışanın dilini de seçiyor. Bu iki şeyi belirliyor:
--   1) Otomatik kurulan başlangıç programı/beslenme planının dili (seedClientDefaults) — daha önce
--      her zaman Türkçe'ydi, İngilizce konuşan bir danışan siz planı kişiselleştirene kadar
--      "Programım", "GÖĞÜS & TRICEPS", "Kahvaltı" gibi Türkçe şablon içeriği görüyordu.
--   2) Danışan kendi hesabını açtığında profiles.language'in başlangıç değeri — eğitmenin bu
--      danışan için verdiği açık karar, cihaz dilinden daha güvenilir bir sinyal (bkz. 0063).
alter table public.clients
  add column if not exists language text not null default 'tr'
  check (language in ('tr', 'en', 'ar'));

-- handle_new_user: bir danışan kaydolduğunda, eğitmenin o danışan için seçtiği dil varsa onu
-- kullan; yoksa istemcinin gönderdiği cihaz diline (0063) düş; o da yoksa 'tr'.
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
  v_device_language text := case
    when new.raw_user_meta_data ->> 'language' in ('tr', 'en', 'ar') then new.raw_user_meta_data ->> 'language'
    else 'tr'
  end;
  v_language text := v_device_language;
  v_client_id uuid;
  v_trainer_id uuid;
  v_client_language text;
begin
  if v_role = 'client' then
    select id, trainer_id, language into v_client_id, v_trainer_id, v_client_language
    from public.clients
    where lower(email) = lower(new.email) and profile_id is null
    limit 1;

    -- Eğitmenin bu danışan için seçtiği dil varsa cihaz dilini geçersiz kılar.
    if v_client_language in ('tr', 'en', 'ar') then
      v_language := v_client_language;
    end if;

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
