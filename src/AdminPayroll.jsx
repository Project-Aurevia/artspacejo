import React, { useEffect, useMemo, useState } from 'react';
import {
  Users, Wallet, HandCoins, Check, Lock, Unlock, Trash2, Download, Printer, Pencil, AlertTriangle, Info,
  FileText, Calculator, RotateCcw,
} from 'lucide-react';
import { useApp } from './store.jsx';
import { Modal, EmptyState } from './ui.jsx';
import {
  DEFAULT_HR, EMPTY_EMPLOYEE, RUN_STATUS, computeLine, runTotals, advanceConsumption,
  monthOf, monthLabel, monthEnd, daysInMonth, todayStr,
} from './payroll.js';
import { toCsv } from './accounting.js';
import { renderPdf } from './Documents.jsx';
import Payslip from './Payslip.jsx';

/*
 * Monthly payroll: turn the daily sheet + advances + commissions into one frozen line per employee,
 * then hand out a signed payslip. A run is single per month (id `PR-YYYY-MM`), starts as a draft,
 * is approved (lines frozen so later edits cannot alter a paid month) and finally marked paid.
 * Only approved/paid runs consume advances — see `advanceConsumption`.
 */

const moneyOf = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const DEFAULT_INPUTS = { sales: 0, commissionPct: 0, commission: '', bonus: 0, otherAdd: 0, otherDed: 0, note: '', method: 'bank' };
const PAY_METHODS = [['bank', 'Bank transfer', 'حوالة بنكية'], ['cash', 'Cash', 'نقداً'], ['cheque', 'Cheque', 'شيك']];
const methodLabel = (k, lang) => (PAY_METHODS.find((m) => m[0] === k) || PAY_METHODS[0])[lang === 'ar' ? 2 : 1];

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
  useEffect(() => { setText(v === 0 || v ? String(v) : ''); }, [v]);
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

/** Same, but an empty field is a real value: '' means "calculate it automatically". */
function OptNum({ v = '', onCommit, className = '' }) {
  const [text, setText] = useState(v === '' || v == null ? '' : String(v));
  useEffect(() => { setText(v === '' || v == null ? '' : String(v)); }, [v]);
  const commit = () => {
    const s = text.trim();
    onCommit(s === '' ? '' : (Number.isFinite(parseFloat(s)) ? parseFloat(s) : 0));
  };
  return (
    <input
      className={`input tabular-nums ${className}`} inputMode="decimal" value={text} placeholder="auto"
      onChange={(e) => setText(e.target.value)} onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); e.currentTarget.blur(); } }}
    />
  );
}

function saveCsv(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([`\uFEFF${text}`], { type: 'text/csv;charset=utf-8' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/* ================= one line: the extra pay inputs ================= */
function LineEditor({ line, preview, T, lang, onClose, onSave }) {
  const [f, setF] = useState({ ...DEFAULT_INPUTS, ...(line.inputs || {}) });
  const set = (p) => setF((o) => ({ ...o, ...p }));
  const setK = (k) => (n) => set({ [k]: n });
  const v = preview(f);
  const Row = ({ l, val, strong, neg }) => (
    <div className={`flex items-center justify-between gap-3 ${strong ? 'border-t border-line/15 pt-1.5 font-bold' : ''}`}>
      <span className={strong ? '' : 'text-subtle'}>{l}</span>
      <span className={`tabular-nums ${neg ? 'text-red-400' : ''}`}>{val}</span>
    </div>
  );

  return (
    <Modal title={`${T('Extra pay', 'مدفوعات إضافية')} — ${line.name || line.nameAr || ''}`} onClose={onClose} wide>
      <form onSubmit={(e) => { e.preventDefault(); onSave(f); }} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className="label">{T('Sales / invoices (JOD)', 'المبيعات / الفواتير (د.أ)')}</label><Num v={f.sales} onCommit={setK('sales')} /></div>
          <div><label className="label">{T('Commission %', 'نسبة العمولة %')}</label><Num v={f.commissionPct} onCommit={setK('commissionPct')} /></div>
          <div><label className="label">{T('Commission (empty = from %)', 'العمولة (فارغ = من النسبة)')}</label><OptNum v={f.commission} onCommit={setK('commission')} /></div>
          <div><label className="label">{T('Bonus', 'مكافأة')}</label><Num v={f.bonus} onCommit={setK('bonus')} /></div>
          <div><label className="label">{T('Other additions', 'إضافات أخرى')}</label><Num v={f.otherAdd} onCommit={setK('otherAdd')} /></div>
          <div><label className="label">{T('Other deductions', 'استقطاعات أخرى')}</label><Num v={f.otherDed} onCommit={setK('otherDed')} /></div>
          <div>
            <label className="label">{T('Payment method', 'طريقة الدفع')}</label>
            <select className="input" value={f.method} onChange={(e) => set({ method: e.target.value })}>
              {PAY_METHODS.map(([k, en, ar]) => <option key={k} value={k}>{lang === 'ar' ? ar : en}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2"><label className="label">{T('Note printed on the payslip', 'ملاحظة تُطبع على القسيمة')}</label><input className="input" value={f.note || ''} onChange={(e) => set({ note: e.target.value })} /></div>
        </div>

        <div className="grid gap-2 rounded-xl border border-line/10 p-3 text-[12px] sm:grid-cols-3">
          <Row l={T('Gross', 'الإجمالي')} val={moneyOf(v.gross)} />
          <Row l={T('Deductions', 'الاستقطاعات')} val={moneyOf(v.deductions)} neg />
          <Row l={T('Net', 'الصافي')} val={moneyOf(v.net)} strong />
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>{T('Cancel', 'إلغاء')}</button>
          <button type="submit" className="btn-gold"><Check size={15} />{T('Save', 'حفظ')}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ================= the screen ================= */
export default function Payroll() {
  const { T, lang, employees = [], attendance = [], advances = [], payrolls = [], hr = DEFAULT_HR, upd } = useApp();
  const [month, setMonth] = useState(monthOf());
  const [editId, setEditId] = useState('');
  const [slipId, setSlipId] = useState('');
  const [dl, setDl] = useState(lang === 'ar' ? 'ar' : 'en');

  const run = payrolls.find((r) => r.month === month) || null;

  // Advances already deducted by *other* committed runs — this run must not count its own lines twice.
  const others = useMemo(() => payrolls.filter((r) => r.id !== run?.id), [payrolls, run?.id]);
  const consumedBy = useMemo(() => advanceConsumption(others), [others]);

  const computeFor = (line, inputs = line.inputs || {}, m = month) => {
    const e = employees.find((x) => x.id === line.employeeId) || { ...EMPTY_EMPLOYEE, ...line, id: line.employeeId, base: 0 };
    const rows = attendance.filter((r) => r.employeeId === line.employeeId && String(r.date || '').startsWith(m));
    const adv = advances
      .filter((a) => a.employeeId === line.employeeId)
      .map((a) => ({ ...a, consumed: consumedBy[a.id] || 0 }));
    const c = computeLine({ employee: e, month: m, rows, advances: adv, hr, inputs });
    return { ...c, ack: line.ack || { signed: false }, method: inputs.method || 'bank' };
  };
  // Frozen lines are history: show exactly what was approved, not what today's sheet says.
  const view = (line, m = month) => {
    const base = line.frozen ? line : computeFor(line, line.inputs || {}, m);
    return { ...base, ack: base.ack || line.ack || { signed: false }, method: base.method || line.inputs?.method || 'bank' };
  };

  const items = (run?.lines || []).map((raw) => ({ raw, l: view(raw) }));
  const totals = runTotals(items.map((i) => i.l));
  const unsigned = items.filter((i) => !i.l.ack?.signed).length;
  const warned = items.filter((i) => i.l.warn).length;

  const period = `${month}-01`;
  const team = employees.filter((e) => e.active !== false
    && (!e.startDate || e.startDate <= monthEnd(month))
    && (!e.endDate || e.endDate >= period));

  const newLine = (e) => ({
    employeeId: e.id, no: e.no, name: e.name, nameAr: e.nameAr, title: e.title, payType: e.payType,
    inputs: { ...DEFAULT_INPUTS, commissionPct: Number(e.commissionPct) || 0 },
    ack: { signed: false },
  });

  const saveRuns = (next) => upd({ payrolls: next });
  const replaceRun = (patch) => saveRuns(payrolls.map((r) => (r.id === run.id ? { ...r, ...patch } : r)));

  const makeRun = () => {
    if (!team.length) return alert(T('Add employees in HR → Employees first.', 'أضف الموظفين من شؤون الموظفين → الموظفون أولاً.'));
    saveRuns([{
      id: `PR-${month}`, no: `PR-${month}`, month, status: 'draft', createdAt: todayStr(), lines: team.map(newLine),
    }, ...payrolls]);
  };

  const refreshTeam = () => {
    const ids = new Set(run.lines.map((l) => l.employeeId));
    const add = team.filter((e) => !ids.has(e.id)).map(newLine);
    const keep = run.lines.filter((l) => team.some((e) => e.id === l.employeeId));
    if (!add.length && keep.length === run.lines.length) return alert(T('The run already matches the team.', 'الكشف مطابق للفريق بالفعل.'));
    replaceRun({ lines: [...keep, ...add] });
  };

  const approve = () => {
    const msg = [
      T('Approve and lock this run?', 'اعتماد وإقفال هذا الكشف؟'),
      '',
      `${T('Employees', 'الموظفون')}: ${items.length}`,
      `${T('Gross', 'الإجمالي')}: ${moneyOf(totals.gross)}`,
      `${T('Net', 'الصافي')}: ${moneyOf(totals.net)}`,
      `${T('Advances recovered', 'السلف المخصومة')}: ${moneyOf(totals.advanceTotal)}`,
      warned ? `\n⚠ ${T('Advances exceed the warning limit on', 'السلف تتجاوز حد التنبيه لـ')} ${warned} ${T('line(s).', 'سطر.')}` : '',
      `\n${T('Locked lines no longer follow edits to the attendance sheet.', 'السطور المقفلة لا تتغير بعد ذلك بتعديل سجل الدوام.')}`,
    ].join('\n');
    if (!confirm(msg)) return;
    replaceRun({ status: 'approved', approvedAt: todayStr(), lines: run.lines.map((l) => ({ ...l, ...view(l), frozen: true })) });
  };

  const markPaid = () => {
    if (unsigned && !confirm(`${unsigned} ${T('payslip(s) are not signed yet. Mark the run paid anyway?', 'قسيمة غير موقعة. هل تريد اعتماد الكشف كمدفوع رغم ذلك؟')}`)) return;
    replaceRun({ status: 'paid', paidAt: todayStr(), lines: run.lines.map((l) => ({ ...l, ...view(l), frozen: true })) });
  };

  const unlock = () => {
    const msg = run.status === 'paid'
      ? T('Unlock a paid run? The advances it recovered go back to the open balance.', 'إعادة فتح كشف مدفوع؟ السلف التي خصمها تعود إلى الرصيد المتبقي.')
      : T('Unlock this run and let it follow the attendance sheet again?', 'إعادة فتح الكشف ليتبع سجل الدوام من جديد؟');
    if (!confirm(msg)) return;
    const strip = (l) => ({ employeeId: l.employeeId, no: l.no, name: l.name, nameAr: l.nameAr, title: l.title, payType: l.payType, inputs: l.inputs || {}, ack: l.ack || { signed: false } });
    replaceRun({ status: 'draft', approvedAt: '', paidAt: '', lines: run.lines.map(strip) });
  };

  const removeRun = () => {
    const msg = run.status === 'draft'
      ? T('Delete this draft run?', 'حذف هذا الكشف؟')
      : T('Delete a locked run? Any advances it recovered become outstanding again — the payslips it produced will no longer be reproducible.', 'حذف كشف مقفل؟ السلف التي خصمها تصبح مستحقة مجدداً، ولن يمكن إعادة إصدار قسائمه كما كانت.');
    if (!confirm(msg)) return;
    saveRuns(payrolls.filter((r) => r.id !== run.id));
  };

  const saveInputs = (employeeId, inputs) => replaceRun({
    lines: run.lines.map((l) => (l.employeeId === employeeId ? { ...l, inputs, frozen: false } : l)),
  });

  const setAck = (employeeId, ack) => replaceRun({
    lines: run.lines.map((l) => (l.employeeId === employeeId ? { ...l, ack } : l)),
  });

  const exportCsv = () => {
    const rows = items.map(({ l }) => ({
      no: l.no, name: l.name, month: l.month, basis: l.payType,
      days: l.stats?.worked, hours: l.stats?.regular, ot: l.stats?.ot, holiday: l.stats?.holidayHours, unpaid: l.stats?.unpaidDays,
      base: l.base, allowances: l.allowancesTotal, otAmount: l.otAmount, holidayAmount: l.holidayAmount,
      commission: l.commission, bonus: l.bonus, otherAdd: l.otherAdd, gross: l.gross,
      ssBase: l.ssBase, ssEmployee: l.ssEmployee, tax: l.tax, advances: l.advanceTotal, otherDed: l.otherDed,
      deductions: l.deductions, net: l.net, ssEmployer: l.ssEmployer, employerCost: l.employerCost,
      signed: l.ack?.signed ? 'yes' : 'no',
    }));
    saveCsv(`payroll-${month}.csv`, toCsv(rows, [
      { key: 'no', label: 'No' }, { key: 'name', label: 'Employee' }, { key: 'month', label: 'Month' }, { key: 'basis', label: 'Pay basis' },
      { key: 'days', label: 'Days worked' }, { key: 'hours', label: 'Regular hours' }, { key: 'ot', label: 'OT hours' },
      { key: 'holiday', label: 'Holiday hours' }, { key: 'unpaid', label: 'Unpaid days' },
      { key: 'base', label: 'Basic' }, { key: 'allowances', label: 'Allowances' }, { key: 'otAmount', label: 'Overtime' },
      { key: 'holidayAmount', label: 'Holiday pay' }, { key: 'commission', label: 'Commission' }, { key: 'bonus', label: 'Bonus' },
      { key: 'otherAdd', label: 'Other additions' }, { key: 'gross', label: 'Gross' },
      { key: 'ssBase', label: 'SS subject wage' }, { key: 'ssEmployee', label: 'SS employee' }, { key: 'tax', label: 'Income tax' },
      { key: 'advances', label: 'Advances' }, { key: 'otherDed', label: 'Other deductions' }, { key: 'deductions', label: 'Total deductions' },
      { key: 'net', label: 'Net' }, { key: 'ssEmployer', label: 'SS employer' }, { key: 'employerCost', label: 'Employer cost' },
      { key: 'signed', label: 'Signed' },
    ]));
  };

  const editing = run?.lines.find((l) => l.employeeId === editId);
  const slipRaw = run?.lines.find((l) => l.employeeId === slipId);
  const slip = slipRaw ? view(slipRaw) : null;
  const slipEmp = slip ? (employees.find((e) => e.id === slip.employeeId) || { ...EMPTY_EMPLOYEE, ...slip }) : null;

  const statusBadge = (st) => {
    const [en, ar, cls] = RUN_STATUS[st] || RUN_STATUS.draft;
    return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cls}`}>{lang === 'ar' ? ar : en}</span>;
  };
  const signedBadge = (l) => (l.ack?.signed
    ? <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-500">{T('Signed', 'موقّع')}</span>
    : <span className="rounded-full bg-line/10 px-2 py-0.5 text-[10px] font-bold text-subtle">{T('Not signed', 'غير موقّع')}</span>);

  const runStat = (r) => runTotals(r.lines.map((l) => view(l, r.month)));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tip icon={Users} label={T('Employees in the run', 'موظفو الكشف')} value={items.length} hint={monthLabel(month, lang)} />
        <Tip icon={Wallet} label={T('Gross earnings', 'مجموع الاستحقاقات')} value={moneyOf(totals.gross)} hint={`${totals.otHours} ${T('OT hours', 'ساعة إضافي')}`} />
        <Tip icon={HandCoins} label={T('Deductions', 'الاستقطاعات')} value={moneyOf(totals.deductions)} tone="text-red-400" hint={`${T('of which advances', 'منها سلف')} ${moneyOf(totals.advanceTotal)}`} />
        <Tip icon={Calculator} label={T('Net to pay', 'الصافي للدفع')} value={moneyOf(totals.net)} tone="text-emerald-500" hint={`${T('cost to company', 'الكلفة على الشركة')} ${moneyOf(totals.employerCost)}`} />
      </div>

      <Panel
        title={`${T('Monthly run', 'كشف الرواتب')} — ${monthLabel(month, lang)}`}
        sub={T('One run per month. Approving freezes every line so a payslip can never change afterwards.', 'كشف واحد لكل شهر. الاعتماد يقفل كل سطر حتى لا تتغير أي قسيمة بعد ذلك.')}
        action={<input type="month" className="input !py-1.5 text-xs" value={month} onChange={(e) => setMonth(e.target.value || monthOf())} />}
      >
        {!run ? (
          <EmptyState
            icon={Calculator}
            title={T('No run for this month yet', 'لا يوجد كشف لهذا الشهر بعد')}
            sub={`${T('It will include', 'سيضم')} ${team.length} ${T('employee(s)', 'موظف')} — ${T('attendance, overtime, advances and commissions are taken from what you already entered.', 'الدوام والإضافي والسلف والعمولات تؤخذ من البيانات المسجلة.')}`}
            action={<button type="button" className="btn-gold" onClick={makeRun}><Calculator size={15} />{T('Create the run', 'إنشاء الكشف')}</button>}
          />
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {statusBadge(run.status)}
              <span className="text-[11px] text-subtle">{T('Period', 'الفترة')} 1 – {daysInMonth(month)} {T('days', 'يوم')}</span>
              <span className="text-[11px] text-subtle">· {unsigned}/{items.length} {T('unsigned', 'غير موقعة')}</span>
              {warned > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-500">
                  <AlertTriangle size={11} />{warned} {T('advance warning', 'تنبيه سلف')}
                </span>
              )}
              <div className="ms-auto flex flex-wrap items-center gap-2">
                {run.status === 'draft' && (
                  <>
                    <button type="button" className="btn-ghost !py-1.5 !text-[11px]" onClick={refreshTeam}><RotateCcw size={13} />{T('Refresh team', 'تحديث الفريق')}</button>
                    <button type="button" className="btn-gold !py-1.5 !text-[11px]" onClick={approve}><Lock size={13} />{T('Approve & lock', 'اعتماد وإقفال')}</button>
                  </>
                )}
                {run.status === 'approved' && (
                  <>
                    <button type="button" className="btn-ghost !py-1.5 !text-[11px]" onClick={unlock}><Unlock size={13} />{T('Unlock', 'إعادة فتح')}</button>
                    <button type="button" className="btn-gold !py-1.5 !text-[11px]" onClick={markPaid}><Check size={13} />{T('Mark as paid', 'تسجيل كمدفوع')}</button>
                  </>
                )}
                {run.status === 'paid' && (
                  <button type="button" className="btn-ghost !py-1.5 !text-[11px]" onClick={unlock}><Unlock size={13} />{T('Unlock', 'إعادة فتح')}</button>
                )}
                <button type="button" className="btn-ghost !py-1.5 !text-[11px]" onClick={exportCsv}><Download size={13} />CSV</button>
                <button type="button" className="btn-ghost !py-1.5 !text-[11px] text-red-400" onClick={removeRun}><Trash2 size={13} />{T('Delete', 'حذف')}</button>
              </div>
            </div>

            <div className="-mx-1 overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="text-[10.5px] uppercase tracking-wider text-subtle">
                    {[T('Employee', 'الموظف'), T('Days', 'أيام'), T('Hours', 'ساعات'), T('OT', 'إضافي'), T('Basic', 'الأساسي'),
                      T('Comm.', 'العمولة'), T('Gross', 'الإجمالي'), T('SS', 'الضمان'), T('Tax', 'الضريبة'), T('Adv.', 'السلف'),
                      T('Net', 'الصافي'), T('Ack.', 'الإقرار'), ''].map((h, i) => (
                        <th key={i} className="whitespace-nowrap px-2 py-2 text-start font-bold">{h}</th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(({ raw, l }) => (
                    <tr key={raw.employeeId} className={`border-t border-line/10 ${l.warn ? 'bg-amber-500/[0.06]' : ''}`}>
                      <td className="whitespace-nowrap px-2 py-1.5">
                        <div className="flex items-center gap-1.5 font-semibold">
                          {lang === 'ar' ? (l.nameAr || l.name) : (l.name || l.nameAr)}
                          {l.warn && <AlertTriangle size={12} className="shrink-0 text-amber-500" />}
                        </div>
                        <div className="text-[10px] text-subtle" dir="ltr">{l.no} · {methodLabel(l.method, lang)}</div>
                      </td>
                      <td className="px-2 tabular-nums">{l.stats?.worked ?? 0}{Number(l.stats?.unpaidDays) ? <span className="text-[10px] text-red-400"> −{l.stats.unpaidDays}</span> : ''}</td>
                      <td className="px-2 tabular-nums">{Number(l.stats?.regular || 0).toFixed(1)}</td>
                      <td className="px-2 tabular-nums">{Number(l.stats?.ot || 0).toFixed(1)}</td>
                      <td className="px-2 tabular-nums">{moneyOf(l.base)}</td>
                      <td className="px-2 tabular-nums">{l.commission ? moneyOf(l.commission) : '—'}</td>
                      <td className="px-2 tabular-nums">{moneyOf(l.gross)}</td>
                      <td className="px-2 tabular-nums text-red-400">{moneyOf(l.ssEmployee)}</td>
                      <td className="px-2 tabular-nums text-red-400">{l.tax ? moneyOf(l.tax) : '—'}</td>
                      <td className="px-2 tabular-nums text-red-400">{l.advanceTotal ? moneyOf(l.advanceTotal) : '—'}</td>
                      <td className="px-2 tabular-nums font-bold text-gold">{moneyOf(l.net)}</td>
                      <td className="px-2">{signedBadge(l)}</td>
                      <td className="whitespace-nowrap px-2 text-end">
                        {run.status === 'draft' && (
                          <button type="button" className="icon-btn" onClick={() => setEditId(raw.employeeId)} aria-label={T('Edit extra pay', 'تعديل الإضافات')} title={T('Commissions, bonus, other deductions', 'العمولات والمكافأة والاستقطاعات')}>
                            <Pencil size={14} />
                          </button>
                        )}
                        <button type="button" className="icon-btn text-gold" onClick={() => setSlipId(raw.employeeId)} aria-label={T('Payslip', 'قسيمة الراتب')} title={T('Payslip', 'قسيمة الراتب')}>
                          <FileText size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-line/20 text-[11.5px] font-bold">
                    <td className="px-2 py-2">{T('Totals', 'المجموع')}</td>
                    <td className="px-2" />
                    <td className="px-2 tabular-nums">{items.reduce((s, i) => s + Number(i.l.stats?.regular || 0), 0).toFixed(1)}</td>
                    <td className="px-2 tabular-nums">{totals.otHours.toFixed(1)}</td>
                    <td className="px-2" />
                    <td className="px-2 tabular-nums">{moneyOf(items.reduce((s, i) => s + Number(i.l.commission || 0), 0))}</td>
                    <td className="px-2 tabular-nums">{moneyOf(totals.gross)}</td>
                    <td className="px-2 tabular-nums text-red-400">{moneyOf(totals.ssEmployee)}</td>
                    <td className="px-2 tabular-nums text-red-400">{moneyOf(totals.tax)}</td>
                    <td className="px-2 tabular-nums text-red-400">{moneyOf(totals.advanceTotal)}</td>
                    <td className="px-2 tabular-nums text-gold">{moneyOf(totals.net)}</td>
                    <td className="px-2" colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>

            <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-subtle">
              <Info size={13} className="mt-0.5 shrink-0" />
              {T('Open the payslip icon to print or download the slip and to record the employee’s signature. Signed slips carry the declaration that every wage up to the signing date has been paid.', 'افتح أيقونة القسيمة للطباعة أو التنزيل وتسجيل توقيع الموظف. تتضمن القسيمة الموقعة الإقرار بأن جميع الرواتب حتى تاريخ التوقيع قد دُفعت.')}
            </p>
          </>
        )}
      </Panel>

      <Panel title={T('All runs', 'جميع الكشوف')} sub={T('History. Locked runs keep the figures they were approved with.', 'السجل. تحتفظ الكشوف المقفلة بالأرقام التي اعتُمدت بها.')}>
        {payrolls.length === 0 ? <EmptyState icon={FileText} title={T('No payroll runs yet', 'لا كشوف رواتب بعد')} /> : (
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-wider text-subtle">
                  {[T('Month', 'الشهر'), T('Status', 'الحالة'), T('Employees', 'الموظفون'), T('Net', 'الصافي'), T('Employer cost', 'الكلفة على الشركة'), ''].map((h, i) => (
                    <th key={i} className="whitespace-nowrap px-2 py-2 text-start font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payrolls.map((r) => {
                  const t = runStat(r);
                  return (
                    <tr key={r.id} className={`border-t border-line/10 ${r.month === month ? 'bg-gold/[0.06]' : ''}`}>
                      <td className="whitespace-nowrap px-2 py-1.5 font-semibold">{monthLabel(r.month, lang)}</td>
                      <td className="px-2">{statusBadge(r.status)}</td>
                      <td className="px-2 tabular-nums">{t.people}</td>
                      <td className="px-2 tabular-nums">{moneyOf(t.net)}</td>
                      <td className="px-2 tabular-nums text-subtle">{moneyOf(t.employerCost)}</td>
                      <td className="px-2 text-end">
                        <button type="button" className="btn-ghost !py-1 !text-[11px]" onClick={() => setMonth(r.month)}>{T('Open', 'فتح')}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {editing && (
        <LineEditor
          line={editing}
          T={T}
          lang={lang}
          preview={(inputs) => computeFor(editing, inputs)}
          onClose={() => setEditId('')}
          onSave={(inputs) => { saveInputs(editing.employeeId, inputs); setEditId(''); }}
        />
      )}

      {slip && (
        <Modal title={`${T('Payslip', 'قسيمة راتب')} — ${slip.name || slip.nameAr || ''} · ${monthLabel(slip.month, lang)}`} onClose={() => setSlipId('')} xwide>
          <div className="no-print mb-3 flex flex-wrap items-center gap-2">
            <div className="seg">
              {[['en', 'EN'], ['ar', 'عربي']].map(([k, l]) => (
                <button key={k} type="button" onClick={() => setDl(k)} data-active={dl === k} className="seg-tab">{l}</button>
              ))}
            </div>
            <button
              type="button" className="btn-ghost !py-1.5 !text-[11px]"
              onClick={async () => { try { await renderPdf(document.getElementById('print-area'), `${slip.month}-${slip.no || 'payslip'}.pdf`); } catch (e) { alert(e.message); } }}
            >
              <Download size={14} />PDF
            </button>
            <button type="button" className="btn-ghost !py-1.5 !text-[11px]" onClick={() => window.print()}><Printer size={14} />{T('Print', 'طباعة')}</button>
            <button
              type="button" className={`!py-1.5 !text-[11px] ${slip.ack?.signed ? 'btn-ghost' : 'btn-gold'}`}
              onClick={() => setAck(slip.employeeId, slip.ack?.signed ? { signed: false } : { signed: true, name: slip.name || slip.nameAr || '', at: todayStr() })}
            >
              <Check size={14} />{slip.ack?.signed ? T('Undo signature', 'إلغاء التوقيع') : T('Record signature', 'تسجيل التوقيع')}
            </button>
            {slip.ack?.signed && <span className="text-[11px] text-emerald-500">{T('Signed', 'موقّع')} {slip.ack.at}</span>}
          </div>
          <div className="overflow-x-auto">
            <div className="mx-auto w-max">
              <Payslip line={slip} employee={slipEmp} run={run} dl={dl} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
