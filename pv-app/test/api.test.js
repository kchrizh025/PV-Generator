// End-to-end API test against an in-memory fake database (no network needed).
const test = require('node:test');
const assert = require('node:assert');
const Module = require('module');
const makeFake = require('./fake-supabase');

const fake = makeFake();
const orig = Module._load;
Module._load = function (r, ...a) { return r === '@supabase/supabase-js' ? { createClient: () => fake.client } : orig.call(this, r, ...a); };
Object.assign(process.env, { SUPABASE_URL: 'x', SUPABASE_SERVICE_ROLE_KEY: 'x', ADMIN_USER: 'admin', ADMIN_PASSWORD: 'pw123', JWT_SECRET: 's3cret', PORT: '3998', APP_TIMEZONE: 'Asia/Manila' });
require('../server.js');

const B = 'http://localhost:3998';
let cookie = '';
const call = async (m, p, body) => {
  const r = await fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined });
  const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
  const ct = r.headers.get('content-type') || '';
  return { s: r.status, b: ct.includes('json') ? await r.json() : await r.text() };
};
const make = (o) => call('POST', '/api/vouchers', Object.assign({ purpose: 'p', requester: 'Ben Ruiz', amount: '100' }, o));
const pvs = (r) => r.b.map(v => v.pv);

test.after(() => setTimeout(() => process.exit(0), 50));

test('needs login', async () => {
  assert.equal((await call('GET', '/api/vouchers')).s, 401);
  assert.equal((await call('POST', '/api/login', { username: 'admin', password: 'pw123' })).s, 200);
});

test('numbering follows the voucher month, including backdated ones', async () => {
  assert.equal((await make({ date: '2026-10-16' })).b.pv, '10-2026-021');
  assert.equal((await make({ date: '2026-10-17', requester: 'caroline imperial ' })).b.pv, '10-2026-022');
  assert.equal((await make({ date: '2026-09-30', requester: 'Ann Lee' })).b.pv, '09-2026-001'); // backdated: own month
  assert.equal((await make({ date: '2026-09-30' })).b.pv, '09-2026-002');
  assert.equal((await make({ date: '2027-01-05', amount: '2,700.50' })).b.pv, '01-2027-001');
  assert.equal((await call('GET', '/api/next-pv?date=2026-10-30')).b.pv, '10-2026-023');
});

test('duplicate manual PV (even zero-padded differently) is refused', async () => {
  assert.equal((await make({ pv: '10-2026-021' })).s, 409);
  assert.equal((await make({ pv: '10-2026-21' })).s, 409);
});

test('default order is chronological by PV, newest year last', async () => {
  const r = await call('GET', '/api/vouchers');
  assert.deepEqual(pvs(r), ['09-2026-001', '09-2026-002', '10-2026-021', '10-2026-022', '01-2027-001']);
  const d = await call('GET', '/api/vouchers?sort=pv&dir=desc');
  assert.deepEqual(pvs(d), ['01-2027-001', '10-2026-022', '10-2026-021', '09-2026-002', '09-2026-001']);
});

test('sort by date requested', async () => {
  const r = await call('GET', '/api/vouchers?sort=date&dir=asc');
  assert.deepEqual(r.b.map(v => v.date), ['2026-09-30', '2026-09-30', '2026-10-16', '2026-10-17', '2027-01-05']);
  assert.deepEqual(pvs(r).slice(0, 2), ['09-2026-001', '09-2026-002']); // ties broken by PV
});

test('sort by requester (case-insensitive) with PV tie-break', async () => {
  const r = await call('GET', '/api/vouchers?sort=requester&dir=asc');
  assert.deepEqual(r.b.map(v => v.requester.trim().toLowerCase()), ['ann lee', 'ben ruiz', 'ben ruiz', 'ben ruiz', 'caroline imperial']);
  assert.deepEqual(pvs(r), ['09-2026-001', '09-2026-002', '10-2026-021', '01-2027-001', '10-2026-022']);
});

test('filter by requester and by date range', async () => {
  assert.equal((await call('GET', '/api/vouchers?requester=BEN%20ruiz')).b.length, 3);
  assert.deepEqual(pvs(await call('GET', '/api/vouchers?from=2026-10-01&to=2026-10-31')), ['10-2026-021', '10-2026-022']);
  assert.deepEqual(pvs(await call('GET', '/api/vouchers?sort=bogus&dir=sideways')).length, 5); // bad params fall back safely
});

test('CSV export follows the filter; import skips already-filed numbers', async () => {
  const csv = await call('GET', '/api/export.csv?requester=ann%20lee');
  assert.equal(csv.b.split('\r\n').length, 2); // header + 1 row
  const bk = await call('GET', '/api/backup.json');
  assert.equal(bk.b.logs.length, 5);
  const imp = await call('POST', '/api/import', { logs: [{ pv: '10-2026-21', cents: 500, date: '2026-10-16', purpose: 'x', requester: 'y' }, { pv: '11-2026-001', cents: 500, date: '2026-11-02', purpose: 'x', requester: 'y' }] });
  assert.deepEqual(imp.b, { imported: 1, skipped: 1 });
});
