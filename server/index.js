// Art Space — self-contained server: Express + SQLite (single file) + local file storage.
//   npm run dev   -> API + Vite (middleware mode) on http://127.0.0.1:3000
//   npm run build && npm start -> serve dist from one process (production)
// Env: PORT, HOST, DATA_DIR, SITE_URL, TRUST_PROXY (+ optional SMTP_* / MAIL_FROM / NOTIFY_TO fallback).
//      Admin accounts: the owner is built into server/auth.js; staff are managed in Admin → Users.
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import Database from 'better-sqlite3';
import { createMail } from './mail.js';
import { ROOT, DUMMY_HASH, hashPw, verifyPw } from './auth.js';
import { MODULE_IDS, ACTIONS, COL_MODULES, SETTING_MODULES, FINANCIAL, can, canAny } from './perms.js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  serviceBySlug, renderServicePage, robotsTxt, sitemapXml, llmsTxt, homeHead,
} from './seo.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = process.env.DATA_DIR || path.join(root, 'data');
const UPLOADS = path.join(DATA, 'uploads');
const MEDIA = path.join(DATA, 'media');
fs.mkdirSync(UPLOADS, { recursive: true, mode: 0o700 });
fs.mkdirSync(MEDIA, { recursive: true });

const prod = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT || 3000);
// Loopback in both modes. "localhost" can resolve to ::1 only, which leaves http://127.0.0.1
// refusing connections; bind the IPv4 literal instead. Put Caddy/nginx in front, or set
// HOST=0.0.0.0 to expose the port directly.
const HOST = process.env.HOST || '127.0.0.1';
// Admin accounts: the owner is built into the code (server/auth.js); everyone else lives in the
// `users` table and is managed from Admin → Users. No admin password comes from .env any more.
const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '');
// Canonical tags, hreflang, sitemap.xml and llms.txt are absolute URLs. Without SITE_URL they
// fall back to whatever Host header the request carried — correct behind a proxy that forwards
// the public host, silently wrong (http://127.0.0.1:3000) when it does not.
if (prod && !SITE_URL) {
  console.warn('\n  ⚠ SITE_URL is not set: canonical, hreflang and sitemap URLs will be derived from the request host.\n    Set SITE_URL to the public origin (e.g. https://www.example.com) before submitting the sitemap.\n');
}
if (prod && SITE_URL && !/^https:\/\//.test(SITE_URL)) {
  console.warn(`\n  ⚠ SITE_URL is "${SITE_URL}" — canonical URLs should be https.\n`);
}

/* ---------------- database ---------------- */
const db = new Database(path.join(DATA, 'artspace.db'));
db.pragma('journal_mode = WAL');
const COLLECTIONS = ['leads', 'quotes', 'orders', 'invoices', 'surveys', 'purchases', 'cash', 'customers', 'suppliers', 'employees', 'attendance', 'advances', 'payrolls', 'projects', 'inventory', 'stock_movements'];
const SETTINGS = ['rates', 'content', 'company', 'hr'];
db.exec('CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
// Staff accounts and pending delete-approvals are deliberately NOT in COLLECTIONS: the generic
// /c/:t routes (and the browser) must never be able to read password hashes or rewrite roles.
db.exec('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
db.exec('CREATE TABLE IF NOT EXISTS approvals (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
COLLECTIONS.forEach((t) => db.exec(`CREATE TABLE IF NOT EXISTS ${t} (id TEXT PRIMARY KEY, data TEXT NOT NULL)`));
const getSettingsStmt = db.prepare('SELECT id, data FROM settings');
const putSettingStmt = db.prepare('INSERT INTO settings (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data');
const S = Object.fromEntries(COLLECTIONS.map((t) => [t, {
  all: db.prepare(`SELECT id, data FROM ${t}`),
  put: db.prepare(`INSERT INTO ${t} (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data`),
  ins: db.prepare(`INSERT OR IGNORE INTO ${t} (id, data) VALUES (?, ?)`),
  del: db.prepare(`DELETE FROM ${t} WHERE id = ?`),
}]));
const saveCollection = db.transaction((t, rows, deleted) => {
  for (const id of deleted) S[t].del.run(id);
  for (const r of rows) S[t].put.run(r.id, JSON.stringify(r.data));
});
const settingOf = (id, fallback) => { const r = getSettingsStmt.all().find((x) => x.id === id); return r ? JSON.parse(r.data) : fallback; };

/* ---------------- auth (stateless signed tokens) ---------------- */
const secretFile = path.join(DATA, 'secret.key');
if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
const SECRET = fs.readFileSync(secretFile, 'utf8');
const sign = (s) => crypto.createHmac('sha256', SECRET).update(s).digest('hex');
// Token = userId.expiry.signature. The user is re-read on every request, so deactivating or
// deleting an account (or changing its permissions) takes effect immediately.
const makeToken = (uid) => { const exp = String(Date.now() + 12 * 3600e3); return `${uid}.${exp}.${sign(`${uid}.${exp}`)}`; };
const getUserRow = db.prepare('SELECT data FROM users WHERE id = ?');
const allUsersStmt = db.prepare('SELECT data FROM users');
const putUserStmt = db.prepare('INSERT INTO users (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data');
const delUserStmt = db.prepare('DELETE FROM users WHERE id = ?');
const userById = (id) => {
  if (id === ROOT.id) return ROOT;
  const r = getUserRow.get(String(id));
  return r ? JSON.parse(r.data) : null;
};
const userByEmail = (email) => {
  const e = String(email || '').trim().toLowerCase();
  if (e === ROOT.email) return ROOT;
  return allUsersStmt.all().map((r) => JSON.parse(r.data)).find((u) => u.email === e) || null;
};
const userFromToken = (t = '') => {
  const [uid, exp, sig] = String(t).split('.');
  if (!uid || !exp || !sig || Number(exp) < Date.now()) return null;
  const good = sign(`${uid}.${exp}`);
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  const u = userById(uid);
  return u && u.active !== false ? u : null;
};
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
const safeEq = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));
// Header only — tokens in URLs leak into logs/history. File downloads use a short-lived signed link (see /files-link).
const tokenOf = (req) => (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
const requireAuth = (req, res, next) => {
  const u = userFromToken(tokenOf(req));
  if (!u) return res.status(401).json({ error: 'Unauthorized' });
  req.user = u;
  next();
};
const requireFull = (req, res, next) => requireAuth(req, res, () => (req.user.full ? next() : res.status(403).json({ error: 'Full-access administrators only.' })));
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, full: !!u.full, perms: u.full ? {} : (u.perms || {}), locked: !!u.locked });
const fileSig = (name, exp) => sign(`file:${name}:${exp}`);

/* ---------------- mail (SMTP / Microsoft 365 — configured in Admin → Settings → Email) ---------------- */
const esc = (s = '') => String(s).replace(/[<>&"']/g, '');
const clip = (v, n = 200) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, n);

/* ---------------- app ---------------- */
const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : process.env.TRUST_PROXY);
app.use(helmet({
  contentSecurityPolicy: prod ? {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
      // https: lets the admin link images hosted elsewhere (project photos, client logos).
      'img-src': ["'self'", 'data:', 'blob:', 'https:'],
      'connect-src': ["'self'"],
      'frame-ancestors': ["'none'"],
      'frame-src': ["'none'"],
      'form-action': ["'self'"],
      'base-uri': ["'self'"],
      'object-src': ["'none'"],
      'upgrade-insecure-requests': null,
    },
  } : false,
  crossOriginEmbedderPolicy: false,
  hsts: prod ? undefined : false,
}));
// Parsers are mounted per route: only admin bulk saves and the PDF email need more than 1 MB.
const smallJson = express.json({ limit: '1mb' });
const bigJson = express.json({ limit: '25mb' });

const api = express.Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60e3, limit: 8, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Try again later.' } });
const publicLimiter = rateLimit({ windowMs: 10 * 60e3, limit: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests. Please try later.' } });
const uploadLimiter = rateLimit({ windowMs: 10 * 60e3, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many uploads. Please try later.' } });
const mailLimiter = rateLimit({ windowMs: 10 * 60e3, limit: 30, standardHeaders: true, legacyHeaders: false });
const mail = createMail({
  api, requireAuth: requireFull, smallJson, mailLimiter, sign,
  loadCfg: () => settingOf('mail', null),
  saveCfg: (c) => putSettingStmt.run('mail', JSON.stringify(c)),
  originOf: (req) => originOf(req),
});

api.post('/login', smallJson, loginLimiter, (req, res) => {
  const { email = '', password = '' } = req.body || {};
  // The hash check always runs (against a dummy when the email is unknown) so timing does not reveal valid emails.
  const u = userByEmail(email);
  const ok = verifyPw(String(password), u ? u.hash : DUMMY_HASH);
  if (u && ok && u.active !== false) return res.json({ token: makeToken(u.id), user: publicUser(u) });
  res.status(401).json({ error: 'Invalid credentials' });
});
api.get('/session', requireAuth, (req, res) => res.json({ ok: true, user: publicUser(req.user) }));

// Public capability probe: the admin UI uses it to choose SMTP delivery or the mailto fallback,
// and uptime monitors get something cheap to poll.
api.get('/health', (_req, res) => res.json({ ok: true, mail: mail.ready(), authEmail: true, production: prod, uptime: Math.round(process.uptime()) }));

/* ----- settings (public read: rates/content/company are shown on the site; write: admin) ----- */
api.get('/settings', (req, res) => {
  const ids = String(req.query.ids || '').split(',').filter((i) => SETTINGS.includes(i));
  res.json(getSettingsStmt.all().filter((r) => ids.includes(r.id)).map((r) => ({ id: r.id, data: JSON.parse(r.data) })));
});
api.put('/settings/:id', bigJson, requireAuth, (req, res) => {
  if (!SETTINGS.includes(req.params.id)) return res.status(404).json({ error: 'Unknown setting' });
  if (!canAny(req.user, SETTING_MODULES[req.params.id] || [], 'edit')) return res.status(403).json({ error: 'You do not have permission to change this setting.' });
  if (typeof req.body?.data !== 'object' || req.body.data === null) return res.status(400).json({ error: 'Bad payload' });
  putSettingStmt.run(req.params.id, JSON.stringify(req.body.data));
  res.json({ ok: true });
});

/* ----- admin collections (permission-checked per action; financial deletes need approval) ----- */
const known = (req, res, next) => (COLLECTIONS.includes(req.params.t) ? next() : res.status(404).json({ error: 'Unknown collection' }));
// Key-order independent, so re-saving an unchanged row is never mistaken for an edit.
const canon = (v) => (Array.isArray(v) ? `[${v.map(canon).join(',')}]` : v && typeof v === 'object' ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}` : JSON.stringify(v));
const putApprovalStmt = db.prepare('INSERT INTO approvals (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data');
const allApprovalsStmt = db.prepare('SELECT data FROM approvals');
const approvalRows = () => allApprovalsStmt.all().map((r) => JSON.parse(r.data));
const labelOf = (r = {}) => String(r.no || r.number || r.title || r.name || r.description || r.desc || r.supplier || r.id || '').slice(0, 120);
const amountOf = (r = {}) => Number(r.total ?? r.amount ?? r.net ?? r.grand ?? 0) || 0;

api.get('/c/:t', requireAuth, known, (req, res) => {
  if (!canAny(req.user, COL_MODULES[req.params.t], 'view')) return res.status(403).json({ error: 'No access to this section.' });
  res.json(S[req.params.t].all.all().map((r) => ({ id: r.id, data: JSON.parse(r.data) })));
});
api.put('/c/:t', bigJson, requireAuth, known, (req, res) => {
  const t = req.params.t;
  const { rows, deleted = [] } = req.body || {};
  if (!Array.isArray(rows) || !Array.isArray(deleted) || rows.some((r) => !r || typeof r.id !== 'string' || typeof r.data !== 'object')) return res.status(400).json({ error: 'Bad payload' });
  const mods = COL_MODULES[t];
  const existing = new Map(S[t].all.all().map((r) => [r.id, r.data]));
  const added = rows.filter((r) => !existing.has(r.id));
  const changed = rows.filter((r) => existing.has(r.id) && canon(JSON.parse(existing.get(r.id))) !== canon(r.data));
  const removed = deleted.filter((d) => typeof d === 'string' && existing.has(d));
  const deny = (what) => res.status(403).json({ error: `You do not have permission to ${what} here.` });
  if (added.length && !canAny(req.user, mods, 'add')) return deny('add records');
  if (changed.length && !canAny(req.user, mods, 'edit')) return deny('edit records');
  if (removed.length && !canAny(req.user, mods, 'delete')) return deny('delete records');

  // Money records: only a full-access admin deletes directly; everyone else files a request.
  let toDelete = removed;
  let pending = 0;
  if (removed.length && FINANCIAL.has(t) && !req.user.full) {
    const open = new Set(approvalRows().filter((a) => a.status === 'pending' && a.collection === t).map((a) => a.rowId));
    for (const id of removed) {
      if (open.has(id)) continue;
      const snap = JSON.parse(existing.get(id));
      const a = { id: rid('apr_'), collection: t, rowId: id, label: labelOf(snap), amount: amountOf(snap), snapshot: snap, requestedBy: { id: req.user.id, name: req.user.name || req.user.email }, at: new Date().toISOString(), status: 'pending' };
      putApprovalStmt.run(a.id, JSON.stringify(a));
    }
    pending = removed.length;
    toDelete = [];
  }
  saveCollection(t, rows.filter((r) => added.includes(r) || changed.includes(r)), toDelete);
  res.json({ ok: true, pending });
});

/* ----- users & approvals (full-access administrators only) ----- */
const cleanPerms = (p = {}) => {
  const out = {};
  for (const m of MODULE_IDS) {
    const g = p && typeof p === 'object' ? p[m] : null;
    if (!g || typeof g !== 'object') continue;
    const row = {};
    for (const a of ACTIONS) if (g[a]) row[a] = true;
    if (Object.keys(row).length) { if (!row.view) row.view = true; out[m] = row; }
  }
  return out;
};
const userOut = (u) => ({ id: u.id, name: u.name, email: u.email, full: !!u.full, active: u.active !== false, perms: u.perms || {}, locked: !!u.locked, createdAt: u.createdAt || '' });
api.get('/users', requireFull, (_req, res) => {
  const list = allUsersStmt.all().map((r) => userOut(JSON.parse(r.data))).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  res.json([userOut(ROOT), ...list]);
});
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const saveUser = (req, res, id) => {
  const b = req.body || {};
  const email = clip(b.email, 120).toLowerCase();
  const name = clip(b.name, 80);
  if (!name || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Name and a valid email are required.' });
  const clash = userByEmail(email);
  if (clash && clash.id !== id) return res.status(409).json({ error: 'This email is already used by another account.' });
  const old = id ? userById(id) : null;
  if (id && !old) return res.status(404).json({ error: 'User not found' });
  if (old && old.locked) return res.status(400).json({ error: 'The owner account is built in and cannot be changed here.' });
  const pw = String(b.password || '');
  if (!old && pw.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (pw && pw.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  const u = {
    ...(old || {}), id: old ? old.id : rid('usr_'), name, email, full: !!b.full, active: b.active !== false,
    perms: b.full ? {} : cleanPerms(b.perms), hash: pw ? hashPw(pw) : old.hash, createdAt: old ? old.createdAt : new Date().toISOString(),
  };
  putUserStmt.run(u.id, JSON.stringify(u));
  res.json(userOut(u));
};
api.post('/users', smallJson, requireFull, (req, res) => saveUser(req, res, null));
api.put('/users/:id', smallJson, requireFull, (req, res) => saveUser(req, res, req.params.id));
api.delete('/users/:id', requireFull, (req, res) => {
  if (req.params.id === ROOT.id) return res.status(400).json({ error: 'The owner account cannot be deleted.' });
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account.' });
  delUserStmt.run(req.params.id);
  res.json({ ok: true });
});

// Anyone signed in sees their own requests; full admins see every request.
api.get('/approvals', requireAuth, (req, res) => {
  const list = approvalRows().filter((a) => req.user.full || a.requestedBy?.id === req.user.id).sort((a, b) => String(b.at).localeCompare(String(a.at)));
  res.json(list.slice(0, 200));
});
const decide = (approve) => (req, res) => {
  const a = approvalRows().find((x) => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'Request not found' });
  if (a.status !== 'pending') return res.status(409).json({ error: 'Already decided.' });
  if (approve && COLLECTIONS.includes(a.collection)) S[a.collection].del.run(a.rowId);
  putApprovalStmt.run(a.id, JSON.stringify({ ...a, status: approve ? 'approved' : 'rejected', decidedBy: req.user.name || req.user.email, decidedAt: new Date().toISOString() }));
  res.json({ ok: true });
};
api.post('/approvals/:id/approve', requireFull, decide(true));
api.post('/approvals/:id/reject', requireFull, decide(false));

/* ----- public website submissions: ONE validated endpoint; the server builds the records ----- */
const KINDS = {
  quote: { source: 'Website Calculator', cat: null },
  booth: { source: 'Booth Brief', cat: 'signage' },
  consult: { source: 'Consultation Funnel', cat: 'marketing' },
  survey: { source: 'Site Survey', cat: 'survey' },
  visit: { source: 'Visit Request', cat: 'visit' },
  contact: { source: 'Contact Form', cat: 'general' },
};
const CAT_IDS = ['signage', 'printing', 'social', 'marketing', 'survey', 'visit', 'general'];
const DEPTS = ['signage', 'printing', 'social', 'marketing'];
const today = () => new Date().toISOString().slice(0, 10);
const rid = (p) => p + crypto.randomBytes(4).toString('hex');
const topDept = (items) => {
  const by = {}; items.forEach((i) => { by[i.dept] = (by[i.dept] || 0) + i.price; });
  const t = Object.entries(by).sort((a, b) => b[1] - a[1])[0]; return t ? t[0] : 'general';
};

api.post('/submit', smallJson, publicLimiter, (req, res) => {
  const b = req.body || {};
  const kind = KINDS[b.kind];
  if (!kind) return res.status(400).json({ error: 'Unknown form' });
  if (clip(b.website)) return res.json({ ok: true }); // honeypot: bots fill hidden "website" field
  const name = clip(b.name, 120), phone = clip(b.phone, 40), email = clip(b.email, 120);
  if (!name || (!phone && !email)) return res.status(400).json({ error: 'Name and phone or email are required' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });

  const date = today();
  const cid = rid('c');
  const filePath = /^[\w.\-]{1,160}$/.test(b.filePath || '') && fs.existsSync(path.join(UPLOADS, b.filePath)) ? b.filePath : '';
  let items = [];
  if (b.kind === 'quote') {
    items = (Array.isArray(b.items) ? b.items : []).slice(0, 60).map((i) => ({
      id: rid('i'), label: { en: clip(i?.label?.en, 200), ar: clip(i?.label?.ar, 200) }, detail: clip(i?.detail, 300),
      dept: DEPTS.includes(i?.dept) ? i.dept : 'printing', price: Math.min(1e7, Math.max(0, Number(i?.price) || 0)),
    }));
    if (!items.length) return res.status(400).json({ error: 'Cart is empty' });
  }
  const category = b.kind === 'quote' ? topDept(items) : (CAT_IDS.includes(b.category) && kind.cat === null ? b.category : kind.cat);
  // Visit requests: keep the preferred slot the visitor chose (it used to be dropped) and show it in the lead notes.
  const sv0 = (b.kind === 'visit' && b.survey) || {};
  const vDate = /^\d{4}-\d{2}-\d{2}$/.test(sv0.preferredDate || '') ? sv0.preferredDate : '';
  const vTime = ['morning', 'noon', 'evening'].includes(sv0.preferredTime) ? sv0.preferredTime : '';
  const slot = b.kind === 'visit' && (vDate || vTime) ? `Preferred visit: ${vDate || '—'}${vTime ? ' (' + vTime + ')' : ''}` : '';
  const lead = {
    id: cid, name, company: clip(b.company, 160), phone, email, tax: clip(b.tax, 40), stage: 'new', date,
    source: kind.source, category, notes: [slot, clip(b.notes, 2000)].filter(Boolean).join('\n'), file: clip(b.file, 160), filePath,
    ...(b.kind === 'visit' ? { preferredDate: vDate, preferredTime: vTime } : {}),
  };
  const out = { ok: true };
  const tx = db.transaction(() => {
    S.leads.ins.run(cid, JSON.stringify(lead));
    if (b.kind === 'quote') {
      const vat = settingOf('rates', { vat: 16 }).vat ?? 16;
      const sub = items.reduce((s, i) => s + i.price, 0);
      const total = sub * (1 + vat / 100);
      const n = db.prepare('SELECT COUNT(*) AS n FROM quotes').get().n + 1;
      let no = `Q-2026-${String(n).padStart(3, '0')}`;
      while (db.prepare("SELECT 1 FROM quotes WHERE json_extract(data,'$.no') = ?").get(no)) no = `Q-2026-${String(Number(no.slice(-3)) + 1).padStart(3, '0')}`;
      const qid = rid('q'), oid = rid('o');
      S.quotes.ins.run(qid, JSON.stringify({ id: qid, no, clientId: cid, status: 'draft', discount: 0, vat: true, date, notes: lead.notes, file: lead.file, filePath, converted: false, validDays: 14, items }));
      S.orders.ins.run(oid, JSON.stringify({ id: oid, quoteId: qid, clientId: cid, title: `${lead.company || name} — Web Request (Draft)`, stage: 'draft', date, total: Math.round(total * 100) / 100 }));
      out.no = no; out.total = total;
    }
    if (b.kind === 'survey') {
      const sid = rid('s');
      const sv = b.survey || {};
      S.surveys.ins.run(sid, JSON.stringify({
        id: sid, clientId: cid, status: 'new', date,
        address: clip(sv.address, 300), city: clip(sv.city, 80), mapUrl: /^https?:\/\//.test(sv.mapUrl || '') ? clip(sv.mapUrl, 400) : '',
        type: clip(sv.type, 40), preferredDate: /^\d{4}-\d{2}-\d{2}$/.test(sv.preferredDate || '') ? sv.preferredDate : '',
        preferredTime: clip(sv.preferredTime, 20), notes: clip(sv.notes, 1500), scheduledAt: '', assignee: '', result: '',
      }));
      out.surveyId = sid;
    }
  });
  tx();
  if (mail.ready() && mail.notifyTo()) {
    mail.send({
      to: mail.notifyTo(),
      subject: `[${kind.source}] ${esc(name)}${out.no ? ' — ' + out.no : ''}`,
      html: `<h3>${esc(kind.source)}</h3><p><b>${esc(name)}</b> ${esc(lead.company)}<br>Phone: ${esc(phone)}<br>Email: ${esc(email)}<br>Category: ${esc(category)}</p><p>${esc(lead.notes)}</p>${SITE_URL ? `<p><a href="${SITE_URL}">Open admin</a></p>` : ''}`,
    }).catch((e) => console.error('mail failed:', e.message));
  }
  res.json(out);
});

/* ----- uploads ----- */
const raw = (limit) => express.raw({ type: () => true, limit });
const UP_EXT = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ai', '.psd', '.eps', '.dwg', '.dxf', '.zip', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.skp', '.3ds', '.obj', '.stl']);
api.post('/upload', uploadLimiter, raw('15mb'), (req, res) => {
  if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'Empty file' });
  const orig = decodeURIComponent(String(req.headers['x-filename'] || 'file')).replace(/[^\w.\-]+/g, '_').slice(-80);
  if (!UP_EXT.has(path.extname(orig).toLowerCase())) return res.status(400).json({ error: 'File type not allowed' });
  const file = `${Date.now()}_${crypto.randomBytes(3).toString('hex')}_${orig}`;
  fs.writeFileSync(path.join(UPLOADS, file), req.body, { mode: 0o600 });
  res.json({ path: file });
});
// Admin asks for a 2-minute signed link; the download itself is then a plain browser navigation.
api.get('/files-link/:name', requireAuth, (req, res) => {
  const name = path.basename(req.params.name);
  const exp = Date.now() + 120e3;
  res.json({ url: `/api/files/${encodeURIComponent(name)}?e=${exp}&s=${fileSig(name, exp)}` });
});
api.get('/files/:name', (req, res) => {
  const name = path.basename(req.params.name);
  const exp = Number(req.query.e);
  const s = String(req.query.s || '');
  const good = fileSig(name, exp);
  if (!exp || exp < Date.now() || s.length !== good.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(good))) return res.status(403).json({ error: 'Link expired' });
  const full = path.join(UPLOADS, name);
  if (!fs.existsSync(full)) return res.status(404).json({ error: 'Not found' });
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.download(full, name.replace(/^\d+_[0-9a-f]{6}_/, ''));
});

/* ----- admin media (logos / project photos) ----- */
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
api.post('/media', requireAuth, raw('10mb'), (req, res) => {
  const ext = EXT[String(req.headers['content-type']).split(';')[0]];
  if (!ext || !Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'PNG, JPEG or WebP only' });
  const file = `${Date.now()}_${crypto.randomBytes(3).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(MEDIA, file), req.body);
  res.json({ url: `/media/${file}` });
});

/* ----- email a quote/invoice PDF (admin) ----- */
api.post('/fn/send-quote', bigJson, requireAuth, mailLimiter, async (req, res) => {
  if (!mail.ready()) return res.status(501).json({ error: 'Email is not configured. Open Settings → Email.' });
  const { to, subject, html, filename, pdfBase64, replyTo } = req.body || {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to || '') || !pdfBase64) return res.status(400).json({ error: 'Missing recipient or PDF' });
  try {
    await mail.send({
      to, subject: clip(subject, 200), html: esc(html || '').replace(/\n/g, '<br>'), replyTo: replyTo || undefined,
      attachments: [{ filename: clip(filename || 'quotation.pdf', 80).replace(/[^\w.\-]+/g, '_'), content: Buffer.from(pdfBase64, 'base64'), contentType: 'application/pdf' }],
    });
    res.json({ ok: true });
  } catch (e) { res.status(502).json({ error: String(e.message || e) }); }
});
api.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use('/api', api);

app.use('/media', express.static(MEDIA, { maxAge: '30d', index: false, setHeaders: (r) => r.setHeader('X-Content-Type-Options', 'nosniff') }));
app.use('/admin', (_req, res, next) => { res.setHeader('X-Robots-Tag', 'noindex, nofollow'); res.setHeader('Cache-Control', 'no-store'); next(); });

/* ----- SEO files (content lives in server/seo.js) ----- */
const originOf = (req) => SITE_URL || `${req.protocol}://${req.get('host')}`;

app.get('/robots.txt', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.type('text/plain').send(robotsTxt(originOf(req)));
});
app.get('/sitemap.xml', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.type('application/xml').send(sitemapXml(originOf(req)));
});
// Agent-facing site map: who the business is, what it sells, where, and what it costs.
app.get('/llms.txt', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.type('text/plain').send(llmsTxt(originOf(req), settingOf('company', {})));
});

/* ----- Landing pages: real server-rendered HTML, one per service per language -----
   The SPA cannot rank on its own because its body is injected by JS. These ten pages
   carry the copy, the headings and the schema that crawlers and answer engines read
   without executing anything. They work in dev and production alike. */
app.get(['/en/:slug', '/ar/:slug'], (req, res) => {
  const lang = req.path.startsWith('/ar/') ? 'ar' : 'en';
  const svc = serviceBySlug(req.params.slug);
  if (!svc) {
    // A real 404 — never fall through to the SPA shell, which would be a soft 404.
    res.status(404).type('html').send(
      `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">`
      + '<meta name="robots" content="noindex"><title>404 — Art Space</title></head>'
      + '<body style="font-family:system-ui;padding:2rem;max-width:40rem">'
      + `<h1>404</h1><p>${lang === 'ar' ? 'الصفحة غير موجودة.' : 'Page not found.'}</p>`
      + `<p><a href="/">${lang === 'ar' ? 'العودة إلى الرئيسية' : 'Back to home'}</a></p></body></html>`,
    );
    return;
  }
  // Settings are edited in the admin panel, so allow a short shared cache, not immutable.
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.type('html').send(renderServicePage({ base: originOf(req), lang, svc, company: settingOf('company', {}) }));
});

if (prod) {
  const dist = path.join(root, 'dist');
  // index.html is rendered per request so JSON-LD (LocalBusiness) always reflects the Company settings.
  const page = (req, res) => {
    try {
      const c = settingOf('company', {});
      const base = originOf(req);
      const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
        // Social scrapers require absolute image URLs — resolve them against the real origin.
        .replaceAll('content="/og-image.png"', `content="${base}/og-image.png"`)
        // Canonical + hreflang + the Organization/WebSite/WebPage @graph.
        .replace('<!--SEO_JSONLD-->', homeHead(base, c));
      // The shell references hashed assets, so it must never be cached on its own.
      res.setHeader('Cache-Control', 'no-store');
      res.type('html').send(html);
    } catch { res.sendFile(path.join(dist, 'index.html')); }
  };
  app.get('/', page);
  // Vite content-hashes every asset name, so those files can be cached forever.
  app.use('/assets', express.static(path.join(dist, 'assets'), { index: false, maxAge: '1y', immutable: true }));
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get('/{*splat}', page);
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}
app.use((err, _req, res, _next) => { console.error(err); res.status(err.status || 500).json({ error: err.status === 413 ? 'Payload too large' : 'Server error' }); });

app.listen(PORT, HOST, () => {
  // A wildcard bind is not a browsable address; print something the user can click.
  const shown = HOST === '0.0.0.0' || HOST === '::' ? 'localhost' : HOST;
  console.log(`\n  Art Space running on http://${shown}:${PORT}  (${prod ? 'production' : 'development'})`);
  console.log(`  Data folder: ${DATA}`);
  console.log(`  Email: ${mail.ready() ? 'enabled' : 'not configured (Admin → Settings → Email)'}`);
  console.log(`  Admin login: ${ROOT.email} (built-in owner) + staff accounts from Admin → Users`);
  console.log('');
});
