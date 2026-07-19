-- Eğitmen bir ödemeyi "Ödendi" olarak işaretlediğinde danışana bildirim gitmiyordu —
-- yalnızca YENİ ödeme kaydı eklendiğinde bildirim gönderen tetikleyici vardı
-- (notify_client_on_payment, on_payment_insert). Bu, mevcut bir kaydın paid alanı
-- false'tan true'ya geçtiğinde de bildirim gönderen ayrı bir tetikleyici ekler.

create or replace function public.notify_client_on_payment_paid()
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
      'payment_paid',
      'Ödeme Alındı',
      new.amount || ' ₺ tutarındaki ödemen alındı olarak işaretlendi.',
      new.client_id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_payment_marked_paid on public.payments;
create trigger on_payment_marked_paid
  after update of paid on public.payments
  for each row
  when (old.paid = false and new.paid = true)
  execute function public.notify_client_on_payment_paid();
