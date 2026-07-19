-- Bug: hesap bağlama sadece TEK sırada çalışıyordu — eğitmen önce Danışan ekranından
-- danışanı eklerse (bir "clients" satırı e-posta ile oluşur), sonra danışan o e-postayla kayıt
-- olursa handle_new_user() (0015) tetikleniyor ve bağlanıyordu. Ama sıra tersse — danışan APK
-- linkiyle eğitmen henüz eklemeden ÖNCE kendi kayıt olduysa — signup anında eşleşecek bir
-- "clients" satırı hiç yoktu, hesap sonsuza kadar bağlanmamış kalıyordu ("Hesabın henüz bir
-- antrenöre bağlanmamış" hatası). Eğitmen sonradan o danışanı eklese bile hiçbir şey bunu
-- geriye dönük tetiklemiyordu.
--
-- Bu artık iki yönlü: "clients" tablosuna INSERT olduğunda da, o e-postayla daha önce kayıt
-- olmuş ama hiçbir clients satırına bağlanmamış bir danışan profili var mı diye bakılıyor.

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
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_client_insert_link on public.clients;
create trigger on_client_insert_link
  before insert on public.clients
  for each row execute function public.link_client_on_insert();

-- Geriye dönük onarım: eğitmenin daha önce eklediği ama şu ana kadar sırası ters geldiği için
-- bağlanamamış danışanları şimdi bağla.
update public.clients c
set profile_id = u.id, status = 'active'
from auth.users u
join public.profiles p on p.id = u.id and p.role = 'client'
where c.profile_id is null
  and lower(c.email) = lower(u.email)
  and not exists (select 1 from public.clients c2 where c2.profile_id = u.id);
