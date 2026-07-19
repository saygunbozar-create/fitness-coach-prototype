export const C = {
  bg: '#0B0D12',
  bgOuter: '#05070A',
  card: '#161C26',
  card2: '#1E2632',
  edge: '#2C3644',
  lime: '#C6F94E',
  white: '#F5F7FA',
  grey: '#96A0AC',
  greyD: '#69737F',
  red: '#FF6363',
  blue: '#60A5FA',
  orange: '#FBB040',
} as const;

export const nf = (v: number, d = 0) =>
  v.toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });

// Local calendar date as YYYY-MM-DD. Never use toISOString().slice(0,10) for "today" —
// that reads the UTC date, which is still "yesterday" from local midnight to 3am in
// Turkey (UTC+3) and silently mismatches date-keyed upserts/filters around that window.
export const localDateStr = (d: Date = new Date()) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// Haftalık check-in Cumartesi'den Cumartesi'ye çalışır: bu, verilen tarihi içeren haftanın
// başladığı Cumartesi'nin yerel tarihini döner (o gün Cumartesi ise kendisini döner).
export const checkinWeekStart = (d: Date = new Date()) => {
  const daysSinceSaturday = (d.getDay() + 1) % 7; // Saturday=6 -> 0, Sunday=0 -> 1, ... Friday=5 -> 6
  const start = new Date(d);
  start.setDate(d.getDate() - daysSinceSaturday);
  return localDateStr(start);
};

// Aylık Değerlendirme Anketi'nin ait olduğu ayı, her zaman o ayın 1'i olarak temsil eder.
export const monthPeriodStr = (d: Date = new Date()) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-01`;
};

// Haftalık Ders Takvimi Pazartesi'den Pazar'a çalışır: verilen tarihi içeren haftanın
// Pazartesi'sinin yerel tarihini döner.
export const mondayOfWeek = (d: Date = new Date()) => {
  const daysSinceMonday = (d.getDay() + 6) % 7; // Monday=1 -> 0, Tuesday=2 -> 1, ... Sunday=0 -> 6
  const start = new Date(d);
  start.setDate(d.getDate() - daysSinceMonday);
  return localDateStr(start);
};

export const addDaysToDateStr = (dateStr: string, days: number) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  return localDateStr(date);
};

export const TR_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
] as const;

export const TR_WEEKDAY_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'] as const;

export const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

// Auto-inserts "." separators as the user types digits for a GG.AA.YYYY field, so they
// never have to type the dots themselves. `prev` is the field's current formatted value —
// needed to detect "user just backspaced over an auto-inserted dot" and drop the digit
// before it too, otherwise backspacing appears to do nothing right after a dot.
export const formatDateInputTr = (value: string, prev: string): string => {
  let v = value;
  if (v.length === prev.length - 1 && prev.endsWith('.') && v === prev.slice(0, -1)) {
    v = v.slice(0, -1);
  }
  const digits = v.replace(/\D/g, '').slice(0, 8);
  let out = digits.slice(0, 2);
  if (digits.length > 2) out += '.' + digits.slice(2, 4);
  else if (digits.length === 2) out += '.';
  if (digits.length > 4) out += '.' + digits.slice(4, 8);
  else if (digits.length === 4) out += '.';
  return out;
};

// Same auto-insert behavior as formatDateInputTr, for SS:DD fields (":" instead of ".").
export const formatTimeInputTr = (value: string, prev: string): string => {
  let v = value;
  if (v.length === prev.length - 1 && prev.endsWith(':') && v === prev.slice(0, -1)) {
    v = v.slice(0, -1);
  }
  const digits = v.replace(/\D/g, '').slice(0, 4);
  let out = digits.slice(0, 2);
  if (digits.length > 2) out += ':' + digits.slice(2, 4);
  else if (digits.length === 2) out += ':';
  return out;
};
