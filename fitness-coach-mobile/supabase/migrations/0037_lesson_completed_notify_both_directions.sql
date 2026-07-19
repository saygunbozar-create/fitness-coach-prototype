-- Bug: notify_trainer_on_lesson_completed() (0033) HER ZAMAN eğitmeni bildiriyordu, dersi kimin
-- tamamladığına bakmadan. Bu, sadece "danışan kendi dersini tamamlar" akışı için doğruydu.
-- Sonradan eğitmenin de "Dersi Bitir" ile dersi kapatabildiği eklendi (Ders Defteri) — bu durumda
-- eğitmen kendi kendine bildirim alıyor, danışana ise HİÇBİR bildirim gitmiyordu.
--
-- Artık kimin tamamladığına (auth.uid()) bakılıyor: danışan tamamladıysa eğitmen bildirilir
-- (eskisi gibi), eğitmen tamamladıysa danışan bildirilir.

create or replace function public.notify_trainer_on_lesson_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trainer_id uuid;
  v_client_profile_id uuid;
  v_client_name text;
begin
  if new.completed = true and old.completed = false then
    select c.trainer_id, c.profile_id, c.name into v_trainer_id, v_client_profile_id, v_client_name
    from public.clients c where c.id = new.client_id;

    if v_trainer_id is not null and auth.uid() = v_trainer_id then
      if v_client_profile_id is not null then
        perform public.send_notification(v_client_profile_id, 'lesson_completed', 'Ders Tamamlandı',
          new.lesson_number || '. dersin antrenörün tarafından tamamlandı olarak işaretlendi.',
          new.client_id);
      end if;
    elsif v_trainer_id is not null then
      perform public.send_notification(v_trainer_id, 'lesson_completed', 'Ders Tamamlandı',
        coalesce(v_client_name, 'Bir danışan') || ' ' || new.lesson_number || '. dersi uyguladı olarak işaretledi.',
        new.client_id);
    end if;
  end if;
  return new;
end;
$$;
