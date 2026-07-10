-- Danışan haftalık check-in gönderdiğinde antrenöre anlık bildirim

create or replace function public.notify_trainer_on_checkin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_client_name text;
begin
  select tr.push_token, c.name into v_token, v_client_name
  from public.clients c
  join public.profiles tr on tr.id = c.trainer_id
  where c.id = new.client_id;

  if v_token is not null then
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json'),
      body := jsonb_build_object(
        'to', v_token,
        'title', 'Yeni Haftalık Check-in',
        'body', coalesce(v_client_name, 'Bir danışan') || ' check-in gönderdi.'
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_checkin_insert on public.checkins;
create trigger on_checkin_insert
  after insert on public.checkins
  for each row execute function public.notify_trainer_on_checkin();
