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
