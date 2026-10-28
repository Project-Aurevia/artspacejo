/**
 * Accounting math — supplier bills, petty cash and the P&L bridge.
 *
 * Pure functions only: no React, no DOM, no side effects. The same numbers feed
 * the tiles, the tables and the CSV export, so they can be reused later by a
 * report or a PDF without touching the UI.
 *
 * Conventions (kept identical to invoices):
 *  - a purchase stores its **net** value in `amount`; VAT is opt-out via `vat:false`
 *    and defaults to the company rate in `rates.vat`
 *  - `paid` is a running total of money already sent to the supplier
 *  - petty cash is one record per day: `open` = cash handed over in the morning,
 *    `expenses[]` = what went out during the day, remainder carries to the next day
 */
import { safeTotals, invoiceView, todayStr, parseDay } from './adminStats.js';

const DAY = 86400000;
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/* ---------- editable taxonomies (single source for the UI labels) ---------- */
export const PUR_CATS = [
  ['materials', 'Materials & Fabrication', 'مواد وتصنيع'],
  ['printing', 'Printing & Media', 'مطبوعات ووسائط'],
  ['rent', 'Rent & Utilities', 'إيجار وخدمات'],
  ['salaries', 'Salaries & Freelance', 'رواتب وفريلانس'],
  ['marketing', 'Ads & Marketing', 'إعلانات وتسويق'],
  ['transport', 'Transport & Install', 'نقل وتركيب'],
  ['other', 'Other', 'أخرى'],
];

export const CASH_CATS = [
  ['supplies', 'Office supplies', 'مستلزمات مكتب'],
  ['transport', 'Transport / fuel', 'نقل ومحروقات'],
  ['food', 'Food & hospitality', 'ضيافة'],
  ['permits', 'Permits & fees', 'رسوم وتراخيص'],
  ['maintenance', 'Maintenance', 'صيانة'],
  ['other', 'Other', 'أخرى'],
];

/** Resolve a taxonomy id to the active language, falling back to the raw id. */
export const catName = (list, id, lang) => {
  const row = (list || []).find((c) => c[0] === id);
  return row ? row[lang === 'ar' ? 2 : 1] : id || '—';
};

/** Next free document number for a list of records that carry `no`. */
export const nextNo = (list = [], prefix = 'PUR', year = new Date().getFullYear()) => {
  let n = list.length + 1;
  let no;
  do {
    no = `${prefix}-${year}-${String(n++).padStart(3, '0')}`;
  } while (list.some((x) => x && x.no === no));
  return no;
};

/**
 * A supplier bill, normalised. Never throws on a half-filled record: older or
 * hand-written rows may miss `amount`, `paid`, `due` or `vat`.
 */
export function purchaseView(p = {}, vatRate = 0, today = todayStr()) {
  const net = Math.max(0, Number(p.amount || 0));
  const rate = Number(p.vatRate ?? vatRate) || 0;
  const vat = p.vat === false ? 0 : r2((net * rate) / 100);
  const total = r2(net + vat);
  const paid = Math.max(0, Number(p.paid || 0));
  const balance = Math.max(0, r2(total - paid));
  const due = p.due || p.date || today;
  const dueD = parseDay(due);
  const todayD = parseDay(today);
  const late = dueD && todayD ? Math.max(0, Math.round((todayD - dueD) / DAY)) : 0;
  const status = balance <= 0.005 ? 'paid' : paid > 0 ? 'partial' : 'open';
  return {
    p,
    net: r2(net),
    rate,
    vat,
    total,
    paid: r2(paid),
    balance,
    due,
    late,
    overdue: late > 0 && balance > 0.005,
    status,
    supplier: String(p.supplier || '').trim() || '—',
  };
}

/** One day of petty cash: handed over, spent, left. Negative remainder = overspent. */
export function cashView(d = {}) {
  const open = Math.max(0, Number(d.open || 0));
  const expenses = Array.isArray(d.expenses) ? d.expenses : [];
  const spent = r2(expenses.reduce((s, e) => s + Number(e && e.amount ? e.amount : 0), 0));
  const remaining = r2(open - spent);
  return {
    d,
    id: d.id,
    date: d.date || todayStr(),
    open: r2(open),
    expenses,
    spent,
    remaining,
    count: expenses.length,
    over: remaining < -0.005,
    closed: !!d.closed,
  };
}

/** Remaining cash of the latest day strictly before `date` — the amount to hand over tomorrow. */
export function carryFrom(cash = [], date = todayStr()) {
  const before = cash
    .map(cashView)
    .filter((v) => v.date < date)
    .sort((a, b) => a.date.localeCompare(b.date));
  return before.length ? before[before.length - 1].remaining : 0;
}

const sum = (rows, key) => r2(rows.reduce((s, r) => s + Number(r[key] || 0), 0));

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthKey = (s) => String(s || '').slice(0, 7);
const monthLabel = (key) => {
  const [y, m] = String(key).split('-').map(Number);
  return m >= 1 && m <= 12 ? `${MONTH_NAMES[m - 1]} ${String(y).slice(2)}` : key;
};

/**
 * One call, one object. Everything the accounting tab needs.
 *
 *  - revenue      = invoiced totals, VAT included (a customer's bill, not our money)
 *  - salesNet     = revenue without output VAT — what we actually earned
 *  - purchasesNet = supplier bills without input VAT — what the job cost us
 *  - petty        = every pocket-money expense (already VAT-inclusive cash)
 *  - netProfit    = salesNet − purchasesNet − petty
 *  - vatDue       = output VAT − input VAT (what goes to the tax office)
 *  - cashOnHand   = remainder of the most recent petty-cash day
 */
export function accountingSummary({
  invoices = [],
  quotes = [],
  purchases = [],
  cash = [],
  rates = {},
  today = todayStr(),
  months = 6,
} = {}) {
  const vatRate = Number(rates?.vat ?? 0);

  /* ---- sales (read-only mirror of the invoices tab) ---- */
  const inv = (invoices || []).map((i) => invoiceView(i, vatRate, today));
  const salesGross = sum(inv, 'total');
  const collected = sum(inv, 'paid');
  const receivables = sum(inv, 'balance');
  const lateInvoices = inv.filter((r) => r.overdue);
  const receivablesOverdue = sum(lateInvoices, 'balance');
  const salesVat = r2((invoices || []).reduce((s, i) => s + safeTotals(i, vatRate).vat, 0));
  const salesNet = r2(salesGross - salesVat);

  /* ---- purchases ---- */
  const pur = (purchases || []).map((p) => purchaseView(p, vatRate, today));
  const purchasesNet = sum(pur, 'net');
  const purchasesVat = sum(pur, 'vat');
  const purchasesGross = sum(pur, 'total');
  const supplierPaid = sum(pur, 'paid');
  const payables = sum(pur, 'balance');
  const latePurchases = pur.filter((v) => v.overdue);
  const payablesOverdue = sum(latePurchases, 'balance');

  /* ---- petty cash ---- */
  const days = (cash || []).map(cashView).sort((a, b) => a.date.localeCompare(b.date));
  const petty = sum(days, 'spent');
  const latest = days.length ? days[days.length - 1] : null;
  const cashOnHand = latest ? latest.remaining : 0;
  const pettyByCat = CASH_CATS.map(([key, en, ar]) => {
    let value = 0;
    let count = 0;
    days.forEach((d) => d.expenses.forEach((e) => {
      if ((e.cat || 'other') !== key) return;
      value += Number(e.amount || 0);
      count += 1;
    }));
    return { key, en, ar, value: r2(value), count };
  }).filter((c) => c.count);

  /* ---- result ---- */
  const grossProfit = r2(salesNet - purchasesNet);
  const netProfit = r2(grossProfit - petty);
  const vatDue = r2(salesVat - purchasesVat);
  const margin = salesNet ? (netProfit / salesNet) * 100 : 0;

  /* ---- month buckets ---- */
  const anchor = parseDay(today) || new Date();
  const keys = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const bucket = Object.fromEntries(keys.map((k) => [k, { key: k, sales: 0, purchases: 0, petty: 0 }]));
  inv.forEach(({ inv: doc, total }) => {
    const k = monthKey(doc.date);
    if (bucket[k]) bucket[k].sales += total;
  });
  pur.forEach(({ p, total }) => {
    const k = monthKey(p.date);
    if (bucket[k]) bucket[k].purchases += total;
  });
  days.forEach((d) => {
    const k = monthKey(d.date);
    if (bucket[k]) bucket[k].petty += d.spent;
  });
  const byMonth = keys.map((k) => ({
    ...bucket[k],
    label: monthLabel(k),
    sales: r2(bucket[k].sales),
    purchases: r2(bucket[k].purchases),
    petty: r2(bucket[k].petty),
  }));

  /* ---- purchases by category (unknown categories fold into "other") ---- */
  const known = new Set(PUR_CATS.map((c) => c[0]));
  const catTotals = {};
  pur.forEach((v) => {
    const raw = known.has(v.p.cat) ? v.p.cat : 'other';
    catTotals[raw] = (catTotals[raw] || 0) + v.total;
  });
  const byCat = PUR_CATS
    .map(([key, en, ar]) => ({ key, en, ar, value: r2(catTotals[key] || 0) }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);

  /* ---- suppliers ---- */
  const sup = {};
  pur.forEach((v) => {
    const k = v.supplier.toLowerCase();
    const e = sup[k] || (sup[k] = { name: v.supplier, total: 0, balance: 0, count: 0 });
    e.total += v.total;
    e.balance += v.balance;
    e.count += 1;
  });
  const topSuppliers = Object.values(sup)
    .map((e) => ({ ...e, total: r2(e.total), balance: r2(e.balance) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  /* ---- quotation pipeline (money not yet invoiced) ---- */
  const openQuotes = (quotes || []).filter((q) => ['draft', 'sent'].includes(q.status) && !q.converted);
  const pipeline = r2(openQuotes.reduce((s, q) => s + safeTotals(q, vatRate).total, 0));
  const approvedQuotes = (quotes || []).filter((q) => q.status === 'approved' && !q.converted);
  const approved = r2(approvedQuotes.reduce((s, q) => s + safeTotals(q, vatRate).total, 0));

  return {
    /* sales */
    salesGross, salesNet, salesVat, collected, receivables, receivablesOverdue,
    invoiceCount: inv.length, lateInvoiceCount: lateInvoices.length,
    /* purchases */
    purchasesNet, purchasesVat, purchasesGross, supplierPaid, payables, payablesOverdue,
    purchaseCount: pur.length, latePurchaseCount: latePurchases.length,
    /* petty cash */
    petty, pettyDays: days.length, cashOnHand, latestDay: latest, pettyByCat,
    /* result */
    grossProfit, netProfit, vatDue, margin,
    /* breakdowns */
    byMonth, byCat, topSuppliers, pipeline, approved,
    openQuoteCount: openQuotes.length, approvedQuoteCount: approvedQuotes.length,
    /* raw normalised lists, ready for the tables */
    invoices: inv, purchases: pur, days,
  };
}

/** CSV with a BOM so Excel opens Arabic labels correctly. */
export function toCsv(rows = [], cols = []) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [
    cols.map((c) => esc(c.label)).join(','),
    ...rows.map((r) => cols.map((c) => esc(typeof c.get === 'function' ? c.get(r) : r[c.key])).join(',')),
  ].join('\n');
}
