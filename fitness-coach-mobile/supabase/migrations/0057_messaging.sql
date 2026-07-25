-- Eğitmen-danışan arası uygulama içi mesajlaşma.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id),
  client_id uuid not null references public.clients(id),
  sender_role text not null check (sender_role in ('trainer', 'client')),
  body text not null,
  created_at timestamptz not null default now()
);

create index messages_thread_idx on public.messages (trainer_id, client_id, created_at);

alter table public.messages enable row level security;

create policy messages_trainer_select on public.messages
  for select using (trainer_id = auth.uid());

create policy messages_trainer_insert on public.messages
  for insert with check (trainer_id = auth.uid() and sender_role = 'trainer');

create policy messages_client_select on public.messages
  for select using (public.is_owner_client(client_id));

create policy messages_client_insert on public.messages
  for insert with check (public.is_owner_client(client_id) and sender_role = 'client');

-- Mesaj gönderilince karşı tarafa bildirim (aynı desen: notify_trainer_on_weight_log vb.)
create or replace function public.notify_on_message()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_client_profile_id uuid;
  v_client_name text;
  v_trainer_name text;
begin
  select profile_id, name into v_client_profile_id, v_client_name
  from public.clients where id = new.client_id;

  if new.sender_role = 'client' then
    perform public.send_notification(
      new.trainer_id,
      'new_message',
      coalesce(v_client_name, 'Bir danışan') || ' mesaj gönderdi',
      new.body,
      new.client_id
    );
  else
    if v_client_profile_id is not null then
      select name into v_trainer_name from public.profiles where id = new.trainer_id;
      perform public.send_notification(
        v_client_profile_id,
        'new_message',
        coalesce(v_trainer_name, 'Antrenörün') || ' mesaj gönderdi',
        new.body,
        new.client_id
      );
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists on_message_insert on public.messages;
create trigger on_message_insert
  after insert on public.messages
  for each row execute function public.notify_on_message();

revoke execute on function public.notify_on_message() from public;
