# Build Readiness Plan — Art Space JO

Audit of the current tree found no installed dependencies, no production build, and several
correctness and hardening gaps. Work is ordered so the project builds first, then behaves
correctly, then is production safe.

## Current state

| Area | Finding |
|---|---|
| Dependencies | `node_modules` absent, `dist` absent — nothing installed or built |
| Runtime | `better-sqlite3@13.0.3` requires Node >= 22; no `engines`, no `.nvmrc` |
| Scripts | `start` runs `vite build`, so it needs devDependencies at runtime |
| API | `src/api.js` `insert` posts to `POST /api/c/:t`, which the server never defines |
| Admin email | `if (sb)` in `src/AdminDocs.jsx` is always true, so the `mailto:` fallback is dead |
| Deploy | `deploy/ecosystem.config.cjs` ships a placeholder password that passes the production guard |
| Backup | `scripts/backup.sh` uses GNU-only `xargs -r` and `require()` in an ESM package |
| SEO | `sitemap.xml` emits only `/`; `og:image` is an SVG |
| CSP | `img-src self data: blob:` blocks externally hosted content images |
| Caching | Hashed assets get 1h; the HTML shell gets no `Cache-Control` at all |
| Parser | One 25 MB `express.json()` limit applies to every route, including login |
| Client | No error boundary around the lazy admin chunk; full-collection rewrite on every save |
| Hygiene | `DEMO_DATA` dead code, `supabase.js` naming, stale Supabase copy in the admin, README drift |

## Phase 1 — Build setup

1. Add `engines: { node: ">=22" }` to `package.json` and a `.nvmrc` with `22`.
2. Add `.env.example` documenting every variable the server reads:
   `PORT`, `HOST`, `ADMIN_PASSWORD`, `ADMIN_EMAIL`, `DATA_DIR`, `SITE_URL`, `TRUST_PROXY`,
   `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `NOTIFY_TO`.
3. Scripts: `dev`, `build`, `preview`, `serve`, `start` (no build), `e2e`, `backup`.
4. Scope JSON parsing: small limit globally, 25 MB only on `/api/submit` style routes.
5. Clean install and `vite build`; fix any compile errors surfaced.

## Phase 2 — Correctness

6. Either implement `POST /api/c/:t` or delete `insert` from the client shim. Prefer deleting —
   nothing calls it.
7. Add `GET /api/health` returning `{ ok, mail, production }`. Use it in `AdminDocs` to choose
   SMTP delivery versus the `mailto:` fallback, and show the fallback note from real capability.
8. Harden the admin password guard: reject the demo password and the `CHANGE-ME` placeholder,
   then make `deploy/ecosystem.config.cjs` read the secret from `process.env`.
9. Fix `scripts/backup.sh`: replace `xargs -r` with a portable loop, run the SQLite snapshot with
   `createRequire` or the sqlite3 CLI equivalent, and add `backups/` to `.gitignore`.
10. Cache headers: `immutable` + one year for `/assets/*`, `no-store` for the HTML shell.
11. `sitemap.xml` emits every listed section; add a 1200x630 PNG social card and
    `apple-touch-icon`; point `og:image` and `twitter:image` at the PNG.
12. CSP: allow `https:` for `img-src` only, and document why in the README.

## Phase 3 — Hardening

13. Add an `ErrorBoundary` around the lazy `Admin` import with a recoverable fallback screen.
14. Replace the whole-collection push in `src/store.jsx` with per-table dirty tracking so a save
    only sends the table that changed, and stop the 30 s poll from re-triggering writes.
15. Remove `DEMO_DATA`, rename the `supabase.js` shim to something honest or drop it, delete the
    Supabase copy in `AdminDocs`, and bring `README.md` in line with the actual server.
16. Add an `e2e` script entry and a CI workflow running install, build and `scripts/e2e.mjs`.

## Verification

- `npm ci` completes and `better-sqlite3` loads on Node 22.
- `npm run build` produces `dist/` with an admin chunk separate from the public bundle.
- `npm run dev` serves the site and `/admin`.
- `node scripts/e2e.mjs` passes with the dev password.
- `curl /api/health`, `/sitemap.xml`, `/robots.txt` behave as documented.

## Status — implemented

| Plan item | Result |
|---|---|
| 1–2 Runtime + scripts | `engines.node >=22.9.0`, `.nvmrc`, `.env.example`; `dev`/`build`/`preview`/`serve`/`start`/`test`/`e2e`/`backup`/`social-image` |
| 3 JSON limits | `smallJson` (1 MB) on login/submit, `bigJson` (25 MB) only on admin settings/collection saves and `/fn/send-quote` |
| 4 `POST /api/c/:t` | Client `insert` removed — the API stays read/write via `PUT /api/c/:t` with an explicit `deleted` list |
| 5 `/api/health` | Public `{ ok, mail, production, uptime }`; `serverHealth()` drives the PDF email/mailto decision in `AdminDocs` |
| 6 Password guard | Placeholder set + `/^change[-_ ]?me/i` rejected in production; `deploy/ecosystem.config.cjs` holds no secrets and loads `.env` |
| 7 Backup script | POSIX-safe (`xargs -r` removed, `node --input-type=commonjs`), snapshot + uploads tarball, keeps 30 |
| 8 Cache headers | `no-store` on the HTML shell, `immutable` 1 year for `/assets/*` |
| 9 Sitemap + images | Single-entry sitemap with `lastmod`; real `og-image.png` 1200×630 + `apple-touch-icon.png`, absolutised at render time |
| 10 CSP | `img-src 'self' data: blob: https:` plus `frame-src 'none'`, `form-action 'self'`, `base-uri 'self'`; documented in README |
| 11 ErrorBoundary | `src/App.jsx` guards the lazy admin chunk with a bilingual retry screen |
| 12 Dirty tracking | `dirty` set + `applyServer`; debounced per-slice saves, failed slices stay queued |
| 13 Dead code | `DEMO_DATA` deleted, `src/supabase.js` removed (imports point at `api.js`), Supabase copy replaced, README rewritten |
| 14 CI | `scripts/ci.sh` (build → boot on :3311 → wait for health → e2e) plus `.github/workflows/ci.yml` |
| 15 Verification | `npm ci` ✔ · `sqlite ok` ✔ · `vite build` ✔ · `npm test` → **All checks passed** (35 assertions) ✔ |
