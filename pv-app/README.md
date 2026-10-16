# Payment Voucher Generator

Node.js (Express) backend + browser frontend + Supabase Postgres.

```
server.js     API, login, PV numbering (runs on Render)
lib.js        amount-in-words, PV number logic
public/       the web page (index.html, style.css, app.js)
schema.sql    database tables (run once in Supabase)
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
