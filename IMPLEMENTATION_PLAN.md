# Implementation Plan: Settings + Reports

## 1. Scan result
Node/Express backend (`server.js`, `lib.js`) with Supabase; vanilla JS frontend in `pv-app/public`
(`index.html`, `app.js`, `style.css`). Vouchers had: PV No., date, amount, purpose, requester. **No category field.**

## 2. Changes
| # | Requirement | Implementation | Files |
|---|---|---|---|
| 3 | Side Settings button | Fixed edge button (gear) opens a slide-in panel; header "Settings" link as backup | index.html, style.css, settings.js |
| 3a | Dark / Light | Segmented toggle -> `data-theme` | settings.js, style.css |
| 3b | Theme color (light only) | indigo, teal, pink, amber, slate -> `data-accent`; disabled in dark mode | same |
| 3c | Font + text size | 5 font stacks; Small/Medium/Large/XL via `--fs` multiplier on all UI text (voucher paper is NOT scaled) | style.css, settings.js |
| 3d | Layout style | Button/panel Left, Right, or Hide (Hide -> use header "Settings") | same |
| 3e | Background | Patterns (dots, grid, lines, diagonal) or uploaded photo (resized to 1600px, stored in the browser) | same |
| 4 | Reports tab | Tabs: Vouchers / Reports. Monthly, Per category, Highest ranked (monthly). CSV download + Print | reports.js, index.html |
| 4a | Category data | New **Category** field on the voucher form, saved to DB, shown in log, CSV export, backup/restore | server.js, app.js, migrations/003_category.sql, schema.sql |

## 3. Deploy steps
1. Supabase SQL Editor: run `pv-app/migrations/003_category.sql` (safe to repeat).
2. Redeploy the app (Render) with the new files.
3. Old vouchers appear as "Uncategorized" in reports.

## 4. Notes
- UI settings are saved per browser (localStorage), not in the database.
- Existing 18 tests pass.
