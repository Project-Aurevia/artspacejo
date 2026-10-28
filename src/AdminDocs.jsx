import React, { useState, useRef, useEffect } from 'react';
import {
  Printer, Plus, Trash2, Copy, Download, MessageCircle, ArrowRightCircle, Send, Eye, Pencil, Search,
  FileText, Clock, CheckCircle2, Wallet, TrendingUp, AlertTriangle,
} from 'lucide-react';
import { useApp, totals, uid, ORDER_STAGES, QUOTE_STATUS } from './store.jsx';
import { Doc, renderPdf, StylePicker } from './Documents.jsx';
import { sb, serverHealth } from './api.js';
import { Modal, Badge, FileLink, Field, stageName, EmptyState } from './ui.jsx';
import { addDays, dueOf, invoiceView, todayStr } from './adminStats.js';
import { clientOf } from './directory.js';
import { EntityPicker } from './Directory.jsx';

const DEPTS = [['signage', 'Signage', 'آرمات'], ['booths', 'Booths', 'بوثات'], ['printing', 'Printing', 'مطبوعات'], ['social', 'Social', 'سوشيال'], ['marketing', 'Strategy', 'استشارات']];
// Local calendar date (UTC serialisation would date a document "yesterday" before 03:00 in Amman).
const today = todayStr;
const r2 = (n) => Math.round(n * 100) / 100;

/* ---------- shared building blocks ---------- */
const TONE = { gold: 'text-gold', emerald: 'text-emerald-500', terra: 'text-terra', sky: 'text-sky-400', red: 'text-red-400' };

function Kpi({ icon: Icon, label, value, hint, tone = 'gold' }) {
  return (
    <div className="glass stat-card p-4">
      <div className="flex items-center gap-2"><Icon size={14} className={`shrink-0 ${TONE[tone]}`} /><span className="stat-label truncate">{label}</span></div>
      <div className={`stat-value mt-2 text-[24px] ${TONE[tone]}`}>{value}</div>
      {hint && <div className="mt-1.5 text-[11px] leading-snug text-subtle">{hint}</div>}
    </div>
  );
}

/** Fixed-height money block used inside document modals. */
function Money({ label, value, tone = '' }) {
  return (
    <div className="rounded-xl border border-line/10 bg-surface-2/50 px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-subtle">{label}</div>
      <div className={`mt-0.5 text-[15px] font-extrabold tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}

/** Edit ⇄ PDF switch shared by the quotation and invoice dialogs. */
function ModeSwitch({ mode, onMode }) {
  const { T } = useApp();
  return (
    <div className="seg no-print mb-4">
      <button type="button" onClick={() => onMode('edit')} data-active={mode === 'edit'} className="seg-tab"><Pencil size={13} />{T('Edit', 'تحرير')}</button>
      <button type="button" onClick={() => onMode('pdf')} data-active={mode === 'pdf'} className="seg-tab"><Eye size={13} />{T('PDF & Email', 'PDF والبريد')}</button>
    </div>
  );
}

function FitDoc(props) {
  const ref = useRef(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, (el.clientWidth - 24) / 794));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} dir="ltr" className="flex justify-center overflow-hidden rounded-2xl border border-line/10 bg-zinc-200 p-3 dark:bg-zinc-800">
      <div style={{ width: 794 * scale, height: 1122 * scale, position: 'relative', flex: 'none' }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 794, position: 'absolute', top: 0, left: 0 }}>
          <Doc {...props} />
        </div>
      </div>
    </div>
  );
}

function nextNo(list, prefix) {
  let n = list.length + 1; let no;
  do { no = `${prefix}-2026-${String(n++).padStart(3, '0')}`; } while (list.some((x) => x.no === no));
  return no;
}

/* ---------- document items editor (shared by quotes & invoices) ---------- */
function ItemsEditor({ items, onChange, disabled }) {
  const { T, lang, rates } = useApp();
  const [cat, setCat] = useState('');
  const set = (iid, p) => onChange(items.map((i) => {
    if (i.id !== iid) return i;
    const n = { ...i, ...p };
    const qty = n.qty ?? 1;
    if ('price' in p) n.unit = qty ? r2(n.price / qty) : n.price;
    else n.price = r2(qty * (n.unit ?? 0));
    return n;
  }));
  const add = (item) => onChange([...items, { id: uid('i'), label: { en: '', ar: '' }, detail: '', dept: 'signage', qty: 1, unit: 0, price: 0, ...item }]);
  const catalog = [];
  ['area', 'print', 'packages', 'marketing'].forEach((g) => Object.entries(rates[g] || {}).forEach(([k, v]) => catalog.push({ key: g + ':' + k, ...v })));
  const addCat = (key) => { const c = catalog.find((x) => x.key === key); if (c) add({ label: { en: c.en, ar: c.ar }, dept: c.dept || 'printing', unit: c.price, price: c.price }); setCat(''); };
  return (
    <div>
      <div className="space-y-2.5">
        {items.map((i, n) => (
          <div key={i.id} className="grid grid-cols-12 items-end gap-2 rounded-2xl border border-line/10 bg-surface-2/40 p-3">
            <div className="col-span-12 sm:col-span-6"><label className="label">{T('Item (EN)', 'البند (EN)')}</label><input disabled={disabled} className="input" dir="ltr" value={i.label?.en || ''} onChange={(e) => set(i.id, { label: { ...i.label, en: e.target.value } })} /></div>
            <div className="col-span-12 sm:col-span-6"><label className="label">{T('Item (AR)', 'البند (عربي)')}</label><input disabled={disabled} className="input" dir="rtl" value={i.label?.ar || ''} onChange={(e) => set(i.id, { label: { ...i.label, ar: e.target.value } })} /></div>
            <div className="col-span-12 sm:col-span-4"><label className="label">{T('Description', 'الوصف')}</label><input disabled={disabled} className="input" value={i.detail || ''} onChange={(e) => set(i.id, { detail: e.target.value })} /></div>
            <div className="col-span-4 sm:col-span-2"><label className="label">{T('Dept', 'القسم')}</label><select disabled={disabled} className="input" value={i.dept} onChange={(e) => set(i.id, { dept: e.target.value })}>{DEPTS.map(([k, en, ar]) => <option key={k} value={k}>{lang === 'ar' ? ar : en}</option>)}</select></div>
            <div className="col-span-4 sm:col-span-2"><label className="label">{T('Qty', 'الكمية')}</label><input disabled={disabled} type="number" step="any" className="input tabular-nums" value={i.qty ?? 1} onChange={(e) => set(i.id, { qty: parseFloat(e.target.value) || 0 })} /></div>
            <div className="col-span-4 sm:col-span-2"><label className="label">{T('Unit price', 'سعر الوحدة')}</label><input disabled={disabled} type="number" step="any" className="input tabular-nums" value={i.unit ?? i.price} onChange={(e) => set(i.id, { unit: parseFloat(e.target.value) || 0 })} /></div>
            <div className="col-span-10 pb-2.5 text-sm font-bold tabular-nums text-gold sm:col-span-1">{r2(i.price)}</div>
            <button disabled={disabled} type="button" className="col-span-2 justify-self-end pb-2.5 text-red-400 transition-colors hover:text-red-500 sm:col-span-1" onClick={() => onChange(items.filter((x) => x.id !== i.id))} title={T('Remove', 'حذف')}><Trash2 size={16} /></button>
            <span className="hidden">{n}</span>
          </div>
        ))}
        {!items.length && <p className="rounded-2xl border border-dashed border-line/15 px-4 py-6 text-center text-sm text-subtle">{T('No items yet — add a custom item or pick from the catalog.', 'لا بنود بعد — أضف بنداً مخصصاً أو اختر من الكتالوج.')}</p>}
      </div>
      {!disabled && <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn-gold btn-sm" onClick={() => add({})}><Plus size={14} />{T('Custom item', 'بند مخصص')}</button>
        <select className="input !w-auto !py-1.5 !text-xs" value={cat} onChange={(e) => addCat(e.target.value)}>
          <option value="">{T('+ From catalog…', '+ من الكتالوج…')}</option>
          {catalog.map((c) => <option key={c.key} value={c.key}>{lang === 'ar' ? c.ar : c.en} — {c.price}</option>)}
        </select>
      </div>}
    </div>
  );
}

/* ---------- PDF actions ---------- */
function PdfBar({ kind, doc, client, dl, setDl, onSent }) {
  const { T, money, rates, company, tx } = useApp();
  const [busy, setBusy] = useState('');
  const [to, setTo] = useState(client?.email || '');
  const [note, setNote] = useState('');
  // null = not probed yet. The server tells us whether SMTP is configured, so we can
  // route to real delivery or to the download + mailto fallback instead of guessing.
  const [canMail, setCanMail] = useState(null);
  useEffect(() => {
    let alive = true;
    serverHealth().then((h) => { if (alive) setCanMail(!!(h?.ok && h?.mail)); });
    return () => { alive = false; };
  }, []);
  const fname = `${doc.no}.pdf`;
  const total = money(totals(doc, rates.vat).total);
  const isInv = kind === 'invoice';
  const subject = `${tx(company.name)} — ${isInv ? T('Invoice', 'فاتورة') : T('Quotation', 'عرض سعر')} ${doc.no}`;
  const body = `${T('Hello', 'مرحباً')} ${client?.name || ''},\n\n${note ? note + '\n\n' : ''}${T('Please find attached', 'مرفق لكم')} ${isInv ? T('invoice', 'الفاتورة') : T('quotation', 'عرض السعر')} ${doc.no} — ${T('Total', 'الإجمالي')}: ${total}.\n\n${tx(company.name)}\n${company.phone || ''}`;
  const el = () => document.getElementById('print-area');
  const download = async () => { setBusy('dl'); try { await renderPdf(el(), fname); } catch (e) { alert(e.message); } setBusy(''); };
  // Download the PDF and open the mail client — works with no server-side mail setup.
  const mailto = async () => {
    await renderPdf(el(), fname);
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body + '\n\n(' + T('Attach the downloaded PDF', 'أرفق ملف PDF الذي تم تنزيله') + ')')}`;
    onSent?.();
  };
  const email = async () => {
    if (!to) return alert(T('Enter the recipient email.', 'أدخل بريد المستلم.'));
    setBusy('mail');
    try {
      const health = canMail === null ? await serverHealth() : { ok: true, mail: canMail };
      if (health.ok && health.mail) {
        try {
          const pdfBase64 = await renderPdf(el(), fname, true);
          const html = body.replace(/\n/g, '<br>');
          const { error } = await sb.functions.invoke('send-quote', { body: { to, subject, html, filename: fname, pdfBase64, replyTo: company.email } });
          if (error) throw error;
          setCanMail(true);
          alert(T('Email sent with the PDF attached.', 'تم إرسال البريد مع ملف PDF.'));
          onSent?.();
        } catch (e) {
          // SMTP was configured but rejected the message — still get the PDF to the client.
          console.warn('SMTP delivery failed, falling back to mailto:', e);
          await mailto();
        }
      } else {
        setCanMail(false);
        await mailto();
      }
    } catch (e) { alert(T('Could not send: ', 'تعذر الإرسال: ') + (e.message || e)); }
    setBusy('');
  };
  return (
    <div className="no-print mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="seg">
          {[['en', 'EN'], ['ar', 'عربي']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setDl(k)} data-active={dl === k} className="seg-tab">{l}</button>
          ))}
        </div>
        <span className="mx-1 h-5 w-px self-center bg-line/15" aria-hidden="true" />
        <StylePicker />
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1"><label className="label">{T('Send to', 'إرسال إلى')}</label><input className="input" dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} placeholder="client@email.com" /></div>
        <div className="min-w-[200px] flex-[2]"><label className="label">{T('Message (optional)', 'رسالة (اختياري)')}</label><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></div>
        <button type="button" disabled={!!busy} className="btn-gold" onClick={email}><Send size={15} />{busy === 'mail' ? '…' : T('Email PDF', 'إرسال PDF بالبريد')}</button>
        <button type="button" disabled={!!busy} className="btn-ghost" onClick={download}><Download size={15} />{busy === 'dl' ? '…' : T('Download PDF', 'تنزيل PDF')}</button>
        <button type="button" className="btn-ghost" onClick={() => window.print()}><Printer size={15} />{T('Print', 'طباعة')}</button>
        <a className="btn-ghost" target="_blank" rel="noreferrer" href={`https://wa.me/${(client?.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(body)}`}><MessageCircle size={15} />WhatsApp</a>
      </div>
      {canMail === false && <p className="text-[11px] leading-relaxed text-subtle">{T('SMTP is not configured: the PDF downloads and your mail app opens — attach the file. Add SMTP_HOST/USER/PASS in .env to email automatically.', 'لم يتم ضبط SMTP: يتم تنزيل الملف ويفتح برنامج البريد — أرفق الملف. أضف SMTP_HOST وSMTP_USER وSMTP_PASS في ملف ‎.env‎ للإرسال التلقائي.')}</p>}
    </div>
  );
}

/* ================= Quotations ================= */
export function Quotes() {
  const { T, lang, quotes, leads, customers, upd, money, rates, convertQuote, company } = useApp();
  const [id, setId] = useState(null);
  const [mode, setMode] = useState('edit');
  const [dl, setDl] = useState(lang);
  const [creating, setCreating] = useState(false);
  const [nc, setNc] = useState({ customerId: '' });
  const [find, setFind] = useState('');
  const q = quotes.find((x) => x.id === id);
  const client = q && clientOf(q, customers, leads);
  const clientName = (doc) => { const c = clientOf(doc, customers, leads); return c ? [c.company, c.name].filter(Boolean).join(' · ') : ''; };
  const patch = (p) => upd((o) => ({ quotes: o.quotes.map((x) => (x.id === id ? { ...x, ...p } : x)) }));
  const setStatus = (status) => {
    patch({ status });
    upd((o) => ({ leads: o.leads.map((l) => {
      if (l.id !== q.clientId) return l;
      if (status === 'sent' && ['new', 'contacted', 'measure'].includes(l.stage)) return { ...l, stage: 'sent' };
      if (status === 'rejected') return { ...l, stage: 'lost' };
      if (status === 'approved' && ['new', 'contacted', 'measure', 'sent'].includes(l.stage)) return { ...l, stage: 'negotiation' };
      return l;
    }) }));
  };
  const open = (qid, m = 'edit') => { setId(qid); setMode(m); };
  const create = (e) => {
    e.preventDefault();
    const c = customers.find((x) => x.id === nc.customerId);
    const nq = { id: uid('q'), no: nextNo(quotes, 'Q'), customerId: c?.id || '', clientId: c?.leadId || '', status: 'draft', discount: 0, vat: true, date: today(), notes: '', validDays: 14, items: [] };
    upd((o) => ({ quotes: [nq, ...o.quotes] }));
    setCreating(false); setNc({ customerId: '' }); open(nq.id);
  };
  const duplicate = () => {
    const nq = { ...q, id: uid('q'), no: nextNo(quotes, 'Q'), status: 'draft', converted: false, date: today(), file: undefined, filePath: undefined, items: q.items.map((i) => ({ ...i, id: uid('i') })) };
    upd((o) => ({ quotes: [nq, ...o.quotes] })); open(nq.id);
  };
  const remove = () => { if (confirm(T('Delete this quotation?', 'حذف عرض السعر؟'))) { upd((o) => ({ quotes: o.quotes.filter((x) => x.id !== id), orders: o.orders.filter((x) => x.quoteId !== id || x.stage !== 'brief') })); setId(null); } };
  const lock = q?.converted;
  const docObj = q && { ...q, vatRate: rates.vat };
  const term = find.trim().toLowerCase();
  const shownQ = term ? quotes.filter((x) => `${x.no} ${clientName(x)} ${x.status}`.toLowerCase().includes(term)) : quotes;

  const totalOf = (x) => totals({ ...x, vatRate: x.vatRate ?? rates.vat }, rates.vat).total;
  const openQ = quotes.filter((x) => x.status !== 'rejected' && !x.converted);
  const approvedQ = quotes.filter((x) => x.status === 'approved' && !x.converted);
  const convertedQ = quotes.filter((x) => x.converted);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={FileText} label={T('Quotations', 'عروض الأسعار')} value={String(quotes.length)} hint={`${openQ.length} ${T('still open', 'قيد الانتظار')}`} />
        <Kpi icon={TrendingUp} label={T('Open value', 'قيمة العروض المفتوحة')} value={money(openQ.reduce((s, x) => s + totalOf(x), 0))} hint={T('Not invoiced yet', 'لم تُفوتر بعد')} tone="sky" />
        <Kpi icon={CheckCircle2} label={T('Approved, not invoiced', 'معتمدة وغير مفوترة')} value={money(approvedQ.reduce((s, x) => s + totalOf(x), 0))} hint={`${approvedQ.length} ${T('quotes to convert', 'عرض للتحويل')}`} tone="emerald" />
        <Kpi icon={ArrowRightCircle} label={T('Converted', 'محوّلة')} value={String(convertedQ.length)} hint={`${quotes.filter((x) => x.status === 'rejected').length} ${T('rejected', 'مرفوضة')}`} tone="terra" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-subtle" aria-hidden="true" />
          <input value={find} onChange={(e) => setFind(e.target.value)} className="input ps-9" placeholder={T('Search by number or client…', 'ابحث بالرقم أو العميل…')} aria-label={T('Search quotations', 'ابحث في عروض الأسعار')} />
        </div>
        <span className="hidden text-xs tabular-nums text-subtle sm:inline">{shownQ.length} / {quotes.length}</span>
        <button className="btn-terra ms-auto" onClick={() => setCreating(true)}><Plus size={15} />{T('New quotation', 'عرض سعر جديد')}</button>
      </div>

      <div className="glass overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {['#', T('Client', 'العميل'), T('Date', 'التاريخ'), T('Total', 'الإجمالي'), T('Status', 'الحالة')].map((h, i) => (
                <th key={h} className={`p-3 whitespace-nowrap ${i === 3 ? 'text-end' : 'text-start'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shownQ.map((x) => (
              <tr key={x.id} onClick={() => open(x.id)} className="cursor-pointer border-t border-line/10">
                <td className="whitespace-nowrap p-3 font-semibold">{x.no}</td>
                <td className="min-w-[140px] p-3">{clientName(x) || '—'}</td>
                <td className="whitespace-nowrap p-3 text-xs tabular-nums text-subtle" dir="ltr">{x.date}</td>
                <td className="p-3 text-end font-semibold tabular-nums">{money(totalOf(x))}</td>
                <td className="p-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge id={x.status}>{stageName(QUOTE_STATUS, x.status, lang)}</Badge>
                    {x.converted && <span className="badge bg-emerald-500/15 text-[10px] text-emerald-500"><CheckCircle2 size={11} />{T('Invoiced', 'مفوتر')}</span>}
                  </div>
                </td>
              </tr>
            ))}
            {!shownQ.length && (
              <tr>
                <td colSpan="5" className="p-0">
                  <EmptyState
                    icon={FileText}
                    title={quotes.length ? T('No quotation matches that search.', 'لا يوجد عرض سعر مطابق.') : T('No quotations yet.', 'لا توجد عروض أسعار بعد.')}
                    sub={quotes.length ? T('Try a number, a client name, or clear the search.', 'جرّب رقماً أو اسم عميل، أو امسح البحث.') : T('Create the first quotation and it will appear here, ready to print or email.', 'أنشئ أول عرض سعر وسيظهر هنا، جاهزاً للطباعة أو الإرسال.')}
                    action={!quotes.length && <button type="button" className="btn-gold btn-sm mt-1" onClick={() => setCreating(true)}><Plus size={14} />{T('New quotation', 'عرض سعر جديد')}</button>}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {creating && <Modal title={T('New quotation', 'عرض سعر جديد')} onClose={() => setCreating(false)}>
        <form onSubmit={create} className="space-y-3">
          <EntityPicker kind="customer" label={T('Customer', 'العميل')} value={nc.customerId} onPick={(c) => setNc({ customerId: c ? c.id : '' })} placeholder={T('Search a saved customer, or add a new company…', 'ابحث عن عميل محفوظ أو أضف شركة جديدة…')} />
          <p className="text-xs leading-relaxed text-subtle">{T('Customers are stored in Finance › Directory, so the next document picks them in one click.', 'يُحفظ العميل في المالية › العملاء والموردون، فيظهر في المستند التالي بنقرة واحدة.')}</p>
          <button className="btn-gold w-full" disabled={!nc.customerId}>{T('Create & edit', 'إنشاء وتحرير')}</button>
        </form>
      </Modal>}

      {q && <Modal xwide title={`${q.no} — ${clientName(q)}`} onClose={() => setId(null)}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <ModeSwitch mode={mode} onMode={setMode} />
          <div className="no-print ms-auto flex gap-2">
            <button type="button" className="btn-ghost btn-sm" onClick={duplicate}><Copy size={14} />{T('Duplicate', 'نسخ')}</button>
            <button type="button" className="btn-ghost btn-sm text-red-400" onClick={remove}><Trash2 size={14} />{T('Delete', 'حذف')}</button>
          </div>
        </div>
        {mode === 'pdf' ? <>
          <PdfBar kind="quote" doc={docObj} client={client} dl={dl} setDl={setDl} onSent={() => q.status === 'draft' && setStatus('sent')} />
          <FitDoc kind="quote" dl={dl} doc={docObj} client={client} company={company} />
        </> : <div className="space-y-5">
          {lock && (
            <p className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-500">
              <AlertTriangle size={13} />{T('Converted to an order — items are locked.', 'تم تحويله لطلب — البنود مقفلة.')}
            </p>
          )}
          {q.file && <FileLink name={q.file} path={q.filePath} />}
          <div className="grid gap-3 rounded-2xl border border-line/10 bg-surface-2/40 p-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <EntityPicker kind="customer" label={T('Customer', 'العميل')} value={q.customerId || ''} nameFallback={client?.name || ''} onPick={(c) => patch({ customerId: c ? c.id : '', clientId: c ? c.leadId || q.clientId || '' : q.clientId || '' })} />
            {client && (
              <p className="text-[11px] leading-relaxed text-subtle sm:max-w-[240px] sm:text-end">
                {client.company && `${client.company} · `}
                {client.phone && <span dir="ltr">{client.phone}</span>}
                {client.phone && client.email && ' · '}
                {client.email && <span dir="ltr">{client.email}</span>}
                {client.tax && ` · ${T('Tax no.', 'الرقم الضريبي')} ${client.tax}`}
              </p>
            )}
          </div>
          <ItemsEditor items={q.items} disabled={lock} onChange={(items) => patch({ items })} />
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label={T('Discount (JOD)', 'الخصم (دينار)')} type="number" v={q.discount} on={(discount) => patch({ discount })} disabled={lock} />
            <Field label={T('Valid for (days)', 'صالح لمدة (أيام)')} type="number" v={q.validDays ?? 14} on={(validDays) => patch({ validDays })} />
            <Field label={T('Date', 'التاريخ')} type="date" v={q.date} on={(date) => patch({ date })} />
            <div><label className="label">{T('Status', 'الحالة')}</label><select className="input" value={q.status} onChange={(e) => setStatus(e.target.value)}>{QUOTE_STATUS.map(([k, en, ar]) => <option key={k} value={k}>{lang === 'ar' ? ar : en}</option>)}</select></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#C9A45C]" checked={q.vat} disabled={lock} onChange={(e) => patch({ vat: e.target.checked })} />{T('Apply VAT', 'تطبيق الضريبة')} {rates.vat}%</label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">{T('Intro text (EN)', 'نص تمهيدي (EN)')}</label><textarea className="input" rows="2" value={q.intro?.en || ''} onChange={(e) => patch({ intro: { ...q.intro, en: e.target.value } })} /></div>
            <div><label className="label">{T('Intro text (AR)', 'نص تمهيدي (عربي)')}</label><textarea className="input" rows="2" dir="rtl" value={q.intro?.ar || ''} onChange={(e) => patch({ intro: { ...q.intro, ar: e.target.value } })} /></div>
            <div><label className="label">{T('Terms override (EN, one per line — blank = company default)', 'شروط خاصة (EN، سطر لكل بند — فارغ = الافتراضي)')}</label><textarea className="input" rows="3" value={q.terms?.en || ''} onChange={(e) => patch({ terms: { ...q.terms, en: e.target.value } })} /></div>
            <div><label className="label">{T('Terms override (AR)', 'شروط خاصة (عربي)')}</label><textarea className="input" rows="3" dir="rtl" value={q.terms?.ar || ''} onChange={(e) => patch({ terms: { ...q.terms, ar: e.target.value } })} /></div>
          </div>
          <div><label className="label">{T('Internal notes (not printed)', 'ملاحظات داخلية (لا تُطبع)')}</label><textarea className="input" rows="2" value={q.notes || ''} onChange={(e) => patch({ notes: e.target.value })} /></div>
          <div className="flex flex-wrap items-center gap-3 border-t border-line/10 pt-4">
            <div>
              <div className="stat-label">{T('Quotation total', 'إجمالي العرض')}</div>
              <div className="text-xl font-extrabold tabular-nums text-gold">{money(totals(q, rates.vat).total)}</div>
            </div>
            <button className="btn-gold ms-auto" type="button" onClick={() => setMode('pdf')}><Eye size={15} />{T('Preview PDF & Email', 'معاينة PDF والإرسال')}</button>
            {q.status === 'approved' && !q.converted && <button className="btn-terra" type="button" onClick={() => convertQuote(q.id)}><ArrowRightCircle size={15} />{T('Convert to Order & Invoice', 'تحويل إلى طلب وفاتورة')}</button>}
          </div>
        </div>}
      </Modal>}
    </div>
  );
}

/* ================= Orders ================= */
export function Orders() {
  const { T, lang, orders, leads, upd, money } = useApp();
  const [edit, setEdit] = useState(null);
  const [find, setFind] = useState('');
  const move = (id, stage) => upd((o) => ({ orders: o.orders.map((x) => (x.id === id ? { ...x, stage } : x)) }));
  const save = (e) => {
    e.preventDefault();
    upd((o) => ({ orders: o.orders.some((x) => x.id === edit.id) ? o.orders.map((x) => (x.id === edit.id ? edit : x)) : [edit, ...o.orders] }));
    setEdit(null);
  };
  const del = () => { if (confirm(T('Delete this order?', 'حذف الطلب؟'))) { upd((o) => ({ orders: o.orders.filter((x) => x.id !== edit.id) })); setEdit(null); } };

  const clientNameOf = (id) => leads.find((l) => l.id === id)?.name || '';
  const term = find.trim().toLowerCase();
  const shown = term ? orders.filter((o) => `${o.title} ${clientNameOf(o.clientId)}`.toLowerCase().includes(term)) : orders;
  const inProduction = orders.filter((o) => ['production', 'install'].includes(o.stage));
  const completed = orders.filter((o) => o.stage === 'done');

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={FileText} label={T('Orders', 'الطلبات')} value={String(orders.length)} hint={`${orders.filter((o) => !['done'].includes(o.stage)).length} ${T('in progress', 'قيد التنفيذ')}`} />
        <Kpi icon={TrendingUp} label={T('Pipeline value', 'قيمة قيد التنفيذ')} value={money(orders.filter((o) => o.stage !== 'done').reduce((s, o) => s + Number(o.total || 0), 0))} hint={T('Open orders at quoted value', 'طلبات مفتوحة بقيمتها')} tone="sky" />
        <Kpi icon={Clock} label={T('In the workshop', 'في الورشة')} value={String(inProduction.length)} hint={T('Production & installation', 'تنفيذ وتركيب')} tone="terra" />
        <Kpi icon={CheckCircle2} label={T('Completed', 'مكتملة')} value={String(completed.length)} hint={money(completed.reduce((s, o) => s + Number(o.total || 0), 0))} tone="emerald" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-subtle" aria-hidden="true" />
          <input value={find} onChange={(e) => setFind(e.target.value)} className="input ps-9" placeholder={T('Search order or client…', 'ابحث بطلب أو عميل…')} aria-label={T('Search orders', 'ابحث في الطلبات')} />
        </div>
        <span className="hidden text-xs tabular-nums text-subtle sm:inline">{shown.length} / {orders.length}</span>
        <button className="btn-terra ms-auto" onClick={() => setEdit({ id: uid('o'), title: '', clientId: leads[0]?.id || '', stage: 'brief', date: today(), total: 0, notes: '' })}><Plus size={15} />{T('New order', 'طلب جديد')}</button>
      </div>

      {!orders.length ? (
        <div className="glass p-4">
          <EmptyState
            icon={FileText}
            title={T('No orders yet.', 'لا طلبات بعد.')}
            sub={T('Create an order, or convert an approved quotation to open one automatically.', 'أنشئ طلباً، أو حوّل عرضاً معتمداً ليُفتح الطلب تلقائياً.')}
            action={<button type="button" className="btn-gold btn-sm mt-1" onClick={() => setEdit({ id: uid('o'), title: '', clientId: leads[0]?.id || '', stage: 'brief', date: today(), total: 0, notes: '' })}><Plus size={14} />{T('New order', 'طلب جديد')}</button>}
          />
        </div>
      ) : (
        <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-3">
          {ORDER_STAGES.map(([k, en, ar]) => {
            const col = shown.filter((o) => o.stage === k);
            const value = col.reduce((s, o) => s + Number(o.total || 0), 0);
            return (
              <section key={k} className="glass flex w-[248px] shrink-0 snap-start flex-col p-3">
                <header className="mb-2.5 flex items-start justify-between gap-2 border-b border-line/10 pb-2.5">
                  <div className="min-w-0">
                    <h3 className="truncate text-xs font-bold uppercase tracking-[0.06em] text-gold">{lang === 'ar' ? ar : en}</h3>
                    <div className="mt-0.5 text-[10px] tabular-nums text-subtle">{money(value)}</div>
                  </div>
                  <span className="badge shrink-0 bg-line/[0.06] text-[10px] tabular-nums text-muted">{col.length}</span>
                </header>
                <div className="space-y-2">
                  {col.map((o) => (
                    <article key={o.id} className="group rounded-xl border border-line/10 bg-surface-2/70 p-2.5 transition duration-200 hover:border-gold/40 hover:shadow-soft">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{o.title || T('Untitled', 'بدون عنوان')}</div>
                          <div className="mt-0.5 truncate text-[11px] text-subtle">{clientNameOf(o.clientId) || '—'}</div>
                        </div>
                        <button type="button" onClick={() => setEdit(o)} className="shrink-0 rounded-lg p-1 text-gold opacity-0 transition-opacity hover:bg-gold/10 group-hover:opacity-100" title={T('Edit', 'تحرير')}><Pencil size={13} /></button>
                      </div>
                      <div className="mt-1.5 text-[13px] font-bold tabular-nums text-muted">{money(o.total)}</div>
                      <select
                        className="input mt-2 !py-1 !text-[11px]" value={o.stage} onChange={(e) => move(o.id, e.target.value)}
                        aria-label={T('Move to stage', 'نقل إلى مرحلة')}
                      >{ORDER_STAGES.map(([s, e2, a2]) => <option key={s} value={s}>{lang === 'ar' ? a2 : e2}</option>)}</select>
                    </article>
                  ))}
                  {!col.length && (
                    <p className="rounded-xl border border-dashed border-line/15 px-2 py-5 text-center text-[11px] text-subtle">
                      {term ? T('No match', 'لا نتائج') : T('Empty', 'فارغ')}
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {edit && <Modal title={T('Order', 'الطلب')} onClose={() => setEdit(null)}>
        <form onSubmit={save} className="grid grid-cols-2 gap-3">
          <Field className="col-span-2" label={T('Title', 'العنوان')} v={edit.title} on={(title) => setEdit({ ...edit, title })} required />
          <div><label className="label">{T('Client', 'العميل')}</label><select className="input" value={edit.clientId} onChange={(e) => setEdit({ ...edit, clientId: e.target.value })}>{leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
          <div><label className="label">{T('Stage', 'المرحلة')}</label><select className="input" value={edit.stage} onChange={(e) => setEdit({ ...edit, stage: e.target.value })}>{ORDER_STAGES.map(([s, e2, a2]) => <option key={s} value={s}>{lang === 'ar' ? a2 : e2}</option>)}</select></div>
          <Field label={T('Value (JOD)', 'القيمة (دينار)')} type="number" v={edit.total} on={(total) => setEdit({ ...edit, total })} />
          <Field label={T('Date', 'التاريخ')} type="date" v={edit.date} on={(date) => setEdit({ ...edit, date })} />
          <div className="col-span-2"><label className="label">{T('Notes', 'ملاحظات')}</label><textarea className="input" rows="3" value={edit.notes || ''} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></div>
          <button className="btn-gold">{T('Save', 'حفظ')}</button>
          <button type="button" className="btn-ghost text-red-400" onClick={del}><Trash2 size={14} />{T('Delete', 'حذف')}</button>
        </form>
      </Modal>}
    </div>
  );
}

/* ================= Invoices ================= */
export function Invoices() {
  const { T, lang, invoices, leads, customers, rates, money, upd, company } = useApp();
  const [id, setId] = useState(null);
  const [mode, setMode] = useState('edit');
  const [dl, setDl] = useState(lang);
  const [pay, setPay] = useState({ label: '', amount: '' });
  const [creating, setCreating] = useState(null); // null = closed, '' = open with nothing picked yet
  const [find, setFind] = useState('');
  const inv = invoices.find((i) => i.id === id);
  const client = inv && clientOf(inv, customers, leads);
  const clientName = (doc) => { const c = clientOf(doc, customers, leads); return c ? [c.company, c.name].filter(Boolean).join(' · ') : ''; };
  const paidOf = (i) => i.payments.reduce((s, p) => s + Number(p.amount), 0);
  const patch = (p) => upd((o) => ({ invoices: o.invoices.map((i) => (i.id === id ? { ...i, ...p } : i)) }));
  const addPay = (e) => {
    e.preventDefault();
    patch({ payments: [...inv.payments, { id: uid('p'), label: pay.label || T('Payment', 'دفعة'), amount: parseFloat(pay.amount) || 0, date: today() }] });
    setPay({ label: '', amount: '' });
  };
  const create = (e) => {
    e.preventDefault();
    const c = customers.find((x) => x.id === creating);
    const ni = { id: uid('inv'), no: nextNo(invoices, 'INV'), customerId: c?.id || '', clientId: c?.leadId || '', date: today(), due: addDays(today(), 30), vat: true, vatRate: rates.vat, discount: 0, items: [], payments: [] };
    upd((o) => ({ invoices: [ni, ...o.invoices] })); setCreating(null); setId(ni.id); setMode('edit');
  };
  const remove = () => { if (confirm(T('Delete this invoice?', 'حذف الفاتورة؟'))) { upd((o) => ({ invoices: o.invoices.filter((i) => i.id !== id) })); setId(null); } };
  const presets = [T('Down Payment / عربون', 'عربون / Down Payment'), T('Milestone / دفعة مرحلية', 'دفعة مرحلية / Milestone'), T('Delivery / دفعة تسليم', 'دفعة تسليم / Delivery')];
  const t = inv && totals(inv, rates.vat);
  const term = find.trim().toLowerCase();
  const shownI = term ? invoices.filter((i) => `${i.no} ${clientName(i)}`.toLowerCase().includes(term)) : invoices;

  const views = invoices.map((i) => invoiceView(i, rates.vat));
  const invoiced = views.reduce((s, v) => s + v.total, 0);
  const collected = views.reduce((s, v) => s + v.paid, 0);
  const outstanding = views.reduce((s, v) => s + Math.max(0, v.balance), 0);
  const late = views.filter((v) => v.overdue);

  const openNew = () => setCreating('');

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Wallet} label={T('Invoiced', 'المفوتر')} value={money(invoiced)} hint={`${invoices.length} ${T('invoices', 'فاتورة')}`} />
        <Kpi icon={CheckCircle2} label={T('Collected', 'المحصّل')} value={money(collected)} hint={`${invoiced ? Math.round((collected / invoiced) * 100) : 0}% ${T('of invoiced', 'من المفوتر')}`} tone="emerald" />
        <Kpi icon={Clock} label={T('Outstanding', 'المتبقي')} value={money(outstanding)} hint={T('Across all invoices', 'على كل الفواتير')} tone="terra" />
        <Kpi icon={AlertTriangle} label={T('Overdue', 'متأخرة')} value={String(late.length)} hint={money(late.reduce((s, v) => s + Math.max(0, v.balance), 0))} tone={late.length ? 'red' : 'emerald'} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-subtle" aria-hidden="true" />
          <input value={find} onChange={(e) => setFind(e.target.value)} className="input ps-9" placeholder={T('Search by number or client…', 'ابحث بالرقم أو العميل…')} aria-label={T('Search invoices', 'ابحث في الفواتير')} />
        </div>
        <span className="hidden text-xs tabular-nums text-subtle sm:inline">{shownI.length} / {invoices.length}</span>
        <button className="btn-terra ms-auto" onClick={openNew}><Plus size={15} />{T('New invoice', 'فاتورة جديدة')}</button>
      </div>

      <div className="glass overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {['#', T('Client', 'العميل'), T('Total', 'الإجمالي'), T('Paid', 'المدفوع'), T('Remaining', 'المتبقي'), T('Due', 'الاستحقاق')].map((h, i) => (
                <th key={h} className={`p-3 whitespace-nowrap ${i >= 2 && i <= 4 ? 'text-end' : 'text-start'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shownI.map((i) => {
              const v = invoiceView(i, rates.vat);
              return (
                <tr key={i.id} onClick={() => { setId(i.id); setMode('edit'); }} className="cursor-pointer border-t border-line/10">
                  <td className="whitespace-nowrap p-3 font-semibold">{i.no}</td>
                  <td className="min-w-[140px] p-3">{clientName(i) || '—'}</td>
                  <td className="p-3 text-end tabular-nums">{money(v.total)}</td>
                  <td className="p-3 text-end tabular-nums text-emerald-500">{money(v.paid)}</td>
                  <td className={`p-3 text-end font-bold tabular-nums ${v.balance > 0.005 ? 'text-terra' : 'text-subtle'}`}>{money(v.balance)}</td>
                  <td className="whitespace-nowrap p-3 text-xs">
                    {v.overdue
                      ? <span className="badge bg-red-500/15 text-red-400">{v.late} {T('days late', 'يوم تأخير')}</span>
                      : <span className="text-subtle tabular-nums" dir="ltr">{v.due}</span>}
                  </td>
                </tr>
              );
            })}
            {!shownI.length && (
              <tr>
                <td colSpan="6" className="p-0">
                  <EmptyState
                    icon={Wallet}
                    title={invoices.length ? T('No invoice matches that search.', 'لا توجد فاتورة مطابقة.') : T('No invoices yet.', 'لا فواتير بعد.')}
                    sub={invoices.length ? T('Try a number, a client name, or clear the search.', 'جرّب رقماً أو اسم عميل، أو امسح البحث.') : T('Create an invoice or convert an approved quotation.', 'أنشئ فاتورة أو حوّل عرضاً معتمداً.')}
                    action={!invoices.length && <button type="button" className="btn-gold btn-sm mt-1" onClick={openNew}><Plus size={14} />{T('New invoice', 'فاتورة جديدة')}</button>}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {creating !== null && <Modal title={T('New invoice', 'فاتورة جديدة')} onClose={() => setCreating(null)}>
        <form onSubmit={create} className="space-y-3">
          <EntityPicker kind="customer" label={T('Customer', 'العميل')} value={creating} onPick={(c) => setCreating(c ? c.id : '')} placeholder={T('Search a saved customer, or add a new company…', 'ابحث عن عميل محفوظ أو أضف شركة جديدة…')} />
          <p className="text-xs leading-relaxed text-subtle">{T('Customers are stored in Finance › Directory, so the next document picks them in one click.', 'يُحفظ العميل في المالية › العملاء والموردون، فيظهر في المستند التالي بنقرة واحدة.')}</p>
          <button className="btn-gold w-full" disabled={!creating}>{T('Create', 'إنشاء')}</button>
        </form>
      </Modal>}

      {inv && <Modal xwide title={inv.no} onClose={() => setId(null)}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <ModeSwitch mode={mode} onMode={setMode} />
          <button type="button" className="btn-ghost btn-sm no-print ms-auto text-red-400" onClick={remove}><Trash2 size={14} />{T('Delete', 'حذف')}</button>
        </div>

        <div className="mb-4 grid gap-2 sm:grid-cols-4">
          <Money label={T('Total', 'الإجمالي')} value={money(t.total)} />
          <Money label={T('Paid', 'المدفوع')} value={money(paidOf(inv))} tone="text-emerald-500" />
          <Money label={T('Remaining', 'المتبقي')} value={money(t.total - paidOf(inv))} tone={t.total - paidOf(inv) > 0.005 ? 'text-terra' : 'text-emerald-500'} />
          <Money label={T('Due date', 'الاستحقاق')} value={inv.due || dueOf(inv)} />
        </div>

        {mode === 'pdf' ? <>
          <PdfBar kind="invoice" doc={{ ...inv, vatRate: inv.vatRate ?? rates.vat }} client={client} dl={dl} setDl={setDl} />
          <FitDoc kind="invoice" dl={dl} doc={{ ...inv, vatRate: inv.vatRate ?? rates.vat }} client={client} company={company} />
        </> : <div className="space-y-5">
          <EntityPicker kind="customer" label={T('Customer', 'العميل')} value={inv.customerId || ''} nameFallback={client?.name || ''} onPick={(c) => patch({ customerId: c ? c.id : '', clientId: c ? c.leadId || inv.clientId || '' : inv.clientId || '' })} />
          <ItemsEditor items={inv.items} onChange={(items) => patch({ items })} />
          <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={T('Date', 'التاريخ')} type="date" v={inv.date} on={(date) => patch({ date })} />
            <Field label={T('Due date', 'تاريخ الاستحقاق')} type="date" v={inv.due || dueOf(inv)} on={(due) => patch({ due })} />
            <Field label={T('Discount (JOD)', 'الخصم (دينار)')} type="number" v={inv.discount} on={(discount) => patch({ discount })} />
            <label className="flex items-center gap-2 pb-2.5 text-sm"><input type="checkbox" className="accent-[#C9A45C]" checked={inv.vat} onChange={(e) => patch({ vat: e.target.checked })} />{T('Apply VAT', 'تطبيق الضريبة')} {inv.vatRate ?? rates.vat}%</label>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h4 className="text-[13px] font-bold">{T('Payments', 'الدفعات')}</h4>
              <span className="text-[11px] tabular-nums text-subtle">{inv.payments.length} {T('recorded', 'مسجّلة')}</span>
            </div>
            <div className="divide-y divide-line/10 rounded-2xl border border-line/10 bg-surface-2/40">
              {inv.payments.map((p) => (
                <div key={p.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <span className="w-20 shrink-0 text-[11px] tabular-nums text-subtle" dir="ltr">{p.date}</span>
                  <span className="min-w-0 flex-1 truncate">{p.label}</span>
                  <span className="tabular-nums font-semibold">{money(p.amount)}</span>
                  <button type="button" className="text-red-400/70 transition-colors hover:text-red-400" onClick={() => patch({ payments: inv.payments.filter((x) => x.id !== p.id) })} aria-label={T('Delete payment', 'حذف الدفعة')}><Trash2 size={13} /></button>
                </div>
              ))}
              {!inv.payments.length && <p className="px-3 py-3 text-center text-xs text-subtle">{T('No payments recorded yet.', 'لا دفعات مسجلة بعد.')}</p>}
            </div>
            <form onSubmit={addPay} className="mt-2 flex flex-wrap gap-2">
              <select className="input !w-auto !py-1.5 !text-xs" value={pay.label} onChange={(e) => setPay({ ...pay, label: e.target.value })}><option value="">{T('Payment type…', 'نوع الدفعة…')}</option>{presets.map((p) => <option key={p}>{p}</option>)}</select>
              <input required type="number" step="0.01" className="input !w-32 !py-1.5 tabular-nums" placeholder={T('Amount', 'المبلغ')} value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
              <button className="btn-gold btn-sm"><Plus size={14} />{T('Record payment', 'تسجيل دفعة')}</button>
            </form>
          </div>
        </div>}
      </Modal>}
    </div>
  );
}
