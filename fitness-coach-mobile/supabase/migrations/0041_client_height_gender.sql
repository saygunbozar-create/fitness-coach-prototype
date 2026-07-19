-- Danışan profiline boy (cm) ve cinsiyet eklendi. BMI, boy + (varsa) en son kayıtlı kilodan
-- (yoksa başlangıç kilosundan) istemci tarafında hesaplanıyor, ayrı bir kolon tutulmuyor.

alter table public.clients add column if not exists height numeric not null default 0;
alter table public.clients add column if not exists gender text not null default 'Erkek';
