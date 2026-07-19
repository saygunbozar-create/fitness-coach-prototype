-- "Programı Sil" bir programı silince, ona bağlı workout_days/exercises/logs zaten cascade ile
-- siliniyordu — ama program_lessons (Ders Defteri) da aynı şekilde cascade ile siliniyordu, bu da
-- eğitmenin tamamlanmış ders geçmişini fark etmeden kaybetmesine sebep oluyordu. Bunu artık
-- engelliyoruz: Ders Defteri'nde en az bir ders varken program silinemez; eğitmen önce Ders
-- Defteri'ndeki dersleri silmeli.

alter table public.program_lessons drop constraint if exists program_lessons_program_id_fkey;
alter table public.program_lessons
  add constraint program_lessons_program_id_fkey
  foreign key (program_id) references public.workout_programs (id) on delete restrict;
