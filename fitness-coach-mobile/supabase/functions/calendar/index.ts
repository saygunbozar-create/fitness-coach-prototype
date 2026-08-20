// Apple/Google Takvim aboneliği (ICS feed).
//
// Neden edge function: takvim uygulamaları adrese istek atarken Authorization başlığı
// gönderemiyor, dolayısıyla normal Supabase REST + RLS yolu kullanılamıyor. Bu fonksiyon
// verify_jwt=false ile yayınlanıyor ve kimlik doğrulamayı KENDİSİ yapıyor:
// ?token=<profiles.calendar_token> (gen_random_uuid, 122 bit). Token yalnızca tek bir profile
// çözülüyor ve o profilin göreceği kayıtlar servis rolüyle sunucu tarafında filtreleniyor —
// istemciye asla ham tablo erişimi verilmiyor.
//
// İçerik bilinçli olarak asgari tutuldu: tarih/saat + karşı tarafın adı. Sağlık formu, ölçüm,
// ödeme gibi hiçbir hassas veri buraya girmiyor (adres sızarsa görülebilecek şey ders saatleri).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const TZID = 'Europe/Istanbul';
const DEFAULT_MINUTES = 60; // lesson_schedule süre tutmuyor; ders uzunluğu varsayılanı

// ICS metin kaçışı (RFC 5545): ters bölü, noktalı virgül, virgül ve satır sonu.
function esc(s: string): string {
  return String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}


// RFC 5545 §3.1: bir içerik satırı 75 OKTETİ aşamaz; aşarsa CRLF + tek boşlukla katlanır.
// Sayım karakter değil BAYT üzerinden yapılıyor — Türkçe harfler UTF-8'de 2 bayt, yani
// "Çağrı Şahin" gibi bir danışan adında karakter saymak sınırı yine aşardı. Katlama kod
// noktası sınırında yapılıyor ki bir karakter ortadan ikiye bölünmesin.
function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let cur = '';
  let curBytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    // Devam satırları baştaki boşlukla birlikte 75'i geçmemeli, o yüzden onlarda sınır 74.
    const limit = parts.length === 0 ? 75 : 74;
    if (curBytes + b > limit) {
      parts.push(cur);
      cur = '';
      curBytes = 0;
    }
    cur += ch;
    curBytes += b;
  }
  if (cur) parts.push(cur);
  return parts.join('\r\n ');
}

// Satırları katlayıp birleştirir. SON satır da CRLF ile bitmek ZORUNDA (RFC 5545) —
// eksikliği Google Takvim'in aboneliği sessizce boş çekmesine yol açıyordu.
function buildIcs(lines: string[]): string {
  return lines.map(fold).join('\r\n') + '\r\n';
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// "2026-07-29" + "21:00:00" -> "20260729T210000" (yerel saat, TZID ile birlikte kullanılıyor)
function localStamp(date: string, time: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.slice(0, 5).split(':').map(Number);
  return `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`;
}

function addMinutes(date: string, time: string, minutes: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.slice(0, 5).split(':').map(Number);
  // Ay/gün taşmasını doğru yapmak için UTC tabanlı aritmetik; sadece takvim hesabı, saat dilimi
  // dönüşümü DEĞİL (çıktı yine yerel damga olarak yazılıyor).
  const base = Date.UTC(y, m - 1, d, hh, mm) + minutes * 60_000;
  const dt = new Date(base);
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00`;
}

function icsResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'Content-Disposition': 'inline; filename="coachbook.ics"',
    },
  });
}

// Boş ama geçerli bir takvim: geçersiz token'da bile 200 + boş takvim dönüyoruz. Böylece
// "bu token var mı yok mu" bilgisini sızdırmıyoruz ve takvim uygulamaları hata döngüsüne girmiyor.
function emptyCalendar(): Response {
  return icsResponse(
    buildIcs(['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Coachbook//TR', 'CALSCALE:GREGORIAN', 'END:VCALENDAR'])
  );
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return emptyCalendar();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, name')
    .eq('calendar_token', token)
    .maybeSingle();
  if (!profile) return emptyCalendar();

  // Geçmişi tamamen boşaltmamak için son 30 günü de veriyoruz.
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  let rows: { id: string; date: string; time: string; other: string }[] = [];

  if (profile.role === 'trainer') {
    const { data } = await supabase
      .from('lesson_schedule')
      .select('id, date, time, clients(name)')
      .eq('trainer_id', profile.id)
      .gte('date', since)
      .order('date');
    rows = (data ?? []).map((r: any) => ({ id: r.id, date: r.date, time: r.time, other: r.clients?.name ?? '' }));
  } else {
    // Danışan: kendi clients satırı üzerinden, antrenörünün adıyla.
    const { data: clientRows } = await supabase
      .from('clients')
      .select('id, profiles!clients_trainer_id_fkey(name)')
      .eq('profile_id', profile.id);
    const ids = (clientRows ?? []).map((c: any) => c.id);
    if (!ids.length) return emptyCalendar();
    const trainerName = (clientRows as any[])[0]?.profiles?.name ?? '';
    const { data } = await supabase
      .from('lesson_schedule')
      .select('id, date, time')
      .in('client_id', ids)
      .gte('date', since)
      .order('date');
    rows = (data ?? []).map((r: any) => ({ id: r.id, date: r.date, time: r.time, other: trainerName }));
  }

  const now = new Date();
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Coachbook//TR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Coachbook',
    `X-WR-TIMEZONE:${TZID}`,
    // Türkiye 2016'dan beri kalıcı UTC+3 (yaz saati uygulaması yok).
    'BEGIN:VTIMEZONE',
    `TZID:${TZID}`,
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0300',
    'TZOFFSETTO:+0300',
    'TZNAME:+03',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];

  for (const r of rows) {
    const title = r.other ? `Antrenman · ${r.other}` : 'Antrenman';
    lines.push(
      'BEGIN:VEVENT',
      `UID:${r.id}@coachbook`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=${TZID}:${localStamp(r.date, r.time)}`,
      `DTEND;TZID=${TZID}:${addMinutes(r.date, r.time, DEFAULT_MINUTES)}`,
      `SUMMARY:${esc(title)}`,
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return icsResponse(buildIcs(lines));
});
