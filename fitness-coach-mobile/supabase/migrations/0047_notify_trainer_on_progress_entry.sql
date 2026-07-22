-- Danışan kilo veya ölçüm girdiğinde eğitmene bildirim gönder — notify_trainer_on_checkin
-- ile aynı desen. weight_logs/measurements hem danışan hem eğitmen tarafından
-- yazılabildiği için (eğitmen danışan adına da kilo girebiliyor), sadece GİRİŞİ YAPAN
-- danışansa bildirim gönderiyoruz — eğitmen kendi girdiği veri için kendine bildirim
-- almasın diye is_owner_client kontrolü şart. AFTER INSERT olduğu için aynı tarihe
-- yapılan düzenlemeler (upsert'in ON CONFLICT DO UPDATE yolu) tekrar bildirim üretmez,
-- sadece gerçekten yeni bir tarih girildiğinde tetiklenir.

create or replace function public.notify_trainer_on_weight_log()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_trainer_id uuid;
  v_client_name text;
begin
  if not public.is_owner_client(new.client_id) then
    return new;
  end if;

  select c.trainer_id, c.name into v_trainer_id, v_client_name
  from public.clients c
  where c.id = new.client_id;

  if v_trainer_id is not null then
    perform public.send_notification(
      v_trainer_id,
      'weight_logged',
      'Yeni Kilo Girişi',
      coalesce(v_client_name, 'Bir danışan') || ' yeni bir kilo kaydı girdi.',
      new.client_id
    );
  end if;
  return new;
end;
$function$;

drop trigger if exists on_weight_log_insert on public.weight_logs;
create trigger on_weight_log_insert
  after insert on public.weight_logs
  for each row execute function public.notify_trainer_on_weight_log();

revoke execute on function public.notify_trainer_on_weight_log() from public;

create or replace function public.notify_trainer_on_measurement()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_trainer_id uuid;
  v_client_name text;
begin
  if not public.is_owner_client(new.client_id) then
    return new;
  end if;

  select c.trainer_id, c.name into v_trainer_id, v_client_name
  from public.clients c
  where c.id = new.client_id;

  if v_trainer_id is not null then
    perform public.send_notification(
      v_trainer_id,
      'measurement_logged',
      'Yeni Ölçüm Girişi',
      coalesce(v_client_name, 'Bir danışan') || ' yeni bir ölçüm kaydı girdi.',
      new.client_id
    );
  end if;
  return new;
end;
$function$;

drop trigger if exists on_measurement_insert on public.measurements;
create trigger on_measurement_insert
  after insert on public.measurements
  for each row execute function public.notify_trainer_on_measurement();

revoke execute on function public.notify_trainer_on_measurement() from public;
