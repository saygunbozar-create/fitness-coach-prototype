-- Aylık beslenme planı: "meals" tablosu şimdiye kadar tek bir sabit şablon (client_id başına,
-- her gün aynı öğünler) tutuyordu. Trainer'ın ayın her günü için ayrı bir plan yazabilmesi
-- için nullable bir plan_date ekliyoruz: plan_date null olan satırlar mevcut günlük/şablon
-- öğünler (davranış değişmiyor), plan_date dolu olanlar belirli bir takvim gününe ait
-- aylık plan öğünleridir.

alter table public.meals add column if not exists plan_date date;
create index if not exists meals_plan_date_idx on public.meals (client_id, plan_date);
