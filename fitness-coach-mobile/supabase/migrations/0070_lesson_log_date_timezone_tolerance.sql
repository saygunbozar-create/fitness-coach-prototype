-- 0068'de damgalama şartını `new.log_date = current_date` yazmıştım. HATA: veritabanının
-- saat dilimi UTC, uygulama ise CİHAZIN YEREL tarihini gönderiyor (localDateStr). Türkiye'de
-- gece 00:00–03:00 arasında yerel tarih UTC'den bir gün ileride oluyor; o aralıkta set
-- kaydeden danışan "clients may only stamp log_date once" hatası alıyordu — üstelik
-- workout_logs kaydı çoktan yazılmış oluyordu, yani set kaydediliyor ama ekran hata veriyordu.
--
-- Sabit bir saat dilimine bağlamak yerine ±1 gün tolerans veriyoruz: dünyadaki hiçbir saat
-- dilimi UTC'den bir günden fazla sapmıyor, dolayısıyla bu her yerde çalışıyor. Asıl amaç
-- korunuyor — danışan hâlâ tarihi SONRADAN değiştiremiyor ve 15 Temmuz gibi keyfi bir
-- geçmişe tarih atayamıyor.
create or replace function public.prevent_lesson_client_field_tamper()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if public.is_owner_client(new.client_id) and not public.is_trainer_of_client(new.client_id) then
    if new.workout_day_id is distinct from old.workout_day_id
      or new.lesson_number is distinct from old.lesson_number
      or new.program_id is distinct from old.program_id
      or new.client_id is distinct from old.client_id then
      raise exception 'clients may only change completed/completed_at on program_lessons';
    end if;

    if new.log_date is distinct from old.log_date
       and not (old.log_date is null
                and new.log_date between current_date - 1 and current_date + 1) then
      raise exception 'clients may only stamp log_date once, and only with a current date';
    end if;
  end if;
  return new;
end;
$function$;
