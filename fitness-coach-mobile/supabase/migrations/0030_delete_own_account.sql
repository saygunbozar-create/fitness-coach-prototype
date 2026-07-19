-- Hesabımı Sil: App Store'un zorunlu tuttuğu, kullanıcının kendi hesabını
-- ve verisini uygulama içinden silebilmesi özelliği.
--
-- Danışan kendi hesabını silerse clients satırı (ve client_id'ye bağlı tüm
-- kilo/ölçüm/fotoğraf/ödeme/seans kaydı, cascade ile) de silinir — sadece
-- login'i değil, o danışana ait tüm veriyi kaldırır.
-- Eğitmen kendi hesabını silerse profiles satırı zaten trainer_id üzerinden
-- clients'a cascade ettiği için ekstra adım gerekmez.

create function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role from public.profiles where id = auth.uid();

  if v_role = 'client' then
    delete from public.clients where profile_id = auth.uid();
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delete_own_account() to authenticated;
