# Art Space | مساحة الفن

Bilingual (AR/EN, RTL/LTR) agency website + mini ERP/CRM. React + Vite + Tailwind on the front;
**Express + SQLite** on the back (one process, no external services).

Requires **Node ≥ 22.9** (see `engines` in `package.json` and `.nvmrc`) — `better-sqlite3` ships
native bindings only for modern Node releases.

## Run
```bash
npm ci
cp .env.example .env   # optional in dev
npm run dev            # http://127.0.0.1:3000  (site + API + Vite middleware, hot reload)
```
- Public site: `/`  ·  Admin panel: `/admin` (not linked from the site)
- Admin sign-in: the built-in owner `ceo@artspacejo.com` (see Admin below)
- Health probe: `GET /api/health` → `{ ok, mail, production, uptime }` (public, cheap)

| Script | What it does |
|---|---|
| `npm run dev` | Vite middleware + API on :3000, loads `.env` if present |
| `npm run build` | Production build into `dist/` |
| `npm start` / `npm run serve` | `NODE_ENV=production node server/index.js` — serves `dist/` + API (run `npm run build` first) |
| `npm test` | Build + boot a throwaway server on :3311 + run the end-to-end suite (`scripts/ci.sh`) |
| `npm run e2e` | Run `scripts/e2e.mjs` against an already-running server (`BASE`, `E2E_PASSWORD`) |
| `npm run backup` | `scripts/backup.sh` — SQLite snapshot + uploads into `backups/` |
| `npm run social-image` | Regenerate `public/og-image.png` (1200×630) and `apple-touch-icon.png` (macOS, dev only) |

## Production
```bash
npm ci && npm run build
cp .env.example .env      # then edit it: SITE_URL (SMTP is set in Admin → Settings → Email)
npm start                 # reads .env via --env-file-if-exists
```
The server binds to **127.0.0.1 only** — put a reverse proxy with HTTPS in front (see `deploy/Caddyfile`).
Keep it alive with pm2 (`deploy/ecosystem.config.cjs`, which also loads `.env` and holds **no secrets**)
or systemd. Only ports 80/443 should be open on the machine
(`sudo ufw allow 80,443/tcp && sudo ufw allow OpenSSH && sudo ufw enable`).

The owner account is built into `server/auth.js` (only a salted scrypt hash is stored), so it survives
redeploys and a wiped `data/` folder. Change its password with `node scripts/hash-password.mjs "new password"`
and paste the output into `ROOT.hash`. No admin password is read from `.env`.

| Env | Purpose |
|---|---|
| `PORT`, `HOST` | default `3000` and `127.0.0.1` (loopback in dev too; set `HOST=0.0.0.0` to expose) |
| `SITE_URL` | public URL for canonical / sitemap / robots / Open Graph images |
| `DATA_DIR` | database + uploads folder (default `./data`) |
| `TRUST_PROXY` | `true` behind a reverse proxy so rate limits see real IPs |
| `SMTP_HOST/PORT/USER/PASS`, `MAIL_FROM`, `NOTIFY_TO` | optional email (PDF sending + new-request alerts) |

**Backup:** `scripts/backup.sh` writes a consistent SQLite snapshot plus a tarball of uploads/media/secret
key into `backups/`, keeping the newest 30 (`BACKUP_KEEP`, `BACKUP_DIR`). Runs on macOS and Linux
(no GNU-only flags). Schedule it daily from cron, e.g. `0 3 * * * /path/to/ArtSpaceJo/scripts/backup.sh`.

## Testing & CI
`npm test` builds the app, boots the server against a throwaway database on port 3311, waits for
`/api/health`, then runs `scripts/e2e.mjs` (70+ assertions: auth, token handling, every form kind,
lead categorisation, quote→order linkage, accounting books, the customer/supplier directory, the
HR & payroll round-trip, upload/type rules, signed links, robots/sitemap, `/admin`).
`.github/workflows/ci.yml` runs the same thing on every push and pull request (Node from `.nvmrc`).

## How everything connects
| Website action | Server | Admin |
|---|---|---|
| Calculator → Request Quotation | `POST /api/submit` kind `quote` | Lead (category = top department) + Quote (draft) + Order (draft) |
| **Site Survey** button | kind `survey` | Lead (category *Site Survey*) + record in **Site Surveys** tab (status, date, engineer, findings) |
| **Request a Visit** button | kind `visit` | Lead (category *Visit Request*) |
| Strategy session funnel | kind `consult` | Lead (category *Strategy & Consulting*) |
| Booth floor-plan brief | kind `booth` | Lead (category *Signage & Booths*) + downloadable file |
| Admin edits prices / content / company | `PUT /api/settings/*` (login) | Website updates for everyone |

Every form goes through one validated endpoint; the **server** builds and categorises the records. Leads can be filtered by
category in **CRM**. New website submissions appear in the admin automatically (refresh every 30 s) and in sidebar badges.

Admin saves are tracked per slice (`rates`, `content`, `company`, `leads`, `quotes`, `orders`,
`invoices`, `surveys`, `purchases`, `cash`, `customers`, `suppliers`, `employees`, `attendance`,
`advances`, `payrolls`) and debounced, so a save only sends the tables the user actually touched and
never overwrites a concurrent website submission with a stale copy.

## Admin
Sign-in is always email + password. The owner (`ceo@artspacejo.com`) is built in; everyone else is created in
**Settings → Users & Permissions** with View / Add / Edit / Delete per section, or as a full-access administrator.
Deleting an invoice, expense, purchase or payroll run by anyone other than a full-access admin becomes an
approval request that a full-access admin approves or rejects. Permissions are enforced on the server.
`npm run e2e` needs `E2E_PASSWORD` (and optionally `E2E_EMAIL`).

Dashboard · CRM (kanban/table, categories) · Site Surveys · Quotations (free-form items, PDF & email) · Production ·
Invoices · Calculator & Pricing · Website Content · Company & Quote Style (compact / bubbles / waves, colours, header & footer) ·
Accounting (sales, supplier bills, petty cash) · Customers & Suppliers · **People** (Employees & Attendance, Payroll & Payslips).

The PDF email button asks `GET /api/health` whether SMTP is configured: it sends through the server when it is,
and otherwise downloads the PDF and opens the mail client with the message pre-filled.

## HR & payroll
Two tabs under **People**, both driven by one import-free engine ([`src/payroll.js`](src/payroll.js)) so the screen,
the CSV and the payslip can never disagree.

**Employees & Attendance** — the employee file holds number, name (EN/AR), title, department, national ID, SSC
number, start date, pay type (*monthly / daily / hourly*), the rate, allowance lines, a default commission %, a
*married* flag for the extra tax exemption, and bank + IBAN. The **daily sheet** is one row per employee per day —
coming, leaving, break minutes, status (worked / paid leave / sick / unpaid / absent) and a *holiday* switch; hours
are `out − in − break`, so 09:00–18:00 with 60 minutes of break is 8 hours. The month summary shows days worked,
leave, absence, regular hours, overtime and missing days. **Advances** records money handed out mid-month and how
much is still to recover; **Rules** edits every rate used by the engine.

**Payroll & Payslips** — pick a month and the run (`PR-YYYY-MM`) lists every active employee with the figures
computed from that month's sheet. Extra pay is entered per line (sales + commission %, a commission override,
bonus, other additions/deductions, payment method, note) with a live gross/deductions/net preview, and the totals
sit under the table. `Approve & lock` freezes every line, so a payslip reproduces exactly what was approved even if
the attendance sheet or the rules change afterwards; `Mark as paid` records the payout; `Unlock` returns the month
to draft and releases the advances it had recovered; `CSV` exports the 27-column run.

| Item | Rule (all of it editable in *Rules*) |
|---|---|
| Hours | `out − in − break`; a day is `dayHours` (8), a week `weekHours` (48) |
| Base pay | monthly = salary · daily = `(worked − holiday) × day rate` · hourly = regular hours × rate |
| Overtime | 125 % of the hourly rate, for hours above the day/week limits |
| Rest day / public holiday | 150 %, marked per day with the *holiday* switch |
| Absence & unpaid leave | one day rate off the month, per day |
| Social security | 7.5 % employee + 14.25 % employer on the subject wage (base + chosen allowances); ceiling configurable, `0` = none |
| Income tax | monthly accrual of the annual brackets (5/10/15/20/25 %) after the 9,000 + 9,000 family exemption, SSC share deducted first |
| Commission | % of the sales entered on the line, or a fixed override |
| Advances | recovered oldest-first, never below zero net, flagged above 50 % of gross |

**The payslip** ([`src/Payslip.jsx`](src/Payslip.jsx), A4 on `#print-area`) prints earnings, deductions and their
totals, the attendance summary, the advances recovered, the employer's SSC share and the net pay — then a
declaration in Arabic and English: the figures are correct, **all wages up to the signature date have been paid**,
no claim or reservation is outstanding, later entitlements are settled in a later payslip, and the signed copy is
kept on file, followed by blank signature/date lines. `Record signature` in the admin stores
`ack: { signed, name, at }` on the line, and the run header shows how many payslips are still unsigned.

> The rates ship as Jordanian Labour Code defaults (Art. 56 and 59) and are **not** legal advice. Confirm the SSC
> ceiling, the allowance base and the tax brackets with the accountant, then set them once in *Rules* — every
> figure on every payslip follows those settings.

## Project gallery
One portfolio item is **one place**: a single cover photo on the card, plus the rest of that job's photos,
shown when a visitor clicks the cover. Photos of two different jobs are never mixed — add a second item.

- **Public** — [`Portfolio()`](src/Site.jsx) shows the cover with a camera/count badge; clicking it opens a
  viewer with arrow buttons, a thumbnail strip, ← → keys, Escape and a horizontal swipe on touch.
- **Admin → Website Content** — in a project card, `Cover photo` sets the card image, `Photos of this
  project` adds/reorders/deletes the rest, and the ★ button on any photo promotes it to cover.
- **Model** — `{ id, cat, title:{en,ar}, desc:{en,ar}, image, images: [] }` in [`src/store.jsx`](src/store.jsx).
  [`galleryOf()`](src/store.jsx) returns cover + photos, de-duplicated, and `migrateContent()` gives older
  saved content an empty `images` array, so nothing has to be re-entered after this change.

### Importing a folder of photos
```bash
node scripts/import-gallery.mjs --src "/path/to/photos" [--map data/gallery-map.json] [--dry] [--append]
```
The script groups photos the way they were posted: files named `<post>_<media>_…` receive consecutive media
ids when they are uploaded together, so a run of nearby ids is one project and a large jump starts a new one
(`--gap`, default 6e8). It resizes each photo to 1200 px / quality 72, copies it to `data/media/`, writes the
projects into `settings.content` — backing up the previous content first — and reports the split in
`data/gallery-report.json`. Without a map file the titles are neutral (`Project 1`…), which the owner renames
in the admin panel; with one, a page of real bilingual titles and cover choices is applied in one go:

```json
{ "projects": [ { "key": "max-pump", "cat": "signage", "cover": 2,
                  "title": { "en": "Max Pump — Shopfront", "ar": "ماكس بمب — واجهة المتجر" },
                  "desc":  { "en": "…", "ar": "…" } } ] }
```

## Security notes
- Login: single admin password, constant-time compare, 8 attempts / 15 min / IP, 12-hour signed token (header only, never in URLs).
- All private data (`leads/quotes/orders/invoices/surveys`, uploads, media write, PDF email, settings write) requires login.
- Public forms: rate-limited, size-limited, validated and sanitised server-side, honeypot field for bots.
- Request bodies: 1 MB JSON limit on public/login endpoints; only admin bulk saves and the PDF-email
  call accept up to 25 MB (base64 PDF).
- Uploads: file-type allow-list, random names, stored outside the web root; downloads via 2-minute signed links.
- Headers: CSP, HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy: no-referrer` (helmet). `/admin` is `noindex` and disallowed in `robots.txt`.
- `img-src` is `'self' data: blob: https:` on purpose: admins can point logos/project images at an
  external CDN, and the CSP still blocks inline scripts, frames and form hijacking.
- The HTML shell is served `Cache-Control: no-store`; only content-hashed `/assets/*` files are cached for a year.
- Private data is never stored in visitors' browsers (only language/theme/cart/public settings).

## SEO & GEO
The public marketing copy is **server-rendered as static, zero-JS HTML** so crawlers and AI retrieval
agents read real text without executing the bundle. The SPA at `/` keeps the interactive calculator,
quote cart and forms; `/admin` and `/api/*` stay private.

| Route | Content |
|---|---|
| `/` | SPA (calculator, cart, forms) + canonical, `WebSite`/`ProfessionalService` graph |
| `/en/<slug>`, `/ar/<slug>` | 6 services × 2 languages — own `<h1>`, meta, canonical, hreflang, breadcrumb, FAQ and `Service` schema |
| `/robots.txt` | Disallows `/admin` and `/api/`, explicitly allows Googlebot, Bingbot, `OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `ClaudeBot`, `Claude-SearchBot`, `Applebot`, `Google-Extended` |
| `/sitemap.xml` | 13 `<loc>` entries with `en`/`ar`/`x-default` alternates |
| `/llms.txt` | Who the business is, services, published rates, contact, URL map — written for answer engines |

Slugs: `signage-amman`, `exhibition-booths-jordan`, `printing-amman`,
`social-media-management-amman`, `marketing-consulting-jordan`, `signage-prices-jordan`.

Every page carries one `<h1>`, one self-referencing canonical, reciprocal `hreflang`, Open Graph +
Twitter (`summary_large_image`) with a real 1200×630 `public/og-image.png` rewritten to an absolute
URL, and an `@id`-linked JSON-LD `@graph`: `ProfessionalService`/`LocalBusiness`, `WebSite`, `WebPage`,
`ImageObject`, `BreadcrumbList`, `Service` (+ `AggregateOffer` computed from the visible price table),
`FAQPage`. No `Review`/`aggregateRating` — the sample testimonials are not real reviews.

`SITE_URL` drives every absolute URL above. Unset, they fall back to the request host; in production the
server warns at boot when it is missing or not `https`.

The full audit, bilingual keyword map and keyword-to-URL mapping live in
[`plans/seo-geo-plan.md`](plans/seo-geo-plan.md).

## Before launch checklist
1. Set `SITE_URL` (the real public https origin) in `.env`; HTTPS via Caddy; firewall (above). Keep `data/`
   on persistent storage and back it up (it holds the database, uploads and the signing key).
2. Admin → Company Profile: real logo, email, address, tax number, terms (email and tax number start empty).
3. Admin → Website Content: rename the imported projects (one per place, cover + photos), add real
   testimonials (the Reviews section stays hidden while there are none) and client logos.
4. Admin → Calculator & Pricing: confirm prices and VAT.
5. Admin → Settings → Email: connect Microsoft (or SMTP), send a test; `/api/health` should report `mail: true`.
6. Admin → Settings → Users: create staff accounts and roles. The warehouse, clients and suppliers start empty.
6. Cron the backup script. Submit `<SITE_URL>/sitemap.xml` to Google Search Console and Bing Webmaster
   Tools, then confirm 13 discovered URLs. Check `/llms.txt` and `/robots.txt` serve on the live host.

## Brand palette
Ink `#161616` · Gold `#C9A45C` · Cream `#F0E4D6` · Terracotta `#CB6B47`

## Structure
- `server/index.js` — API, SQLite, auth, uploads, SMTP, SEO routes, security headers
- `server/seo.js` — server-rendered bilingual landing pages, JSON-LD graph, `robots.txt`, `sitemap.xml`, `llms.txt`
- `src/api.js` — the only browser client for the API (auth, tables, uploads, signed links, health)
- `src/store.jsx` — state, dirty-tracked sync, categories, quote→order→invoice logic
- `src/App.jsx` — public site vs. code-split, error-boundary-wrapped admin
- `src/Site.jsx` — public site and forms · `src/Admin*.jsx` — admin panel · `src/Documents.jsx` — PDF/print renderer
- `src/payroll.js` — HR/payroll engine (shift hours, SSC, overtime, tax brackets, advances, run totals)
- `src/Payslip.jsx` — printable payslip with the acknowledgement declaration · `src/AdminHR.jsx` / `src/AdminPayroll.jsx` — its screens
- `scripts/e2e.mjs` — integration + security test · `scripts/ci.sh` — build + boot + test · `scripts/backup.sh`
- `scripts/make-social-image.mjs` — regenerates the social preview PNGs
- `scripts/import-gallery.mjs` — groups a photo folder into projects (cover + photos) and imports them
- `deploy/` — Caddyfile + pm2 config (no secrets)
