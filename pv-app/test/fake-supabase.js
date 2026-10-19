// Tiny in-memory stand-in for the parts of supabase-js the server uses (for tests only).
const crypto = require('crypto');
module.exports = function makeFake() {
  const T = { vouchers: [], settings: [{ id: 1, seed: '10-2026-020', reset_monthly: true }] };
  let tick = 0;
  const RX = /^(\d{1,2})-(\d{4})-(\d{1,9})$/;
  const gen = r => { // generated columns, as in migrations/002_pv_sort.sql
    const m = RX.exec(r.pv_no);
    r.pv_year = m ? +m[2] : null; r.pv_month = m ? +m[1] : null; r.pv_seq = m ? +m[3] : null;
    r.requester_norm = String(r.requester || '').trim().toLowerCase();
    return r;
  };
  const cmp = (a, b, asc) => {
    if (a == null && b == null) return 0;
    if (a == null) return 1; if (b == null) return -1;   // nulls last, both directions
    return (a < b ? -1 : a > b ? 1 : 0) * (asc ? 1 : -1);
  };
  function from(name) {
    const s = { op: 'select', f: [], ord: [], lim: null, rng: null, pay: null, one: null, ret: false };
    const q = {
      select() { if (s.op !== 'select') s.ret = true; return q; },
      insert(p) { s.op = 'insert'; s.pay = p; return q; },
      upsert(p) { s.op = 'upsert'; s.pay = p; return q; },
      delete() { s.op = 'delete'; return q; },
      eq(c, v) { s.f.push(r => r[c] === v); return q; },
      gte(c, v) { s.f.push(r => r[c] >= v); return q; },
      lte(c, v) { s.f.push(r => r[c] <= v); return q; },
      not(c, op, v) { s.f.push(r => !(op === 'is' && v === null && r[c] == null)); return q; },
      order(c, o) { s.ord.push([c, !(o && o.ascending === false)]); return q; },
      limit(n) { s.lim = n; return q; },
      range(a, b) { s.rng = [a, b]; return q; },
      single() { s.one = 'single'; return q; },
      maybeSingle() { s.one = 'maybe'; return q; },
      then(res, rej) { return Promise.resolve(run()).then(res, rej); }
    };
    function run() {
      const t = T[name], match = r => s.f.every(f => f(r));
      if (s.op === 'insert') {
        const arr = Array.isArray(s.pay) ? s.pay : [s.pay], out = [];
        for (const p of arr) {
          const r = Object.assign({ id: crypto.randomUUID(), created_at: new Date(Date.now() + tick++).toISOString() }, p);
          if (name === 'vouchers') {
            gen(r);
            if (t.some(x => x.pv_no === r.pv_no || (r.pv_year != null && x.pv_year === r.pv_year && x.pv_month === r.pv_month && x.pv_seq === r.pv_seq)))
              return { data: null, error: { code: '23505' } };
          }
          t.push(r); out.push(r);
        }
        return s.ret ? { data: s.one ? out[0] : out, error: null } : { data: null, error: null };
      }
      if (s.op === 'upsert') { const i = t.findIndex(r => r.id === s.pay.id); if (i >= 0) t[i] = s.pay; else t.push(s.pay); return { data: null, error: null }; }
      if (s.op === 'delete') { T[name] = t.filter(r => !match(r)); return { data: null, error: null }; }
      let rows = t.filter(match);
      rows.sort((a, b) => { for (const [c, asc] of s.ord) { const d = cmp(a[c], b[c], asc); if (d) return d; } return 0; });
      if (s.rng) rows = rows.slice(s.rng[0], s.rng[1] + 1);
      if (s.lim) rows = rows.slice(0, s.lim);
      if (s.one) return { data: rows[0] || null, error: null };
      return { data: rows, error: null };
    }
    return q;
  }
  return { client: { from }, tables: T };
};
