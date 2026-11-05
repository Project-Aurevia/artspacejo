import React from 'react';
import { Mark } from './Logo.jsx';
import { useApp } from './store.jsx';
import { DEFAULT_HR, monthLabel, PAY_TYPES } from './payroll.js';

/**
 * The printable salary slip — one A4 page, driven by a computed payroll line.
 *
 * It is the document the employee signs, so it always carries: every earning and deduction with
 * its basis (hours × rate, % of the subject wage), the attendance summary behind those figures,
 * the legal basis, and the acknowledgement in which the employee confirms the figures and that
 * everything due up to the date of signature has been paid.
 */
export default function Payslip({ line, employee = {}, run = {}, dl = 'en', company: companyProp, hr: hrProp }) {
  const app = useApp();
  const c = companyProp || app.company || {};
  const hr = hrProp || app.hr || DEFAULT_HR;
  const ar = dl === 'ar';
  const L = (en, a) => (ar ? a : en);
  const x = (v) => (v && typeof v === 'object' ? v[dl] || v.en || '' : v || '');
  const money = (v) => `${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${ar ? 'د.أ' : 'JOD'}`;
  const dec = (v) => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
  const st = line.stats || {};
  const payType = (PAY_TYPES.find(([k]) => k === line.payType) || PAY_TYPES[0])[ar ? 2 : 1];
  const e = { ...employee };
  const slipNo = `${run.no || `PR-${line.month}`}-${e.no || ''}`;

  const Row = ({ l, v, strong, neg }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: strong ? '5px 0 3px' : '2.5px 0', fontSize: strong ? 12 : 11, fontWeight: strong ? 800 : 400, borderTop: strong ? '1.5px solid #161616' : 'none' }}>
      <span style={{ color: strong ? '#161616' : '#4a4a4a' }}>{l}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums', color: neg ? '#B0522F' : 'inherit' }}>{v}</span>
    </div>
  );
  const Box = ({ title, children }) => (
    <div style={{ border: '1px solid #dcdcdc', borderRadius: 4, padding: '9px 12px' }}>
      <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: ar ? 0 : 1, color: '#A88438', marginBottom: 5 }}>{title}</div>
      {children}
    </div>
  );
  const Meta = ({ l, v, dir }) => (
    <div style={{ display: 'flex', gap: 6, fontSize: 10.5 }}>
      <span style={{ color: '#777' }}>{l}:</span>
      <b dir={dir} style={{ fontWeight: 700 }}>{v || '—'}</b>
    </div>
  );

  const contact = [c.phone, c.email, c.website].filter(Boolean).join('  ·  ');

  return (
    <div
      id="print-area" dir={ar ? 'rtl' : 'ltr'}
      style={{
        width: 794, minHeight: 1122, background: '#ffffff', color: '#161616', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        fontFamily: ar ? 'Cairo, sans-serif' : '"Plus Jakarta Sans", sans-serif',
      }}
    >
      {/* ---------- header ---------- */}
      <div style={{ padding: '26px 36px 14px', borderBottom: '2px solid #C4A05C', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {c.logo ? <img src={c.logo} alt="" crossOrigin="anonymous" style={{ height: 46, maxWidth: 150, objectFit: 'contain' }} /> : <Mark className="h-12" variant="print" />}
          <div>
            <div style={{ fontFamily: 'Mont, Montserrat, -apple-system, sans-serif', fontSize: 19, fontWeight: 800, letterSpacing: '0.04em', lineHeight: 1.1 }}>
              {c.name?.en}{c.name?.en && c.name?.ar && <span style={{ opacity: 0.4 }}> | </span>}
              {c.name?.ar && <span style={{ fontFamily: '"DIN Next LT Arabic", Cairo, -apple-system, sans-serif', fontSize: 17, fontWeight: 700 }}>{c.name.ar}</span>}
            </div>
            <div style={{ fontSize: 9.5, color: '#666', marginTop: 2 }}>
              {[x(c.address), c.taxNo ? `${L('Tax No.', 'الرقم الضريبي')}: ${c.taxNo}` : ''].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>
        <div style={{ textAlign: ar ? 'left' : 'right' }}>
          <div style={{ fontSize: 19, fontWeight: 800, color: '#C4A05C' }}>{L('PAYSLIP', 'قسيمة راتب')}</div>
          <div style={{ fontSize: 11.5, fontWeight: 700 }}>{monthLabel(line.month, dl)}</div>
          <div style={{ fontSize: 10, color: '#666' }} dir="ltr">{slipNo}</div>
        </div>
      </div>

      <div style={{ padding: '16px 36px 20px', flex: 1 }}>
        {/* ---------- employee ---------- */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <Box title={L('EMPLOYEE', 'بيانات الموظف')}>
            <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 4 }}>{e.name || line.name}{e.nameAr ? <span style={{ fontWeight: 600 }}> · {e.nameAr}</span> : null}</div>
            <Meta l={L('Employee No.', 'الرقم الوظيفي')} v={e.no} dir="ltr" />
            <Meta l={L('Job title', 'المسمى الوظيفي')} v={e.title} />
            <Meta l={L('Department', 'القسم')} v={e.dept} />
            <Meta l={L('Start date', 'تاريخ الالتحاق')} v={e.startDate} dir="ltr" />
            <Meta l={L('National ID', 'الرقم الوطني')} v={e.nationalId} dir="ltr" />
          </Box>
          <Box title={L('PAYMENT DETAILS', 'بيانات الدفع')}>
            <Meta l={L('Pay basis', 'أساس الأجر')} v={payType} />
            <Meta l={L('Monthly basic', 'الراتب الأساسي')} v={e.payType === 'monthly' ? money(e.base) : `${money(e.base)} / ${e.payType === 'hourly' ? L('hour', 'ساعة') : L('day', 'يوم')}`} />
            <Meta l={L('Social security No.', 'رقم الضمان')} v={e.ssNo} dir="ltr" />
            <Meta l={L('Bank', 'البنك')} v={e.bankName} />
            <Meta l="IBAN" v={e.iban} dir="ltr" />
            <Meta l={L('Paid by', 'طريقة الدفع')} v={line.method || e.salaryMethod || L('Bank transfer', 'حوالة بنكية')} />
          </Box>
        </div>

        {/* ---------- earnings / deductions ---------- */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Box title={L('EARNINGS', 'الاستحقاقات')}>
            <Row l={L('Basic salary', 'الراتب الأساسي')} v={money(line.base)} />
            {(line.allowances || []).map((a, i) => <Row key={i} l={x(a.label) || L('Allowance', 'بدل')} v={money(a.amount)} />)}
            {line.otAmount > 0 && (
              <Row
                l={`${L('Overtime', 'عمل إضافي')} — ${dec(st.ot)} ${L('h', 'س')} × ${dec(line.rates?.hourly)} × ${hr.otNormal}%`}
                v={money(line.otAmount)}
              />
            )}
            {line.holidayAmount > 0 && (
              <Row
                l={`${L('Rest day / holiday work', 'عمل في عطلة')} — ${dec(st.holidayHours)} ${L('h', 'س')} × ${dec(line.rates?.hourly)} × ${hr.otHoliday}%`}
                v={money(line.holidayAmount)}
              />
            )}
            {line.commission > 0 && <Row l={`${L('Commission', 'عمولة')}${line.commissionPct ? ` (${dec(line.commissionPct)}%)` : ''}`} v={money(line.commission)} />}
            {line.bonus > 0 && <Row l={L('Bonus', 'مكافأة')} v={money(line.bonus)} />}
            {line.otherAdd > 0 && <Row l={L('Other additions', 'إضافات أخرى')} v={money(line.otherAdd)} />}
            <Row l={L('Total earnings', 'مجموع الاستحقاقات')} v={money(line.gross)} strong />
          </Box>

          <Box title={L('DEDUCTIONS', 'الاستقطاعات')}>
            {line.absence > 0 && <Row l={`${L('Unpaid days', 'أيام بدون أجر')} — ${dec(st.unpaidDays)} × ${dec(line.rates?.dayRate)}`} v={`-${money(line.absence)}`} neg />}
            <Row
              l={`${L('Social security', 'الضمان الاجتماعي')} ${dec(hr.ssEmployee)}% (${L('on', 'على')} ${dec(line.ssBase)})`}
              v={`-${money(line.ssEmployee)}`} neg
            />
            {line.tax > 0 && <Row l={L('Income tax', 'ضريبة الدخل')} v={`-${money(line.tax)}`} neg />}
            {(line.advances || []).map((a, i) => (
              <Row key={a.id || i} l={`${L('Advance', 'سلفة')} ${a.date || ''}`} v={`-${money(a.amount)}`} neg />
            ))}
            {line.otherDed > 0 && <Row l={L('Other deductions', 'استقطاعات أخرى')} v={`-${money(line.otherDed)}`} neg />}
            {(line.advances || []).length === 0 && line.absence <= 0 && line.tax <= 0 && line.otherDed <= 0 && (
              <Row l={L('—', '—')} v={money(0)} />
            )}
            <Row l={L('Total deductions', 'مجموع الاستقطاعات')} v={`-${money(line.deductions)}`} strong />
          </Box>
        </div>

        {/* ---------- net ---------- */}
        <div style={{ marginTop: 12, background: '#161616', color: '#F0E4D6', borderRadius: 4, padding: '11px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, letterSpacing: ar ? 0 : 1 }}>{L('NET PAY FOR THE MONTH', 'صافي الراتب عن الشهر')} · {monthLabel(line.month, dl)}</div>
          <div style={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{money(line.net)}</div>
        </div>

        {/* ---------- attendance ---------- */}
        <div style={{ marginTop: 12, border: '1px solid #dcdcdc', borderRadius: 4, padding: '9px 12px' }}>
          <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: ar ? 0 : 1, color: '#A88438', marginBottom: 6 }}>{L('WHAT THE FIGURES ARE BASED ON', 'أساس الاحتساب')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px 14px', fontSize: 10.5 }}>
            <Meta l={L('Days worked', 'أيام الدوام')} v={dec(st.worked)} />
            <Meta l={L('Paid leave', 'إجازة مدفوعة')} v={dec(st.leave)} />
            <Meta l={L('Sick leave', 'إجازة مرضية')} v={dec(st.sick)} />
            <Meta l={L('Unpaid / absent', 'بدون أجر / غياب')} v={dec(st.unpaidDays)} />
            <Meta l={L('Regular hours', 'ساعات الدوام')} v={dec(st.regular)} />
            <Meta l={L('Overtime hours', 'ساعات إضافي')} v={dec(st.ot)} />
            <Meta l={L('Rest day / holiday hours', 'ساعات عطلة')} v={dec(st.holidayHours)} />
            <Meta l={L('Hourly rate', 'أجر الساعة')} v={dec(line.rates?.hourly)} />
          </div>
          {line.note ? <div style={{ marginTop: 6, fontSize: 10, color: '#555' }}>{L('Note', 'ملاحظة')}: {line.note}</div> : null}
        </div>

        {/* ---------- employer side (internal) ---------- */}
        <div style={{ marginTop: 8, fontSize: 9.5, color: '#777' }}>
          {L('Employer social security share', 'حصة المنشأة من الضمان')} {dec(hr.ssEmployer)}% = {money(line.ssEmployer)} · {L('Total cost to the company', 'الكلفة الإجمالية على الشركة')} = {money(line.employerCost)}
        </div>

        {/* ---------- legal + acknowledgement ---------- */}
        <div style={{ marginTop: 12, fontSize: 9.5, lineHeight: 1.55, color: '#555' }}>{x(hr.legalNote)}</div>

        <div className="avoid" style={{ marginTop: 12, border: '1.5px solid #161616', borderRadius: 4, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, marginBottom: 4 }}>{L('ACKNOWLEDGEMENT & DECLARATION', 'إقرار وتعهد')}</div>
          <div style={{ fontSize: 9.5, lineHeight: 1.6, textAlign: 'justify' }}>{x(hr.disclaimer)}</div>
          {line.ack?.signed && (
            <div style={{ marginTop: 6, fontSize: 9.5, fontWeight: 700, color: '#1a7f4b' }}>
              {L('Recorded as signed', 'مسجّل كموقّع')}: {line.ack.name || e.name} — {line.ack.at}
            </div>
          )}
        </div>

        <div className="avoid" style={{ display: 'flex', gap: 46, marginTop: 30, fontSize: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ borderTop: '1px solid #161616', paddingTop: 5 }}>
              {L('Employee signature', 'توقيع الموظف')} — {e.name}
            </div>
            <div style={{ marginTop: 10, color: '#666' }}>{L('Date', 'التاريخ')}: ________________</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ borderTop: '1px solid #161616', paddingTop: 5 }}>
              {L('Authorised signature & stamp', 'التوقيع المفوض والختم')} — {c.name?.[dl] || c.name?.en}
            </div>
            <div style={{ marginTop: 10, color: '#666' }}>{L('Date', 'التاريخ')}: ________________</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '10px 36px 16px', borderTop: '1px solid #dcdcdc', fontSize: 9.5, color: '#666', textAlign: 'center' }}>
        {x(hr.slipFooter) ? <div style={{ marginBottom: 6, fontSize: 9.5, lineHeight: 1.6, color: '#333', whiteSpace: 'pre-line' }}>{x(hr.slipFooter)}</div> : null}
        {L('This payslip is confidential and issued to the employee named above.', 'هذه القسيمة سرية وتُسلَّم للموظف المذكور أعلاه فقط.')}
        {contact ? <div style={{ marginTop: 3 }} dir="ltr">{contact}</div> : null}
      </div>
    </div>
  );
}
