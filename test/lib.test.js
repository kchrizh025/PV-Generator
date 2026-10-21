const test = require('node:test');
const assert = require('node:assert');
const L = require('../lib');

test('amount in words', () => {
  assert.equal(L.amtWords(10000), 'One Hundred Pesos Only');
  assert.equal(L.amtWords(270050), 'Two Thousand Seven Hundred Pesos and Fifty Centavos Only');
  assert.equal(L.amtWords(1), 'One Centavo Only');
});

test('parsePV', () => {
  assert.deepEqual(L.parsePV('10-2026-021'), { month: 10, year: 2026, seq: 21 });
  assert.deepEqual(L.parsePV('1-2027-5'), { month: 1, year: 2027, seq: 5 });
  assert.equal(L.parsePV('weird'), null);
});

test('comparePV is chronological across years, not alphabetical', () => {
  const sorted = ['01-2027-001', '10-2026-021', '10-2026-003', '09-2026-150', '12-2025-999'].sort(L.comparePV);
  assert.deepEqual(sorted, ['12-2025-999', '09-2026-150', '10-2026-003', '10-2026-021', '01-2027-001']);
  assert.ok(L.comparePV('10-2026-001', 'junk') < 0); // unparseable goes last
});

test('nextPV: continues from the seed until the month has vouchers', () => {
  assert.equal(L.nextPV({ seed: '10-2026-020', date: '2026-10-16' }), '10-2026-021');
});
test('nextPV: uses the highest sequence in that month', () => {
  assert.equal(L.nextPV({ monthMax: 22, seed: '10-2026-020', date: '2026-10-20' }), '10-2026-023');
});
test('nextPV: new month restarts at 001 (reset on)', () => {
  assert.equal(L.nextPV({ monthMax: 0, seed: '10-2026-020', date: '2026-11-02' }), '11-2026-001');
});
test('nextPV: backdated voucher numbers within its own month', () => {
  assert.equal(L.nextPV({ monthMax: 150, seed: '10-2026-020', date: '2026-09-30' }), '09-2026-151');
});
test('nextPV: new year restarts at 001', () => {
  assert.equal(L.nextPV({ monthMax: 0, seed: '12-2026-040', date: '2027-01-04' }), '01-2027-001');
});
test('nextPV: reset off continues across months', () => {
  assert.equal(L.nextPV({ globalMax: 22, seed: '10-2026-020', reset: false, date: '2026-11-02' }), '11-2026-023');
});
