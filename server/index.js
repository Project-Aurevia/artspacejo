// Art Space — self-contained server: Express + SQLite (single file) + local file storage.
//   npm run dev   -> API + Vite dev server (http://localhost:3000)
//   npm start     -> build + serve from one process (production)
// Env: PORT, HOST, ADMIN_PASSWORD (required in production), ADMIN_EMAIL, DATA_DIR, SITE_URL,
//      SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, NOTIFY_TO, TRUST_PROXY
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import Database from 'better-sqlite3';
import nodemailer from 'nodemailer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = process.env.DATA_DIR || path.join(root, 'data');
const UPLOADS = path.join(DATA, 'uploads');
const MEDIA = path.join(DATA, 'media');
fs.mkdirSync(UPLOADS, { recursive: true, mode: 0o700 });
fs.mkdirSync(MEDIA, { recursive: true });

const prod = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT || 3000);
// Production binds to loopback only (put Caddy/nginx in front). Override with HOST=0.0.0.0 if needed.
const HOST = process.env.HOST || (prod ? '127.0.0.1' : 'localhost');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (prod ? '' : 'artspace2026');
if (prod && (ADMIN_PASSWORD.length < 10 || ADMIN_PASSWORD === 'artspace2026')) {
  console.error('\n  ✖ Refusing to start: set ADMIN_PASSWORD (min 10 chars, not the demo password) in production.\n');
  process.exit(1);
}
const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '');

/* ---------------- database ---------------- */
const db = new Database(path.join(DATA, 'artspace.db'));
db.pragma('journal_mode = WAL');
const COLLECTIONS = ['leads', 'quotes', 'orders', 'invoices', 'surveys'];
const SETTINGS = ['rates', 'content', 'company'];
db.exec('CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
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
const makeToken = () => { const exp = String(Date.now() + 12 * 3600e3); return `${exp}.${sign(exp)}`; };
const validToken = (t = '') => {
  const [exp, sig] = String(t).split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const good = sign(exp);
  return sig.length === good.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good));
};
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
const safeEq = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));
// Header only — tokens in URLs leak into logs/history. File downloads use a short-lived signed link (see /files-link).
const tokenOf = (req) => (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
const requireAuth = (req, res, next) => (validToken(tokenOf(req)) ? next() : res.status(401).json({ error: 'Unauthorized' }));
const fileSig = (name, exp) => sign(`file:${name}:${exp}`);

/* ---------------- mail (optional SMTP) ---------------- */
const smtp = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: Number(process.env.SMTP_PORT) === 465,
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
}) : null;
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
      'img-src': ["'self'", 'data:', 'blob:'],
      'connect-src': ["'self'"],
      'frame-ancestors': ["'none'"],
      'object-src': ["'none'"],
      'upgrade-insecure-requests': null,
    },
  } : false,
  crossOriginEmbedderPolicy: false,
  hsts: prod ? undefined : false,
}));
app.use(express.json({ limit: '25mb' }));

const api = express.Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60e3, limit: 8, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Try again later.' } });
const publicLimiter = rateLimit({ windowMs: 10 * 60e3, limit: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests. Please try later.' } });
const uploadLimiter = rateLimit({ windowMs: 10 * 60e3, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many uploads. Please try later.' } });
const mailLimiter = rateLimit({ windowMs: 10 * 60e3, limit: 30, standardHeaders: true, legacyHeaders: false });

api.post('/login', loginLimiter, (req, res) => {
  const { password = '' } = req.body || {};
  const okPass = safeEq(password, ADMIN_PASSWORD);
  if (okPass && ADMIN_PASSWORD) return res.json({ token: makeToken() });
  res.status(401).json({ error: 'Invalid credentials' });
});
api.get('/session', requireAuth, (_req, res) => res.json({ ok: true }));

/* ----- settings (public read: rates/content/company are shown on the site; write: admin) ----- */
api.get('/settings', (req, res) => {
  const ids = String(req.query.ids || '').split(',').filter((i) => SETTINGS.includes(i));
  res.json(getSettingsStmt.all().filter((r) => ids.includes(r.id)).map((r) => ({ id: r.id, data: JSON.parse(r.data) })));
});
api.put('/settings/:id', requireAuth, (req, res) => {
  if (!SETTINGS.includes(req.params.id)) return res.status(404).json({ error: 'Unknown setting' });
  if (typeof req.body?.data !== 'object' || req.body.data === null) return res.status(400).json({ error: 'Bad payload' });
  putSettingStmt.run(req.params.id, JSON.stringify(req.body.data));
  res.json({ ok: true });
});

/* ----- admin collections ----- */
const known = (req, res, next) => (COLLECTIONS.includes(req.params.t) ? next() : res.status(404).json({ error: 'Unknown collection' }));
api.get('/c/:t', requireAuth, known, (req, res) => res.json(S[req.params.t].all.all().map((r) => ({ id: r.id, data: JSON.parse(r.data) }))));
api.put('/c/:t', requireAuth, known, (req, res) => {
  const { rows, deleted = [] } = req.body || {};
  if (!Array.isArray(rows) || !Array.isArray(deleted) || rows.some((r) => !r || typeof r.id !== 'string' || typeof r.data !== 'object')) return res.status(400).json({ error: 'Bad payload' });
  saveCollection(req.params.t, rows, deleted.filter((d) => typeof d === 'string'));
  res.json({ ok: true });
});

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

api.post('/submit', publicLimiter, (req, res) => {
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
  const lead = {
    id: cid, name, company: clip(b.company, 160), phone, email, tax: clip(b.tax, 40), stage: 'new', date,
    source: kind.source, category, notes: clip(b.notes, 2000), file: clip(b.file, 160), filePath,
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
  if (smtp && process.env.NOTIFY_TO) {
    smtp.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER, to: process.env.NOTIFY_TO,
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
api.post('/fn/send-quote', requireAuth, mailLimiter, async (req, res) => {
  if (!smtp) return res.status(501).json({ error: 'SMTP is not configured on the server (set SMTP_HOST, SMTP_USER, SMTP_PASS, MAIL_FROM).' });
  const { to, subject, html, filename, pdfBase64, replyTo } = req.body || {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to || '') || !pdfBase64) return res.status(400).json({ error: 'Missing recipient or PDF' });
  try {
    await smtp.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject: clip(subject, 200), html: esc(html || '').replace(/\n/g, '<br>'), replyTo: replyTo || undefined,
      attachments: [{ filename: clip(filename || 'quotation.pdf', 80).replace(/[^\w.\-]+/g, '_'), content: Buffer.from(pdfBase64, 'base64'), contentType: 'application/pdf' }],
    });
    res.json({ ok: true });
  } catch (e) { res.status(502).json({ error: String(e.message || e) }); }
});
api.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use('/api', api);

app.use('/media', express.static(MEDIA, { maxAge: '30d', index: false, setHeaders: (r) => r.setHeader('X-Content-Type-Options', 'nosniff') }));
app.use('/admin', (_req, res, next) => { res.setHeader('X-Robots-Tag', 'noindex, nofollow'); res.setHeader('Cache-Control', 'no-store'); next(); });

/* ----- SEO files ----- */
app.get('/robots.txt', (req, res) => {
  const base = SITE_URL || `${req.protocol}://${req.get('host')}`;
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${base}/sitemap.xml\n`);
});
app.get('/sitemap.xml', (req, res) => {
  const base = SITE_URL || `${req.protocol}://${req.get('host')}`;
  const sections = ['', '#signage', '#printing', '#social', '#marketing', '#calculator', '#portfolio', '#testimonials', '#survey'];
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sections.slice(0, 1).map((s) => `<url><loc>${base}/${s}</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`).join('\n')}\n</urlset>\n`);
});

if (prod) {
  const dist = path.join(root, 'dist');
  // index.html is rendered per request so JSON-LD (LocalBusiness) always reflects the Company settings.
  const page = (req, res) => {
    try {
      const c = settingOf('company', {});
      const base = SITE_URL || `${req.protocol}://${req.get('host')}`;
      const ld = {
        '@context': 'https://schema.org', '@type': 'LocalBusiness', name: c.name?.en || 'Art Space', alternateName: c.name?.ar || 'مساحة الفن',
        url: base, telephone: c.phone || undefined, email: c.email || undefined,
        address: { '@type': 'PostalAddress', streetAddress: c.address?.en || 'Amman', addressCountry: 'JO' },
        image: c.logo ? (c.logo.startsWith('http') ? c.logo : base + c.logo) : `${base}/favicon.svg`,
        areaServed: 'JO', priceRange: '$$',
      };
      const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
        .replace('<!--SEO_JSONLD-->', `<link rel="canonical" href="${base}/" /><script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`);
      res.type('html').send(html);
    } catch { res.sendFile(path.join(dist, 'index.html')); }
  };
  app.get('/', page);
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get('/{*splat}', page);
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}
app.use((err, _req, res, _next) => { console.error(err); res.status(err.status || 500).json({ error: err.status === 413 ? 'Payload too large' : 'Server error' }); });

app.listen(PORT, HOST, () => {
  console.log(`\n  Art Space running on http://${HOST}:${PORT}  (${prod ? 'production' : 'development'})`);
  console.log(`  Data folder: ${DATA}`);
  console.log(`  Email (SMTP): ${smtp ? 'enabled' : 'not configured (optional)'}`);
  if (!prod) console.log('  ⚠ Dev mode: demo admin password in use. Production requires ADMIN_PASSWORD.');
  console.log('');
});
