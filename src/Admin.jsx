import React, { useState } from 'react';
import {
  LayoutDashboard, Tag, Users, FileText, Hammer, Receipt, Sun, Moon, Languages, Globe, Plus, RotateCcw, Trash2, Kanban, Table2, LogOut, Download, Upload, Images, Building2, Ruler,
} from 'lucide-react';
import Logo from './Logo.jsx';
import { CatalogGroup, ContentManager } from './AdminContent.jsx';
import CompanySettings from './AdminCompany.jsx';
import Surveys from './AdminSurveys.jsx';
import { Quotes, Orders, Invoices } from './AdminDocs.jsx';
import { Modal, Stat, Badge, FileLink, Field, stageName } from './ui.jsx';
import { sb } from './api.js';
import { useApp, totals, LEAD_STAGES, LEAD_CATS, ORDER_STAGES, QUOTE_STATUS, DEFAULT_RATES } from './store.jsx';

const DEPT = { signage: '#C9A45C', printing: '#CB6B47', social: '#F0E4D6', marketing: '#7DA7A1' };

/* ================= Dashboard ================= */
function Dashboard() {
  const { T, money, rates, quotes, orders, leads, invoices, lang } = useApp();
  const revenue = invoices.reduce((s, i) => s + i.payments.reduce((a, p) => a + Number(p.amount), 0), 0);
  const pending = quotes.filter((q) => ['draft', 'sent'].includes(q.status)).length;
  const active = orders.filter((o) => !['draft', 'done'].includes(o.stage)).length;
  const newLeads = leads.filter((l) => l.stage === 'new').length;
  const conv = leads.length ? Math.round((leads.filter((l) => l.stage === 'won').length / leads.length) * 100) : 0;
  const byDept = {};
  invoices.forEach((i) => { const t = totals(i, rates.vat); const f = t.sub ? t.total / t.sub : 1; i.items.forEach((it) => { byDept[it.dept] = (byDept[it.dept] || 0) + it.price * f; }); });
  const max = Math.max(1, ...Object.values(byDept));
  const names = { signage: T('Signage & Booths', 'آرمات ومعارض'), printing: T('Printing', 'مطبوعات'), social: T('Social Media', 'سوشيال'), marketing: T('Marketing', 'تسويق') };
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Stat l={T('Total Revenue (collected)', 'إجمالي الإيرادات (المحصلة)')} v={money(revenue)} />
        <Stat l={T('Pending Quotations', 'عروض أسعار معلقة')} v={pending} c="text-terra" />
        <Stat l={T('Active Production Orders', 'طلبات قيد التنفيذ')} v={active} />
        <Stat l={T('New Leads', 'عملاء جدد')} v={newLeads} c="text-sky-400" />
        <Stat l={T('Conversion Rate', 'نسبة التحويل')} v={`${conv}%`} c="text-emerald-500" />
        <Stat l={T('Unpaid Balances', 'أرصدة غير مدفوعة')} v={money(invoices.reduce((s, i) => s + totals(i, rates.vat).total - i.payments.reduce((a, p) => a + Number(p.amount), 0), 0))} c="text-red-400" />
      </div>
      <div className="glass p-6">
        <h3 className="font-bold mb-5">{T('Revenue by Department (invoiced)', 'الإيرادات حسب القسم (مفوترة)')}</h3>
        {Object.keys(byDept).length === 0 ? <p className="opacity-60 text-sm">{T('No invoices yet.', 'لا توجد فواتير.')}</p> :
          <div className="flex items-end gap-6 h-52">{Object.entries(byDept).map(([k, v]) => <div key={k} className="flex-1 flex flex-col items-center justify-end h-full">
            <span className="text-xs font-bold mb-1">{money(v)}</span><div className="w-full max-w-[70px] rounded-t-lg transition-all duration-700" style={{ height: `${(v / max) * 80}%`, background: DEPT[k] }} /><span className="text-xs mt-2 opacity-70 text-center">{names[k]}</span></div>)}</div>}
      </div>
      <div className="glass p-6"><h3 className="font-bold mb-3">{T('Latest Leads', 'أحدث العملاء')}</h3>
        {leads.slice(0, 5).map((l) => <div key={l.id} className="flex justify-between text-sm py-2 border-b border-black/5 dark:border-white/10"><span>{l.name} <span className="opacity-50">· {l.company}</span></span><Badge id={l.stage}>{stageName(LEAD_STAGES, l.stage, lang)}</Badge></div>)}</div>
    </div>
  );
}

/* ================= Pricing ================= */
function Pricing() {
  const { T, rates, upd, resetAll, leads, quotes, orders, invoices, surveys, content, company } = useApp();
  const exportData = () => {
    const data = JSON.stringify({ version: 2, rates, content, company, leads, quotes, orders, invoices, surveys }, null, 1);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    a.download = `artspace-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };
  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    file.text().then((txt) => {
      try {
        const d = JSON.parse(txt);
        if (!d || typeof d !== 'object' || !d.rates) throw new Error('bad');
        if (!confirm(T('Replace current data with this backup?', 'استبدال البيانات الحالية بهذه النسخة؟'))) return;
        const pick = {};
        ['rates', 'content', 'company', 'leads', 'quotes', 'orders', 'invoices', 'surveys'].forEach((k) => { if (d[k]) pick[k] = d[k]; });
        upd(pick);
      } catch { alert(T('Invalid backup file', 'ملف نسخة احتياطية غير صالح')); }
    });
  };
  return (
    <div className="space-y-5">
      <p className="text-sm opacity-70">{T('Add, edit or remove any calculator item — changes apply instantly to the public website.', 'أضف أو عدّل أو احذف أي عنصر في الحاسبة — التغييرات تظهر فوراً في الموقع.')}</p>
      <div className="grid xl:grid-cols-2 gap-5">
        <CatalogGroup g="area" title={T('Signage / Booth materials (price per m²)', 'مواد الآرمات والبوثات (سعر المتر المربع)')} unit="/ m²" />
        <CatalogGroup g="addons" title={T('Signage add-ons', 'إضافات الآرمات')} unit="/ m²" />
        <CatalogGroup g="print" title={T('Printing items (base unit price: A5 · 150g · single side)', 'المطبوعات (سعر القطعة الأساسي: A5 · 150غ · وجه)')} unit="/ pc" />
        <CatalogGroup g="packages" title={T('Social media monthly packages', 'باقات السوشيال الشهرية')} unit="/ mo" />
        <CatalogGroup g="marketing" title={T('Strategy & consultancy services', 'خدمات الاستراتيجية والاستشارات')} unit={T('flat', 'مقطوع')} />
        <div className="glass p-5 xl:col-span-2"><h3 className="font-bold mb-3 text-gold">{T('Printing multipliers (× base price; quantity = per-unit discount factor)', 'معاملات المطبوعات (× السعر الأساسي؛ الكمية = معامل خصم)')}</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[['size', T('Size', 'المقاس')], ['paper', T('Paper (g)', 'الورق (غ)')], ['lam', T('Lamination', 'التشطيب')], ['sides', T('Sides', 'الجهات')], ['qty', T('Quantity tier', 'شريحة الكمية')]].map(([g, title]) => (
              <div key={g}><div className="text-xs font-bold opacity-70 mb-2">{title}</div>
                {Object.entries(rates.mult[g]).map(([k, v]) => <div key={k} className="flex items-center gap-2 mb-1.5 text-sm"><span className="flex-1">{k}</span>
                  <input type="number" step="0.05" className="input !w-24" value={v} onChange={(e) => upd((o) => ({ rates: { ...o.rates, mult: { ...o.rates.mult, [g]: { ...o.rates.mult[g], [k]: parseFloat(e.target.value) || 0 } } } }))} /></div>)}</div>))}
          </div></div>
        <div className="glass p-5"><h3 className="font-bold mb-3 text-gold">{T('Tax', 'الضريبة')}</h3>
          <div className="flex items-center gap-3 text-sm"><span className="flex-1">{T('VAT %', 'ضريبة القيمة المضافة %')}</span><input type="number" className="input !w-28" value={rates.vat} onChange={(e) => upd((o) => ({ rates: { ...o.rates, vat: parseFloat(e.target.value) || 0 } }))} /></div>
          <button className="btn-ghost mt-5 text-xs" onClick={() => upd({ rates: DEFAULT_RATES })}><RotateCcw size={14} />{T('Reset rates to default', 'إعادة الأسعار الافتراضية')}</button>
          <div className="flex gap-2 mt-2 flex-wrap">
            <button className="btn-ghost text-xs" onClick={exportData}><Download size={14} />{T('Export backup', 'تصدير نسخة احتياطية')}</button>
            <label className="btn-ghost text-xs cursor-pointer"><Upload size={14} />{T('Import backup', 'استيراد نسخة')}<input type="file" accept="application/json" className="hidden" onChange={importData} /></label></div>
          <button className="btn-ghost mt-2 text-xs text-red-400" onClick={() => confirm(T('Reset website settings on this browser?', 'إعادة ضبط إعدادات الموقع على هذا المتصفح؟')) && resetAll()}><Trash2 size={14} />{T('Reset local settings', 'إعادة ضبط الإعدادات المحلية')}</button></div>
      </div>
    </div>
  );
}

/* ================= CRM ================= */
function CRM() {
  const { T, lang, leads, upd, quotes, orders, invoices, rates, money, addLeadLocal } = useApp();
  const [view, setView] = useState('kanban');
  const [sel, setSel] = useState(null);
  const [adding, setAdding] = useState(false);
  const [catF, setCatF] = useState('all');
  const [nf, setNf] = useState({ name: '', company: '', phone: '', email: '', notes: '', category: 'general' });
  const allLeads = leads;
  const shown = leads.filter((l) => catF === 'all' || (l.category || 'general') === catF);
  const catOf = (l) => LEAD_CATS.find((c) => c[0] === (l.category || 'general')) || LEAD_CATS[LEAD_CATS.length - 1];
  const CatDot = ({ l }) => { const c = catOf(l); return <span className="inline-flex items-center gap-1 text-[10px] opacity-80"><i className="w-2 h-2 rounded-full inline-block" style={{ background: c[3] }} />{lang === 'ar' ? c[2] : c[1]}</span>; };
  const setStage = (id, stage) => upd((o) => ({ leads: o.leads.map((l) => (l.id === id ? { ...l, stage } : l)) }));
  const patchLead = (id, p) => upd((o) => ({ leads: o.leads.map((l) => (l.id === id ? { ...l, ...p } : l)) }));
  const Select = ({ l }) => <select className="input !py-1 !text-xs" value={l.stage} onChange={(e) => setStage(l.id, e.target.value)} onClick={(e) => e.stopPropagation()}>{LEAD_STAGES.map(([k, en, ar]) => <option key={k} value={k}>{lang === 'ar' ? ar : en}</option>)}</select>;
  const client = leads.find((l) => l.id === sel);
  const balance = (cid) => invoices.filter((i) => i.clientId === cid).reduce((s, i) => s + totals(i, rates.vat).total - i.payments.reduce((a, p) => a + Number(p.amount), 0), 0);
  return (
    <div>
      <div className="flex gap-2 mb-3">
        <button className={`btn ${view === 'kanban' ? 'bg-gold text-ink' : 'btn-ghost'}`} onClick={() => setView('kanban')}><Kanban size={15} />Kanban</button>
        <button className={`btn ${view === 'table' ? 'bg-gold text-ink' : 'btn-ghost'}`} onClick={() => setView('table')}><Table2 size={15} />{T('Table', 'جدول')}</button>
        <button className="btn-terra ms-auto" onClick={() => setAdding(true)}><Plus size={15} />{T('Add Lead', 'عميل جديد')}</button>
      </div>
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {[['all', 'All', 'الكل', '#C9A45C'], ...LEAD_CATS].map(([k, en, ar, col]) => (
          <button key={k} onClick={() => setCatF(k)} className={`badge !py-1 !px-3 border transition ${catF === k ? 'bg-gold text-ink border-gold' : 'border-black/10 dark:border-white/15'}`}>
            <i className="w-2 h-2 rounded-full inline-block me-1.5" style={{ background: col }} />{lang === 'ar' ? ar : en} <span className="opacity-60">({k === 'all' ? allLeads.length : allLeads.filter((l) => (l.category || 'general') === k).length})</span>
          </button>))}
      </div>
      {view === 'kanban' ? <div className="flex gap-3 overflow-x-auto pb-3">
        {LEAD_STAGES.map(([k]) => <div key={k} className="min-w-[230px] w-[230px] glass p-3"><div className="flex justify-between mb-3"><Badge id={k}>{stageName(LEAD_STAGES, k, lang)}</Badge><span className="text-xs opacity-60">{shown.filter((l) => l.stage === k).length}</span></div>
          <div className="space-y-2">{shown.filter((l) => l.stage === k).map((l) => <div key={l.id} onClick={() => setSel(l.id)} className="bg-white/70 dark:bg-white/5 rounded-xl p-3 cursor-pointer hover:ring-1 ring-gold transition space-y-2">
            <div className="font-semibold text-sm">{l.name}</div><div className="text-xs opacity-60">{l.company}</div><div className="flex justify-between items-center gap-1"><CatDot l={l} /><span className="text-[10px] opacity-50">{l.source}</span></div><Select l={l} /></div>)}</div></div>)}
      </div> : <div className="glass overflow-auto"><table className="w-full text-sm"><thead className="text-xs opacity-60"><tr>{[T('Client', 'العميل'), T('Company', 'الشركة'), T('Phone', 'الهاتف'), T('Category', 'الفئة'), T('Source', 'المصدر'), T('Stage', 'المرحلة')].map((h) => <th key={h} className="p-3 text-start">{h}</th>)}</tr></thead>
        <tbody>{shown.map((l) => <tr key={l.id} onClick={() => setSel(l.id)} className="border-t border-black/5 dark:border-white/10 cursor-pointer hover:bg-gold/5"><td className="p-3">{l.name}</td><td className="p-3">{l.company}</td><td className="p-3" dir="ltr">{l.phone}</td><td className="p-3"><CatDot l={l} /></td><td className="p-3 text-xs">{l.source}</td><td className="p-3 w-44"><Select l={l} /></td></tr>)}</tbody></table></div>}
      {client && <Modal title={client.name} onClose={() => setSel(null)}>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[['name', T('Name', 'الاسم')], ['company', T('Company', 'الشركة')], ['phone', T('Phone', 'الهاتف')], ['email', T('Email', 'البريد')], ['tax', T('Tax No.', 'الرقم الضريبي')]].map(([k, l]) => <Field key={k} label={l} v={client[k]} on={(v) => patchLead(client.id, { [k]: v })} />)}
          <div><label className="label">{T('Stage', 'المرحلة')}</label><select className="input" value={client.stage} onChange={(e) => setStage(client.id, e.target.value)}>{LEAD_STAGES.map(([k, en, ar]) => <option key={k} value={k}>{lang === 'ar' ? ar : en}</option>)}</select></div>
          <div><label className="label">{T('Category', 'الفئة')}</label><select className="input" value={client.category || 'general'} onChange={(e) => patchLead(client.id, { category: e.target.value })}>{LEAD_CATS.map(([k, en, ar]) => <option key={k} value={k}>{lang === 'ar' ? ar : en}</option>)}</select></div>
          <div className="col-span-2"><label className="label">{T('Notes', 'ملاحظات')}</label><textarea className="input" rows="2" value={client.notes || ''} onChange={(e) => patchLead(client.id, { notes: e.target.value })} /></div>
          {client.file && <FileLink name={client.file} path={client.filePath} />}
          <div className="text-xs opacity-50 col-span-2 flex items-center">{client.source} · {client.date}<button className="ms-auto text-red-400 flex items-center gap-1" onClick={() => { if (confirm(T('Delete this client and all their quotes, orders and invoices?', 'حذف العميل وكل عروضه وطلباته وفواتيره؟'))) { const cid = client.id; setSel(null); upd((o) => ({ leads: o.leads.filter((l) => l.id !== cid), quotes: o.quotes.filter((x) => x.clientId !== cid), orders: o.orders.filter((x) => x.clientId !== cid), invoices: o.invoices.filter((x) => x.clientId !== cid) })); } }}><Trash2 size={13} />{T('Delete client', 'حذف العميل')}</button></div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4"><Stat l={T('Quotations', 'عروض')} v={quotes.filter((q) => q.clientId === client.id).length} /><Stat l={T('Orders', 'طلبات')} v={orders.filter((o) => o.clientId === client.id).length} /><Stat l={T('Unpaid', 'غير مدفوع')} v={money(balance(client.id))} c="text-red-400" /></div>
        <h4 className="font-bold text-sm mb-2">{T('History', 'السجل')}</h4>
        {quotes.filter((q) => q.clientId === client.id).map((q) => <div key={q.id} className="flex justify-between text-sm py-1"><span>{q.no}</span><span>{money(totals(q, rates.vat).total)}</span><Badge id={q.status}>{stageName(QUOTE_STATUS, q.status, lang)}</Badge></div>)}
        {orders.filter((o) => o.clientId === client.id).map((o) => <div key={o.id} className="flex justify-between text-sm py-1"><span>{o.title}</span><Badge id="approved">{stageName(ORDER_STAGES, o.stage, lang)}</Badge></div>)}
        {invoices.filter((i) => i.clientId === client.id).map((i) => <div key={i.id} className="text-sm py-1">{i.no} — {money(totals(i, rates.vat).total)}</div>)}
      </Modal>}
      {adding && <Modal title={T('Add Lead', 'إضافة عميل')} onClose={() => setAdding(false)}>
        <form className="grid grid-cols-2 gap-3" onSubmit={(e) => { e.preventDefault(); addLeadLocal({ ...nf, source: 'Manual' }); setAdding(false); setNf({ name: '', company: '', phone: '', email: '', notes: '', category: 'general' }); }}>
          {[['name', T('Name', 'الاسم')], ['company', T('Company', 'الشركة')], ['phone', T('Phone', 'الهاتف')], ['email', T('Email', 'البريد')]].map(([k, l]) => <div key={k}><label className="label">{l}</label><input required={k === 'name'} className="input" value={nf[k]} onChange={(e) => setNf({ ...nf, [k]: e.target.value })} /></div>)}
          <div className="col-span-2"><label className="label">{T('Category', 'الفئة')}</label><select className="input" value={nf.category} onChange={(e) => setNf({ ...nf, category: e.target.value })}>{LEAD_CATS.map(([k, en, ar]) => <option key={k} value={k}>{lang === 'ar' ? ar : en}</option>)}</select></div>
          <div className="col-span-2"><label className="label">{T('Notes', 'ملاحظات')}</label><textarea className="input" value={nf.notes} onChange={(e) => setNf({ ...nf, notes: e.target.value })} /></div>
          <button className="btn-gold col-span-2">{T('Save', 'حفظ')}</button></form></Modal>}
    </div>
  );
}

/* ================= Login ================= */
function Login() {
  const { T, upd } = useApp();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await sb.auth.signInWithPassword({ email, password: pw });
    setBusy(false);
    if (error) setErr(error.status === 429 ? T('Too many attempts. Try again in 15 minutes.', 'محاولات كثيرة. حاول بعد 15 دقيقة.') : T('Invalid credentials.', 'بيانات الدخول غير صحيحة.'));
    // onAuthStateChange sets auth on success
  };
  return (
    <div className="min-h-screen grid place-items-center bg-ink text-cream p-4">
      <form onSubmit={submit} className="glass !bg-white/5 !border-white/10 p-8 w-full max-w-sm space-y-4">
        <div className="flex justify-center"><Logo className="h-12" /></div>
        <h1 className="text-center font-bold text-lg">{T('Admin Sign In', 'تسجيل دخول الإدارة')}</h1>
        <input type="email" autoComplete="username" className="input" placeholder={T('Email', 'البريد الإلكتروني')} value={email} onChange={(e) => { setEmail(e.target.value); setErr(''); }} />
        <input type="password" required autoComplete="current-password" className="input" placeholder={T('Password', 'كلمة المرور')} value={pw} onChange={(e) => { setPw(e.target.value); setErr(''); }} />
        {err && <p className="text-xs text-red-400">{err}</p>}
        <button disabled={busy} className="btn-gold w-full">{T('Sign In', 'دخول')}</button>
        <button type="button" className="btn-ghost !border-white/20 w-full text-xs" onClick={() => location.assign('/')}>{T('Back to website', 'العودة للموقع')}</button>
      </form>
    </div>
  );
}

/* ================= Shell ================= */
export default function Admin() {
  const { T, lang, dark, upd, auth, leads, quotes, surveys } = useApp();
  const [tab, setTab] = useState('dash');
  if (!auth) return <Login />;
  const badges = { crm: leads.filter((l) => l.stage === 'new').length, quotes: quotes.filter((q) => q.status === 'draft' && !q.converted).length, surveys: surveys.filter((s) => s.status === 'new').length };
  const tabs = [['dash', LayoutDashboard, T('Dashboard', 'لوحة المؤشرات')], ['crm', Users, 'CRM'], ['surveys', Ruler, T('Site Surveys', 'معاينات المواقع')], ['quotes', FileText, T('Quotations', 'عروض الأسعار')], ['orders', Hammer, T('Production', 'الطلبات والتنفيذ')], ['invoices', Receipt, T('Invoices', 'الفواتير')], ['pricing', Tag, T('Calculator & Pricing', 'الحاسبة والأسعار')], ['content', Images, T('Website Content', 'محتوى الموقع')], ['company', Building2, T('Company & Quote Style', 'الشركة وشكل العروض')]];
  const View = { dash: Dashboard, pricing: Pricing, content: ContentManager, crm: CRM, surveys: Surveys, quotes: Quotes, orders: Orders, invoices: Invoices, company: CompanySettings }[tab];
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="md:w-60 bg-ink text-cream p-4 md:min-h-screen shrink-0 no-print">
        <Logo className="h-8" />
        <nav className="mt-6 flex md:flex-col gap-1 overflow-x-auto">
          {tabs.map(([id, Icon, l]) => <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm whitespace-nowrap transition ${tab === id ? 'bg-gold text-ink font-bold' : 'hover:bg-white/10'}`}><Icon size={17} />{l}
            {badges[id] > 0 && <span className="ms-auto bg-terra text-white text-[10px] rounded-full min-w-[18px] h-[18px] px-1 grid place-items-center">{badges[id]}</span>}</button>)}
        </nav>
        <div className="mt-6 flex md:flex-col gap-2">
          <button className="btn-ghost !border-white/20 !text-sm" onClick={() => upd({ lang: lang === 'ar' ? 'en' : 'ar' })}><Languages size={15} />{lang === 'ar' ? 'English' : 'العربية'}</button>
          <button className="btn-ghost !border-white/20 !text-sm" onClick={() => upd({ dark: !dark })}>{dark ? <Sun size={15} /> : <Moon size={15} />}</button>
          <button className="btn-terra !text-sm" onClick={() => location.assign('/')}><Globe size={15} />{T('View Website', 'عرض الموقع')}</button>
          <button className="btn-ghost !border-white/20 !text-sm" onClick={() => { sb.auth.signOut(); location.assign('/'); }}><LogOut size={15} />{T('Logout', 'خروج')}</button>
        </div>
      </aside>
      <main className="flex-1 p-5 md:p-8 min-w-0">
        <h1 className="text-2xl font-extrabold mb-5 no-print">{tabs.find((t) => t[0] === tab)[2]}</h1>
        <View />
      </main>
    </div>
  );
}
