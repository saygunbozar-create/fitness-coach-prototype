-- 0036'daki geriye dönük onarım UPDATE'i tek bir ifade olarak çalıştığı için, aynı e-postayı
-- paylaşan (farklı eğitmenlere ait) birden fazla bağlanmamış "clients" satırı varsa, ifadenin
-- NOT EXISTS kontrolü ifadenin BAŞINDAKİ tek bir görüntüye (snapshot) bakar — ifadenin kendi
-- içindeki satır satır yazımları görmez. Bu yüzden teorik olarak aynı danışan profiline birden
-- fazla clients satırı aynı anda bağlanabilirdi. Bunu, eşleşen her profil için sadece EN ESKİ
-- (created_at) clients satırının bağlanmasını garanti eden bir ROW_NUMBER() ayracı ile düzeltiyoruz.
-- (Mevcut veride bu çakışmanın gerçekleştiğine dair bir iz yok — bu saf bir düzeltme/güvence.)

with ranked as (
  select
    c.id,
    u.id as matched_profile_id,
    row_number() over (partition by u.id order by c.created_at asc) as rn
  from public.clients c
  join auth.users u on lower(u.email) = lower(c.email)
  join public.profiles p on p.id = u.id and p.role = 'client'
  where c.profile_id is null
)
update public.clients c
set profile_id = ranked.matched_profile_id, status = 'active'
from ranked
where c.id = ranked.id
  and ranked.rn = 1
  and not exists (select 1 from public.clients c2 where c2.profile_id = ranked.matched_profile_id);
