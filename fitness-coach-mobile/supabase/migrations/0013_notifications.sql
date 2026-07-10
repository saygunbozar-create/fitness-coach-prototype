-- Bildirim merkezi: uygulama içi bildirim listesi + push gönderimini tek yerden yöneten yardımcı fonksiyon

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  client_id uuid references public.clients (id) on delete set null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "notifications_own" on public.notifications
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create index if not exists notifications_profile_created_idx on public.notifications (profile_id, created_at desc);

-- Tek bir bildirimi hem notifications tablosuna yazar hem de (varsa) push token'ına gönderir.
create or replace function public.send_notification(
  p_profile_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_client_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  insert into public.notifications (profile_id, type, title, body, client_id)
  values (p_profile_id, p_type, p_title, p_body, p_client_id);

  select push_token into v_token from public.profiles where id = p_profile_id;
  if v_token is not null then
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json'),
      body := jsonb_build_object('to', v_token, 'title', p_title, 'body', p_body)
    );
  end if;
end;
$$;

-- Danışan check-in gönderdiğinde antrenöre bildir (0012'deki fonksiyonu ortak yardımcıyı kullanacak şekilde günceller)
create or replace function public.notify_trainer_on_checkin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trainer_id uuid;
  v_client_name text;
begin
  select c.trainer_id, c.name into v_trainer_id, v_client_name
  from public.clients c
  where c.id = new.client_id;

  if v_trainer_id is not null then
    perform public.send_notification(
      v_trainer_id,
      'checkin_submitted',
      'Yeni Haftalık Check-in',
      coalesce(v_client_name, 'Bir danışan') || ' check-in gönderdi.',
      new.client_id
    );
  end if;
  return new;
end;
$$;

-- Bu tetikleyici 0012'de de oluşturulmuştu; burada tekrar tanımlamak 0013'ü 0012'den
-- bağımsız çalıştırılabilir (idempotent) hale getirir.
drop trigger if exists on_checkin_insert on public.checkins;
create trigger on_checkin_insert
  after insert on public.checkins
  for each row execute function public.notify_trainer_on_checkin();

-- Ödeme hatırlatma cron görevi: hem trainer hem client'a ayrı ayrı, kişiselleştirilmiş bildirim + push
create or replace function public.send_payment_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select p.amount, p.date, c.id as client_id, c.trainer_id, c.profile_id as client_profile_id, c.name as client_name
    from public.payments p
    join public.clients c on c.id = p.client_id
    where p.date = current_date + 1 and p.paid = false
  loop
    if r.trainer_id is not null then
      perform public.send_notification(
        r.trainer_id,
        'payment_due',
        'Ödeme Hatırlatıcısı',
        coalesce(r.client_name, 'Bir danışan') || ' için yarın ' || r.amount || ' ₺ ödeme günü.',
        r.client_id
      );
    end if;
    if r.client_profile_id is not null then
      perform public.send_notification(
        r.client_profile_id,
        'payment_due',
        'Ödeme Hatırlatıcısı',
        'Yarın ' || r.amount || ' ₺ ödeme günün var.',
        r.client_id
      );
    end if;
  end loop;
end;
$$;

-- Yeni ödeme kaydı eklendiğinde danışana bildir
create or replace function public.notify_client_on_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_profile uuid;
begin
  select profile_id into v_client_profile from public.clients where id = new.client_id;
  if v_client_profile is not null then
    perform public.send_notification(
      v_client_profile,
      'payment_added',
      'Yeni Ödeme Kaydı',
      new.amount || ' ₺ tutarında bir ödeme kaydı eklendi.',
      new.client_id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_payment_insert on public.payments;
create trigger on_payment_insert
  after insert on public.payments
  for each row execute function public.notify_client_on_payment();

-- Yeni paket tanımlandığında danışana bildir
create or replace function public.notify_client_on_package()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_profile uuid;
begin
  select profile_id into v_client_profile from public.clients where id = new.client_id;
  if v_client_profile is not null then
    perform public.send_notification(
      v_client_profile,
      'package_added',
      'Yeni Paket Tanımlandı',
      new.name || ' — ' || new.total_sessions || ' seans',
      new.client_id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_package_insert on public.client_packages;
create trigger on_package_insert
  after insert on public.client_packages
  for each row execute function public.notify_client_on_package();
