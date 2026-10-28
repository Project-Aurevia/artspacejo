import React, { useState, useRef, useEffect } from 'react';
import { Printer, Plus, Trash2, Copy, Download, Mail, MessageCircle, ArrowRightCircle, Send, Eye, Pencil } from 'lucide-react';
import { useApp, totals, uid, ORDER_STAGES, QUOTE_STATUS } from './store.jsx';
import { Doc, renderPdf, StylePicker } from './Documents.jsx';
import { sb, serverHealth } from './api.js';
import { Modal, Stat, Badge, FileLink, Field, stageName } from './ui.jsx';
import { addDays, dueOf, invoiceView, todayStr } from './adminStats.js';

const DEPTS = [['signage', 'Signage', 'آرمات'], ['booths', 'Booths', 'بوثات'], ['printing', 'Printing', 'مطبوعات'], ['social', 'Social', 'سوشيال'], ['marketing', 'Strategy', 'استشارات']];
// Local calendar date (UTC serialisation would date a document "yesterday" before 03:00 in Amman).
const today = todayStr;
const r2 = (n) => Math.round(n * 100) / 100;

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
    <div ref={ref} dir="ltr" className="rounded-xl bg-zinc-200 dark:bg-zinc-800 p-3 flex justify-center overflow-hidden">
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
      <div className="space-y-3">
        {items.map((i, n) => (
          <div key={i.id} className="rounded-xl border border-black/10 dark:border-white/10 p-3 grid grid-cols-12 gap-2 items-end">
            <div className="col-span-12 sm:col-span-6"><label className="label">{T('Item (EN)', 'البند (EN)')}</label><input disabled={disabled} className="input" dir="ltr" value={i.label?.en || ''} onChange={(e) => set(i.id, { label: { ...i.label, en: e.target.value } })} /></div>
            <div className="col-span-12 sm:col-span-6"><label className="label">{T('Item (AR)', 'البند (عربي)')}</label><input disabled={disabled} className="input" dir="rtl" value={i.label?.ar || ''} onChange={(e) => set(i.id, { label: { ...i.label, ar: e.target.value } })} /></div>
            <div className="col-span-12 sm:col-span-4"><label className="label">{T('Description', 'الوصف')}</label><input disabled={disabled} className="input" value={i.detail || ''} onChange={(e) => set(i.id, { detail: e.target.value })} /></div>
            <div className="col-span-4 sm:col-span-2"><label className="label">{T('Dept', 'القسم')}</label><select disabled={disabled} className="input" value={i.dept} onChange={(e) => set(i.id, { dept: e.target.value })}>{DEPTS.map(([k, en, ar]) => <option key={k} value={k}>{lang === 'ar' ? ar : en}</option>)}</select></div>
            <div className="col-span-4 sm:col-span-2"><label className="label">{T('Qty', 'الكمية')}</label><input disabled={disabled} type="number" step="any" className="input" value={i.qty ?? 1} onChange={(e) => set(i.id, { qty: parseFloat(e.target.value) || 0 })} /></div>
            <div className="col-span-4 sm:col-span-2"><label className="label">{T('Unit price', 'سعر الوحدة')}</label><input disabled={disabled} type="number" step="any" className="input" value={i.unit ?? i.price} onChange={(e) => set(i.id, { unit: parseFloat(e.target.value) || 0 })} /></div>
            <div className="col-span-10 sm:col-span-1 text-sm font-bold text-gold pb-2">{r2(i.price)}</div>
            <button disabled={disabled} type="button" className="col-span-2 sm:col-span-1 pb-2 text-red-400 justify-self-end" onClick={() => onChange(items.filter((x) => x.id !== i.id))} title={T('Remove', 'حذف')}><Trash2 size={16} /></button>
            <span className="hidden">{n}</span>
          </div>
        ))}
        {!items.length && <p className="text-sm opacity-60">{T('No items yet — add a custom item or pick from the catalog.', 'لا بنود بعد — أضف بنداً مخصصاً أو اختر من الكتالوج.')}</p>}
      </div>
      {!disabled && <div className="flex gap-2 mt-3 flex-wrap">
        <button type="button" className="btn-gold" onClick={() => add({})}><Plus size={14} />{T('Custom item', 'بند مخصص')}</button>
        <select className="input !w-auto" value={cat} onChange={(e) => addCat(e.target.value)}>
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
    <div className="no-print space-y-3 mb-4">
      <div className="flex gap-2 flex-wrap items-center">
        {[['en', 'EN'], ['ar', 'عربي']].map(([k, l]) => <button key={k} type="button" onClick={() => setDl(k)} className={`btn !py-1.5 ${dl === k ? 'bg-gold text-ink' : 'btn-ghost'}`}>{l}</button>)}
        <span className="opacity-30">|</span>
        <StylePicker />
      </div>
      <div className="flex gap-2 flex-wrap items-end">
        <div className="flex-1 min-w-[200px]"><label className="label">{T('Send to', 'إرسال إلى')}</label><input className="input" dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} placeholder="client@email.com" /></div>
        <div className="flex-[2] min-w-[200px]"><label className="label">{T('Message (optional)', 'رسالة (اختياري)')}</label><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></div>
        <button type="button" disabled={!!busy} className="btn-gold" onClick={email}><Send size={15} />{busy === 'mail' ? '…' : T('Email PDF', 'إرسال PDF بالبريد')}</button>
        <button type="button" disabled={!!busy} className="btn-ghost" onClick={download}><Download size={15} />{busy === 'dl' ? '…' : T('Download PDF', 'تنزيل PDF')}</button>
        <button type="button" className="btn-ghost" onClick={() => window.print()}><Printer size={15} />{T('Print', 'طباعة')}</button>
        <a className="btn-ghost" target="_blank" rel="noreferrer" href={`https://wa.me/${(client?.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(body)}`}><MessageCircle size={15} />WhatsApp</a>
      </div>
      {canMail === false && <p className="text-[11px] opacity-50">{T('SMTP is not configured: the PDF downloads and your mail app opens — attach the file. Add SMTP_HOST/USER/PASS in .env to email automatically.', 'لم يتم ضبط SMTP: يتم تنزيل الملف ويفتح برنامج البريد — أرفق الملف. أضف SMTP_HOST وSMTP_USER وSMTP_PASS في ملف ‎.env‎ للإرسال التلقائي.')}</p>}
    </div>
  );
}

/* ================= Quotations ================= */
export function Quotes() {
  const { T, lang, quotes, leads, upd, money, rates, convertQuote, company, addLead } = useApp();
  const [id, setId] = useState(null);
  const [mode, setMode] = useState('edit');
  const [dl, setDl] = useState(lang);
  const [creating, setCreating] = useState(false);
  const [nc, setNc] = useState({ clientId: '', name: '', company: '', phone: '', email: '' });
  const q = quotes.find((x) => x.id === id);
  const client = q && leads.find((l) => l.id === q.clientId);
  const patch = (p) => upd((o) => ({ quotes: o.quotes.map((x) => (x.id === id ? { ...x, ...p } : x)) }));
  const patchClient = (p) => upd((o) => ({ leads: o.leads.map((l) => (l.id === q.clientId ? { ...l, ...p } : l)) }));
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
    let cid = nc.clientId;
    if (!cid) {
      cid = uid('c');
      upd((o) => ({ leads: [{ id: cid, stage: 'new', date: today(), tax: '', source: 'Manual', notes: '', name: nc.name, company: nc.company, phone: nc.phone, email: nc.email }, ...o.leads] }));
    }
    const nq = { id: uid('q'), no: nextNo(quotes, 'Q'), clientId: cid, status: 'draft', discount: 0, vat: true, date: today(), notes: '', validDays: 14, items: [] };
    upd((o) => ({ quotes: [nq, ...o.quotes] }));
    setCreating(false); setNc({ clientId: '', name: '', company: '', phone: '', email: '' }); open(nq.id);
  };
  const duplicate = () => {
    const nq = { ...q, id: uid('q'), no: nextNo(quotes, 'Q'), status: 'draft', converted: false, date: today(), file: undefined, filePath: undefined, items: q.items.map((i) => ({ ...i, id: uid('i') })) };
    upd((o) => ({ quotes: [nq, ...o.quotes] })); open(nq.id);
  };
  const remove = () => { if (confirm(T('Delete this quotation?', 'حذف عرض السعر؟'))) { upd((o) => ({ quotes: o.quotes.filter((x) => x.id !== id), orders: o.orders.filter((x) => x.quoteId !== id || x.stage !== 'brief') })); setId(null); } };
  const lock = q?.converted;
  const docObj = q && { ...q, vatRate: rates.vat };
  return (
    <div>
      <div className="flex mb-4"><button className="btn-terra ms-auto" onClick={() => setCreating(true)}><Plus size={15} />{T('New quotation', 'عرض سعر جديد')}</button></div>
      <div className="glass overflow-auto">
        <table className="w-full text-sm"><thead className="text-xs opacity-60"><tr>{['#', T('Client', 'العميل'), T('Date', 'التاريخ'), T('Total', 'الإجمالي'), T('Status', 'الحالة')].map((h) => <th key={h} className="p-3 text-start">{h}</th>)}</tr></thead>
          <tbody>{quotes.map((x) => <tr key={x.id} onClick={() => open(x.id)} className="border-t border-black/5 dark:border-white/10 cursor-pointer hover:bg-gold/5">
            <td className="p-3 font-semibold">{x.no}</td><td className="p-3">{leads.find((l) => l.id === x.clientId)?.name}</td><td className="p-3">{x.date}</td><td className="p-3">{money(totals({ ...x }, rates.vat).total)}</td>
            <td className="p-3"><Badge id={x.status}>{stageName(QUOTE_STATUS, x.status, lang)}</Badge>{x.converted && <span className="ms-2 text-xs text-emerald-500">✓ {T('Converted', 'محوّل')}</span>}</td></tr>)}
            {!quotes.length && <tr><td colSpan="5" className="p-6 text-center opacity-60">{T('No quotations yet.', 'لا توجد عروض أسعار.')}</td></tr>}</tbody></table>
      </div>

      {creating && <Modal title={T('New quotation', 'عرض سعر جديد')} onClose={() => setCreating(false)}>
        <form onSubmit={create} className="space-y-3">
          <div><label className="label">{T('Existing client', 'عميل موجود')}</label><select className="input" value={nc.clientId} onChange={(e) => setNc({ ...nc, clientId: e.target.value })}><option value="">{T('— New client —', '— عميل جديد —')}</option>{leads.map((l) => <option key={l.id} value={l.id}>{l.name} {l.company && `· ${l.company}`}</option>)}</select></div>
          {!nc.clientId && <div className="grid grid-cols-2 gap-3">
            <Field label={T('Name', 'الاسم')} v={nc.name} on={(name) => setNc({ ...nc, name })} required />
            <Field label={T('Company', 'الشركة')} v={nc.company} on={(c) => setNc({ ...nc, company: c })} />
            <Field label={T('Phone', 'الهاتف')} v={nc.phone} on={(phone) => setNc({ ...nc, phone })} dir="ltr" />
            <Field label={T('Email', 'البريد')} v={nc.email} on={(email) => setNc({ ...nc, email })} dir="ltr" />
          </div>}
          <button className="btn-gold w-full">{T('Create & edit', 'إنشاء وتحرير')}</button>
        </form>
      </Modal>}

      {q && <Modal xwide title={`${q.no} — ${client?.name || ''}`} onClose={() => setId(null)}>
        <div className="flex gap-2 mb-4 no-print flex-wrap">
          <button className={`btn ${mode === 'edit' ? 'bg-gold text-ink' : 'btn-ghost'}`} onClick={() => setMode('edit')}><Pencil size={15} />{T('Edit', 'تحرير')}</button>
          <button className={`btn ${mode === 'pdf' ? 'bg-gold text-ink' : 'btn-ghost'}`} onClick={() => setMode('pdf')}><Eye size={15} />{T('PDF & Email', 'PDF والبريد')}</button>
          <button className="btn-ghost ms-auto" onClick={duplicate}><Copy size={15} />{T('Duplicate', 'نسخ')}</button>
          <button className="btn-ghost text-red-400" onClick={remove}><Trash2 size={15} />{T('Delete', 'حذف')}</button>
        </div>
        {mode === 'pdf' ? <>
          <PdfBar kind="quote" doc={docObj} client={client} dl={dl} setDl={setDl} onSent={() => q.status === 'draft' && setStatus('sent')} />
          <FitDoc kind="quote" dl={dl} doc={docObj} client={client} company={company} />
        </> : <div className="space-y-5">
          {lock && <p className="text-xs text-amber-500">{T('Converted to an order — items are locked.', 'تم تحويله لطلب — البنود مقفلة.')}</p>}
          {q.file && <FileLink name={q.file} path={q.filePath} />}
          <div className="grid sm:grid-cols-4 gap-3">
            <Field label={T('Client name', 'اسم العميل')} v={client?.name} on={(name) => patchClient({ name })} />
            <Field label={T('Company', 'الشركة')} v={client?.company} on={(c) => patchClient({ company: c })} />
            <Field label={T('Phone', 'الهاتف')} v={client?.phone} on={(phone) => patchClient({ phone })} dir="ltr" />
            <Field label={T('Email', 'البريد')} v={client?.email} on={(email) => patchClient({ email })} dir="ltr" />
          </div>
          <ItemsEditor items={q.items} disabled={lock} onChange={(items) => patch({ items })} />
          <div className="grid sm:grid-cols-4 gap-3 items-end">
            <Field label={T('Discount (JOD)', 'الخصم (دينار)')} type="number" v={q.discount} on={(discount) => patch({ discount })} disabled={lock} />
            <Field label={T('Valid for (days)', 'صالح لمدة (أيام)')} type="number" v={q.validDays ?? 14} on={(validDays) => patch({ validDays })} />
            <Field label={T('Date', 'التاريخ')} type="date" v={q.date} on={(date) => patch({ date })} />
            <div><label className="label">{T('Status', 'الحالة')}</label><select className="input" value={q.status} onChange={(e) => setStatus(e.target.value)}>{QUOTE_STATUS.map(([k, en, ar]) => <option key={k} value={k}>{lang === 'ar' ? ar : en}</option>)}</select></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#C9A45C]" checked={q.vat} disabled={lock} onChange={(e) => patch({ vat: e.target.checked })} />{T('Apply VAT', 'تطبيق الضريبة')} {rates.vat}%</label>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="label">{T('Intro text (EN)', 'نص تمهيدي (EN)')}</label><textarea className="input" rows="2" value={q.intro?.en || ''} onChange={(e) => patch({ intro: { ...q.intro, en: e.target.value } })} /></div>
            <div><label className="label">{T('Intro text (AR)', 'نص تمهيدي (عربي)')}</label><textarea className="input" rows="2" dir="rtl" value={q.intro?.ar || ''} onChange={(e) => patch({ intro: { ...q.intro, ar: e.target.value } })} /></div>
            <div><label className="label">{T('Terms override (EN, one per line — blank = company default)', 'شروط خاصة (EN، سطر لكل بند — فارغ = الافتراضي)')}</label><textarea className="input" rows="3" value={q.terms?.en || ''} onChange={(e) => patch({ terms: { ...q.terms, en: e.target.value } })} /></div>
            <div><label className="label">{T('Terms override (AR)', 'شروط خاصة (عربي)')}</label><textarea className="input" rows="3" dir="rtl" value={q.terms?.ar || ''} onChange={(e) => patch({ terms: { ...q.terms, ar: e.target.value } })} /></div>
          </div>
          <div><label className="label">{T('Internal notes (not printed)', 'ملاحظات داخلية (لا تُطبع)')}</label><textarea className="input" rows="2" value={q.notes || ''} onChange={(e) => patch({ notes: e.target.value })} /></div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-xl font-extrabold text-gold">{money(totals(q, rates.vat).total)}</div>
            <button className="btn-gold ms-auto" onClick={() => setMode('pdf')}><Eye size={15} />{T('Preview PDF & Email', 'معاينة PDF والإرسال')}</button>
            {q.status === 'approved' && !q.converted && <button className="btn-terra" onClick={() => convertQuote(q.id)}><ArrowRightCircle size={15} />{T('Convert to Order & Invoice', 'تحويل إلى طلب وفاتورة')}</button>}
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
  const move = (id, stage) => upd((o) => ({ orders: o.orders.map((x) => (x.id === id ? { ...x, stage } : x)) }));
  const save = (e) => {
    e.preventDefault();
    upd((o) => ({ orders: o.orders.some((x) => x.id === edit.id) ? o.orders.map((x) => (x.id === edit.id ? edit : x)) : [edit, ...o.orders] }));
    setEdit(null);
  };
  const del = () => { if (confirm(T('Delete this order?', 'حذف الطلب؟'))) { upd((o) => ({ orders: o.orders.filter((x) => x.id !== edit.id) })); setEdit(null); } };
  return (
    <div>
      <div className="flex mb-4"><button className="btn-terra ms-auto" onClick={() => setEdit({ id: uid('o'), title: '', clientId: leads[0]?.id || '', stage: 'brief', date: today(), total: 0, notes: '' })}><Plus size={15} />{T('New order', 'طلب جديد')}</button></div>
      <div className="flex gap-3 overflow-x-auto pb-3">
        {ORDER_STAGES.map(([k]) => <div key={k} className="min-w-[230px] w-[230px] glass p-3">
          <div className="flex justify-between mb-3"><span className="text-xs font-bold text-gold">{stageName(ORDER_STAGES, k, lang)}</span><span className="text-xs opacity-60">{orders.filter((o) => o.stage === k).length}</span></div>
          <div className="space-y-2">{orders.filter((o) => o.stage === k).map((o) => <div key={o.id} className="bg-white/70 dark:bg-white/5 rounded-xl p-3 space-y-2">
            <div className="flex justify-between gap-2"><div className="font-semibold text-sm">{o.title}</div><button onClick={() => setEdit(o)} className="text-gold"><Pencil size={13} /></button></div>
            <div className="text-xs opacity-60">{leads.find((l) => l.id === o.clientId)?.name} · {money(o.total)}</div>
            <select className="input !py-1 !text-xs" value={o.stage} onChange={(e) => move(o.id, e.target.value)}>{ORDER_STAGES.map(([s, en, ar]) => <option key={s} value={s}>{lang === 'ar' ? ar : en}</option>)}</select></div>)}</div></div>)}
      </div>
      {edit && <Modal title={T('Order', 'الطلب')} onClose={() => setEdit(null)}>
        <form onSubmit={save} className="grid grid-cols-2 gap-3">
          <Field className="col-span-2" label={T('Title', 'العنوان')} v={edit.title} on={(title) => setEdit({ ...edit, title })} required />
          <div><label className="label">{T('Client', 'العميل')}</label><select className="input" value={edit.clientId} onChange={(e) => setEdit({ ...edit, clientId: e.target.value })}>{leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
          <div><label className="label">{T('Stage', 'المرحلة')}</label><select className="input" value={edit.stage} onChange={(e) => setEdit({ ...edit, stage: e.target.value })}>{ORDER_STAGES.map(([s, en, ar]) => <option key={s} value={s}>{lang === 'ar' ? ar : en}</option>)}</select></div>
          <Field label={T('Value (JOD)', 'القيمة (دينار)')} type="number" v={edit.total} on={(total) => setEdit({ ...edit, total })} />
          <Field label={T('Date', 'التاريخ')} type="date" v={edit.date} on={(date) => setEdit({ ...edit, date })} />
          <div className="col-span-2"><label className="label">{T('Notes', 'ملاحظات')}</label><textarea className="input" rows="3" value={edit.notes || ''} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></div>
          <button className="btn-gold">{T('Save', 'حفظ')}</button>
          <button type="button" className="btn-ghost text-red-400" onClick={del}><Trash2 size={14} />{T('Delete', 'حذف')}</button>
        </form></Modal>}
    </div>
  );
}

/* ================= Invoices ================= */
export function Invoices() {
  const { T, lang, invoices, leads, rates, money, upd, company } = useApp();
  const [id, setId] = useState(null);
  const [mode, setMode] = useState('edit');
  const [dl, setDl] = useState(lang);
  const [pay, setPay] = useState({ label: '', amount: '' });
  const [creating, setCreating] = useState('');
  const inv = invoices.find((i) => i.id === id);
  const client = inv && leads.find((l) => l.id === inv.clientId);
  const paidOf = (i) => i.payments.reduce((s, p) => s + Number(p.amount), 0);
  const patch = (p) => upd((o) => ({ invoices: o.invoices.map((i) => (i.id === id ? { ...i, ...p } : i)) }));
  const addPay = (e) => {
    e.preventDefault();
    patch({ payments: [...inv.payments, { id: uid('p'), label: pay.label || T('Payment', 'دفعة'), amount: parseFloat(pay.amount) || 0, date: today() }] });
    setPay({ label: '', amount: '' });
  };
  const create = (e) => {
    e.preventDefault();
    const ni = { id: uid('inv'), no: nextNo(invoices, 'INV'), clientId: creating, date: today(), due: addDays(today(), 30), vat: true, vatRate: rates.vat, discount: 0, items: [], payments: [] };
    upd((o) => ({ invoices: [ni, ...o.invoices] })); setCreating(''); setId(ni.id); setMode('edit');
  };
  const remove = () => { if (confirm(T('Delete this invoice?', 'حذف الفاتورة؟'))) { upd((o) => ({ invoices: o.invoices.filter((i) => i.id !== id) })); setId(null); } };
  const presets = [T('Down Payment / عربون', 'عربون / Down Payment'), T('Milestone / دفعة مرحلية', 'دفعة مرحلية / Milestone'), T('Delivery / دفعة تسليم', 'دفعة تسليم / Delivery')];
  const t = inv && totals(inv, rates.vat);
  return (
    <div>
      <div className="flex mb-4"><button className="btn-terra ms-auto" onClick={() => setCreating(leads[0]?.id || 'x')}><Plus size={15} />{T('New invoice', 'فاتورة جديدة')}</button></div>
      <div className="glass overflow-auto">
        <table className="w-full text-sm"><thead className="text-xs opacity-60"><tr>{['#', T('Client', 'العميل'), T('Total', 'الإجمالي'), T('Paid', 'المدفوع'), T('Remaining', 'المتبقي'), T('Due', 'الاستحقاق')].map((h) => <th key={h} className="p-3 text-start">{h}</th>)}</tr></thead>
          <tbody>{invoices.map((i) => { const v = invoiceView(i, rates.vat); return <tr key={i.id} onClick={() => { setId(i.id); setMode('edit'); }} className="border-t border-black/5 dark:border-white/10 cursor-pointer hover:bg-gold/5"><td className="p-3 font-semibold">{i.no}</td><td className="p-3">{leads.find((l) => l.id === i.clientId)?.name}</td><td className="p-3">{money(v.total)}</td><td className="p-3 text-emerald-500">{money(v.paid)}</td><td className="p-3 text-terra font-bold">{money(v.balance)}</td><td className="p-3 text-xs whitespace-nowrap">{v.overdue ? <span className="badge bg-red-500/15 text-red-400">{v.late} {T('days late', 'يوم تأخير')}</span> : <span className="opacity-60" dir="ltr">{v.due}</span>}</td></tr>; })}
            {!invoices.length && <tr><td colSpan="6" className="p-6 text-center opacity-60">{T('Create an invoice or convert an approved quotation.', 'أنشئ فاتورة أو حوّل عرضاً معتمداً.')}</td></tr>}</tbody></table>
      </div>
      {creating && <Modal title={T('New invoice', 'فاتورة جديدة')} onClose={() => setCreating('')}>
        <form onSubmit={create} className="space-y-3"><label className="label">{T('Client', 'العميل')}</label>
          <select className="input" value={creating} onChange={(e) => setCreating(e.target.value)}>{leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
          <button className="btn-gold w-full" disabled={!leads.length}>{T('Create', 'إنشاء')}</button></form></Modal>}
      {inv && <Modal xwide title={inv.no} onClose={() => setId(null)}>
        <div className="flex gap-2 mb-4 no-print flex-wrap">
          <button className={`btn ${mode === 'edit' ? 'bg-gold text-ink' : 'btn-ghost'}`} onClick={() => setMode('edit')}><Pencil size={15} />{T('Edit', 'تحرير')}</button>
          <button className={`btn ${mode === 'pdf' ? 'bg-gold text-ink' : 'btn-ghost'}`} onClick={() => setMode('pdf')}><Eye size={15} />{T('PDF & Email', 'PDF والبريد')}</button>
          <button className="btn-ghost text-red-400 ms-auto" onClick={remove}><Trash2 size={15} />{T('Delete', 'حذف')}</button>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 mb-4 no-print"><Stat l={T('Total', 'الإجمالي')} v={money(t.total)} /><Stat l={T('Paid', 'المدفوع')} v={money(paidOf(inv))} c="text-emerald-500" /><Stat l={T('Remaining', 'المتبقي')} v={money(t.total - paidOf(inv))} c="text-terra" /></div>
        {mode === 'pdf' ? <>
          <PdfBar kind="invoice" doc={{ ...inv, vatRate: inv.vatRate ?? rates.vat }} client={client} dl={dl} setDl={setDl} />
          <FitDoc kind="invoice" dl={dl} doc={{ ...inv, vatRate: inv.vatRate ?? rates.vat }} client={client} company={company} />
        </> : <div className="space-y-5">
          <ItemsEditor items={inv.items} onChange={(items) => patch({ items })} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <Field label={T('Date', 'التاريخ')} type="date" v={inv.date} on={(date) => patch({ date })} />
            <Field label={T('Due date', 'تاريخ الاستحقاق')} type="date" v={inv.due || dueOf(inv)} on={(due) => patch({ due })} />
            <Field label={T('Discount (JOD)', 'الخصم (دينار)')} type="number" v={inv.discount} on={(discount) => patch({ discount })} />
            <label className="flex items-center gap-2 text-sm pb-2"><input type="checkbox" className="accent-[#C9A45C]" checked={inv.vat} onChange={(e) => patch({ vat: e.target.checked })} />{T('Apply VAT', 'تطبيق الضريبة')} {inv.vatRate ?? rates.vat}%</label>
          </div>
          <div><h4 className="font-bold text-sm mb-2">{T('Payments', 'الدفعات')}</h4>
            {inv.payments.map((p) => <div key={p.id} className="flex items-center gap-2 text-sm py-1"><span className="flex-1">{p.date} — {p.label}</span><span>{money(p.amount)}</span><button className="text-red-400" onClick={() => patch({ payments: inv.payments.filter((x) => x.id !== p.id) })}><Trash2 size={14} /></button></div>)}
            <form onSubmit={addPay} className="flex gap-2 flex-wrap mt-2">
              <select className="input !w-auto" value={pay.label} onChange={(e) => setPay({ ...pay, label: e.target.value })}><option value="">{T('Payment type…', 'نوع الدفعة…')}</option>{presets.map((p) => <option key={p}>{p}</option>)}</select>
              <input required type="number" step="0.01" className="input !w-32" placeholder={T('Amount', 'المبلغ')} value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
              <button className="btn-gold"><Plus size={14} />{T('Record payment', 'تسجيل دفعة')}</button></form></div>
        </div>}
      </Modal>}
    </div>
  );
}
