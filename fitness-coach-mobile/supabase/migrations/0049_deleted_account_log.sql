-- Bir kullanıcı "Hesabımı Sil" ile kendi hesabını sildiğinde auth.users ve clients
-- satırları KALICI OLARAK siliniyor — hiçbir iz kalmıyor. Bu, eğitmenin "danışanım
-- hesabını ne zaman sildi" diye sormasına yanıt bulamamamıza yol açtı (sadece Supabase'in
-- kısa ömürlü auth loglarından, dolaylı yoldan çıkarabildik). Silme işleminden HEMEN ÖNCE
-- ad/e-posta/rol/tarih bilgisini kalıcı bir kayda yazıyoruz — sadece ilgili eğitmen kendi
-- danışanlarının kaydını görebiliyor.

create table public.deleted_account_log (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('trainer', 'client')),
  name text not null,
  email text not null,
  trainer_id uuid,
  deleted_at timestamptz not null default now()
);

alter table public.deleted_account_log enable row level security;

create policy "deleted_account_log_trainer_read" on public.deleted_account_log
  for select using (trainer_id = auth.uid());

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_role text;
  v_name text;
  v_email text;
  v_trainer_id uuid;
begin
  select p.role, p.name into v_role, v_name from public.profiles p where p.id = auth.uid();
  select u.email into v_email from auth.users u where u.id = auth.uid();

  if v_role = 'client' then
    select c.trainer_id into v_trainer_id from public.clients c where c.profile_id = auth.uid();
  end if;

  insert into public.deleted_account_log (role, name, email, trainer_id)
  values (coalesce(v_role, 'unknown'), coalesce(v_name, ''), coalesce(v_email, ''), v_trainer_id);

  if v_role = 'client' then
    delete from public.clients where profile_id = auth.uid();
  end if;

  delete from auth.users where id = auth.uid();
end;
$function$;
