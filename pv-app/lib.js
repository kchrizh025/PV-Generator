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
// "10-2026-021" -> {month:10, year:2026, seq:21}, or null if it is not in that format
function parsePV(pv) {
  const m = /^(\d{1,2})-(\d{4})-(\d{1,9})$/.exec(String(pv == null ? '' : pv).trim());
  return m ? { month: +m[1], year: +m[2], seq: +m[3] } : null;
}
// Chronological comparison: year, then month, then sequence. Unparseable numbers go last.
function comparePV(a, b) {
  const x = parsePV(a), y = parsePV(b);
  if (!x || !y) return x ? -1 : y ? 1 : String(a).localeCompare(String(b));
  return x.year - y.year || x.month - y.month || x.seq - y.seq;
}
// Next PV No. for a voucher dated `date` (YYYY-MM-DD).
//   monthMax  = highest sequence already used in that voucher's month
//   globalMax = highest sequence used anywhere (only needed when reset is false)
//   seed      = "last PV used" setting, used until that month has vouchers
function nextPV({ monthMax = 0, globalMax = 0, seed = '', reset = true, date }) {
  const [y, m] = date.split('-');
  const sd = parsePV(seed);
  const base = reset
    ? Math.max(monthMax, sd && sd.year === +y && sd.month === +m ? sd.seq : 0)
    : Math.max(globalMax, sd ? sd.seq : 0);
  return m + '-' + y + '-' + String(base + 1).padStart(3, '0');
}
module.exports = { amtWords, parseCents, today, parsePV, comparePV, nextPV };
