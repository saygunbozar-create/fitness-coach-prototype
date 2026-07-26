-- BUG: Bir danışan, eğitmen onu "Danışan Ekle" ile eklemeden ÖNCE kendi hesabını oluşturmuşsa
-- (link_client_on_insert trigger'ı clients.profile_id'yi doğru bağlıyor), danışanın KENDİ
-- profiles.trainer_id kolonu hiç güncellenmiyordu — NULL kalıyordu. Randevu (Müsaitlik) özelliği
-- availability_rules/availability_exceptions RLS'inde tam olarak profiles.trainer_id'ye bakıyor,
-- bu yüzden bu şekilde bağlanmış danışanlar eğitmenin müsaitlik saatlerini asla göremiyordu
-- ("randevu saatleri açılmıyor" raporu buradan geliyor). Diğer özellikler etkilenmedi çünkü onlar
-- clients.trainer_id / is_owner_client() / is_trainer_of_client() kullanıyor, profiles.trainer_id
-- değil.
--
-- prevent_profile_privilege_escalation() bu güncellemeyi engelliyordu (NULL -> değer geçişini de
-- yasak listesine almıştı — bkz. 0054). Gerçek güvenlik amacı sadece bir danışanın KENDİ isteğiyle
-- rastgele bir eğitmene bağlanmasını (spoofing) engellemekti; link_client_on_insert() gibi güvenilir
-- dahili SECURITY DEFINER tetikleyicilerin meşru ilk-bağlama işlemini engellemesi istenmeyen bir
-- yan etkiydi. Bir session-local bayrak (app.bypass_trainer_link_check) ekleyerek SADECE bu dahili
-- tetikleyicinin geçişine izin veriyoruz; dışarıdan (ör. ham bir REST PATCH ile) yapılan
-- trainer_id değişikliği hâlâ tamamen engelleniyor.

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
  if new.trainer_id is distinct from old.trainer_id
     and new.trainer_id is not null
     and coalesce(current_setting('app.bypass_trainer_link_check', true), 'false') <> 'true' then
    raise exception 'profiles.trainer_id is not editable';
  end if;
  return new;
end;
$$;

create or replace function public.link_client_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
begin
  if new.profile_id is null then
    select u.id into v_profile_id
    from auth.users u
    join public.profiles p on p.id = u.id and p.role = 'client'
    where lower(u.email) = lower(new.email)
      and not exists (select 1 from public.clients c2 where c2.profile_id = u.id)
    limit 1;

    if v_profile_id is not null then
      new.profile_id := v_profile_id;
      new.status := 'active';

      perform set_config('app.bypass_trainer_link_check', 'true', true);
      update public.profiles set trainer_id = new.trainer_id where id = v_profile_id and trainer_id is null;
      perform set_config('app.bypass_trainer_link_check', 'false', true);
    end if;
  end if;
  return new;
end;
$$;

-- Geriye dönük onarım: bu bug'dan önce zaten yanlış bağlanmış (clients.profile_id dolu ama
-- kendi profiles.trainer_id'si NULL kalmış) danışan profillerini şimdi düzelt.
select set_config('app.bypass_trainer_link_check', 'true', true);
update public.profiles p
set trainer_id = c.trainer_id
from public.clients c
where c.profile_id = p.id
  and p.trainer_id is null
  and c.trainer_id is not null;
select set_config('app.bypass_trainer_link_check', 'false', true);
