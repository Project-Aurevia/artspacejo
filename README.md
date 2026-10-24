# Art Space | مساحة الفن

Bilingual (AR/EN, RTL/LTR) agency website + mini ERP/CRM. React + Vite + Tailwind on the front;
**Express + SQLite** on the back (one process, no external services).

## Run
```bash
npm install
npm run dev            # http://localhost:3000  (site + API, hot reload)
```
- Public site: `/`  ·  Admin panel: `/admin` (not linked from the site)
- Dev admin password: `artspace2026` (dev only — production refuses to start with it)

## Production
```bash
export ADMIN_PASSWORD='a-long-unique-password'   # required, min 10 chars
export SITE_URL='https://www.yourdomain.com'      # canonical URL, sitemap, emails
export TRUST_PROXY=true                           # when behind Caddy/nginx
npm start                                         # builds, then serves on 127.0.0.1:3000
```
The server binds to **127.0.0.1 only** — put a reverse proxy with HTTPS in front (see `deploy/Caddyfile`).
Keep it alive with pm2 (`deploy/ecosystem.config.cjs`) or systemd. Only ports 80/443 should be open on the machine
(`sudo ufw allow 80,443/tcp && sudo ufw allow OpenSSH && sudo ufw enable`).

| Env | Purpose |
|---|---|
| `ADMIN_PASSWORD` | admin login (required in production) |
| `PORT`, `HOST` | default `3000`, `127.0.0.1` in production |
| `SITE_URL` | public URL for canonical / sitemap / robots |
| `DATA_DIR` | database + uploads folder (default `./data`) |
| `TRUST_PROXY` | `true` behind a reverse proxy so rate limits see real IPs |
| `SMTP_HOST/PORT/USER/PASS`, `MAIL_FROM`, `NOTIFY_TO` | optional email (PDF sending + new-request alerts) |

**Backup:** `scripts/backup.sh` (copies `data/` to `backups/` with a timestamp; run daily from cron).

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

## Admin
Dashboard · CRM (kanban/table, categories) · Site Surveys · Quotations (free-form items, PDF & email) · Production ·
Invoices · Calculator & Pricing · Website Content · Company & Quote Style (compact / bubbles / waves, colours, header & footer).

## Security notes
- Login: single admin password, constant-time compare, 8 attempts / 15 min / IP, 12-hour signed token (sent as a header only).
- All private data (`leads/quotes/orders/invoices/surveys`, uploads, media write, PDF email, settings write) requires login.
- Public forms: rate-limited, size-limited, validated and sanitised server-side, honeypot field for bots.
- Uploads: file-type allow-list, random names, stored outside the web root; downloads via 2-minute signed links.
- Headers: CSP, HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy: no-referrer` (helmet). `/admin` is `noindex` and disallowed in `robots.txt`.
- Private data is never stored in visitors' browsers (only language/theme/cart/public settings).
- Run `node scripts/e2e.mjs` (server running) to verify the whole flow and the security rules.

## SEO
Title/description follow the language, Open Graph + Twitter tags, `LocalBusiness` JSON-LD generated from Company settings,
canonical URL, `robots.txt`, `sitemap.xml`, semantic `<main>/<address>/<h1>`, alt text on images, lazy-loaded images,
admin code-split away from the public bundle.

## Before launch checklist
1. Set `ADMIN_PASSWORD`, `SITE_URL`; HTTPS via Caddy; firewall (above).
2. Admin → Company & Quote Style: real logo, phone, email, address, tax number, terms.
3. Admin → Website Content: real projects, testimonials, client logos (Uncle Osaka, Tirasimino Cafe, Al Ameed Coffee).
4. Admin → Calculator & Pricing: confirm prices and VAT.
5. SMTP details (optional) → test **Quotations → PDF & Email**.
6. Cron the backup script. Submit `https://yourdomain/sitemap.xml` to Google Search Console.

## Brand palette
Ink `#161616` · Gold `#C9A45C` · Cream `#F0E4D6` · Terracotta `#CB6B47`

## Structure
- `server/index.js` — API, SQLite, auth, uploads, SMTP, SEO files, security headers
- `src/api.js` — browser client for the API · `src/store.jsx` — state, categories, quote→order→invoice logic
- `src/Site.jsx` — public site and forms · `src/Admin*.jsx` — admin panel · `src/Documents.jsx` — PDF/print renderer
- `scripts/e2e.mjs` — integration + security test · `scripts/backup.sh` · `deploy/`
