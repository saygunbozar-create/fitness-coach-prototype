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
