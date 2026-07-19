-- Danışan kayıt eşleştirmesi büyük/küçük harfe duyarlıydı: antrenörün girdiği e-posta
-- ("Mert.K@Gmail.com") ile danışanın kayıt olurken kullandığı e-posta ("mert.k@gmail.com")
-- birebir aynı yazılmazsa eşleşme kurulamıyor, danışan hesabı hiçbir zaman bağlanmayan
-- bir profile ile kalıyor ve uygulamada sonsuz yüklenme ekranına takılıyordu.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(new.raw_user_meta_data ->> 'role', 'client');
  v_name text := coalesce(new.raw_user_meta_data ->> 'name', new.email);
  v_client_id uuid;
  v_trainer_id uuid;
begin
  if v_role = 'client' then
    select id, trainer_id into v_client_id, v_trainer_id
    from public.clients
    where lower(email) = lower(new.email) and profile_id is null
    limit 1;

    insert into public.profiles (id, role, name, trainer_id)
    values (new.id, 'client', v_name, v_trainer_id);

    if v_client_id is not null then
      update public.clients
      set profile_id = new.id, status = 'active'
      where id = v_client_id;
    end if;
  else
    insert into public.profiles (id, role, name)
    values (new.id, 'trainer', v_name);
  end if;

  return new;
end;
$$;

-- Geriye dönük onarım: bu düzeltmeden önce büyük/küçük harf uyuşmazlığı yüzünden
-- bağlanamamış olabilecek danışanları şimdi eşleştir.
update public.clients c
set profile_id = u.id, status = 'active'
from auth.users u
where c.profile_id is null
  and lower(c.email) = lower(u.email)
  and exists (select 1 from public.profiles p where p.id = u.id and p.role = 'client');
