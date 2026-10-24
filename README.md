# Art Space | مساحة الفن

Bilingual (AR/EN, RTL/LTR) agency website + mini ERP/CRM. React + Vite + Tailwind on the front;
**Express + SQLite** on the back (one process, no external services).

Requires **Node ≥ 22.9** (see `engines` in `package.json` and `.nvmrc`) — `better-sqlite3` ships
native bindings only for modern Node releases.

## Run
```bash
npm ci
cp .env.example .env   # optional in dev; ADMIN_PASSWORD defaults to artspace2026
npm run dev            # http://localhost:3000  (site + API + Vite middleware, hot reload)
```
- Public site: `/`  ·  Admin panel: `/admin` (not linked from the site)
- Dev admin password: `artspace2026` (dev only — production refuses to start with it)
- Health probe: `GET /api/health` → `{ ok, mail, production, uptime }` (public, cheap)

| Script | What it does |
|---|---|
| `npm run dev` | Vite middleware + API on :3000, loads `.env` if present |
| `npm run build` | Production build into `dist/` |
| `npm start` / `npm run serve` | `NODE_ENV=production node server/index.js` — serves `dist/` + API (run `npm run build` first) |
| `npm test` | Build + boot a throwaway server on :3311 + run the end-to-end suite (`scripts/ci.sh`) |
| `npm run e2e` | Run `scripts/e2e.mjs` against an already-running server (`BASE`, `ADMIN_PASSWORD`) |
| `npm run backup` | `scripts/backup.sh` — SQLite snapshot + uploads into `backups/` |
| `npm run social-image` | Regenerate `public/og-image.png` (1200×630) and `apple-touch-icon.png` (macOS, dev only) |

## Production
```bash
npm ci && npm run build
cp .env.example .env      # then edit it: ADMIN_PASSWORD, SITE_URL, optionally SMTP_*
npm start                 # reads .env via --env-file-if-exists
```
The server binds to **127.0.0.1 only** — put a reverse proxy with HTTPS in front (see `deploy/Caddyfile`).
Keep it alive with pm2 (`deploy/ecosystem.config.cjs`, which also loads `.env` and holds **no secrets**)
or systemd. Only ports 80/443 should be open on the machine
(`sudo ufw allow 80,443/tcp && sudo ufw allow OpenSSH && sudo ufw enable`).

The production guard refuses to start when `ADMIN_PASSWORD` is missing, shorter than 10 characters,
or still one of the shipped placeholders (`artspace2026`, `CHANGE-ME…`).

| Env | Purpose |
|---|---|
| `ADMIN_PASSWORD` | admin login (required in production) |
| `PORT`, `HOST` | default `3000`, `127.0.0.1` in production |
| `SITE_URL` | public URL for canonical / sitemap / robots / Open Graph images |
| `DATA_DIR` | database + uploads folder (default `./data`) |
| `TRUST_PROXY` | `true` behind a reverse proxy so rate limits see real IPs |
| `SMTP_HOST/PORT/USER/PASS`, `MAIL_FROM`, `NOTIFY_TO` | optional email (PDF sending + new-request alerts) |

**Backup:** `scripts/backup.sh` writes a consistent SQLite snapshot plus a tarball of uploads/media/secret
key into `backups/`, keeping the newest 30 (`BACKUP_KEEP`, `BACKUP_DIR`). Runs on macOS and Linux
(no GNU-only flags). Schedule it daily from cron, e.g. `0 3 * * * /path/to/ArtSpaceJo/scripts/backup.sh`.

## Testing & CI
`npm test` builds the app, boots the server against a throwaway database on port 3311, waits for
`/api/health`, then runs `scripts/e2e.mjs` (40+ assertions: auth, token handling, every form kind,
lead categorisation, quote→order linkage, upload/type rules, signed links, robots/sitemap, `/admin`).
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
`invoices`, `surveys`) and debounced, so a save only sends the tables the user actually touched and
never overwrites a concurrent website submission with a stale copy.

## Admin
Dashboard · CRM (kanban/table, categories) · Site Surveys · Quotations (free-form items, PDF & email) · Production ·
Invoices · Calculator & Pricing · Website Content · Company & Quote Style (compact / bubbles / waves, colours, header & footer).

The PDF email button asks `GET /api/health` whether SMTP is configured: it sends through the server when it is,
and otherwise downloads the PDF and opens the mail client with the message pre-filled.

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

## SEO
Title/description follow the language, Open Graph + Twitter (`summary_large_image`) tags with a real 1200×630
`public/og-image.png` rewritten to an absolute URL at render time, `LocalBusiness` JSON-LD generated from
Company settings, canonical URL, `robots.txt`, `sitemap.xml`, semantic `<main>/<address>/<h1>`, alt text on
images, lazy-loaded images, admin code-split away from the public bundle.

## Before launch checklist
1. Set `ADMIN_PASSWORD`, `SITE_URL` in `.env`; HTTPS via Caddy; firewall (above).
2. Admin → Company & Quote Style: real logo, phone, email, address, tax number, terms.
3. Admin → Website Content: real projects, testimonials, client logos (Uncle Osaka, Tirasimino Cafe, Al Ameed Coffee).
4. Admin → Calculator & Pricing: confirm prices and VAT.
5. SMTP details (optional) → test **Quotations → PDF & Email**; `/api/health` should report `mail: true`.
6. Cron the backup script. Submit `https://yourdomain/sitemap.xml` to Google Search Console.

## Brand palette
Ink `#161616` · Gold `#C9A45C` · Cream `#F0E4D6` · Terracotta `#CB6B47`

## Structure
- `server/index.js` — API, SQLite, auth, uploads, SMTP, SEO files, security headers
- `src/api.js` — the only browser client for the API (auth, tables, uploads, signed links, health)
- `src/store.jsx` — state, dirty-tracked sync, categories, quote→order→invoice logic
- `src/App.jsx` — public site vs. code-split, error-boundary-wrapped admin
- `src/Site.jsx` — public site and forms · `src/Admin*.jsx` — admin panel · `src/Documents.jsx` — PDF/print renderer
- `scripts/e2e.mjs` — integration + security test · `scripts/ci.sh` — build + boot + test · `scripts/backup.sh`
- `scripts/make-social-image.mjs` — regenerates the social preview PNGs
- `deploy/` — Caddyfile + pm2 config (no secrets)
