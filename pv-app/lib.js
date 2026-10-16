// Pure helpers: amount in words, PV numbering, dates. No I/O.
const O = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const T = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function hundreds(n) {
  let s = '';
  if (n >= 100) { s = O[Math.floor(n / 100)] + ' Hundred'; n %= 100; if (n) s += ' '; }
  if (n >= 20) s += T[Math.floor(n / 10)] + (n % 10 ? '-' + O[n % 10] : '');
  else if (n) s += O[n];
  return s;
}
function intWords(n) {
  if (n === 0) return 'Zero';
  const sc = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];
  const parts = []; let i = 0;
  while (n > 0) { const c = n % 1000; if (c) parts.unshift(hundreds(c) + (sc[i] ? ' ' + sc[i] : '')); n = Math.floor(n / 1000); i++; }
  return parts.join(' ');
}
function amtWords(cents) {
  const p = Math.floor(cents / 100), q = cents % 100, out = [];
  if (p > 0) out.push(intWords(p) + (p === 1 ? ' Peso' : ' Pesos'));
  if (q > 0) out.push(intWords(q) + (q === 1 ? ' Centavo' : ' Centavos'));
  return out.join(' and ') + ' Only';
}
// "2,700" / "2700.5" / 2700 -> integer centavos, or NaN
function parseCents(v) {
  const s = String(v == null ? '' : v).replace(/[^\d.]/g, '');
  if (!s || s === '.' || (s.match(/\./g) || []).length > 1) return NaN;
  const n = Math.round(parseFloat(s) * 100);
  return n > 0 && n < 1e14 ? n : NaN;
}
// YYYY-MM-DD in the given IANA timezone
function today(tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
// Next PV No. like 10-2026-021, following `last` (or `seed` if there is no voucher yet)
function nextPV({ last, seed, reset, date }) {
  const [y, m] = date.split('-');
  const pre = m + '-' + y;
  const src = (last || seed || '').trim();
  const mm = /^(\d{1,2})-(\d{4})-(\d+)$/.exec(src);
  if (!mm) return pre + '-001';
  const same = mm[1].padStart(2, '0') + '-' + mm[2] === pre;
  const w = Math.max(3, mm[3].length);
  const n = same || !reset ? parseInt(mm[3], 10) + 1 : 1;
  return pre + '-' + String(n).padStart(w, '0');
}
module.exports = { amtWords, parseCents, today, nextPV };
