import React, { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Mark } from './Logo.jsx';
import { useApp } from './store.jsx';
import { renderPdf } from './Documents.jsx';
import { DEFAULT_HR, DAY_STATUS, monthDates, monthOf, monthLabel, shiftHours, attendanceStats, isWeekend, weekdayOf } from './payroll.js';

const WEEK_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEK_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/** Printable monthly timesheet (A4) for one employee. */
export function Timesheet({ employee = {}, month, rows = [], dl = 'en', company: c = {}, hr = DEFAULT_HR }) {
  const ar = dl === 'ar';
  const L = (en, a) => (ar ? a : en);
  const x = (v) => (v && typeof v === 'object' ? v[dl] || v.en || '' : v || '');
  const byDate = Object.fromEntries(rows.map((r) => [r.date, r]));
  const st = attendanceStats(rows, hr);
  const dates = monthDates(month);
  const statusName = (k) => { const s = DAY_STATUS.find(([key]) => key === k); return s ? s[ar ? 2 : 1] : k; };
  const th = { padding: '4px 6px', textAlign: 'start', fontSize: 9.5, fontWeight: 800, background: '#161616', color: '#fff' };
  const td = { padding: '2.5px 6px', fontSize: 9.5, borderBottom: '1px solid #e6e6e6', fontVariantNumeric: 'tabular-nums' };
  const name = ar ? (employee.nameAr || employee.name) : (employee.name || employee.nameAr);
  const contact = [c.phone, c.email, c.website].filter(Boolean).join('  ·  ');

  return (
    <div
      id="print-area" dir={ar ? 'rtl' : 'ltr'}
      style={{ width: 794, minHeight: 1122, background: '#fff', color: '#161616', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', fontFamily: ar ? '"DIN Next LT Arabic", Cairo, sans-serif' : 'Mont, "Plus Jakarta Sans", sans-serif' }}
    >
      <div style={{ padding: '24px 36px 12px', borderBottom: '2px solid #C4A05C', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {c.logo ? <img src={c.logo} alt="" crossOrigin="anonymous" style={{ height: 44, maxWidth: 150, objectFit: 'contain' }} /> : <Mark className="h-12" variant="print" />}
          <div style={{ fontSize: 17, fontWeight: 800 }}>{x(c.name)}</div>
        </div>
        <div style={{ textAlign: ar ? 'left' : 'right' }}>
          <div style={{ fontSize: 19, fontWeight: 800, color: '#C4A05C' }}>{L('TIMESHEET', 'سجل الدوام الشهري')}</div>
          <div style={{ fontSize: 11.5, fontWeight: 700 }}>{monthLabel(month, dl)}</div>
        </div>
      </div>

      <div style={{ padding: '14px 36px', flex: 1 }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 11, marginBottom: 10 }}>
          <div><span style={{ color: '#777' }}>{L('Employee', 'الموظف')}: </span><b>{name || '—'}</b></div>
          <div><span style={{ color: '#777' }}>{L('No.', 'الرقم')}: </span><b dir="ltr">{employee.no || '—'}</b></div>
          {employee.title ? <div><span style={{ color: '#777' }}>{L('Position', 'المسمى')}: </span><b>{employee.title}</b></div> : null}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{[L('Date', 'التاريخ'), L('Day', 'اليوم'), L('In', 'الحضور'), L('Out', 'الانصراف'), L('Break', 'استراحة'), L('Hours', 'الساعات'), L('Status', 'الحالة'), L('Note', 'ملاحظة')].map((h, i) => <th key={i} style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {dates.map((d) => {
              const r = byDate[d];
              const rest = isWeekend(d, hr.restDays);
              const wd = weekdayOf(d);
              const h = r ? shiftHours(r, hr) : 0;
              return (
                <tr key={d} style={{ background: rest ? '#f6f1e7' : 'transparent' }}>
                  <td style={td} dir="ltr">{d.slice(8)}/{d.slice(5, 7)}</td>
                  <td style={td}>{(ar ? WEEK_AR : WEEK_EN)[wd]}</td>
                  <td style={td} dir="ltr">{r?.in || ''}</td>
                  <td style={td} dir="ltr">{r?.out || ''}</td>
                  <td style={td}>{r && (r.in || r.out) ? `${Number(r.brk || 0)}'` : ''}</td>
                  <td style={td}>{h ? h.toFixed(2) : ''}</td>
                  <td style={td}>{r ? `${statusName(r.status || 'work')}${r.holiday ? ` · ${L('Holiday', 'عطلة')}` : ''}` : (rest ? L('Rest day', 'راحة') : '')}</td>
                  <td style={td}>{r?.note || ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="avoid" style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: '4px 22px', fontSize: 10.5, border: '1px solid #dcdcdc', borderRadius: 4, padding: '8px 12px' }}>
          {[
            [L('Days worked', 'أيام العمل'), st.worked], [L('Total hours', 'إجمالي الساعات'), st.hours.toFixed(2)],
            [L('Regular', 'عادية'), st.regular.toFixed(2)], [L('Overtime', 'إضافي'), st.ot.toFixed(2)],
            [L('Holiday hours', 'ساعات العطل'), st.holidayHours.toFixed(2)], [L('Paid leave', 'إجازة'), st.leave],
            [L('Sick', 'مرضية'), st.sick], [L('Unpaid / absent', 'بدون أجر / غياب'), st.unpaidDays],
          ].map(([l, v]) => <div key={l}><span style={{ color: '#777' }}>{l}: </span><b>{v}</b></div>)}
        </div>

        <div className="avoid" style={{ display: 'flex', gap: 46, marginTop: 30, fontSize: 10 }}>
          <div style={{ flex: 1, borderTop: '1px solid #161616', paddingTop: 5 }}>{L('Employee signature', 'توقيع الموظف')}</div>
          <div style={{ flex: 1, borderTop: '1px solid #161616', paddingTop: 5 }}>{L('Manager signature', 'توقيع المدير')}</div>
        </div>
      </div>

      <div style={{ padding: '10px 36px 16px', borderTop: '1px solid #dcdcdc', fontSize: 9.5, color: '#666', textAlign: 'center' }}>
        {x(hr.timesheetFooter) ? <div style={{ marginBottom: 6, lineHeight: 1.6, color: '#333', whiteSpace: 'pre-line' }}>{x(hr.timesheetFooter)}</div> : null}
        {contact ? <div dir="ltr">{contact}</div> : null}
      </div>
    </div>
  );
}

/** HR tab: pick an employee + month, preview, download or print. */
export default function TimesheetTab() {
  const { T, lang, employees = [], attendance = [], company, hr = DEFAULT_HR } = useApp();
  const [empId, setEmpId] = useState('');
  const [month, setMonth] = useState(monthOf());
  const [dl, setDl] = useState(lang === 'ar' ? 'ar' : 'en');
  const emp = employees.find((e) => e.id === empId);
  const rows = emp ? attendance.filter((r) => r.employeeId === emp.id && String(r.date || '').startsWith(month)) : [];

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[220px]">
          <label className="label">{T('Employee', 'الموظف')}</label>
          <select className="input" value={empId} onChange={(e) => setEmpId(e.target.value)}>
            <option value="">{T('— choose —', '— اختر —')}</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.no} · {lang === 'ar' ? (e.nameAr || e.name) : (e.name || e.nameAr)}</option>)}
          </select>
        </div>
        <div><label className="label">{T('Month', 'الشهر')}</label><input type="month" className="input" value={month} onChange={(e) => setMonth(e.target.value || monthOf())} /></div>
        <div className="seg">
          {[['en', 'EN'], ['ar', 'عربي']].map(([k, l]) => <button key={k} type="button" data-active={dl === k} className="seg-tab" onClick={() => setDl(k)}>{l}</button>)}
        </div>
        <button type="button" className="btn-gold !py-1.5 !text-[11px]" disabled={!emp}
          onClick={async () => { try { await renderPdf(document.getElementById('print-area'), `timesheet-${month}-${emp.no || 'staff'}.pdf`); } catch (e) { alert(e.message); } }}>
          <Download size={14} />PDF
        </button>
        <button type="button" className="btn-ghost !py-1.5 !text-[11px]" disabled={!emp} onClick={() => window.print()}><Printer size={14} />{T('Print', 'طباعة')}</button>
        <p className="w-full text-[11px] text-subtle">{T('The salary slip (with advances, deductions and incentives) is printed from Payroll Runs → payslip icon. Both PDFs print the bottom disclaimers set in Rules.', 'تُطبع قسيمة الراتب (مع السلف والاستقطاعات والحوافز) من كشوف الرواتب ← أيقونة القسيمة. ويُطبع في المستندين نص إخلاء المسؤولية المحدد في الإعدادات.')}</p>
      </div>
      {emp && (
        <div className="overflow-x-auto"><div className="mx-auto w-max"><Timesheet employee={emp} month={month} rows={rows} dl={dl} company={company} hr={hr} /></div></div>
      )}
    </div>
  );
}
