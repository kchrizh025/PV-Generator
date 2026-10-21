# Payment Voucher Generator

Node.js (Express) backend + browser frontend + Supabase Postgres.

```
server.js     API, login, PV numbering (runs on Render)
lib.js        amount-in-words, PV number logic
public/       the web page (index.html, style.css, app.js)
schema.sql    database tables (fresh installs: run once in Supabase)
migrations/   upgrade scripts for an existing database (run in order)
test/         automated tests (`npm test`, no network or database needed)
render.yaml   Render blueprint
```

The browser never talks to Supabase. It calls this server's `/api/...`,
and only the server holds the Supabase secret key.

## 1. Supabase (new project)
1. Create a project and save the database password.
2. **SQL Editor > New query**: paste the *contents* of `schema.sql`, click **Run**.
3. **Project Settings > API**: copy the **Project URL** and the **service_role** key
   (newer dashboards call it the **Secret key**). Keep it private.

## 2. Try it on your computer (optional, needs Node 20+)
```
copy .env.example .env     (then fill in the values)
npm install
npm run dev
```
Open http://localhost:3000

## 3. Deploy on Render
1. Put this folder in a GitHub repository (`.env` and `node_modules` are already ignored).
2. Render: **New > Blueprint**, pick the repo (uses `render.yaml`).
   Or **New > Web Service** with Build `npm install`, Start `npm start`.
3. Set these environment variables:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | your Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | the service_role / secret key |
| `ADMIN_USER` | the username you will log in with |
| `ADMIN_PASSWORD` | a long password |
| `JWT_SECRET` | long random text (the blueprint generates it) |
| `APP_TIMEZONE` | `Asia/Manila` (default) |
| `NODE_ENV` | `production` |

4. Deploy, open the Render URL, sign in.

## Notes
- Free Render services sleep when idle; the first visit afterwards takes about a minute.
- Free Supabase projects pause after about a week without activity; resume from the dashboard.
- The server sets the date (in `APP_TIMEZONE`) and assigns the PV No., so two devices
  can't create the same number. The database also enforces unique PV numbers.
- Moving the old log from the Claude version: click **Backup** there, then **Restore** here.

## Upgrading an existing install to PV2 (sorting, filters, chronological PV numbers)
1. **Supabase first:** SQL Editor > New query > paste the *contents* of `migrations/002_pv_sort.sql` > Run.
   It is additive, safe to run twice, and fills in your existing vouchers automatically.
2. Commit and push this version to GitHub. Render redeploys by itself.
3. Open the app and hard-refresh (Ctrl+F5).

Deploying the code before step 1 makes the log fail to load (the new columns would not exist yet).
To roll back, `git revert` the commit; the extra database columns do no harm to the old code.

### What changed
- **Log ordering:** sort by PV No. (chronological), date requested, requester or amount, in either
  direction. Click a column heading or use the Sort by box. Filter by requester and by date range.
  Ties are always broken by PV No.
- **Chronological PV numbers:** stored as year / month / sequence, so `01-2027-001` correctly sorts after
  `10-2026-021`. `10-2026-21` and `10-2026-021` count as the same number.
- **Numbering fix:** the next number now comes from the highest sequence *in the month of the date
  requested*, so a backdated voucher gets a number in its own month instead of clashing.
- **Export CSV** follows the current sort, requester and date filters. **Backup** is always the full log.

### API
`GET /api/vouchers?sort=pv|date|requester|amount&dir=asc|desc&requester=<name>&from=YYYY-MM-DD&to=YYYY-MM-DD`
(default: chronological by PV, oldest first). `GET /api/next-pv?date=YYYY-MM-DD`.

### Not changed
Deleting a voucher still removes it, so its number can be reused if it was the highest in its month.
A "void" status that keeps the number would avoid that; it is not part of PV2.

## Settings & Reports (added)
- Side gear button: dark/light, theme color (light mode), fonts, text size, left/right/hide, background pattern or photo.
- Reports tab: Monthly, Per category, Highest expenses ranked (monthly); export CSV or print.
- Run `migrations/003_category.sql` once in Supabase to add the Category column.

## Phase 2
- Click a category chip in the log to rename it; tick rows for bulk category changes.
- Preview toolbar: zoom, Letter/A4, print, PDF, hide form. Drafts and the last-used category are remembered in the browser.
- Settings: Theme / Text / Layout / Background tabs, System theme, Compact density.
