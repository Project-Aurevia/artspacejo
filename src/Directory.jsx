import React, { useMemo, useState } from 'react';
import {
  Search, Plus, Users, Truck, Building2, Pencil, Trash2, AlertTriangle, Check, X, Download, Phone, Mail,
} from 'lucide-react';
import { useApp } from './store.jsx';
import { Modal, Field } from './ui.jsx';
import {
  DIR_KINDS, kindKey, blankEntity, newEntityId, sortEntities, findDuplicates, matchesQuery,
  customerFromLead, entityPhones, entityEmails, sameName,
} from './directory.js';

/* ------------------------------------------------------------------ */
/* persistence                                                        */
/* ------------------------------------------------------------------ */

/** Upsert a company (customer or supplier) and normalise every free-text field. */
export function saveEntity(upd, kind, raw) {
  const clean = {
    ...raw,
    name: String(raw.name || '').trim(),
    tax: String(raw.tax || '').trim(),
    address: String(raw.address || '').trim(),
    notes: String(raw.notes || '').trim(),
    phone: String(raw.phone || '').trim(),
    email: String(raw.email || '').trim(),
    contact: {
      name: String(raw.contact?.name || '').trim(),
      role: String(raw.contact?.role || '').trim(),
      phone: String(raw.contact?.phone || '').trim(),
      email: String(raw.contact?.email || '').trim(),
    },
    updated: new Date().toISOString(),
  };
  upd((o) => {
    const key = kindKey(kind);
    const list = o[key] || [];
    return {
      [key]: list.some((x) => x.id === clean.id)
        ? list.map((x) => (x.id === clean.id ? clean : x))
        : [clean, ...list],
    };
  });
  return clean;
}

export const removeEntity = (upd, kind, id) => upd((o) => ({ [kindKey(kind)]: (o[kindKey(kind)] || []).filter((x) => x.id !== id) }));

const contactLine = (e) => [e?.contact?.name, e?.contact?.role].filter(Boolean).join(' · ');
const phoneOf = (e) => e?.contact?.phone || e?.phone || '';
const emailOf = (e) => e?.contact?.email || e?.email || '';

/* ------------------------------------------------------------------ */
/* company editor — Details tab + Contact tab                          */
/* ------------------------------------------------------------------ */

export function EntityModal({ kind = 'customer', draft, onClose, onSaved }) {
  const { T, upd, customers, suppliers } = useApp();
  const [v, setV] = useState(draft);
  const [tab, setTab] = useState('details');
  const [ok, setOk] = useState(false);
  const set = (p) => { setV((o) => ({ ...o, ...p })); setOk(false); };
  const setC = (p) => { setV((o) => ({ ...o, contact: { ...(o.contact || {}), ...p } })); setOk(false); };

  const meta = DIR_KINDS[kind] || DIR_KINDS.customer;
  const isNew = ![...(customers || []), ...(suppliers || [])].some((x) => x.id === v.id);
  const named = String(v.name || '').trim().length > 0;
  const dups = findDuplicates(v, { customers, suppliers });
  const blocked = !named || (dups.length > 0 && !ok);

  const save = (e) => {
    e.preventDefault();
    if (blocked) return;
    const clean = saveEntity(upd, kind, v);
    if (onSaved) onSaved(clean);
    onClose();
  };

  return (
    <Modal wide title={`${isNew ? T('New', 'جديد') : T('Edit', 'تحرير')} · ${T(meta.en, meta.ar)}`} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <div className="flex gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5 w-fit">
          {[['details', T('Details', 'البيانات')], ['contact', T('Contact', 'جهة الاتصال')]].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${tab === k ? 'bg-gold text-ink shadow-sm' : 'opacity-70 hover:opacity-100'}`}>
              {l}
            </button>
          ))}
        </div>

        {tab === 'details' ? (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field className="sm:col-span-2" label={T('Company name', 'اسم الشركة')} v={v.name} on={(name) => set({ name })} required autoFocus />
            <Field label={T('Tax / registration no.', 'الرقم الضريبي')} v={v.tax} on={(tax) => set({ tax })} dir="ltr" />
            <Field label={T('Main phone', 'هاتف الشركة')} v={v.phone} on={(phone) => set({ phone })} dir="ltr" />
            <Field label={T('Main e-mail', 'بريد الشركة')} type="email" v={v.email} on={(email) => set({ email })} dir="ltr" />
            <div>
              <label className="label">{T('Address', 'العنوان')}</label>
              <textarea className="input" rows="2" value={v.address || ''} onChange={(e) => set({ address: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">{T('Notes', 'ملاحظات')}</label>
              <textarea className="input" rows="2" value={v.notes || ''} onChange={(e) => set({ notes: e.target.value })} />
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={T('Contact person', 'الشخص المسؤول')} v={v.contact?.name} on={(name) => setC({ name })} autoFocus />
            <Field label={T('Role / title', 'المسمى الوظيفي')} v={v.contact?.role} on={(role) => setC({ role })} />
            <Field label={T('Direct phone', 'هاتف مباشر')} v={v.contact?.phone} on={(phone) => setC({ phone })} dir="ltr" />
            <Field label={T('Direct e-mail', 'بريد مباشر')} type="email" v={v.contact?.email} on={(email) => setC({ email })} dir="ltr" />
            <p className="sm:col-span-2 text-[11px] opacity-50 leading-snug">
              {T('The contact person is who we speak to — it is printed on quotations and invoices under the company name.',
                'جهة الاتصال هي من نتعامل معه — تُطبع في العروض والفواتير تحت اسم الشركة.')}
            </p>
          </div>
        )}

        {dups.length > 0 && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-500">
              <AlertTriangle size={14} />{T('Possible duplicate', 'تكرار محتمل')}
            </div>
            <ul className="mt-2 space-y-1.5">
              {dups.slice(0, 4).map((d) => (
                <li key={`${d.entity.id}-${d.by}`} className="text-xs leading-snug">
                  <b>{d.entity.name || '—'}</b>
                  {contactLine(d.entity) && <span className="opacity-70"> · {contactLine(d.entity)}</span>}
                  <span className="opacity-60">
                    {' — '}{d.by === 'phone' ? T('same phone', 'نفس الهاتف') : T('same e-mail', 'نفس البريد')}
                    {' '}<span dir="ltr">{d.value}</span>
                  </span>
                  <span className="badge bg-black/10 dark:bg-white/10 text-[10px] ms-1.5 align-middle">
                    {T(DIR_KINDS[d.kind].en, DIR_KINDS[d.kind].ar)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] mt-2 font-semibold">{T("Are you sure it isn't a duplicate?", 'هل أنت متأكد أنه ليس تكراراً؟')}</p>
            {!ok ? (
              <button type="button" className="btn-ghost !py-1.5 !px-3 text-xs mt-2" onClick={() => setOk(true)}>
                <Check size={13} />{T('Yes, save it as a separate company', 'نعم، احفظه كشركة منفصلة')}
              </button>
            ) : (
              <p className="text-[11px] text-emerald-500 mt-2 flex items-center gap-1">
                <Check size={12} />{T('Confirmed — different company.', 'تم التأكيد — شركة مختلفة.')}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button className="btn-gold flex-1" disabled={blocked}><Check size={15} />{T('Save', 'حفظ')}</button>
          <button type="button" className="btn-ghost" onClick={onClose}>{T('Cancel', 'إلغاء')}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* picker — search saved companies, or add the typed name              */
/* ------------------------------------------------------------------ */

export function EntityPicker({ kind = 'customer', value = '', onPick, label, nameFallback = '', allowCreate = true, placeholder }) {
  const { T, upd, customers, suppliers, leads } = useApp();
  const key = kindKey(kind);
  const list = key === 'suppliers' ? (suppliers || []) : (customers || []);
  const meta = DIR_KINDS[kind] || DIR_KINDS.customer;

  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(null);

  const sel = list.find((x) => x.id === value) || null;
  const showing = !sel || editing;

  const rows = useMemo(() => sortEntities(list).filter((e) => matchesQuery(e, q)).slice(0, 8), [list, q]);

  /* Old CRM entries still live in `leads`; offer them so nothing has to be re-typed. */
  const leadRows = useMemo(() => {
    if (kind !== 'customer') return [];
    const linked = new Set(list.map((x) => x.leadId).filter(Boolean));
    return (leads || [])
      .filter((l) => l && !linked.has(l.id))
      .filter((l) => matchesQuery({ name: l.company || l.name, phone: l.phone, email: l.email, contact: { name: l.company ? l.name : '' } }, q))
      .slice(0, 4);
  }, [kind, leads, list, q]);

  const pick = (e) => { if (onPick) onPick(e); setQ(''); setEditing(false); };
  const takeLead = (l) => pick(saveEntity(upd, 'customer', customerFromLead(l)));
  const openNew = () => setCreating({ ...blankEntity(kind, newEntityId(kind)), name: q.trim() });

  return (
    <div>
      {label && <label className="label">{label}</label>}

      {sel && !editing ? (
        <div className="flex items-center gap-2 rounded-xl border border-line/15 px-3 py-2">
          <Building2 size={15} className="text-gold shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">{sel.name}</div>
            <div className="text-[11px] opacity-55 truncate">{[contactLine(sel), phoneOf(sel)].filter(Boolean).join(' · ') || T('No contact yet', 'لا جهة اتصال')}</div>
          </div>
          <button type="button" className="text-[11px] text-gold shrink-0 hover:underline" onClick={() => { setQ(''); setEditing(true); }}>
            {T('Change', 'تغيير')}
          </button>
          <button type="button" className="opacity-40 hover:opacity-80 shrink-0" title={T('Clear', 'إفراغ')} onClick={() => onPick && onPick(null)}>
            <X size={14} />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 opacity-40" />
            <input
              className="input !py-2 ps-9" autoFocus={editing}
              placeholder={placeholder || `${T('Search', 'بحث')} ${T(meta.pluralEn, meta.pluralAr)}…`}
              value={q} onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="mt-2 rounded-xl border border-line/15 divide-y divide-black/5 dark:divide-white/10 max-h-60 overflow-auto">
            {rows.map((e) => (
              <button type="button" key={e.id} onClick={() => pick(e)} className="w-full flex items-center gap-2 p-2.5 text-start hover:bg-gold/10">
                <Building2 size={14} className="opacity-40 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{e.name}</div>
                  <div className="text-[11px] opacity-55 truncate">{[contactLine(e), phoneOf(e), emailOf(e)].filter(Boolean).join(' · ')}</div>
                </div>
                {sameName(e.name, q) && <span className="badge bg-emerald-500/15 text-emerald-500 text-[10px] shrink-0">{T('exact', 'مطابق')}</span>}
              </button>
            ))}

            {leadRows.map((l) => (
              <button type="button" key={l.id} onClick={() => takeLead(l)} className="w-full flex items-center gap-2 p-2.5 text-start hover:bg-gold/10">
                <Users size={14} className="opacity-40 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{l.company || l.name}</div>
                  <div className="text-[11px] opacity-55 truncate">{[l.company ? l.name : '', l.phone, l.email].filter(Boolean).join(' · ')}</div>
                </div>
                <span className="badge bg-black/10 dark:bg-white/10 text-[10px] shrink-0">{T('CRM', 'العملاء')}</span>
              </button>
            ))}

            {allowCreate && (q.trim() || (!rows.length && !leadRows.length)) && (
              <button type="button" onClick={openNew} className="w-full flex items-center gap-2 p-2.5 text-start text-sm text-gold hover:bg-gold/10">
                <Plus size={14} className="shrink-0" />
                <span className="truncate">
                  {q.trim()
                    ? `${T('Add new', 'إضافة جديد')} “${q.trim()}”`
                    : T(`Add the first ${meta.en.toLowerCase()}`, `أضف أول ${meta.ar}`)}
                </span>
              </button>
            )}

            {!rows.length && !leadRows.length && !q.trim() && !allowCreate && (
              <p className="p-3 text-[11px] opacity-45">{T('Nothing saved yet.', 'لا يوجد سجل بعد.')}</p>
            )}
          </div>

          {!!nameFallback && !sel && (
            <p className="text-[11px] opacity-50 mt-1.5">{T('Saved as', 'محفوظ كـ')}: {nameFallback}</p>
          )}
        </>
      )}

      {creating && (
        <EntityModal
          kind={kind} draft={creating} onClose={() => setCreating(null)}
          onSaved={(e) => pick(e)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* directory board — customers / suppliers book                        */
/* ------------------------------------------------------------------ */

export default function Directory() {
  const { T, customers, suppliers, leads, upd } = useApp();
  const [kind, setKind] = useState('customer');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);

  const list = kind === 'supplier' ? (suppliers || []) : (customers || []);
  const meta = DIR_KINDS[kind];
  const rows = useMemo(() => sortEntities(list).filter((e) => matchesQuery(e, q)), [list, q]);

  /* Records that share a phone/e-mail with anything else in the two books. */
  const clashes = useMemo(() => {
    const seen = new Map();
    [...(customers || []), ...(suppliers || [])].forEach((e) => {
      [...entityPhones(e), ...entityEmails(e)].forEach((k) => seen.set(k, (seen.get(k) || 0) + 1));
    });
    const out = new Set();
    list.forEach((e) => {
      if ([...entityPhones(e), ...entityEmails(e)].some((k) => seen.get(k) > 1)) out.add(e.id);
    });
    return out;
  }, [list, customers, suppliers]);

  const importLeads = () => {
    const linked = new Set((customers || []).map((x) => x.leadId).filter(Boolean));
    const fresh = (leads || []).filter((l) => l && !linked.has(l.id));
    if (!fresh.length) return;
    if (!confirm(T(`Import ${fresh.length} clients from the CRM?`, `استيراد ${fresh.length} عميلاً من إدارة العملاء؟`))) return;
    fresh.forEach((l) => saveEntity(upd, 'customer', customerFromLead(l)));
  };

  const remove = (e) => {
    if (!confirm(T(`Delete “${e.name}”?`, `حذف “${e.name}”؟`))) return;
    removeEntity(upd, kind, e.id);
  };

  const exportCsv = () => {
    const head = ['Company', 'Tax', 'Contact', 'Role', 'Phone', 'E-mail', 'Address', 'Notes'];
    const esc = (x) => `"${String(x == null ? '' : x).replace(/"/g, '""')}"`;
    const body = rows.map((e) => [e.name, e.tax, e.contact?.name, e.contact?.role, phoneOf(e), emailOf(e), e.address, e.notes].map(esc).join(','));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([`\uFEFF${[head.map(esc).join(','), ...body].join('\n')}`], { type: 'text/csv;charset=utf-8' }));
    a.download = `${kind}s-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  const Icon = kind === 'supplier' ? Truck : Users;
  const withContact = list.filter((e) => e.contact?.name || e.contact?.phone).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="glass stat-card p-5">
          <div className="flex items-center gap-2"><Icon size={14} className="shrink-0 text-gold" /><span className="stat-label truncate">{T(meta.pluralEn, meta.pluralAr)}</span></div>
          <div className="stat-value mt-2.5 text-[26px] text-gold">{list.length}</div>
          <div className="mt-1.5 text-[11px] leading-snug text-subtle">{T('Companies on file', 'شركات مسجّلة')}</div>
        </div>
        <div className="glass stat-card p-5">
          <div className="flex items-center gap-2"><Phone size={14} className="shrink-0 text-emerald-500" /><span className="stat-label truncate">{T('With a contact', 'بجهة اتصال')}</span></div>
          <div className="stat-value mt-2.5 text-[26px] text-emerald-500">{withContact}</div>
          <div className="mt-1.5 text-[11px] leading-snug text-subtle">{T('Ready for documents', 'جاهزة للمستندات')}</div>
        </div>
        <div className="glass stat-card p-5">
          <div className="flex items-center gap-2"><AlertTriangle size={14} className={`shrink-0 ${clashes.size ? 'text-amber-500' : 'text-emerald-500'}`} /><span className="stat-label truncate">{T('Possible duplicates', 'تكرارات محتملة')}</span></div>
          <div className={`stat-value mt-2.5 text-[26px] ${clashes.size ? 'text-amber-500' : 'text-emerald-500'}`}>{clashes.size}</div>
          <div className="mt-1.5 text-[11px] leading-snug text-subtle">{T('Shared phone or e-mail', 'هاتف أو بريد مشترك')}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="seg">
          {[['customer', Users, 'Customers', 'العملاء', (customers || []).length], ['supplier', Truck, 'Suppliers', 'الموردون', (suppliers || []).length]].map(([k, I, en, ar, n]) => (
            <button key={k} type="button" onClick={() => { setKind(k); setQ(''); }} data-active={kind === k} className="seg-tab">
              <I size={13} />{T(en, ar)} <span className="tabular-nums opacity-60">({n})</span>
            </button>
          ))}
        </div>
        <div className="relative min-w-[170px] max-w-[300px] flex-1">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-subtle" />
          <input className="input !py-2 ps-9" placeholder={`${T('Search', 'بحث')} ${T(meta.pluralEn, meta.pluralAr)}`} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button type="button" className="btn-ghost !py-2 !px-3 text-xs" onClick={exportCsv}><Download size={14} />{T('CSV', 'CSV')}</button>
        {kind === 'customer' && (leads || []).length > 0 && (
          <button type="button" className="btn-ghost !py-2 !px-3 text-xs" onClick={importLeads} title={T('Turn saved CRM clients into customers', 'تحويل عملاء إدارة العملاء إلى العملاء')}>
            <Users size={14} />{T('Import from CRM', 'استيراد من العملاء')}
          </button>
        )}
        <button type="button" className="btn-terra text-xs ms-auto" onClick={() => setEdit(blankEntity(kind, newEntityId(kind)))}>
          <Plus size={15} />{T(`New ${meta.en.toLowerCase()}`, `جديد · ${meta.ar}`)}
        </button>
      </div>

      <div className="glass overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>{[T('Company', 'الشركة'), T('Contact', 'جهة الاتصال'), T('Phone', 'الهاتف'), T('E-mail', 'البريد'), T('Tax no.', 'الرقم الضريبي'), ''].map((h, i) => <th key={i} className="p-3 text-start whitespace-nowrap">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className="border-t border-line/10 hover:bg-gold/5">
                <td className="p-2.5 min-w-[160px]">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-semibold">{e.name}</span>
                    {clashes.has(e.id) && <AlertTriangle size={12} className="shrink-0 text-amber-500" title={T('Shares a phone or e-mail with another record', 'يشترك في هاتف أو بريد مع سجل آخر')} />}
                  </div>
                  {e.address && <div className="mt-0.5 max-w-[220px] truncate text-[11px] text-subtle">{e.address}</div>}
                </td>
                <td className="p-3">
                  {contactLine(e) ? <div>{contactLine(e)}</div> : <span className="text-[11px] text-subtle">{T('No contact yet', 'لا جهة اتصال')}</span>}
                </td>
                <td className="p-3 text-xs tabular-nums text-muted" dir="ltr">{phoneOf(e) || '—'}</td>
                <td className="p-3 text-xs text-muted" dir="ltr">{emailOf(e) || '—'}</td>
                <td className="p-3 text-xs text-subtle" dir="ltr">{e.tax || '—'}</td>
                <td className="whitespace-nowrap p-3 text-end">
                  <button type="button" className="text-gold me-2" title={T('Edit', 'تحرير')} onClick={() => setEdit(e)}><Pencil size={14} /></button>
                  <button type="button" className="text-red-400/70 hover:text-red-400" title={T('Delete', 'حذف')} onClick={() => remove(e)}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan="6" className="p-8 text-center text-sm text-subtle">
                  {q ? T('Nothing matches that search.', 'لا نتائج لهذا البحث.') : T(`No ${meta.pluralEn.toLowerCase()} yet — add the first company.`, `لا يوجد ${meta.pluralAr} بعد — أضف أول شركة.`)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] leading-relaxed text-subtle">
        <Mail size={12} />
        {T('A company is the account; the Contact tab holds the person we actually talk to. Phone and e-mail are checked against both books to stop duplicates.',
          'الشركة هي الحساب، وتبويب جهة الاتصال يحمل الشخص الذي نتعامل معه. يُفحص الهاتف والبريد في الدفترين لمنع التكرار.')}
      </p>

      {edit && <EntityModal kind={kind} draft={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}
