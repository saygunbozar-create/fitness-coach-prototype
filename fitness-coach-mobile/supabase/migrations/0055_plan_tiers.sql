-- Eğitmenlere satılacak paket kademeleri (danışan sayısı sınırına göre).
create table public.plan_tiers (
  tier text primary key,
  label text not null,
  client_limit integer, -- null = sınırsız
  sort_order integer not null
);

alter table public.plan_tiers enable row level security;

create policy plan_tiers_select_all on public.plan_tiers
  for select using (true);

insert into public.plan_tiers (tier, label, client_limit, sort_order) values
  ('ucretsiz', 'Ücretsiz', 3, 0),
  ('baslangic', 'Başlangıç', 20, 1),
  ('profesyonel', 'Profesyonel', 50, 2),
  ('sinirsiz', 'Sınırsız', null, 3);

alter table public.profiles
  add column plan_tier text not null default 'ucretsiz' references public.plan_tiers(tier);

-- Bu sınır sistemi eklenmeden önce var olan eğitmenler aniden bir engelle
-- karşılaşmasın diye Sınırsız'a alınıyor. Yeni kaydolan eğitmenler Ücretsiz'den başlar.
update public.profiles set plan_tier = 'sinirsiz' where role = 'trainer';

create or replace function public.enforce_client_limit()
returns trigger
language plpgsql
set search_path = 'public'
as $$
declare
  v_limit integer;
  v_count integer;
begin
  select pt.client_limit into v_limit
  from public.profiles p
  join public.plan_tiers pt on pt.tier = p.plan_tier
  where p.id = new.trainer_id;

  if v_limit is not null then
    select count(*) into v_count from public.clients where trainer_id = new.trainer_id;
    if v_count >= v_limit then
      raise exception 'Paket danışan sınırınıza ulaştınız (% danışan). Daha fazla danışan eklemek için paketinizi yükseltin.', v_limit;
    end if;
  end if;

  return new;
end;
$$;

create trigger clients_enforce_limit
  before insert on public.clients
  for each row execute function public.enforce_client_limit();
