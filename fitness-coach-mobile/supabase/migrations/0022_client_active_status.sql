-- Danışanı silmeden "aktif"/"pasif" (çalışmaya ara vermiş) olarak işaretleme.
-- Not: mevcut "status" kolonu (pending/active) hesap eşleşmesini takip ediyor, bu ayrı bir alan.

alter table public.clients add column if not exists is_active boolean not null default true;
