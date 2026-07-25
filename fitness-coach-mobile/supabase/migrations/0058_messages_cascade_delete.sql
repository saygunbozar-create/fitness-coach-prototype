-- messages.trainer_id/client_id FK'leri ON DELETE belirtilmeden oluşturulmuştu (varsayılan
-- NO ACTION), bu yüzden mesaj geçmişi olan bir eğitmen/danışan kendi hesabını silemiyordu
-- (delete_own_account() -> auth.users silme -> profiles/clients cascade -> messages FK hatası).
-- Diğer tüm client_id/trainer_id ilişkili tablolarla aynı desene getiriliyor: hesap silinince
-- o kişinin mesajları da birlikte silinir.
alter table public.messages drop constraint messages_trainer_id_fkey;
alter table public.messages add constraint messages_trainer_id_fkey
  foreign key (trainer_id) references public.profiles(id) on delete cascade;

alter table public.messages drop constraint messages_client_id_fkey;
alter table public.messages add constraint messages_client_id_fkey
  foreign key (client_id) references public.clients(id) on delete cascade;
