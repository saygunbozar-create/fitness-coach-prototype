-- Kullanıcı isteği üzerine geri alındı: silinen hesap kaydı (migration 0049) kaldırılıyor.
-- delete_own_account() 0049 öncesi haline dönüyor, deleted_account_log tablosu siliniyor.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_role text;
begin
  select role into v_role from public.profiles where id = auth.uid();

  if v_role = 'client' then
    delete from public.clients where profile_id = auth.uid();
  end if;

  delete from auth.users where id = auth.uid();
end;
$function$;

drop table if exists public.deleted_account_log;
