import React, { useMemo, useState } from 'react';
import {
  Users, CalendarDays, HandCoins, SlidersHorizontal, Plus, Trash2, Pencil, Check, Search, Clock, Info, X, Download, Printer,
} from 'lucide-react';
import TimesheetTab from './Timesheet.jsx';
import { useApp, uid } from './store.jsx';
import { Modal, Field, EmptyState } from './ui.jsx';
import { todayStr } from './adminStats.js';
import {
  EMPTY_EMPLOYEE, PAY_TYPES, DAY_STATUS, DEFAULT_HR, monthDates, monthOf, monthLabel, isWeekend,
  attendanceStats, computeLine, advanceConsumption, nextEmployeeNo, shiftHours, daysInMonth, round2,
} from './payroll.js';
import { toCsv } from './accounting.js';

const moneyOf = (n) => `${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const TABS = [
  ['people', Users, 'Employees', 'الموظفون'],
  ['sheet', CalendarDays, 'Daily sheet', 'سجل الدوام'],
  ['advances', HandCoins, 'Advances', 'السلف'],
  ['timesheet', Printer, 'Timesheet PDF', 'سجل الدوام PDF'],
  ['rules', SlidersHorizontal, 'Rules', 'الإعدادات'],
];

function Panel({ title, sub, action, children, className = '' }) {
  return (
    <section className={`glass p-4 ${className} sm:p-5`}>
      <div className="panel-head mb-3 flex items-start gap-3 pb-3">
        <div className="min-w-0">
          <h3 className="text-[13px] font-bold leading-tight tracking-tight">{title}</h3>
          {sub && <p className="mt-1 text-[11px] leading-relaxed text-subtle">{sub}</p>}
        </div>
        {action && <div className="ms-auto shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

function Tip({ icon: Icon, label, value, hint, tone = 'text-gold' }) {
  return (
    <div className="glass stat-card p-4">
      <div className="flex items-center gap-2"><Icon size={14} className={`shrink-0 ${tone}`} /><span className="stat-label truncate">{label}</span></div>
      <div className={`stat-value mt-2 text-[22px] ${tone}`}>{value}</div>
      {hint && <div className="mt-1.5 text-[11px] leading-snug text-subtle">{hint}</div>}
    </div>
  );
}

/** Number input that commits on blur/Enter so a half-typed value never reaches the model. */
function Num({ v = 0, onCommit, className = '', ...rest }) {
  const [text, setText] = useState(v === 0 || v ? String(v) : '');
  React.useEffect(() => { setText(v === 0 || v ? String(v) : ''); }, [v]);
  const commit = () => { const n = parseFloat(text); onCommit(Number.isFinite(n) ? n : 0); };
  return (
    <input
      className={`input tabular-nums ${className}`} inputMode="decimal" value={text}
      onChange={(e) => setText(e.target.value)} onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); e.currentTarget.blur(); } }}
      {...rest}
    />
  );
}

const allowTotal = (e) => round2((e.allowances || []).reduce((s, a) => s + Number(a.amount || 0), 0));

/* ================= employees ================= */
function EmployeeModal({ draft, onClose, onSave }) {
  const { T, lang } = useApp();
  const [f, setF] = useState(draft);
  const set = (p) => setF((o) => ({ ...o, ...p }));
  const setAllow = (i, p) => set({ allowances: f.allowances.map((a, k) => (k === i ? { ...a, ...p } : a)) });
  const addAllow = () => set({ allowances: [...(f.allowances || []), { label: { en: '', ar: '' }, amount: 0 }] });
  const delAllow = (i) => set({ allowances: f.allowances.filter((_, k) => k !== i) });
  const save = (e) => { e.preventDefault(); onSave({ ...f, base: Number(f.base) || 0, commissionPct: Number(f.commissionPct) || 0 }); };

  return (
    <Modal title={T('Employee', 'الموظف')} onClose={onClose} xwide>
      <form onSubmit={save} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={T('Employee No.', 'الرقم الوظيفي')} v={f.no} on={(v) => set({ no: v })} dir="ltr" />
          <Field label={T('Job title', 'المسمى الوظيفي')} v={f.title} on={(v) => set({ title: v })} />
          <Field label={T('Name (English)', 'الاسم (إنجليزي)')} v={f.name} on={(v) => set({ name: v })} />
          <Field label={T('Name (Arabic)', 'الاسم (عربي)')} v={f.nameAr} on={(v) => set({ nameAr: v })} />
          <Field label={T('Department', 'القسم')} v={f.dept} on={(v) => set({ dept: v })} />
          <Field label={T('Phone', 'الهاتف')} v={f.phone} on={(v) => set({ phone: v })} dir="ltr" />
          <Field label={T('Email', 'البريد')} v={f.email} on={(v) => set({ email: v })} dir="ltr" />
          <Field label={T('National ID', 'الرقم الوطني')} v={f.nationalId} on={(v) => set({ nationalId: v })} dir="ltr" />
          <Field label={T('Social security No.', 'رقم الضمان الاجتماعي')} v={f.ssNo} on={(v) => set({ ssNo: v })} dir="ltr" />
          <Field label={T('Start date', 'تاريخ الالتحاق')} v={f.startDate} on={(v) => set({ startDate: v })} type="date" />
          <Field label={T('End date', 'تاريخ الانتهاء')} v={f.endDate} on={(v) => set({ endDate: v })} type="date" />
          <div>
            <label className="label">{T('Pay basis', 'أساس الأجر')}</label>
            <select className="input" value={f.payType} onChange={(e) => set({ payType: e.target.value })}>
              {PAY_TYPES.map(([k, en, ar]) => <option key={k} value={k}>{lang === 'ar' ? ar : en}</option>)}
            </select>
          </div>
          <div>
            <label className="label">
              {f.payType === 'monthly' ? T('Monthly basic salary', 'الراتب الأساسي الشهري')
                : f.payType === 'hourly' ? T('Hourly rate', 'أجر الساعة') : T('Daily rate', 'أجر اليوم')}
            </label>
            <Num v={f.base} onCommit={(v) => set({ base: v })} />
          </div>
          <Field label={T('Commission %', 'نسبة العمولة %')} v={f.commissionPct} on={(v) => set({ commissionPct: Number(v) || 0 })} type="number" />
          <Field label={T('Bank', 'البنك')} v={f.bankName} on={(v) => set({ bankName: v })} />
          <Field label="IBAN" v={f.iban} on={(v) => set({ iban: v })} dir="ltr" />
        </div>

        <div className="rounded-xl border border-line/10 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12px] font-bold">{T('Fixed allowances', 'البدلات الثابتة')}</span>
            <button type="button" className="btn-ghost !py-1 !text-[11px]" onClick={addAllow}><Plus size={13} />{T('Add', 'إضافة')}</button>
          </div>
          {(f.allowances || []).length === 0 && <p className="text-[11px] text-subtle">{T('No allowances — housing, transport, phone…', 'لا بدلات — سكن، مواصلات، هاتف…')}</p>}
          <div className="space-y-2">
            {(f.allowances || []).map((a, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="label">{T('Label (English)', 'الوصف (إنجليزي)')}</label>
                  <input className="input" value={a.label?.en || ''} onChange={(e) => setAllow(i, { label: { ...a.label, en: e.target.value } })} />
                </div>
                <div className="flex-1">
                  <label className="label">{T('Label (Arabic)', 'الوصف (عربي)')}</label>
                  <input className="input" value={a.label?.ar || ''} onChange={(e) => setAllow(i, { label: { ...a.label, ar: e.target.value } })} />
                </div>
                <div className="w-28"><label className="label">{T('Amount', 'المبلغ')}</label><Num v={a.amount} onCommit={(v) => setAllow(i, { amount: v })} /></div>
                <button type="button" className="icon-btn mb-0.5 text-red-400" onClick={() => delAllow(i)} aria-label={T('Remove', 'حذف')}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {[
            ['family', T('Married (extra tax exemption)', 'متزوج (إعفاء ضريبي إضافي)')],
            ['ssSubject', T('Registered with social security', 'مسجل في الضمان الاجتماعي')],
            ['taxSubject', T('Subject to income tax', 'خاضع لضريبة الدخل')],
            ['active', T('Currently employed', 'على رأس العمل')],
          ].map(([k, l]) => (
            <label key={k} className="flex items-center gap-2 rounded-lg border border-line/10 px-3 py-2 text-[12px]">
              <input type="checkbox" className="h-4 w-4 accent-gold" checked={f[k] !== false} onChange={(e) => set({ [k]: e.target.checked })} />
              {l}
            </label>
          ))}
        </div>

        <div>
          <label className="label">{T('Notes', 'ملاحظات')}</label>
          <textarea className="input" rows={2} value={f.notes || ''} onChange={(e) => set({ notes: e.target.value })} />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose}>{T('Cancel', 'إلغاء')}</button>
          <button type="submit" className="btn-gold"><Check size={15} />{T('Save employee', 'حفظ الموظف')}</button>
        </div>
      </form>
    </Modal>
  );
}

function People() {
  const { T, lang, employees = [], attendance = [], advances = [], upd, tx } = useApp();
  const [q, setQ] = useState('');
  const [draft, setDraft] = useState(null);
  const list = employees.filter((e) => !q || `${e.name} ${e.nameAr} ${e.no} ${e.title}`.toLowerCase().includes(q.toLowerCase()));

  const save = (f) => {
    const exists = employees.some((e) => e.id === f.id);
    upd({ employees: exists ? employees.map((e) => (e.id === f.id ? f : e)) : [{ ...f, id: uid('emp') }, ...employees] });
    setDraft(null);
  };
  const remove = (e) => {
    const used = attendance.some((r) => r.employeeId === e.id) || advances.some((a) => a.employeeId === e.id);
    if (used) {
      if (!confirm(T('This employee has attendance or advance records. Deactivate instead of deleting?', 'لدى الموظف سجلات دوام أو سلف. هل تريد تعطيله بدل الحذف؟'))) return;
      upd({ employees: employees.map((x) => (x.id === e.id ? { ...x, active: false } : x)) });
      return;
    }
    if (!confirm(T(`Delete ${e.name || e.no}?`, `حذف ${e.name || e.no}؟`))) return;
    upd({ employees: employees.filter((x) => x.id !== e.id) });
  };

  const totalBase = employees.filter((e) => e.active !== false).reduce((s, e) => s + Number(e.base || 0) + allowTotal(e), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Tip icon={Users} label={T('Active employees', 'الموظفون على رأس العمل')} value={employees.filter((e) => e.active !== false).length} hint={T(`${employees.length} on file`, `${employees.length} في السجل`)} />
        <Tip icon={HandCoins} label={T('Monthly payroll base', 'الأساس الشهري للأجور')} value={moneyOf(totalBase)} hint={T('Basic salaries + fixed allowances', 'الرواتب الأساسية + البدلات الثابتة')} />
        <Tip icon={Clock} label={T('Pending advances', 'سلف قائمة')} value={moneyOf(advances.reduce((s, a) => s + Number(a.amount || 0), 0))} hint={T('Deducted from the next payroll runs', 'تُخصم من قسائم الرواتب القادمة')} />
      </div>

      <Panel
        title={T('Employee file', 'ملف الموظفين')}
        sub={T('Everything here stays on your server. Payroll reads the salary, allowances and commission defaults from this file.', 'كل هذه البيانات على سيرفرك. يحتسب الراتب والبدلات والعمولة من هذا الملف.')}
        action={(
          <div className="flex gap-2">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute inset-y-0 start-2.5 my-auto text-subtle" />
              <input className="input !py-1.5 ps-8 text-xs" placeholder={T('Search', 'بحث')} value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <button type="button" className="btn-gold !py-1.5 !text-[11px]" onClick={() => setDraft({ ...EMPTY_EMPLOYEE, id: uid('emp'), no: nextEmployeeNo(employees), startDate: todayStr(), allowances: [] })}>
              <Plus size={14} />{T('Employee', 'موظف')}
            </button>
          </div>
        )}
      >
        {list.length === 0 ? (
          <EmptyState icon={Users} title={T('No employees yet', 'لا موظفين بعد')} sub={T('Add the team, then record their daily in/out on the Daily sheet tab.', 'أضف الفريق، ثم سجّل الحضور والانصراف في تبويب سجل الدوام.')} />
        ) : (
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-start text-[10.5px] uppercase tracking-wider text-subtle">
                  {[T('No.', 'الرقم'), T('Name', 'الاسم'), T('Job', 'الوظيفة'), T('Pay', 'الأجر'), T('Allowances', 'البدلات'), T('Status', 'الحالة'), ''].map((h, i) => <th key={i} className="whitespace-nowrap px-2 py-2 text-start font-bold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {list.map((e) => (
                  <tr key={e.id} className="border-t border-line/10">
                    <td className="whitespace-nowrap px-2 py-2 tabular-nums text-subtle" dir="ltr">{e.no}</td>
                    <td className="px-2 py-2">
                      <div className="font-semibold">{lang === 'ar' ? (e.nameAr || e.name) : (e.name || e.nameAr)}</div>
                      <div className="text-[10.5px] text-subtle">{e.nameAr && lang !== 'ar' ? e.nameAr : ''}{e.phone ? ` · ${e.phone}` : ''}</div>
                    </td>
                    <td className="px-2 py-2">{e.title || '—'}<div className="text-[10.5px] text-subtle">{e.dept}</div></td>
                    <td className="whitespace-nowrap px-2 py-2 tabular-nums">
                      {moneyOf(e.base)}<span className="text-[10.5px] text-subtle"> /{(PAY_TYPES.find(([k]) => k === e.payType) || PAY_TYPES[0])[0] === 'monthly' ? T('mo', 'شهر') : e.payType === 'hourly' ? T('hr', 'ساعة') : T('day', 'يوم')}</span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 tabular-nums">{allowTotal(e) ? moneyOf(allowTotal(e)) : '—'}</td>
                    <td className="px-2 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${e.active === false ? 'bg-zinc-500/15 text-muted' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'}`}>
                        {e.active === false ? T('Inactive', 'غير نشط') : T('Active', 'نشط')}
                      </span>
                      {e.ssSubject === false && <span className="ms-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-500">{T('no SS', 'بدون ضمان')}</span>}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-end">
                      <button type="button" className="icon-btn" onClick={() => setDraft({ ...EMPTY_EMPLOYEE, ...e })} aria-label={T('Edit', 'تعديل')}><Pencil size={14} /></button>
                      <button type="button" className="icon-btn text-red-400" onClick={() => remove(e)} aria-label={T('Delete', 'حذف')}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {draft && <EmployeeModal draft={draft} onClose={() => setDraft(null)} onSave={save} />}
    </div>
  );
}

/* ================= daily sheet ================= */
function Sheet() {
  const { T, lang, employees = [], attendance = [], advances = [], payrolls = [], hr = DEFAULT_HR, upd, tx } = useApp();
  const [day, setDay] = useState(todayStr());
  const [showInactive, setShowInactive] = useState(false);
  const month = monthOf(day);
  const team = employees.filter((e) => showInactive || e.active !== false);
  const consumed = useMemo(() => advanceConsumption(payrolls), [payrolls]);

  const idOf = (empId) => `${empId}:${day}`;
  const rowOf = (empId) => attendance.find((r) => r.id === idOf(empId)) || { id: idOf(empId), employeeId: empId, date: day, in: '', out: '', brk: 0, status: 'work', holiday: false, otAdj: 0, note: '' };
  const emptyRow = (r) => !r.in && !r.out && !r.holiday && !Number(r.otAdj || 0) && !r.note && (r.status || 'work') === 'work';

  const setRow = (empId, patch) => {
    const id = idOf(empId);
    const base = rowOf(empId);
    const next = { ...base, ...patch };
    const rows = attendance.some((r) => r.id === id) ? attendance.map((r) => (r.id === id ? next : r)) : [...attendance, next];
    upd({ attendance: rows.filter((r) => !emptyRow(r)) });
  };
  const fillAll = () => {
    const rows = [...attendance];
    team.forEach((e) => {
      const id = idOf(e.id);
      const cur = rows.find((r) => r.id === id);
      if (cur && (cur.in || cur.out)) return;
      // Keep any status/holiday/break already recorded for the day; only fill in the missing punches.
      const row = { id, employeeId: e.id, date: day, status: 'work', holiday: false, otAdj: 0, note: '', ...(cur || {}), in: '09:00', out: '18:00', brk: Number(cur?.brk) || 60 };
      const i = rows.findIndex((r) => r.id === id);
      if (i > -1) rows[i] = row; else rows.push(row);
    });
    upd({ attendance: rows });
  };
  const clearDay = () => {
    if (!confirm(T('Clear every entry of this day?', 'مسح كل قيود هذا اليوم؟'))) return;
    upd({ attendance: attendance.filter((r) => !String(r.id).endsWith(`:${day}`)) });
  };

  const monthRows = (empId) => attendance.filter((r) => r.employeeId === empId && String(r.date || '').startsWith(month));
  const sums = team.map((e) => {
    const line = computeLine({ employee: e, month, rows: monthRows(e.id), advances: advances.filter((a) => a.employeeId === e.id).map((a) => ({ ...a, consumed: consumed[a.id] || 0 })), hr });
    return { e, line };
  });
  const todayRows = team.filter((e) => attendance.some((r) => r.id === idOf(e.id)));
  const isRest = isWeekend(day, hr.restDays);

  const exportCsv = () => {
    const rows = team.map((e) => {
      const r = rowOf(e.id);
      return [e.no, e.name, day, r.in, r.out, r.brk || 0, r.status || 'work', r.holiday ? 'yes' : '', shiftHours(r, hr).toFixed(2), e.id];
    });
    const csv = toCsv(rows, [
      { key: 0, label: 'No' }, { key: 1, label: 'Employee' }, { key: 2, label: 'Date' }, { key: 3, label: 'In' }, { key: 4, label: 'Out' },
      { key: 5, label: 'Break (min)' }, { key: 6, label: 'Status' }, { key: 7, label: 'Holiday' }, { key: 8, label: 'Hours' },
    ]);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    a.download = `attendance-${day}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  const statusOpts = DAY_STATUS.map(([k, en, ar]) => [k, lang === 'ar' ? ar : en]);

  return (
    <div className="space-y-4">
      <Panel
        title={T('Daily attendance sheet', 'سجل الدوام اليومي')}
        sub={T('Enter the punches for one day. Hours, overtime and the monthly pay preview update as you type.', 'سجّل الحضور والانصراف ليوم واحد. تُحدَّث الساعات والإضافي ومعاينة الراتب الشهري تلقائياً.')}
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" className="input !py-1.5 text-xs" value={day} onChange={(e) => setDay(e.target.value || todayStr())} />
            <button type="button" className="btn-ghost !py-1.5 !text-[11px]" onClick={fillAll}><Clock size={13} />{T('Everyone 09:00–18:00', 'الجميع 9:00–18:00')}</button>
            <button type="button" className="btn-ghost !py-1.5 !text-[11px]" onClick={exportCsv}><Download size={13} />CSV</button>
            <button type="button" className="btn-ghost !py-1.5 !text-[11px] text-red-400" onClick={clearDay}><Trash2 size={13} />{T('Clear', 'مسح')}</button>
          </div>
        )}
      >
        <div className="mb-3 flex flex-wrap items-center gap-3 text-[11px] text-subtle">
          <span className="font-semibold text-gold">{new Date(`${day}T00:00:00`).toLocaleDateString(lang === 'ar' ? 'ar-JO' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          {isRest && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-bold text-amber-500">{T('Weekend / rest day — hours count at', 'عطلة أسبوعية — الساعات تُحتسب بـ')} {hr.otHoliday}%</span>}
          <label className="ms-auto flex items-center gap-1.5"><input type="checkbox" className="h-3.5 w-3.5 accent-gold" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />{T('Show inactive', 'إظهار غير النشطين')}</label>
          <span>{todayRows.length}/{team.length} {T('entered', 'مسجّل')}</span>
        </div>

        {team.length === 0 ? (
          <EmptyState icon={Users} title={T('Add employees first', 'أضف الموظفين أولاً')} sub={T('The sheet lists everyone on the payroll.', 'يعرض السجل كل من هم على كشف الرواتب.')} />
        ) : (
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-wider text-subtle">
                  {[T('Employee', 'الموظف'), T('In', 'الحضور'), T('Out', 'الانصراف'), T('Break', 'استراحة'), T('Status', 'الحالة'), T('Holiday', 'عطلة'), T('OT +/-', 'إضافي ±'), T('Hours', 'الساعات'), T('Note', 'ملاحظة')].map((h, i) => <th key={i} className="whitespace-nowrap px-1.5 py-2 text-start font-bold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {team.map((e) => {
                  const r = rowOf(e.id);
                  const h = shiftHours(r, hr);
                  const over = Math.max(0, h - Number(hr.dayHours || 8));
                  return (
                    <tr key={e.id} className="border-t border-line/10">
                      <td className="whitespace-nowrap px-1.5 py-1.5">
                        <div className="font-semibold">{lang === 'ar' ? (e.nameAr || e.name) : (e.name || e.nameAr)}</div>
                        <div className="text-[10px] text-subtle" dir="ltr">{e.no}</div>
                      </td>
                      <td className="px-1.5"><input type="time" className="input !w-[104px] !py-1 text-xs" value={r.in || ''} onChange={(ev) => setRow(e.id, { in: ev.target.value })} /></td>
                      <td className="px-1.5"><input type="time" className="input !w-[104px] !py-1 text-xs" value={r.out || ''} onChange={(ev) => setRow(e.id, { out: ev.target.value })} /></td>
                      <td className="px-1.5"><input type="number" min="0" step="5" className="input !w-[72px] !py-1 text-xs tabular-nums" value={r.brk ?? 0} onChange={(ev) => setRow(e.id, { brk: Number(ev.target.value) || 0 })} /></td>
                      <td className="px-1.5">
                        <select className="input !w-[124px] !py-1 text-xs" value={r.status || 'work'} onChange={(ev) => setRow(e.id, { status: ev.target.value })}>
                          {statusOpts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                        </select>
                      </td>
                      <td className="px-1.5 text-center"><input type="checkbox" className="h-4 w-4 accent-gold" checked={!!r.holiday} onChange={(ev) => setRow(e.id, { holiday: ev.target.checked })} /></td>
                      <td className="px-1.5"><input type="number" step="0.5" className="input !w-[70px] !py-1 text-xs tabular-nums" value={r.otAdj ?? 0} onChange={(ev) => setRow(e.id, { otAdj: Number(ev.target.value) || 0 })} /></td>
                      <td className="whitespace-nowrap px-1.5 tabular-nums">
                        {h ? <span>{h.toFixed(2)}<span className="text-[10px] text-subtle"> {over > 0 ? `(+${over.toFixed(1)} OT)` : ''}</span></span> : <span className="text-subtle">—</span>}
                      </td>
                      <td className="px-1.5"><input className="input !w-[140px] !py-1 text-xs" value={r.note || ''} onChange={(ev) => setRow(e.id, { note: ev.target.value })} placeholder={T('optional', 'اختياري')} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        title={`${T('Month so far', 'ملخص الشهر')} — ${monthLabel(month, lang)}`}
        sub={T('Preview of what each payslip will show. Advances already deducted by an approved run are excluded.', 'معاينة لما ستظهره كل قسيمة. تُستثنى السلف المخصومة في كشوف معتمدة.')}
        action={<span className="text-[11px] text-subtle">{daysInMonth(month)} {T('days', 'يوم')}</span>}
      >
        {sums.length === 0 ? <EmptyState icon={CalendarDays} title={T('Nothing to summarise yet', 'لا يوجد ملخص بعد')} /> : (
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-wider text-subtle">
                  {[T('Employee', 'الموظف'), T('Days', 'أيام'), T('Hours', 'ساعات'), T('OT', 'إضافي'), T('Holiday h', 'ساعات عطلة'), T('Unpaid', 'بدون أجر'), T('Gross', 'الإجمالي'), T('Deductions', 'الاستقطاعات'), T('Net', 'الصافي')].map((h, i) => <th key={i} className="whitespace-nowrap px-2 py-2 text-start font-bold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {sums.map(({ e, line }) => (
                  <tr key={e.id} className="border-t border-line/10">
                    <td className="px-2 py-1.5 font-semibold">{lang === 'ar' ? (e.nameAr || e.name) : (e.name || e.nameAr)}</td>
                    <td className="px-2 tabular-nums">{line.stats.worked}</td>
                    <td className="px-2 tabular-nums">{line.stats.regular.toFixed(2)}</td>
                    <td className="px-2 tabular-nums">{line.stats.ot.toFixed(2)}</td>
                    <td className="px-2 tabular-nums">{line.stats.holidayHours.toFixed(2)}</td>
                    <td className="px-2 tabular-nums">{line.stats.unpaidDays}</td>
                    <td className="px-2 tabular-nums">{moneyOf(line.gross)}</td>
                    <td className="px-2 tabular-nums text-red-400">{moneyOf(line.deductions)}</td>
                    <td className="px-2 tabular-nums font-bold text-gold">{moneyOf(line.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-subtle">
          <Info size={13} className="mt-0.5 shrink-0" />
          {T('Monthly staff are paid the full basic salary and unpaid days come off; hourly staff are paid for the hours actually worked. Overtime is 125% and holiday work 150% (Art. 59) — the percentages are editable in Rules.', 'يُدفع للموظف الشهري كامل الراتب الأساسي وتُخصم الأيام بدون أجر، ويُدفع لموظف الساعة عن الساعات الفعلية. العمل الإضافي 125% والعمل في العطلة 150% (المادة 59) والنسب قابلة للتعديل في الإعدادات.')}
        </p>
      </Panel>
    </div>
  );
}

/* ================= advances ================= */
function Advances() {
  const { T, lang, employees = [], advances = [], payrolls = [], upd } = useApp();
  const consumed = useMemo(() => advanceConsumption(payrolls), [payrolls]);
  const [f, setF] = useState({ employeeId: '', date: todayStr(), amount: 0, reason: '', method: 'cash' });
  const name = (id) => { const e = employees.find((x) => x.id === id) || {}; return lang === 'ar' ? (e.nameAr || e.name) : (e.name || e.nameAr) || '—'; };

  const add = (ev) => {
    ev.preventDefault();
    if (!f.employeeId || !Number(f.amount)) return alert(T('Pick the employee and the amount.', 'اختر الموظف وأدخل المبلغ.'));
    upd({ advances: [{ ...f, id: uid('adv'), amount: Number(f.amount) }, ...advances] });
    setF({ employeeId: '', date: todayStr(), amount: 0, reason: '', method: 'cash' });
  };
  const remove = (a) => {
    const used = Number(consumed[a.id] || 0);
    if (used > 0) return alert(T('This advance was already deducted in a payroll run — unlock that run first.', 'تم خصم هذه السلفة في كشف رواتب — أعد فتح ذلك الكشف أولاً.'));
    if (!confirm(T('Delete this advance?', 'حذف هذه السلفة؟'))) return;
    upd({ advances: advances.filter((x) => x.id !== a.id) });
  };

  const open = advances.reduce((s, a) => s + Math.max(0, Number(a.amount || 0) - Number(consumed[a.id] || 0)), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Tip icon={HandCoins} label={T('Open balance', 'الرصيد المتبقي')} value={moneyOf(open)} hint={T('Still to be deducted from salaries', 'ما زال يُخصم من الرواتب')} />
        <Tip icon={HandCoins} label={T('Advances issued', 'إجمالي السلف')} value={moneyOf(advances.reduce((s, a) => s + Number(a.amount || 0), 0))} tone="text-terra" />
        <Tip icon={HandCoins} label={T('Already deducted', 'المخصوم')} value={moneyOf(advances.reduce((s, a) => s + Number(consumed[a.id] || 0), 0))} tone="text-emerald-500" />
      </div>

      <Panel title={T('New advance', 'سلفة جديدة')} sub={T('A payment on account. It is deducted automatically from the next payroll run, oldest first.', 'دفعة على الحساب، تُخصم تلقائياً في أول كشف رواتب لاحق، الأقدم أولاً.')}>
        <form onSubmit={add} className="grid items-end gap-2 sm:grid-cols-5">
          <div className="sm:col-span-2">
            <label className="label">{T('Employee', 'الموظف')}</label>
            <select className="input" value={f.employeeId} onChange={(e) => setF({ ...f, employeeId: e.target.value })}>
              <option value="">{T('— choose —', '— اختر —')}</option>
              {employees.filter((e) => e.active !== false).map((e) => <option key={e.id} value={e.id}>{e.no} · {lang === 'ar' ? (e.nameAr || e.name) : (e.name || e.nameAr)}</option>)}
            </select>
          </div>
          <div><label className="label">{T('Date', 'التاريخ')}</label><input type="date" className="input" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
          <div><label className="label">{T('Amount', 'المبلغ')}</label><Num v={f.amount} onCommit={(v) => setF({ ...f, amount: v })} /></div>
          <div><label className="label">{T('Reason', 'السبب')}</label><input className="input" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></div>
          <button type="submit" className="btn-gold sm:col-span-5 sm:w-max"><Plus size={15} />{T('Record advance', 'تسجيل السلفة')}</button>
        </form>
      </Panel>

      <Panel title={T('Advance register', 'سجل السلف')} sub={T('“Deducted” is taken from payroll runs that were approved or paid.', '«المخصوم» يُحتسب من كشوف الرواتب المعتمدة أو المدفوعة فقط.')}>
        {advances.length === 0 ? <EmptyState icon={HandCoins} title={T('No advances', 'لا سلف')} sub={T('Recorded advances appear here and are deducted from salary runs automatically.', 'تظهر السلف هنا وتُخصم من كشوف الرواتب تلقائياً.')} /> : (
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-wider text-subtle">
                  {[T('Date', 'التاريخ'), T('Employee', 'الموظف'), T('Amount', 'المبلغ'), T('Deducted', 'المخصوم'), T('Remaining', 'المتبقي'), T('Reason', 'السبب'), ''].map((h, i) => <th key={i} className="whitespace-nowrap px-2 py-2 text-start font-bold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {[...advances].sort((a, b) => String(b.date).localeCompare(String(a.date))).map((a) => {
                  const used = Number(consumed[a.id] || 0);
                  const left = Math.max(0, Number(a.amount || 0) - used);
                  return (
                    <tr key={a.id} className="border-t border-line/10">
                      <td className="whitespace-nowrap px-2 py-1.5 tabular-nums" dir="ltr">{a.date}</td>
                      <td className="px-2 py-1.5 font-semibold">{name(a.employeeId)}</td>
                      <td className="px-2 tabular-nums">{moneyOf(a.amount)}</td>
                      <td className="px-2 tabular-nums text-emerald-500">{used ? moneyOf(used) : '—'}</td>
                      <td className={`px-2 tabular-nums font-bold ${left > 0 ? 'text-terra' : 'text-subtle'}`}>{left ? moneyOf(left) : T('settled', 'مسددة')}</td>
                      <td className="px-2 text-subtle">{a.reason || '—'}</td>
                      <td className="px-2 text-end"><button type="button" className="icon-btn text-red-400" onClick={() => remove(a)} aria-label={T('Delete', 'حذف')}><Trash2 size={14} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ================= rules ================= */
function Rules() {
  const { T, lang, hr = DEFAULT_HR, upd } = useApp();
  const set = (p) => upd({ hr: { ...hr, ...p } });
  const setInc = (k, v) => set({ ssIncludes: { ...hr.ssIncludes, [k]: v } });
  const setBracket = (i, p) => set({ taxBrackets: hr.taxBrackets.map((b, k) => (k === i ? { ...b, ...p } : b)) });
  const DAYS = lang === 'ar' ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-4">
      <Panel
        title={T('Social security & overtime', 'الضمان الاجتماعي والعمل الإضافي')}
        sub={T('Shares applied to the subject wage, and the multipliers of Art. 59. Confirm the current rates and ceiling with your accountant — they change by law.', 'الحصص المطبقة على الأجر الخاضع للضمان، ومعاملات المادة 59. تأكد من النسب والسقف النافذ مع محاسبك — تتغير بقرار قانوني.')}
        action={<button type="button" className="btn-ghost !py-1.5 !text-[11px]" onClick={() => { if (confirm(T('Restore the default rules and wording?', 'استعادة الإعدادات والصياغة الافتراضية؟'))) upd({ hr: DEFAULT_HR }); }}>{T('Restore defaults', 'استعادة الافتراضي')}</button>}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className="label">{T('Employee share %', 'حصة العامل %')}</label><Num v={hr.ssEmployee} onCommit={(v) => set({ ssEmployee: v })} /></div>
          <div><label className="label">{T('Employer share %', 'حصة المنشأة %')}</label><Num v={hr.ssEmployer} onCommit={(v) => set({ ssEmployer: v })} /></div>
          <div><label className="label">{T('Monthly wage ceiling (0 = none)', 'سقف الأجر الشهري (0 = بدون)')}</label><Num v={hr.ssCeiling} onCommit={(v) => set({ ssCeiling: v })} /></div>
          <div><label className="label">{T('Hours per day', 'ساعات العمل اليومية')}</label><Num v={hr.dayHours} onCommit={(v) => set({ dayHours: v })} /></div>
          <div><label className="label">{T('Days per month (divisor)', 'أيام الشهر (القاسم)')}</label><Num v={hr.dayDivisor} onCommit={(v) => set({ dayDivisor: v })} /></div>
          <div><label className="label">{T('Hours per month (0 = auto)', 'ساعات الشهر (0 = تلقائي)')}</label><Num v={hr.hoursDivisor} onCommit={(v) => set({ hoursDivisor: v })} /></div>
          <div><label className="label">{T('Overtime %', 'العمل الإضافي %')}</label><Num v={hr.otNormal} onCommit={(v) => set({ otNormal: v })} /></div>
          <div><label className="label">{T('Holiday / rest day %', 'العطلة والراحة %')}</label><Num v={hr.otHoliday} onCommit={(v) => set({ otHoliday: v })} /></div>
          <div><label className="label">{T('Warn if advances exceed % of gross', 'تنبيه إذا تجاوزت السلف % من الإجمالي')}</label><Num v={hr.advanceWarnPct} onCommit={(v) => set({ advanceWarnPct: v })} /></div>
        </div>

        <div className="mt-4 rounded-xl border border-line/10 p-3">
          <div className="mb-2 text-[12px] font-bold">{T('What the subject wage includes', 'ما يدخل في الأجر الخاضع للضمان')}</div>
          <div className="flex flex-wrap gap-2">
            {[['base', T('Basic', 'الأساسي')], ['allowances', T('Allowances', 'البدلات')], ['overtime', T('Overtime', 'الإضافي')], ['commission', T('Commission', 'العمولة')], ['bonus', T('Bonus', 'المكافأة')]].map(([k, l]) => (
              <label key={k} className="flex items-center gap-1.5 rounded-lg border border-line/10 px-3 py-1.5 text-[11.5px]">
                <input type="checkbox" className="h-3.5 w-3.5 accent-gold" checked={!!hr.ssIncludes?.[k]} onChange={(e) => setInc(k, e.target.checked)} />
                {l}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-line/10 p-3">
          <div className="mb-2 text-[12px] font-bold">{T('Weekend days (rest days)', 'أيام الراحة الأسبوعية')}</div>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d, i) => {
              const on = (hr.restDays || []).includes(i);
              return (
                <button key={i} type="button" onClick={() => set({ restDays: on ? hr.restDays.filter((x) => x !== i) : [...hr.restDays, i] })}
                  className={`btn !py-1.5 !text-[11px] ${on ? 'bg-gold text-ink' : 'btn-ghost'}`}>{d}</button>
              );
            })}
          </div>
        </div>
      </Panel>

      <Panel title={T('Income tax', 'ضريبة الدخل')} sub={T('Annual brackets, accrued monthly. The employee’s social security share is deducted from the taxable income first.', 'شرائح سنوية تُستحق شهرياً، وتُخصم حصة الموظف في الضمان من الدخل الخاضع للضريبة أولاً.')}>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" className="h-4 w-4 accent-gold" checked={hr.taxOn !== false} onChange={(e) => set({ taxOn: e.target.checked })} />{T('Withhold income tax on payslips', 'استقطاع ضريبة الدخل في القسائم')}</label>
          </div>
          <div><label className="label">{T('Annual exemption (individual)', 'الإعفاء السنوي (فرد)')}</label><Num v={hr.taxExempt} onCommit={(v) => set({ taxExempt: v })} /></div>
          <div><label className="label">{T('Extra annual exemption (family)', 'إعفاء إضافي (عائلة)')}</label><Num v={hr.taxFamily} onCommit={(v) => set({ taxFamily: v })} /></div>
        </div>
        <div className="mt-3 space-y-2">
          {(hr.taxBrackets || []).map((b, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="w-40"><label className="label">{T('Up to (0 = ∞)', 'حتى (0 = بلا حد)')}</label><Num v={b.upTo} onCommit={(v) => setBracket(i, { upTo: v })} /></div>
              <div className="w-28"><label className="label">{T('Rate %', 'النسبة %')}</label><Num v={b.rate} onCommit={(v) => setBracket(i, { rate: v })} /></div>
            </div>
          ))}
          <button type="button" className="btn-ghost !py-1 !text-[11px]" onClick={() => set({ taxBrackets: [...hr.taxBrackets, { upTo: 0, rate: 0 }] })}><Plus size={13} />{T('Add bracket', 'إضافة شريحة')}</button>
        </div>
      </Panel>

      <Panel title={T('Wording on the payslip', 'صياغة القسيمة')} sub={T('Printed on every slip: the legal basis and the acknowledgement the employee signs.', 'تُطبع على كل قسيمة: الأساس القانوني والإقرار الذي يوقعه الموظف.')}>
        {[['disclaimer', T('Acknowledgement & declaration', 'الإقرار والتعهد')], ['legalNote', T('Legal basis note', 'ملاحظة الأساس القانوني')]].map(([k, l]) => (
          <div key={k} className="mb-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">{l} — English</label>
              <textarea className="input" rows={k === 'disclaimer' ? 7 : 4} dir="ltr" value={hr[k]?.en || ''} onChange={(e) => set({ [k]: { ...hr[k], en: e.target.value } })} />
            </div>
            <div>
              <label className="label">{l} — العربية</label>
              <textarea className="input" rows={k === 'disclaimer' ? 7 : 4} dir="rtl" value={hr[k]?.ar || ''} onChange={(e) => set({ [k]: { ...hr[k], ar: e.target.value } })} />
            </div>
          </div>
        ))}
      </Panel>
      <Panel title={T('Bottom disclaimers (PDFs)', 'إخلاء المسؤولية أسفل المستندات')} sub={T('Free text printed at the bottom of each PDF. Write it in English and Arabic; leave empty to print nothing.', 'نص حر يُطبع أسفل كل مستند. اكتبه بالإنجليزية والعربية، واتركه فارغاً إن لم ترغب بطباعته.')}>
        {[['timesheetFooter', T('Timesheet disclaimer', 'إخلاء مسؤولية سجل الدوام')], ['slipFooter', T('Salary slip disclaimer', 'إخلاء مسؤولية قسيمة الراتب')]].map(([k, l]) => (
          <div key={k} className="mb-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">{l} — English</label>
              <textarea className="input" rows={3} dir="ltr" value={hr[k]?.en || ''} onChange={(e) => set({ [k]: { ...hr[k], en: e.target.value } })} />
            </div>
            <div>
              <label className="label">{l} — العربية</label>
              <textarea className="input" rows={3} dir="rtl" value={hr[k]?.ar || ''} onChange={(e) => set({ [k]: { ...hr[k], ar: e.target.value } })} />
            </div>
          </div>
        ))}
      </Panel>
    </div>
  );
}

export default function HR() {
  const { lang } = useApp();
  const [tab, setTab] = useState('people');
  return (
    <div className="space-y-4">
      <div className="seg flex-wrap">
        {TABS.map(([k, Icon, en, ar]) => (
          <button key={k} type="button" data-active={tab === k} className="seg-tab" onClick={() => setTab(k)}>
            <Icon size={14} className="me-1.5 inline align-[-2px]" />{lang === 'ar' ? ar : en}
          </button>
        ))}
      </div>
      {tab === 'people' && <People />}
      {tab === 'sheet' && <Sheet />}
      {tab === 'advances' && <Advances />}
      {tab === 'timesheet' && <TimesheetTab />}
      {tab === 'rules' && <Rules />}
    </div>
  );
}
