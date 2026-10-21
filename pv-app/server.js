const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const L = require('./lib');

const need = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_USER', 'ADMIN_PASSWORD', 'JWT_SECRET'];
const missing = need.filter(k => !process.env[k]);
if (missing.length) { console.error('Missing environment variables: ' + missing.join(', ')); process.exit(1); }
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_USER, ADMIN_PASSWORD, JWT_SECRET } = process.env;
const TZ = process.env.APP_TIMEZONE || 'Asia/Manila';
const PROD = process.env.NODE_ENV === 'production';

// Service-role key stays on the server only. Never send it to the browser.
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const app = express();
app.set('trust proxy', 1);
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin' });
  next();
});
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

/* ---------- auth (single admin from env vars, JWT in httpOnly cookie) ---------- */
const sha = s => crypto.createHash('sha256').update(String(s == null ? '' : s)).digest();
const same = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Try again in 15 minutes.' } });

app.post('/api/login', loginLimiter, (req, res) => {
  const { username, password } = req.body || {};
  const okU = same(username, ADMIN_USER), okP = same(password, ADMIN_PASSWORD);
  if (!(okU && okP)) return res.status(401).json({ error: 'Wrong username or password.' });
  const token = jwt.sign({ u: ADMIN_USER }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('pv_session', token, { httpOnly: true, sameSite: 'lax', secure: PROD, maxAge: 7 * 864e5 });
  res.json({ ok: true });
});
app.post('/api/logout', (req, res) => { res.clearCookie('pv_session'); res.json({ ok: true }); });
function auth(req, res, next) {
  try { jwt.verify(req.cookies.pv_session, JWT_SECRET); next(); }
  catch (e) { res.status(401).json({ error: 'Not signed in.' }); }
}
app.get('/api/me', auth, (req, res) => res.json({ ok: true }));

/* ---------- data helpers ---------- */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const toApi = r => ({ id: r.id, pv: r.pv_no, date: r.voucher_date, cents: Number(r.amount_cents), words: r.amount_words, purpose: r.purpose || '', requester: r.requester || '', category: r.category || '', createdAt: r.created_at });
const ah = fn => (req, res) => fn(req, res).catch(e => { console.error(e); res.status(500).json({ error: 'Database error. Check the server logs.' }); });

async function getSettings() {
  const { data, error } = await db.from('settings').select('*').eq('id', 1).maybeSingle();
  if (error) throw error;
  return { seed: (data && data.seed) || '', reset: !data || data.reset_monthly !== false };
}
// Highest PV sequence number, optionally narrowed by a filter (e.g. one month)
async function topSeq(narrow) {
  let q = db.from('vouchers').select('pv_seq').not('pv_seq', 'is', null);
  if (narrow) q = narrow(q);
  const { data, error } = await q.order('pv_seq', { ascending: false }).limit(1);
  if (error) throw error;
  return data && data[0] ? Number(data[0].pv_seq) : 0;
}
// Next number is based on the voucher's own month, so backdated vouchers number correctly
async function nextNumber(date, s) {
  const [y, m] = date.split('-').map(Number);
  const monthMax = await topSeq(q => q.eq('pv_year', y).eq('pv_month', m));
  const globalMax = s.reset ? 0 : await topSeq();
  return L.nextPV({ monthMax, globalMax, seed: s.seed, reset: s.reset, date });
}

// Sorting / filtering. Every sort is chronological by PV No. as the tie-breaker.
const PVCOLS = ['pv_year', 'pv_month', 'pv_seq'];
const SORTS = {
  pv: PVCOLS,
  date: ['voucher_date', ...PVCOLS],
  requester: ['requester_norm', 'voucher_date', ...PVCOLS],
  amount: ['amount_cents', ...PVCOLS]
};
const isDay = d => /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d));
function listParams(q) {
  q = q || {};
  return {
    sort: SORTS[q.sort] ? q.sort : 'pv',
    asc: String(q.dir || 'asc').toLowerCase() !== 'desc',   // default: oldest first
    requester: String(q.requester || '').trim().toLowerCase(),
    from: isDay(String(q.from || '')) ? String(q.from) : '',
    to: isDay(String(q.to || '')) ? String(q.to) : ''
  };
}
async function allVouchers(params) { // Supabase returns max 1000 rows per request, so page through
  const p = listParams(params), out = [];
  for (let start = 0; ; start += 1000) {
    let q = db.from('vouchers').select('*');
    if (p.requester) q = q.eq('requester_norm', p.requester);
    if (p.from) q = q.gte('voucher_date', p.from);
    if (p.to) q = q.lte('voucher_date', p.to);
    for (const c of SORTS[p.sort]) q = q.order(c, { ascending: p.asc, nullsFirst: false });
    q = q.order('created_at', { ascending: p.asc }).order('id', { ascending: p.asc });
    const { data, error } = await q.range(start, start + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out.map(toApi);
}

const cleanCat = v => String(v || '').replace(/\s+/g, ' ').trim().slice(0, 80);
async function catMap() { // lowercase -> first-used spelling
  const m = new Map();
  for (const v of await allVouchers()) { const c = cleanCat(v.category); if (c && !m.has(c.toLowerCase())) m.set(c.toLowerCase(), c); }
  return m;
}
const canon = (m, v) => { const c = cleanCat(v) || 'Uncategorized'; return m.get(c.toLowerCase()) || c; };

/* ---------- API ---------- */
app.get('/api/vouchers', auth, ah(async (req, res) => res.json(await allVouchers(req.query))));

app.get('/api/next-pv', auth, ah(async (req, res) => {
  const date = isDay(String(req.query.date || '')) ? String(req.query.date) : L.today(TZ);
  res.json({ pv: await nextNumber(date, await getSettings()) });
}));

app.post('/api/vouchers', auth, ah(async (req, res) => {
  const b = req.body || {};
  const purpose = String(b.purpose || '').trim().slice(0, 1000);
  const requester = String(b.requester || '').trim().slice(0, 200);
  const cents = L.parseCents(b.amount);
  const date = b.date ? String(b.date) : L.today(TZ);
  const manual = String(b.pv || '').trim().slice(0, 40);
  const category = canon(await catMap(), b.category);
  if (!purpose || !requester) return res.status(400).json({ error: 'Purpose and requester are required.' });
  if (!Number.isFinite(cents)) return res.status(400).json({ error: 'Enter a valid amount greater than zero.' });
  if (!isDay(date)) return res.status(400).json({ error: 'Invalid date.' });

  const s = await getSettings();
  for (let i = 0; i < 6; i++) { // retry if two requests grab the same number
    const pv = manual || await nextNumber(date, s);
    const { data, error } = await db.from('vouchers')
      .insert({ pv_no: pv, voucher_date: date, amount_cents: cents, amount_words: L.amtWords(cents), purpose, requester, category })
      .select().single();
    if (!error) return res.status(201).json(toApi(data));
    if (error.code === '23505') {
      if (manual) return res.status(409).json({ error: 'PV No. ' + pv + ' already exists.' });
      continue;
    }
    throw error;
  }
  res.status(409).json({ error: 'Could not assign a PV number. Please try again.' });
}));

app.patch('/api/vouchers/:id', auth, ah(async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(400).json({ error: 'Bad id.' });
  if (!cleanCat((req.body || {}).category)) return res.status(400).json({ error: 'Enter a category.' });
  const category = canon(await catMap(), req.body.category);
  const { error } = await db.from('vouchers').update({ category }).eq('id', req.params.id);
  if (error) throw error;
  res.json({ ok: true, category });
}));
app.post('/api/vouchers-category', auth, ah(async (req, res) => {
  const ids = Array.isArray((req.body || {}).ids) ? req.body.ids.filter(i => UUID.test(i)).slice(0, 500) : [];
  if (!ids.length || !cleanCat(req.body.category)) return res.status(400).json({ error: 'Select vouchers and enter a category.' });
  const category = canon(await catMap(), req.body.category);
  const { error } = await db.from('vouchers').update({ category }).in('id', ids);
  if (error) throw error;
  res.json({ ok: true, category, updated: ids.length });
}));
app.delete('/api/vouchers/:id', auth, ah(async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(400).json({ error: 'Bad id.' });
  const { error } = await db.from('vouchers').delete().eq('id', req.params.id);
  if (error) throw error;
  res.json({ ok: true });
}));

app.get('/api/settings', auth, ah(async (req, res) => res.json(await getSettings())));
app.put('/api/settings', auth, ah(async (req, res) => {
  const seed = String((req.body || {}).seed || '').trim().slice(0, 40);
  const reset = (req.body || {}).reset !== false;
  const { error } = await db.from('settings').upsert({ id: 1, seed, reset_monthly: reset });
  if (error) throw error;
  res.json({ seed, reset });
}));

const day = () => L.today(TZ);
app.get('/api/export.csv', auth, ah(async (req, res) => {
  const q = v => { v = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
  const rows = [['PV No.', 'Date', 'Requested by', 'Category', 'Purpose', 'Amount', 'Amount in Words', 'Generated at']]
    .concat((await allVouchers(req.query)).map(v => [v.pv, v.date, v.requester, v.category, v.purpose, (v.cents / 100).toFixed(2), v.words, v.createdAt]));
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="PV-log-' + day() + '.csv"' });
  res.send('\ufeff' + rows.map(r => r.map(q).join(',')).join('\r\n'));
}));
app.get('/api/backup.json', auth, ah(async (req, res) => {
  res.set({ 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="PV-backup-' + day() + '.json"' });
  res.send(JSON.stringify({ logs: await allVouchers(), st: await getSettings() }, null, 1));
}));
app.post('/api/import', auth, ah(async (req, res) => {
  const input = Array.isArray((req.body || {}).logs) ? req.body.logs : [];
  const key = pv => { const p = L.parsePV(pv); return p ? p.year + '-' + p.month + '-' + p.seq : pv.toLowerCase(); };
  const cm = await catMap();
  const have = new Set((await allVouchers()).map(v => key(v.pv)));
  const rows = []; let skipped = 0;
  for (const r of input) {
    const pv = String((r && r.pv) || '').trim(), cents = Number(r && r.cents);
    const date = String((r && r.date) || '');
    if (!pv || !Number.isInteger(cents) || cents <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || have.has(key(pv))) { skipped++; continue; }
    have.add(key(pv));
    const row = { pv_no: pv, voucher_date: date, amount_cents: cents, amount_words: L.amtWords(cents), purpose: String(r.purpose || '').slice(0, 1000) || '-', requester: String(r.requester || '').slice(0, 200) || '-', category: canon(cm, r.category) };
    if (!cm.has(row.category.toLowerCase())) cm.set(row.category.toLowerCase(), row.category);
    if (r.createdAt && !isNaN(Date.parse(r.createdAt))) row.created_at = new Date(r.createdAt).toISOString();
    rows.push(row);
  }
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await db.from('vouchers').insert(rows.slice(i, i + 200));
    if (error) throw error;
  }
  res.json({ imported: rows.length, skipped });
}));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
app.get('/healthz', (req, res) => res.send('ok'));
app.use(express.static(path.join(__dirname, 'public')));
app.use((err, req, res, next) => res.status(400).json({ error: 'Bad request.' }));

app.listen(process.env.PORT || 3000, () => console.log('Payment voucher app running on port ' + (process.env.PORT || 3000)));
