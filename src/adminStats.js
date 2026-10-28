/**
 * Commercial metrics for the admin dashboard.
 *
 * Pure functions only — no React, no side effects — so the same numbers can be
 * reused later by reports, exports or a PDF. Every list is guarded: data saved
 * before a field existed (no `items`, no `payments`, no `due`) must never crash
 * the dashboard.
 */
import { totals, LEAD_STAGES } from './store.jsx';

const DAY = 86400000;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Serialise a Date with its *local* calendar fields — `toISOString()` would shift the day in UTC+X. */
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const todayStr = () => ymd(new Date());

/** Parse a `YYYY-MM-DD` value as local midnight so it never shifts by a timezone. */
export const parseDay = (s) => {
  const d = new Date(`${String(s || '').slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const addDays = (s, n) => {
  const d = parseDay(s) || new Date();
  d.setDate(d.getDate() + n);
  return ymd(d);
};

/** Older invoices carry no due date — fall back to "30 days after issue". */
export const dueOf = (inv, fallbackDays = 30) => inv?.due || addDays(inv?.date || todayStr(), fallbackDays);

/** `totals()` assumes an items array; tolerate documents saved without one. */
export const safeTotals = (doc, vatRate) => totals({ items: [], ...(doc || {}) }, vatRate);

export const paidOf = (inv) => (Array.isArray(inv?.payments) ? inv.payments : []).reduce((s, p) => s + Number(p.amount || 0), 0);

/** Everything the dashboard needs about a single invoice. */
export function invoiceView(inv, vatRate, today = todayStr()) {
  const t = safeTotals(inv, vatRate);
  const paid = paidOf(inv);
  const due = dueOf(inv);
  const dueD = parseDay(due);
  const todayD = parseDay(today);
  const late = dueD && todayD ? Math.max(0, Math.round((todayD - dueD) / DAY)) : 0;
  const balance = Math.max(0, t.total - paid);
  return { inv, total: t.total, paid, balance, due, late, overdue: late > 0 && balance > 0 };
}

const monthKey = (s) => String(s || '').slice(0, 7);
const monthLabel = (key) => {
  const [y, m] = String(key).split('-').map(Number);
  return m >= 1 && m <= 12 ? `${MONTH_NAMES[m - 1]} ${String(y).slice(2)}` : key;
};

/**
 * One call, one object. Feed it the four collections from the store.
 *
 * Definitions used (kept identical everywhere in the UI):
 *  - total sales      = sum of invoice totals, VAT included
 *  - collected        = sum of recorded payments
 *  - outstanding      = sales − collected (clamped at 0 per invoice)
 *  - delayed payments = outstanding on invoices whose due date has passed
 *  - conversion rate  = won leads ÷ all leads
 */
export function buildStats({ leads = [], quotes = [], orders = [], invoices = [], rates = {}, today = todayStr(), months = 6 } = {}) {
  const vat = Number(rates?.vat ?? 0);
  const rows = (invoices || []).map((inv) => invoiceView(inv, vat, today));

  const sales = rows.reduce((s, r) => s + r.total, 0);
  const collected = rows.reduce((s, r) => s + r.paid, 0);
  const outstanding = rows.reduce((s, r) => s + r.balance, 0);
  const overdueRows = rows.filter((r) => r.overdue).sort((a, b) => b.late - a.late || b.balance - a.balance);
  const overdue = overdueRows.reduce((s, r) => s + r.balance, 0);
  const notYetDue = Math.max(0, outstanding - overdue);
  const withTotal = rows.filter((r) => r.total > 0);

  /* ---- leads / conversion ---- */
  const won = leads.filter((l) => l.stage === 'won').length;
  const lost = leads.filter((l) => l.stage === 'lost').length;
  const decided = won + lost;
  const conversion = leads.length ? (won / leads.length) * 100 : 0;
  const winRate = decided ? (won / decided) * 100 : 0;
  const funnel = LEAD_STAGES.map(([k]) => ({ key: k, count: leads.filter((l) => l.stage === k).length }));

  /* ---- quotations pipeline ---- */
  const openQuotes = quotes.filter((q) => ['draft', 'sent'].includes(q.status) && !q.converted);
  const pipeline = openQuotes.reduce((s, q) => s + safeTotals(q, vat).total, 0);
  const approvedQuotes = quotes.filter((q) => q.status === 'approved' && !q.converted);
  const approved = approvedQuotes.reduce((s, q) => s + safeTotals(q, vat).total, 0);

  /* ---- production ---- */
  const activeOrders = orders.filter((o) => !['draft', 'done'].includes(o.stage));
  const activeOrderValue = activeOrders.reduce((s, o) => s + Number(o.total || 0), 0);
  const doneOrders = orders.filter((o) => o.stage === 'done').length;

  /* ---- revenue by department (invoice value spread over its line items) ---- */
  const dept = {};
  rows.forEach(({ inv, total }) => {
    const subtotal = safeTotals(inv, vat).sub;
    const factor = subtotal ? total / subtotal : 1;
    (Array.isArray(inv.items) ? inv.items : []).forEach((it) => {
      const k = it.dept || 'general';
      dept[k] = (dept[k] || 0) + Number(it.price || 0) * factor;
    });
  });
  const byDept = Object.entries(dept)
    .map(([key, value]) => ({ key, value, share: sales ? (value / sales) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);

  /* ---- month buckets: invoiced in that month vs cash received in that month ---- */
  const anchor = parseDay(today) || new Date();
  const keys = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const bucket = Object.fromEntries(keys.map((k) => [k, { key: k, invoiced: 0, collected: 0 }]));
  rows.forEach(({ inv, total }) => {
    const ik = monthKey(inv.date);
    if (bucket[ik]) bucket[ik].invoiced += total;
    (Array.isArray(inv.payments) ? inv.payments : []).forEach((p) => {
      const pk = monthKey(p.date || inv.date);
      if (bucket[pk]) bucket[pk].collected += Number(p.amount || 0);
    });
  });
  const byMonth = keys.map((k) => ({ ...bucket[k], label: monthLabel(k) }));

  /* ---- aging buckets for the outstanding balance ---- */
  const bucketOf = (r) => {
    if (!r.overdue) return 0;
    if (r.late <= 30) return 1;
    if (r.late <= 60) return 2;
    if (r.late <= 90) return 3;
    return 4;
  };
  const AGING = [
    ['current', 'Not due yet', 'غير مستحق'],
    ['d30', '1–30 days late', 'متأخر 1–30 يوم'],
    ['d60', '31–60 days late', 'متأخر 31–60 يوم'],
    ['d90', '61–90 days late', 'متأخر 61–90 يوم'],
    ['d90p', '90+ days late', 'متأخر أكثر من 90 يوم'],
  ];
  const aging = AGING.map(([key, en, ar], i) => {
    const list = rows.filter((r) => r.balance > 0 && bucketOf(r) === i);
    return { key, en, ar, amount: list.reduce((s, r) => s + r.balance, 0), count: list.length };
  });

  /* ---- per client ---- */
  const clients = {};
  rows.forEach((r) => {
    const id = r.inv.clientId || '—';
    const e = clients[id] || (clients[id] = { id, sales: 0, collected: 0, balance: 0 });
    e.sales += r.total;
    e.collected += r.paid;
    e.balance += r.balance;
  });
  const topClients = Object.values(clients)
    .sort((a, b) => b.collected - a.collected || b.sales - a.sales)
    .slice(0, 5)
    .map((e) => ({ ...e, name: leads.find((l) => l.id === e.id)?.name || '—' }));

  const overdueList = overdueRows.slice(0, 6).map((r) => ({
    id: r.inv.id,
    no: r.inv.no,
    client: leads.find((l) => l.id === r.inv.clientId)?.name || '—',
    due: r.due,
    late: r.late,
    balance: r.balance,
  }));

  return {
    /* money */
    sales,
    collected,
    outstanding,
    overdue,
    overdueCount: overdueRows.length,
    notYetDue,
    collectionRate: sales ? Math.min(100, (collected / sales) * 100) : 0,
    invoiceCount: rows.length,
    avgInvoice: withTotal.length ? sales / withTotal.length : 0,
    /* funnel */
    conversion,
    winRate,
    won,
    lost,
    funnel,
    activeLeads: leads.filter((l) => !['won', 'lost'].includes(l.stage)).length,
    newLeads: leads.filter((l) => l.stage === 'new').length,
    /* quotes */
    pipeline,
    openQuotes: openQuotes.length,
    approved,
    approvedQuotes: approvedQuotes.length,
    /* production */
    activeOrders: activeOrders.length,
    activeOrderValue,
    doneOrders,
    /* breakdowns */
    byDept,
    byMonth,
    aging,
    topClients,
    overdueList,
  };
}
