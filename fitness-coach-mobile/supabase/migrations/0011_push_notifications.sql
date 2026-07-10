-- Push bildirimleri: cihaz token'ı + ödeme hatırlatma cron görevi

alter table public.profiles add column if not exists push_token text;

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.send_payment_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tokens text[];
begin
  select array_agg(distinct t) into tokens
  from (
    select tr.push_token as t
    from public.payments p
    join public.clients c on c.id = p.client_id
    join public.profiles tr on tr.id = c.trainer_id
    where p.date = current_date + 1 and p.paid = false and tr.push_token is not null

    union

    select cl.push_token as t
    from public.payments p
    join public.clients c on c.id = p.client_id
    join public.profiles cl on cl.id = c.profile_id
    where p.date = current_date + 1 and p.paid = false and cl.push_token is not null
  ) x;

  if tokens is not null and array_length(tokens, 1) > 0 then
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json'),
      body := jsonb_build_object(
        'to', tokens,
        'title', 'Ödeme Hatırlatıcısı',
        'body', 'Yarın için planlı bir ödeme var.'
      )
    );
  end if;
end;
$$;

select cron.unschedule(jobid) from cron.job where jobname = 'payment-reminders-daily';

select cron.schedule(
  'payment-reminders-daily',
  '0 7 * * *',
  $$select public.send_payment_reminders();$$
);
