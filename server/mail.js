// Outgoing mail: SMTP (Outlook / Microsoft 365) or "Connect with Microsoft" (OAuth 2 + Microsoft Graph).
// The configuration lives in the `settings` table under id "mail" (never exposed by the public
// /settings route). Secrets are write-only: the admin UI only ever receives "is it set" flags.
import nodemailer from 'nodemailer';
import crypto from 'node:crypto';

const MS_SCOPE = 'offline_access User.Read Mail.Send';
const SECRET_KEYS = ['pass', 'secret', 'refreshToken'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const s = (v, n = 200) => String(v ?? '').trim().slice(0, n);

export function createMail({ api, requireAuth, smallJson, mailLimiter, loadCfg, saveCfg, sign, originOf }) {
  /* ----- configuration (saved config wins, .env is the fallback) ----- */
  const cfg = () => {
    const c = loadCfg() || {};
    if (c.mode) return c;
    if (!process.env.SMTP_HOST) return { mode: 'off' };
    return {
      mode: 'smtp', host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '', from: process.env.MAIL_FROM || process.env.SMTP_USER || '', fromName: '', notifyTo: process.env.NOTIFY_TO || '',
    };
  };
  const ready = () => {
    const c = cfg();
    if (c.mode === 'smtp') return !!(c.host && c.user && c.pass);
    if (c.mode === 'microsoft') return !!c.refreshToken;
    return false;
  };
  const notifyTo = () => cfg().notifyTo || process.env.NOTIFY_TO || '';
  const fromOf = (c) => {
    const addr = c.from || c.user || c.account || '';
    return c.fromName && addr ? `"${c.fromName.replace(/"/g, '')}" <${addr}>` : addr;
  };

  /* ----- Microsoft OAuth ----- */
  const tokenUrl = (c) => `https://login.microsoftonline.com/${encodeURIComponent(c.tenant || 'common')}/oauth2/v2.0/token`;
  const redirectOf = (req) => `${originOf(req)}/api/mail/ms/callback`;
  async function tokenCall(c, params) {
    const r = await fetch(tokenUrl(c), {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: c.clientId, client_secret: c.secret, scope: MS_SCOPE, ...params }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error_description || j.error || `Microsoft sign-in failed (${r.status})`);
    return j;
  }
  async function accessToken(c) {
    const j = await tokenCall(c, { grant_type: 'refresh_token', refresh_token: c.refreshToken });
    if (j.refresh_token && j.refresh_token !== c.refreshToken) saveCfg({ ...c, refreshToken: j.refresh_token });
    return j.access_token;
  }

  /* ----- sending ----- */
  /** @param m {to, subject, html, replyTo?, attachments?: [{filename, content: Buffer, contentType}]} */
  async function send(m) {
    const c = cfg();
    if (!ready()) throw new Error('Email is not configured. Open Settings → Email.');
    if (c.mode === 'smtp') {
      const port = Number(c.port) || 587;
      const tr = nodemailer.createTransport({
        host: c.host, port, secure: port === 465, requireTLS: port !== 465 && port !== 25,
        auth: { user: c.user, pass: c.pass },
      });
      return tr.sendMail({ from: fromOf(c), to: m.to, subject: m.subject, html: m.html, replyTo: m.replyTo || undefined, attachments: m.attachments });
    }
    const token = await accessToken(c);
    const list = (v) => String(v).split(',').map((a) => a.trim()).filter(Boolean).map((address) => ({ emailAddress: { address } }));
    const message = {
      subject: m.subject, body: { contentType: 'HTML', content: m.html || '' }, toRecipients: list(m.to),
      ...(m.replyTo ? { replyTo: list(m.replyTo) } : {}),
      ...(c.from && c.from.toLowerCase() !== String(c.account || '').toLowerCase() ? { from: { emailAddress: { address: c.from, name: c.fromName || undefined } } } : {}),
      attachments: (m.attachments || []).map((a) => ({
        '@odata.type': '#microsoft.graph.fileAttachment', name: a.filename, contentType: a.contentType || 'application/octet-stream',
        contentBytes: Buffer.from(a.content).toString('base64'),
      })),
    };
    const r = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, saveToSentItems: true }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error(j.error?.message || `Microsoft Graph error ${r.status}`);
    }
    return { ok: true };
  }

  /* ----- admin routes ----- */
  const publicView = (c) => {
    const out = { ...c };
    for (const k of SECRET_KEYS) { out[`has${k[0].toUpperCase()}${k.slice(1)}`] = !!c[k]; delete out[k]; }
    return out;
  };
  api.get('/mail/config', requireAuth, (req, res) => {
    const c = cfg();
    res.json({ ...publicView({ mode: 'off', host: 'smtp.office365.com', port: 587, ...c }), ready: ready(), redirectUri: redirectOf(req), envFallback: !loadCfg()?.mode && !!process.env.SMTP_HOST });
  });
  api.put('/mail/config', smallJson, requireAuth, (req, res) => {
    const b = req.body || {};
    const old = loadCfg() || {};
    const mode = ['smtp', 'microsoft', 'off'].includes(b.mode) ? b.mode : 'off';
    const next = {
      ...old, mode, host: s(b.host) || 'smtp.office365.com', port: Number(b.port) || 587, user: s(b.user), from: s(b.from), fromName: s(b.fromName, 80),
      notifyTo: s(b.notifyTo, 300), clientId: s(b.clientId), tenant: s(b.tenant) || 'common',
    };
    for (const k of ['from', 'user', 'notifyTo']) {
      if (k === 'notifyTo') { if (next[k] && !next[k].split(',').every((a) => EMAIL_RE.test(a.trim()))) return res.status(400).json({ error: 'Invalid notification address' }); }
      else if (next[k] && !EMAIL_RE.test(next[k])) return res.status(400).json({ error: `Invalid ${k} address` });
    }
    if (s(b.pass, 500)) next.pass = s(b.pass, 500);
    if (s(b.secret, 500)) next.secret = s(b.secret, 500);
    saveCfg(next);
    res.json({ ok: true });
  });
  api.post('/mail/test', smallJson, requireAuth, mailLimiter, async (req, res) => {
    const to = s(req.body?.to);
    if (!EMAIL_RE.test(to)) return res.status(400).json({ error: 'Enter a valid recipient' });
    try {
      await send({ to, subject: 'Art Space — test email', html: '<p>This is a test email from your Art Space admin panel. Email delivery is working.</p>' });
      res.json({ ok: true });
    } catch (e) { res.status(502).json({ error: String(e.message || e) }); }
  });
  api.post('/mail/ms/start', smallJson, requireAuth, (req, res) => {
    const c = loadCfg() || {};
    if (!c.clientId || !c.secret) return res.status(400).json({ error: 'Save the Application (client) ID and the client secret first.' });
    const exp = Date.now() + 10 * 60e3;
    const nonce = crypto.randomBytes(8).toString('hex');
    const state = `${exp}.${nonce}.${sign(`ms:${exp}:${nonce}`)}`;
    const url = `https://login.microsoftonline.com/${encodeURIComponent(c.tenant || 'common')}/oauth2/v2.0/authorize?${new URLSearchParams({
      client_id: c.clientId, response_type: 'code', redirect_uri: redirectOf(req), response_mode: 'query', scope: MS_SCOPE, prompt: 'select_account', state,
    })}`;
    res.json({ url });
  });
  // Browser redirect from Microsoft — authenticated by the signed `state`, not by the admin header.
  api.get('/mail/ms/callback', async (req, res) => {
    const back = (q) => res.redirect(`/admin?mail=${q}`);
    try {
      const [exp, nonce, sig] = String(req.query.state || '').split('.');
      const good = sign(`ms:${exp}:${nonce}`);
      if (!exp || Number(exp) < Date.now() || !sig || sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return back('error');
      if (req.query.error) return back('error');
      const c = loadCfg() || {};
      const j = await tokenCall(c, { grant_type: 'authorization_code', code: String(req.query.code || ''), redirect_uri: redirectOf(req) });
      const me = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName,displayName', { headers: { Authorization: `Bearer ${j.access_token}` } }).then((r) => r.json()).catch(() => ({}));
      saveCfg({ ...c, mode: 'microsoft', refreshToken: j.refresh_token, account: me.mail || me.userPrincipalName || '', accountName: me.displayName || '' });
      back('connected');
    } catch (e) { console.error('ms oauth failed:', e.message); back('error'); }
  });
  api.post('/mail/ms/disconnect', smallJson, requireAuth, (_req, res) => {
    const c = loadCfg() || {};
    saveCfg({ ...c, refreshToken: '', account: '', accountName: '' });
    res.json({ ok: true });
  });

  return { send, ready, notifyTo };
}
