/*
 * Payroll engine — Jordan.
 *
 * Everything the HR screens need to turn a month of attendance into a payslip, with no React
 * inside so it can be reasoned about (and tested) on its own.
 *
 * The rules below are the defaults of the Jordanian Labour Law No. 8 of 1996 (and its amendments)
 * and the Social Security Law currently applicable. Rates and thresholds change, so they live in
 * the `hr` setting and are editable from Admin → HR → Rules. Nothing here is a substitute for the
 * signed contract or for the accountant's advice: the payslip prints the wording that applies.
 *
 *   • normal hours            8 / day, 48 / week             (Art. 56)
 *   • overtime                125% of the hourly wage        (Art. 59)
 *   • weekly rest / holidays  150% of the hourly wage        (Art. 59)
 *   • social security         employee 7.5% / employer 14.25% of the subject wage
 *   • income tax              monthly accrual of the annual brackets, after exemption
 */

/* ---------- small helpers (kept local so this module has no imports) ---------- */
export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
export const clamp = (n, lo, hi) => Math.min(Math.max(Number(n) || 0, lo), hi);
export const hrId = (p = 'hr') => p + Math.random().toString(36).slice(2, 8);
export const todayStr = () => new Date().toISOString().slice(0, 10);
export const monthOf = (d = new Date()) => String(d).slice(0, 7);
export const daysInMonth = (m = monthOf()) => new Date(Number(String(m).slice(0, 4)), Number(String(m).slice(5, 7)), 0).getDate();
export const monthDates = (m = monthOf()) => Array.from({ length: daysInMonth(m) }, (_, i) => `${m}-${String(i + 1).padStart(2, '0')}`);
export const monthEnd = (m = monthOf()) => `${m}-${String(daysInMonth(m)).padStart(2, '0')}`;
/** 0 = Sunday … 6 = Saturday. Jordan's weekend is Friday + Saturday. */
export const weekdayOf = (date) => {
  const d = new Date(`${String(date).slice(0, 10)}T00:00:00`);
  return isNaN(d) ? -1 : d.getDay();
};
export const isWeekend = (date, restDays = [5, 6]) => restDays.includes(weekdayOf(date));
export const monthLabel = (m = monthOf(), lang = 'en') => {
  const d = new Date(`${m}-01T00:00:00`);
  if (isNaN(d)) return m;
  return d.toLocaleDateString(lang === 'ar' ? 'ar-JO' : 'en-GB', { month: 'long', year: 'numeric' });
};

/* ---------- the rules (editable from Admin → HR → Rules) ---------- */
export const DEFAULT_HR = {
  /* social security */
  ssEmployee: 7.5, // % of the subject wage paid by the employee
  ssEmployer: 14.25, // % paid by the company
  ssCeiling: 0, // monthly cap on the subject wage; 0 = no cap (set the current ceiling)
  ssIncludes: { base: true, allowances: true, overtime: false, commission: true, bonus: false },
  /* working time */
  dayHours: 8,
  weekHours: 48,
  dayDivisor: 26, // monthly salary ÷ this = daily wage (used for absence + hourly rate)
  hoursDivisor: 0, // monthly salary ÷ this = hourly wage; 0 = dayDivisor × dayHours
  restDays: [5, 6], // Friday, Saturday
  /* overtime multipliers (%) */
  otNormal: 125,
  otHoliday: 150,
  /* income tax — annual figures, accrued monthly */
  taxOn: true,
  taxExempt: 9000, // annual exemption for the individual
  taxFamily: 9000, // annual exemption added for a family
  taxBrackets: [
    { upTo: 5000, rate: 5 },
    { upTo: 10000, rate: 10 },
    { upTo: 20000, rate: 15 },
    { upTo: 40000, rate: 20 },
    { upTo: 0, rate: 25 }, // 0 = no upper bound
  ],
  /* advances */
  advanceWarnPct: 50, // warn when advances eat more than this % of the gross
  /* wording printed on every payslip */
  legalNote: {
    en: 'Calculated under the Jordanian Labour Law No. 8 of 1996 and its amendments: 8 hours a day / 48 a week (Art. 56), overtime at 125% of the hourly wage and work on weekly rest days or public holidays at 150% (Art. 59). Social security shares are those currently applied by the Social Security Corporation; rates and ceilings are configured by the employer.',
    ar: 'احتسبت هذه القسيمة وفقاً لقانون العمل الأردني رقم 8 لسنة 1996 وتعديلاته: ساعات العمل 8 يومياً و48 أسبوعياً (المادة 56)، والعمل الإضافي بنسبة 125% من أجر الساعة، والعمل في أيام الراحة الأسبوعية والعطل الرسمية بنسبة 150% (المادة 59). وتُطبق حصص الضمان الاجتماعي المعتمدة حالياً من المؤسسة العامة للضمان الاجتماعي، وتُضبط النسب والسقف من قبل المنشأة.',
  },
  disclaimer: {
    en: 'I, the undersigned, confirm that the days and hours worked, overtime, commissions, allowances, advances and deductions shown above are true and correct, and that the net amount stated is the full amount due to me for the month shown. I acknowledge receiving that amount in full and confirm that every wage, overtime payment, commission, allowance and leave entitlement due to me from the date I joined the company up to the date of my signature below — for this month and for every previous month — has been paid to me, and that I have no claim, objection or reservation of any kind in respect of unpaid wages or entitlements up to that date. Any entitlement arising after the date of my signature will be settled in a later payslip. A signed copy of this payslip is kept in my personnel file.',
    ar: 'أقر أنا الموقع أدناه بأن أيام العمل والساعات وساعات العمل الإضافي والعمولات والبدلات والسلف والاستقطاعات الواردة أعلاه صحيحة، وأن الصافي المذكور هو كامل المستحق لي عن الشهر المبين. وأقر باستلامي هذا المبلغ بالكامل، وبأن جميع الرواتب والعمل الإضافي والعمولات والبدلات ومستحقات الإجازات المستحقة لي من تاريخ التحاقي بالشركة وحتى تاريخ توقيعي أدناه — عن هذا الشهر وعن كل شهر سابق — قد دُفعت لي، ولا يحق لي المطالبة بأي مبالغ أو تقديم أي اعتراض أو تحفظ بشأن أي رواتب أو مستحقات غير مدفوعة حتى ذلك التاريخ. وأي مستحقات تنشأ بعد تاريخ توقيعي تُسوَّى في قسيمة لاحقة. وتُحفظ نسخة موقعة من هذه القسيمة في ملفي الوظيفي.',
  },
  /* free-text disclaimers printed at the very bottom of each PDF (written manually, AR + EN) */
  slipFooter: { en: '', ar: '' },
  timesheetFooter: { en: '', ar: '' },
};

/** Merge saved rules over the defaults (a new field must never break an old save). */
export const migrateHR = (h = {}) => ({
  ...DEFAULT_HR,
  ...(h || {}),
  ssIncludes: { ...DEFAULT_HR.ssIncludes, ...((h || {}).ssIncludes || {}) },
  legalNote: { ...DEFAULT_HR.legalNote, ...((h || {}).legalNote || {}) },
  disclaimer: { ...DEFAULT_HR.disclaimer, ...((h || {}).disclaimer || {}) },
  slipFooter: { ...DEFAULT_HR.slipFooter, ...((h || {}).slipFooter || {}) },
  timesheetFooter: { ...DEFAULT_HR.timesheetFooter, ...((h || {}).timesheetFooter || {}) },
  taxBrackets: Array.isArray((h || {}).taxBrackets) && h.taxBrackets.length ? h.taxBrackets : DEFAULT_HR.taxBrackets,
  restDays: Array.isArray((h || {}).restDays) ? h.restDays : DEFAULT_HR.restDays,
});

export const PAY_TYPES = [
  ['monthly', 'Monthly salary', 'راتب شهري'],
  ['hourly', 'Hourly', 'بالساعة'],
  ['daily', 'Daily', 'باليوم'],
];

export const DAY_STATUS = [
  ['work', 'Worked', 'دوام'],
  ['leave', 'Paid leave', 'إجازة مدفوعة'],
  ['sick', 'Sick leave', 'إجازة مرضية'],
  ['unpaid', 'Unpaid leave', 'إجازة بدون راتب'],
  ['absent', 'Absent', 'غياب'],
];

export const RUN_STATUS = {
  draft: ['Draft', 'مسودة', 'bg-zinc-500/20 text-zinc-400'],
  approved: ['Approved', 'معتمد', 'bg-emerald-500/15 text-emerald-500'],
  paid: ['Paid', 'مدفوع', 'bg-gold/20 text-gold'],
};

export const EMPTY_EMPLOYEE = {
  no: '',
  name: '',
  nameAr: '',
  title: '',
  dept: 'production',
  phone: '',
  email: '',
  nationalId: '',
  ssNo: '',
  startDate: '',
  endDate: '',
  active: true,
  payType: 'monthly',
  base: 0, // monthly salary, or the hourly / daily rate
  allowances: [], // [{ label, amount }] — housing, transport, phone…
  commissionPct: 0, // default % of the sales entered on the payslip
  family: false, // married → the extra annual tax exemption
  ssSubject: true, // registered with the Social Security Corporation
  taxSubject: true,
  bankName: '',
  iban: '',
  notes: '',
};

/* ---------- attendance ---------- */
/** '09:30' → 570 minutes (null when empty / invalid). */
export const minutesOf = (hhmm) => {
  const m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/** Hours between the in and out punches, minus the break. Handles shifts past midnight. */
export function shiftHours(row = {}, hr = DEFAULT_HR) {
  const a = minutesOf(row.in);
  const b = minutesOf(row.out);
  if (a == null || b == null) return 0;
  let span = b - a;
  if (span < 0) span += 24 * 60;
  return round2(Math.max(0, span - Number(row.brk ?? 0)) / 60);
}

/**
 * Summarise one employee's rows for one month.
 * Paid leave and sick leave never create a deduction; absence and unpaid leave do.
 */
export function attendanceStats(rows = [], hr = DEFAULT_HR) {
  const st = { days: 0, worked: 0, leave: 0, sick: 0, unpaid: 0, absent: 0, holidays: 0, regular: 0, ot: 0, holidayHours: 0, hours: 0, missing: 0 };
  for (const r of rows) {
    const status = r.status || 'work';
    st.days += 1;
    if (status === 'leave') { st.leave += 1; continue; }
    if (status === 'sick') { st.sick += 1; continue; }
    if (status === 'unpaid') { st.unpaid += 1; continue; }
    if (status === 'absent') { st.absent += 1; continue; }
    const h = shiftHours(r, hr);
    st.worked += 1;
    st.hours = round2(st.hours + h);
    if (r.holiday) { st.holidays += 1; st.holidayHours = round2(st.holidayHours + h); continue; }
    const reg = Math.min(h, Number(hr.dayHours) || 8);
    st.regular = round2(st.regular + reg);
    st.ot = round2(st.ot + Math.max(0, h - reg) + Number(r.otAdj || 0));
  }
  st.unpaidDays = st.unpaid + st.absent;
  return st;
}

/* ---------- income tax ---------- */
/** Tax on an annual amount given ascending brackets; the last `upTo: 0` means "no limit". */
export function incomeTax(annual = 0, brackets = DEFAULT_HR.taxBrackets) {
  let left = Math.max(0, Number(annual) || 0);
  let floor = 0;
  let tax = 0;
  for (const b of brackets) {
    const cap = Number(b.upTo) > 0 ? Number(b.upTo) : Infinity;
    const slice = Math.min(left, cap - floor);
    if (slice > 0) { tax += (slice * (Number(b.rate) || 0)) / 100; left -= slice; }
    floor = cap;
    if (left <= 0) break;
  }
  return round2(tax);
}

/* ---------- one employee, one month ---------- */
/**
 * @param employee  the employee record
 * @param month     'YYYY-MM'
 * @param rows      this employee's attendance rows for that month
 * @param advances  this employee's advances, each with `consumed` (already deducted before)
 * @param hr        rules (from the `hr` setting)
 * @param inputs    what the admin typed on the run: { sales, commissionPct, commission, bonus, otherAdd, otherDed, note }
 */
export function computeLine({ employee = {}, month = monthOf(), rows = [], advances = [], hr = DEFAULT_HR, inputs = {} }) {
  const e = { ...EMPTY_EMPLOYEE, ...employee };
  const st = attendanceStats(rows, hr);
  const payType = e.payType || 'monthly';
  const allowances = (Array.isArray(e.allowances) ? e.allowances : []).filter((a) => a && (a.label || Number(a.amount)));
  const allowancesTotal = round2(allowances.reduce((s, a) => s + Number(a.amount || 0), 0));

  // One hourly rate for everybody: the base, the overtime premium and the day rate all derive from it.
  const hoursDivisor = Number(hr.hoursDivisor) > 0 ? Number(hr.hoursDivisor) : (Number(hr.dayDivisor) || 26) * (Number(hr.dayHours) || 8);
  const hourly = payType === 'hourly' ? Number(e.base || 0)
    : payType === 'daily' ? round2(Number(e.base || 0) / (Number(hr.dayHours) || 8))
      : round2(Number(e.base || 0) / (hoursDivisor || 208));
  const dayRate = payType === 'daily' ? Number(e.base || 0) : round2(hourly * (Number(hr.dayHours) || 8));

  /* earnings — regular hours only; overtime and holiday hours are paid separately at 125% / 150% */
  let base;
  if (payType === 'hourly') base = round2(st.regular * hourly);
  else if (payType === 'daily') base = round2(Math.max(0, st.worked - st.holidays) * dayRate);
  else base = round2(Number(e.base || 0));

  // Monthly/daily staff are paid for the month; days they did not work come off (unpaid leave *and*
  // absence). Hourly staff are paid per hour, so there is nothing left to deduct.
  const absence = payType === 'hourly' ? 0 : round2(st.unpaidDays * dayRate);
  const otAmount = round2((st.ot * hourly * Number(hr.otNormal || 125)) / 100);
  const holidayAmount = round2((st.holidayHours * hourly * Number(hr.otHoliday || 150)) / 100);

  const commissionPct = Number(inputs.commissionPct ?? e.commissionPct ?? 0);
  const commission = inputs.commission != null && inputs.commission !== ''
    ? round2(inputs.commission)
    : round2((Number(inputs.sales || 0) * commissionPct) / 100);
  const bonus = round2(inputs.bonus || 0);
  const otherAdd = round2(inputs.otherAdd || 0);
  const otherDed = round2(inputs.otherDed || 0);

  const gross = round2(base - absence + allowancesTotal + otAmount + holidayAmount + commission + bonus + otherAdd);

  /* social security — on the subject wage only */
  const inc = hr.ssIncludes || DEFAULT_HR.ssIncludes;
  let ssBase = 0;
  if (e.ssSubject !== false) {
    ssBase = (Number(e.base || 0) * (inc.base ? 1 : 0) - (inc.base ? absence : 0))
      + allowancesTotal * (inc.allowances ? 1 : 0)
      + otAmount * (inc.overtime ? 1 : 0)
      + holidayAmount * (inc.overtime ? 1 : 0)
      + commission * (inc.commission ? 1 : 0)
      + bonus * (inc.bonus ? 1 : 0);
    ssBase = Math.max(0, ssBase);
    if (Number(hr.ssCeiling) > 0) ssBase = Math.min(ssBase, Number(hr.ssCeiling));
  }
  const ssEmployee = round2((ssBase * Number(hr.ssEmployee || 0)) / 100);
  const ssEmployer = round2((ssBase * Number(hr.ssEmployer || 0)) / 100);

  /* income tax — annualised, with the employee's social security share deductible */
  let tax = 0;
  if (hr.taxOn !== false && e.taxSubject !== false) {
    const annual = Math.max(0, gross * 12 - ssEmployee * 12);
    const exempt = Number(hr.taxExempt || 0) + (e.family ? Number(hr.taxFamily || 0) : 0);
    tax = round2(incomeTax(Math.max(0, annual - exempt), hr.taxBrackets) / 12);
  }

  /* advances — oldest first, never taking the net below zero */
  const capacity = Math.max(0, round2(gross - ssEmployee - tax - otherDed));
  let left = capacity;
  const applied = [];
  for (const a of [...advances].sort((x, y) => String(x.date).localeCompare(String(y.date)))) {
    const remaining = round2(Math.max(0, Number(a.amount || 0) - Number(a.consumed || 0)));
    if (remaining <= 0 || left <= 0) continue;
    const take = Math.min(remaining, left);
    applied.push({ id: a.id, date: a.date, amount: round2(take), remaining: round2(remaining - take) });
    left = round2(left - take);
  }
  const advanceTotal = round2(applied.reduce((s, a) => s + a.amount, 0));

  const deductions = round2(ssEmployee + tax + advanceTotal + otherDed);
  const net = round2(gross - deductions);

  return {
    employeeId: e.id,
    no: e.no,
    name: e.name,
    nameAr: e.nameAr,
    title: e.title,
    payType,
    month,
    stats: st,
    rates: { dayRate, hourly, hoursDivisor },
    allowances,
    allowancesTotal,
    base,
    absence,
    otAmount,
    holidayAmount,
    commission,
    commissionPct,
    bonus,
    otherAdd,
    otherDed,
    gross,
    ssBase,
    ssEmployee,
    ssEmployer,
    tax,
    advances: applied,
    advanceTotal,
    deductions,
    net,
    employerCost: round2(gross + ssEmployer),
    note: inputs.note || '',
    warn: advanceTotal > 0 && gross > 0 && (advanceTotal / gross) * 100 > Number(hr.advanceWarnPct || 50),
  };
}

/** Totals for a whole run. */
export function runTotals(lines = []) {
  const sum = (k) => round2(lines.reduce((s, l) => s + Number(l[k] || 0), 0));
  return {
    people: lines.length,
    gross: sum('gross'),
    ssEmployee: sum('ssEmployee'),
    ssEmployer: sum('ssEmployer'),
    tax: sum('tax'),
    advanceTotal: sum('advanceTotal'),
    otherDed: sum('otherDed'),
    deductions: sum('deductions'),
    net: sum('net'),
    employerCost: sum('employerCost'),
    otHours: round2(lines.reduce((s, l) => s + Number(l.stats?.ot || 0), 0)),
    holidayHours: round2(lines.reduce((s, l) => s + Number(l.stats?.holidayHours || 0), 0)),
  };
}

/** Advances already deducted by committed (approved or paid) runs — keyed by advance id. */
export function advanceConsumption(runs = []) {
  const used = {};
  for (const r of runs) {
    if (!r || r.status === 'draft' || !Array.isArray(r.lines)) continue;
    for (const l of r.lines) {
      for (const a of l.advances || []) used[a.id] = round2((used[a.id] || 0) + Number(a.amount || 0));
    }
  }
  return used;
}

/** Next employee number (EMP-001, EMP-002 …). */
export function nextEmployeeNo(list = []) {
  const max = list.reduce((n, e) => {
    const m = String(e.no || '').match(/(\d+)\s*$/);
    return m ? Math.max(n, Number(m[1])) : n;
  }, 0);
  return `EMP-${String(max + 1).padStart(3, '0')}`;
}

export const initials = (e = {}) => String(e.name || e.nameAr || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
