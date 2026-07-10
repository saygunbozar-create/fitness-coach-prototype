-- Ödemeler: gelecek tarihli/planlı ödemeleri destekle

alter table public.payments
  add column paid boolean not null default true;
