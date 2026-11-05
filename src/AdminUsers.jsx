import React, { useEffect, useState, useCallback } from 'react';
import { UserCog, Plus, Pencil, Trash2, ShieldCheck, Check, X, Clock } from 'lucide-react';
import { useApp } from './store.jsx';
import { Modal, EmptyState } from './ui.jsx';
import { usersApi } from './api.js';
import { MODULES, ACTIONS, PRESETS, FINANCIAL } from '../server/perms.js';

const ACT_LABEL = { view: ['View', 'عرض'], add: ['Add', 'إضافة'], edit: ['Edit', 'تعديل'], delete: ['Delete', 'حذف'] };
const COL_LABEL = { invoices: ['Invoice', 'فاتورة'], purchases: ['Purchase / expense', 'مشتريات / مصروف'], cash: ['Pocket-money expense', 'مصروف نثرية'], payrolls: ['Payroll run', 'كشف رواتب'] };
const EMPTY = { id: '', name: '', email: '', password: '', full: false, active: true, perms: {} };

const roleOf = (u, T) => {
  if (u.locked) return [T('Owner', 'المالك'), 'bg-gold/20 text-gold'];
  if (u.full) return [T('Full access', 'صلاحية كاملة'), 'bg-emerald-500/15 text-emerald-500'];
  const g = Object.values(u.perms || {});
  if (g.length && g.every((p) => !p.add && !p.edit && !p.delete)) return [T('Read only', 'قراءة فقط'), 'bg-sky-500/15 text-sky-500'];
  return [T('Custom', 'مخصص'), 'bg-terra/15 text-terra'];
};

/** Admin → Settings → Users & Permissions (full-access administrators only). */
export default function UsersAdmin() {
  const { T, lang, me } = useApp();
  const [users, setUsers] = useState([]);
  const [apr, setApr] = useState([]);
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [u, a] = await Promise.all([usersApi.list(), usersApi.approvals()]);
    if (u.data) setUsers(u.data);
    if (a.data) setApr(a.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const L = (pair) => pair[lang === 'ar' ? 1 : 0];
  const setPerm = (mod, act, on) => setEdit((e) => {
    let cur = { ...(e.perms[mod] || {}) };
    if (act === 'view' && !on) cur = {};
    else if (on) { cur[act] = true; cur.view = true; }
    else delete cur[act];
    const perms = { ...e.perms };
    if (Object.keys(cur).length) perms[mod] = cur; else delete perms[mod];
    return { ...e, perms };
  });
  const preset = (fn) => setEdit((e) => ({ ...e, full: false, perms: fn() }));

  const save = async (ev) => {
    ev.preventDefault();
    setBusy(true); setErr('');
    const body = { name: edit.name, email: edit.email, full: edit.full, active: edit.active, perms: edit.perms, password: edit.password };
    const { error } = edit.id ? await usersApi.update(edit.id, body) : await usersApi.create(body);
    setBusy(false);
    if (error) return setErr(error.message);
    setEdit(null);
    load();
  };
  const remove = async (u) => {
    if (!confirm(T(`Delete ${u.name}? They will be signed out immediately.`, `حذف ${u.name}؟ سيتم تسجيل خروجه فوراً.`))) return;
    const { error } = await usersApi.remove(u.id);
    if (error) alert(error.message); else load();
  };
  const decide = async (a, approve) => {
    if (approve && !confirm(T(`Permanently delete "${a.label}"? This cannot be undone.`, `حذف «${a.label}» نهائياً؟ لا يمكن التراجع.`))) return;
    const { error } = await usersApi.decide(a.id, approve);
    if (error) alert(error.message); else load();
  };

  const pending = apr.filter((a) => a.status === 'pending');
  const done = apr.filter((a) => a.status !== 'pending').slice(0, 8);

  return (
    <div className="max-w-5xl space-y-5">
      <div className="glass space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-bold text-gold"><UserCog size={18} />{T('Users & Permissions', 'المستخدمون والصلاحيات')}</h3>
          <button type="button" className="btn-gold btn-sm" onClick={() => { setErr(''); setEdit({ ...EMPTY }); }}><Plus size={14} />{T('Add user', 'إضافة مستخدم')}</button>
        </div>
        <p className="text-[12px] leading-relaxed text-subtle">
          {T('Each user gets their own login and a role per section: View, Add, Edit, Delete. Deleting invoices, expenses, purchases or payroll runs always needs approval from a full-access administrator.', 'لكل مستخدم حساب خاص وصلاحيات لكل قسم: عرض، إضافة، تعديل، حذف. حذف الفواتير والمصاريف والمشتريات وكشوف الرواتب يحتاج دائماً موافقة مدير بصلاحية كاملة.')}
        </p>
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-[10.5px] uppercase tracking-wider text-subtle">
                {[T('Name', 'الاسم'), T('Email', 'البريد'), T('Role', 'الدور'), T('Status', 'الحالة'), ''].map((h, i) => <th key={i} className="px-2 py-2 text-start font-bold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const [label, cls] = roleOf(u, T);
                return (
                  <tr key={u.id} className="border-t border-line/10">
                    <td className="px-2 py-2 font-semibold">{u.name}{u.id === me?.id && <span className="ms-1.5 text-[10px] text-subtle">({T('you', 'أنت')})</span>}</td>
                    <td className="px-2" dir="ltr">{u.email}</td>
                    <td className="px-2"><span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${cls}`}>{label}</span></td>
                    <td className="px-2">{u.active ? <span className="text-emerald-500">{T('Active', 'فعّال')}</span> : <span className="text-red-400">{T('Disabled', 'معطّل')}</span>}</td>
                    <td className="px-2 text-end">
                      {!u.locked && (
                        <>
                          <button type="button" className="icon-btn" aria-label={T('Edit', 'تعديل')} onClick={() => { setErr(''); setEdit({ ...EMPTY, ...u, password: '' }); }}><Pencil size={14} /></button>
                          {u.id !== me?.id && <button type="button" className="icon-btn text-red-400" aria-label={T('Delete', 'حذف')} onClick={() => remove(u)}><Trash2 size={14} /></button>}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass space-y-3 p-5">
        <h3 className="flex items-center gap-2 font-bold text-gold"><ShieldCheck size={18} />{T('Delete approvals', 'موافقات الحذف')}
          {pending.length > 0 && <span className="rounded-full bg-terra px-2 py-0.5 text-[10.5px] font-bold text-white">{pending.length}</span>}
        </h3>
        {pending.length === 0 ? (
          <EmptyState icon={Clock} title={T('Nothing waiting', 'لا يوجد طلبات معلقة')} sub={T('When staff delete an invoice or expense it appears here for your approval.', 'عندما يحذف الموظفون فاتورة أو مصروفاً يظهر الطلب هنا لموافقتك.')} />
        ) : (
          <div className="space-y-2">
            {pending.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line/10 p-3 text-[12.5px]">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{L(COL_LABEL[a.collection] || [a.collection, a.collection])} · {a.label || a.rowId}{a.amount ? ` · ${Number(a.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''}</div>
                  <div className="text-[11px] text-subtle">{T('Requested by', 'طلب من')} {a.requestedBy?.name} · {String(a.at).slice(0, 16).replace('T', ' ')}</div>
                </div>
                {me?.full && (
                  <>
                    <button type="button" className="btn-ghost btn-sm text-red-400" onClick={() => decide(a, true)}><Trash2 size={13} />{T('Approve delete', 'الموافقة على الحذف')}</button>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => decide(a, false)}><X size={13} />{T('Reject', 'رفض')}</button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        {done.length > 0 && (
          <div className="border-t border-line/10 pt-3 text-[11px] text-subtle">
            {done.map((a) => (
              <div key={a.id}>{a.status === 'approved' ? '✔' : '✖'} {a.label || a.rowId} — {a.status === 'approved' ? T('deleted', 'حُذف') : T('rejected', 'مرفوض')} {T('by', 'بواسطة')} {a.decidedBy}</div>
            ))}
          </div>
        )}
      </div>

      {edit && (
        <Modal title={edit.id ? T('Edit user', 'تعديل مستخدم') : T('New user', 'مستخدم جديد')} onClose={() => setEdit(null)} xwide>
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">{T('Full name', 'الاسم الكامل')}</label><input className="input" required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
              <div><label className="label">{T('Email (login)', 'البريد (اسم الدخول)')}</label><input className="input" type="email" dir="ltr" required value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></div>
              <div>
                <label className="label">{edit.id ? T('New password (leave empty to keep)', 'كلمة مرور جديدة (اتركها فارغة للإبقاء)') : T('Password (min 8)', 'كلمة المرور (8 أحرف على الأقل)')}</label>
                <input className="input" type="password" dir="ltr" autoComplete="new-password" required={!edit.id} minLength={edit.id && !edit.password ? undefined : 8} value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} />
              </div>
              <label className="flex items-end gap-2 pb-2 text-[12.5px]"><input type="checkbox" className="h-4 w-4 accent-gold" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />{T('Account active', 'الحساب فعّال')}</label>
            </div>

            <label className="flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/5 p-3 text-[12.5px]">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-gold" checked={edit.full} onChange={(e) => setEdit({ ...edit, full: e.target.checked })} />
              <span><b>{T('Full-access administrator', 'مدير بصلاحية كاملة')}</b><br /><span className="text-subtle">{T('Can do everything, manage users, set up email and approve deletions of financial records.', 'يمكنه كل شيء، وإدارة المستخدمين، وإعداد البريد، والموافقة على حذف السجلات المالية.')}</span></span>
            </label>

            {!edit.full && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-subtle">{T('Quick roles', 'أدوار جاهزة')}</span>
                  {PRESETS.map(([k, en, ar, fn]) => <button key={k} type="button" className="btn-ghost btn-sm" onClick={() => preset(fn)}>{lang === 'ar' ? ar : en}</button>)}
                  <button type="button" className="btn-ghost btn-sm" onClick={() => setEdit({ ...edit, perms: {} })}>{T('Clear', 'مسح')}</button>
                </div>
                <div className="overflow-x-auto rounded-xl border border-line/10">
                  <table className="w-full text-[12.5px]">
                    <thead>
                      <tr className="bg-line/[0.05] text-[10.5px] uppercase tracking-wider text-subtle">
                        <th className="px-3 py-2 text-start font-bold">{T('Section', 'القسم')}</th>
                        {ACTIONS.map((a) => <th key={a} className="px-2 py-2 text-center font-bold">{L(ACT_LABEL[a])}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {MODULES.map(([id, en, ar]) => (
                        <tr key={id} className="border-t border-line/10">
                          <td className="px-3 py-2 font-semibold">{lang === 'ar' ? ar : en}</td>
                          {ACTIONS.map((a) => (
                            <td key={a} className="px-2 text-center">
                              <input type="checkbox" className="h-4 w-4 accent-gold" checked={!!edit.perms[id]?.[a]} onChange={(e) => setPerm(id, a, e.target.checked)} aria-label={`${en} ${a}`} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-subtle">
                  {T('Delete on Invoices, Accounting or Payroll sends a request to a full-access administrator instead of deleting straight away.', 'الحذف في الفواتير أو المحاسبة أو الرواتب يرسل طلباً إلى مدير بصلاحية كاملة بدلاً من الحذف الفوري.')}
                  {' '}({[...FINANCIAL].length} {T('record types are protected', 'أنواع سجلات محمية')})
                </p>
              </>
            )}

            {err && <div className="rounded-lg bg-red-500/10 px-3 py-2 text-[12px] text-red-400">{err}</div>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setEdit(null)}>{T('Cancel', 'إلغاء')}</button>
              <button type="submit" className="btn-gold" disabled={busy}><Check size={15} />{T('Save user', 'حفظ المستخدم')}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
