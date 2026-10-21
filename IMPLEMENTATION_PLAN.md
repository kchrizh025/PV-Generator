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

---
# Phase 2: Category tools + UI refresh

| Item | Implementation | Files |
|---|---|---|
| Fix existing "Uncategorized" vouchers | Click any category chip in the log to edit it (Enter saves, Esc cancels); tick rows -> bulk "Set category" | app.js, server.js (`PATCH /api/vouchers/:id`, `POST /api/vouchers-category`) |
| Category drift | Server reuses the existing spelling case-insensitively and trims spaces (new, edit, import); Reports also group case-insensitively | server.js, reports.js |
| Remember last-used category | Pre-fills the Category box on the next voucher | app.js |
| Save / restore draft | Form auto-saved in the browser; "Draft restored - discard" chip | app.js |
| Preview toolbar (glass) | Hide/show form, zoom out / Fit / zoom in, Letter or A4, Print, PDF. Paper size also applies to print and PDF | index.html, app.js, settings.js, style.css |
| Settings panel | Tabs: Theme / Text / Layout / Background. Added System theme + Comfortable/Compact density | index.html, settings.js |
| Visual refresh | Rounded cards + soft shadows, glass panels, pill tabs, flex header (no cramped buttons), row hover, focus rings | style.css |

Tests: 19 pass (new API test covers category matching, edit, bulk edit).
No new database migration. 003_category.sql from Phase 1 is still required.
