import React, { useEffect, useState } from 'react';
import { Mail, Send, PlugZap, Unplug, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { useApp } from './store.jsx';
import { mailApi } from './api.js';

const EMPTY = { mode: 'smtp', host: 'smtp.office365.com', port: 587, user: '', from: '', fromName: '', notifyTo: '', clientId: '', tenant: 'common' };

/** Admin → Settings → Email: Outlook / Microsoft 365 via SMTP (alias supported) or "Connect with Microsoft". */
export default function EmailSettings() {
  const { T } = useApp();
  const [cfg, setCfg] = useState(EMPTY);
  const [info, setInfo] = useState({});
  const [pass, setPass] = useState('');
  const [secret, setSecret] = useState('');
  const [testTo, setTestTo] = useState('');
  const [msg, setMsg] = useState(null); // {ok, text}
  const [busy, setBusy] = useState('');

  const load = async () => {
    const { data, error } = await mailApi.get();
    if (error) return setMsg({ ok: false, text: error.message });
    setInfo(data);
    setCfg({ ...EMPTY, ...data, mode: data.mode === 'off' ? 'smtp' : data.mode });
  };
  useEffect(() => {
    load();
    const q = new URLSearchParams(window.location.search).get('mail');
    if (q) {
      setMsg(q === 'connected' ? { ok: true, text: T('Microsoft account connected.', 'تم ربط حساب مايكروسوفت.') } : { ok: false, text: T('Microsoft sign-in failed. Check the client ID, secret and redirect URI, then try again.', 'فشل تسجيل الدخول إلى مايكروسوفت. تحقق من المعرّف والسر وعنوان إعادة التوجيه ثم أعد المحاولة.') });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (p) => setCfg((c) => ({ ...c, ...p }));
  const save = async (quiet) => {
    setBusy('save');
    const { error } = await mailApi.save({ ...cfg, pass, secret });
    setBusy('');
    if (error) { setMsg({ ok: false, text: error.message }); return false; }
    setPass(''); setSecret('');
    if (!quiet) setMsg({ ok: true, text: T('Saved.', 'تم الحفظ.') });
    await load();
    return true;
  };
  const test = async () => {
    if (!(await save(true))) return;
    setBusy('test');
    const { error } = await mailApi.test(testTo);
    setBusy('');
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: T('Test email sent — check the inbox.', 'تم إرسال رسالة اختبار — تحقق من صندوق الوارد.') });
  };
  const connect = async () => {
    if (!(await save(true))) return;
    const { data, error } = await mailApi.start();
    if (error) return setMsg({ ok: false, text: error.message });
    window.location.href = data.url;
  };
  const disconnect = async () => {
    if (!confirm(T('Disconnect the Microsoft account?', 'فصل حساب مايكروسوفت؟'))) return;
    await mailApi.disconnect();
    load();
  };

  const ms = cfg.mode === 'microsoft';
  const connected = ms && info.mode === 'microsoft' && info.hasRefreshToken;

  return (
    <div className="max-w-3xl space-y-5">
      <div className="glass space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-bold text-gold"><Mail size={18} />{T('Outgoing email (Microsoft 365 / Outlook)', 'البريد الصادر (Microsoft 365 / Outlook)')}</h3>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${info.ready ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'}`}>
            {info.ready ? T('Active', 'مفعّل') : T('Not configured', 'غير مهيأ')}
          </span>
        </div>
        <p className="text-[12px] leading-relaxed text-subtle">{T('Used for quotation/invoice emails and new-enquiry notifications. Choose how to connect:', 'يُستخدم لإرسال عروض الأسعار والفواتير وإشعارات الطلبات الجديدة. اختر طريقة الربط:')}</p>
        {info.envFallback && <p className="text-[11px] text-amber-500">{T('Currently using the SMTP values from the server .env file. Saving here overrides them.', 'يُستخدم حالياً إعداد SMTP من ملف .env. الحفظ هنا يلغيه.')}</p>}

        <div className="seg">
          <button type="button" className="seg-tab" data-active={ms} onClick={() => set({ mode: 'microsoft' })}>{T('Connect with Microsoft', 'الربط عبر مايكروسوفت')}</button>
          <button type="button" className="seg-tab" data-active={!ms} onClick={() => set({ mode: 'smtp' })}>{T('SMTP (manual)', 'SMTP (يدوي)')}</button>
        </div>

        {ms ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-line/10 p-3 text-[12px] leading-relaxed text-subtle">
              <b className="text-fg">{T('One-time setup (5 minutes, free):', 'إعداد لمرة واحدة (5 دقائق، مجاني):')}</b>
              <ol className="ms-4 mt-1 list-decimal space-y-0.5">
                <li>{T('Open Microsoft Entra → App registrations → New registration (single tenant is fine).', 'افتح Microsoft Entra ← App registrations ← New registration.')}</li>
                <li>{T('Add a Web redirect URI exactly as shown below.', 'أضف Redirect URI من نوع Web مطابقاً تماماً للعنوان أدناه.')}</li>
                <li>{T('API permissions → Microsoft Graph → Delegated: Mail.Send, User.Read, offline_access.', 'API permissions ← Microsoft Graph ← Delegated: Mail.Send و User.Read و offline_access.')}</li>
                <li>{T('Certificates & secrets → New client secret. Paste the IDs and secret here, save, then press Connect.', 'Certificates & secrets ← New client secret. الصق المعرّفات والسر هنا، احفظ، ثم اضغط ربط.')}</li>
              </ol>
              <a className="mt-2 inline-flex items-center gap-1 text-gold" href="https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank" rel="noreferrer">Microsoft Entra <ExternalLink size={12} /></a>
            </div>
            <div>
              <label className="label">{T('Redirect URI (copy into Azure)', 'عنوان إعادة التوجيه (انسخه إلى Azure)')}</label>
              <input className="input" readOnly dir="ltr" value={info.redirectUri || ''} onFocus={(e) => e.target.select()} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Application (client) ID</label><input className="input" dir="ltr" value={cfg.clientId || ''} onChange={(e) => set({ clientId: e.target.value })} /></div>
              <div><label className="label">Directory (tenant) ID</label><input className="input" dir="ltr" placeholder="common" value={cfg.tenant || ''} onChange={(e) => set({ tenant: e.target.value })} /></div>
              <div className="sm:col-span-2">
                <label className="label">Client secret {info.hasSecret && <span className="text-emerald-500">· {T('saved', 'محفوظ')}</span>}</label>
                <input className="input" type="password" dir="ltr" autoComplete="new-password" placeholder={info.hasSecret ? '••••••••' : ''} value={secret} onChange={(e) => setSecret(e.target.value)} />
              </div>
              <div><label className="label">{T('Send-as / alias address (optional)', 'عنوان الإرسال / الاسم المستعار (اختياري)')}</label><input className="input" type="email" dir="ltr" placeholder="info@artspacejo.com" value={cfg.from || ''} onChange={(e) => set({ from: e.target.value })} /></div>
              <div><label className="label">{T('Sender name', 'اسم المرسل')}</label><input className="input" value={cfg.fromName || ''} onChange={(e) => set({ fromName: e.target.value })} /></div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="btn-gold" onClick={connect} disabled={!!busy}><PlugZap size={15} />{connected ? T('Reconnect Microsoft', 'إعادة الربط') : T('Connect with Microsoft', 'الربط عبر مايكروسوفت')}</button>
              {connected && <button type="button" className="btn-ghost text-red-400" onClick={disconnect}><Unplug size={15} />{T('Disconnect', 'فصل')}</button>}
              {connected && <span className="flex items-center gap-1 text-[12px] text-emerald-500"><CheckCircle2 size={14} />{T('Connected as', 'متصل باسم')} <b dir="ltr">{info.account || info.accountName}</b></span>}
            </div>
            <p className="text-[11px] text-subtle">{T('To send from an alias, the connected mailbox needs “Send As” permission for it in Microsoft 365.', 'للإرسال من اسم مستعار يجب منح صندوق البريد المتصل صلاحية «Send As» لهذا العنوان في Microsoft 365.')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2"><label className="label">SMTP host</label><input className="input" dir="ltr" value={cfg.host || ''} onChange={(e) => set({ host: e.target.value })} /></div>
              <div><label className="label">Port</label><input className="input" type="number" dir="ltr" value={cfg.port || 587} onChange={(e) => set({ port: e.target.value })} /></div>
              <div><label className="label">{T('Mailbox login (username)', 'اسم دخول صندوق البريد')}</label><input className="input" type="email" dir="ltr" placeholder="you@company.com" value={cfg.user || ''} onChange={(e) => set({ user: e.target.value })} /></div>
              <div className="sm:col-span-2">
                <label className="label">{T('Password / app password', 'كلمة المرور / كلمة مرور التطبيق')} {info.hasPass && <span className="text-emerald-500">· {T('saved', 'محفوظة')}</span>}</label>
                <input className="input" type="password" dir="ltr" autoComplete="new-password" placeholder={info.hasPass ? '••••••••' : ''} value={pass} onChange={(e) => setPass(e.target.value)} />
              </div>
              <div><label className="label">{T('From / alias address', 'عنوان المرسل / الاسم المستعار')}</label><input className="input" type="email" dir="ltr" placeholder="info@artspacejo.com" value={cfg.from || ''} onChange={(e) => set({ from: e.target.value })} /></div>
              <div className="sm:col-span-2"><label className="label">{T('Sender name', 'اسم المرسل')}</label><input className="input" value={cfg.fromName || ''} onChange={(e) => set({ fromName: e.target.value })} /></div>
            </div>
            <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-subtle">
              <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-500" />
              {T('Microsoft 365 must allow “Authenticated SMTP” for the mailbox (Admin center → Users → Mail → Manage email apps), and MFA accounts need an app password. If SMTP is blocked by your tenant, use “Connect with Microsoft” instead.', 'يجب السماح بـ «Authenticated SMTP» للصندوق في مركز إدارة Microsoft 365، وحسابات المصادقة الثنائية تحتاج كلمة مرور تطبيق. إن كان SMTP محجوباً في مؤسستك فاستخدم «الربط عبر مايكروسوفت».')}
            </p>
          </div>
        )}

        <div>
          <label className="label">{T('Send new-enquiry notifications to', 'إرسال إشعارات الطلبات الجديدة إلى')}</label>
          <input className="input" dir="ltr" placeholder="sales@company.com, ceo@company.com" value={cfg.notifyTo || ''} onChange={(e) => set({ notifyTo: e.target.value })} />
        </div>

        <div className="flex flex-wrap items-end gap-2 border-t border-line/10 pt-4">
          <button type="button" className="btn-gold" onClick={() => save(false)} disabled={!!busy}>{T('Save', 'حفظ')}</button>
          <div className="ms-auto flex flex-wrap items-end gap-2">
            <input className="input !w-56" type="email" dir="ltr" placeholder={T('Send a test to…', 'إرسال اختبار إلى…')} value={testTo} onChange={(e) => setTestTo(e.target.value)} />
            <button type="button" className="btn-ghost" onClick={test} disabled={!!busy || !testTo}><Send size={14} />{T('Send test', 'إرسال اختبار')}</button>
          </div>
        </div>
        {msg && <div className={`rounded-lg px-3 py-2 text-[12px] ${msg.ok ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-400'}`}>{msg.text}</div>}
      </div>
    </div>
  );
}
