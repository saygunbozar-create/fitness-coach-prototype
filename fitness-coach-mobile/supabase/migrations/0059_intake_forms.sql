-- Danışan kayıt formu: PAR-Q sağlık taraması + sorumluluk feragatnamesi (e-imza olarak yazılı ad).
create table public.intake_forms (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.clients(id) on delete cascade,
  parq_answers jsonb not null,
  health_notes text not null default '',
  waiver_signature_name text not null,
  submitted_at timestamptz not null default now()
);

alter table public.intake_forms enable row level security;

create policy intake_forms_trainer_select on public.intake_forms
  for select using (
    exists (select 1 from public.clients c where c.id = intake_forms.client_id and c.trainer_id = auth.uid())
  );

create policy intake_forms_client_select on public.intake_forms
  for select using (public.is_owner_client(client_id));

create policy intake_forms_client_insert on public.intake_forms
  for insert with check (public.is_owner_client(client_id));
