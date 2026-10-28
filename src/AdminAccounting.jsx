import React, { useEffect, useMemo, useState } from 'react';
import {
  Wallet, Receipt, ShoppingCart, Banknote, Plus, Trash2, Pencil, Download, Search, Check,
  AlertTriangle, ArrowRight, ExternalLink, CalendarDays, BookUser,
} from 'lucide-react';
import { useApp, uid } from './store.jsx';
import { Modal, Field } from './ui.jsx';
import { todayStr, addDays, safeTotals } from './adminStats.js';
import {
  PUR_CATS, CASH_CATS, catName, nextNo, purchaseView, cashView, carryFrom, accountingSummary, toCsv,
} from './accounting.js';
import { payerOptions, payerOf, isCash, isPartner, clientOf } from './directory.js';
import Directory, { EntityPicker } from './Directory.jsx';

const TONE = { gold: 'text-gold', emerald: 'text-emerald-500', red: 'text-red-400', terra: 'text-terra', sky: 'text-sky-400' };
const BADGE = {
  paid: 'bg-emerald-500/15 text-emerald-500',
  partial: 'bg-amber-500/15 text-amber-500',
  open: 'bg-sky-500/15 text-sky-400',
  overdue: 'bg-red-500/15 text-red-400',
  sent: 'bg-gold/20 text-gold',
  draft: 'bg-zinc-500/20 text-zinc-400',
  approved: 'bg-emerald-500/15 text-emerald-500',
  rejected: 'bg-red-500/15 text-red-400',
};

/* ---------- shared building blocks (module level: keeps focus while typing) ---------- */
function Tip({ icon: Icon, label, value, hint, tone = 'gold' }) {
  return (
    <div className="glass p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide opacity-60"><Icon size={14} className={TONE[tone]} />{label}</div>
      <div className={`text-2xl leading-tight font-extrabold mt-1.5 tabular-nums ${TONE[tone]}`}>{value}</div>
      {hint && <div className="text-[11px] opacity-50 mt-1.5 leading-snug">{hint}</div>}
    </div>
  );
}

function Panel({ title, sub, action, children, className = '' }) {
  return (
    <section className={`glass p-5 ${className}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-bold text-sm leading-tight">{title}</h3>
          {sub && <p className="text-[11px] opacity-50 mt-1">{sub}</p>}
        </div>
        {action && <div className="ms-auto shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

function Line({ label, value, strong, tone }) {
  return (
    <div className={`flex items-center justify-between gap-3 py-1 text-sm ${strong ? 'font-bold' : ''}`}>
      <span className={strong ? '' : 'opacity-60'}>{label}</span>
      <span className={`tabular-nums ${tone || ''}`}>{value}</span>
    </div>
  );
}

function Bar({ pct, className = 'bg-gold' }) {
  const w = Math.max(0, Math.min(100, Number(pct) || 0));
  return <div className="h-1.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden"><div className={`h-full rounded-full ${className}`} style={{ width: `${w}%` }} /></div>;
}

/** Amount input that commits on blur/Enter so typing "12." never rewrites the caret. */
function AmountInput({ v = 0, onCommit, className = '', ...rest }) {
  const [text, setText] = useState(v ? String(v) : '');
  useEffect(() => { setText(v ? String(v) : ''); }, [v]);
  const commit = () => {
    const n = parseFloat(text);
    onCommit(Number.isFinite(n) ? n : 0);
  };
  return (
    <input
      className={`input tabular-nums ${className}`} inputMode="decimal" value={text}
      onChange={(e) => setText(e.target.value)} onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); e.currentTarget.blur(); } }}
      {...rest}
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

const statusOf = (v) => (v.balance <= 0.005 ? 'paid' : v.overdue ? 'overdue' : v.paid > 0 ? 'partial' : 'open');

/** Who actually put the money down: the pocket-money box, the company, or a partner. */
function PayerSelect({ v = 'cash', on, kind = 'expense', className = '' }) {
  const { T } = useApp();
  return (
    <select className={`input ${className}`} value={v || (kind === 'bill' ? 'company' : 'cash')} onChange={(e) => on(e.target.value)}>
      {payerOptions(kind).map((p) => <option key={p.id} value={p.id}>{T(p.en, p.ar)}</option>)}
    </select>
  );
}

/* ================= Overview ================= */
function Overview({ s, onTab, onNav }) {
  const { T, money, rates } = useApp();
  const max = Math.max(1, ...s.byMonth.flatMap((m) => [m.sales, m.purchases, m.petty]));
  const collected = s.salesGross ? (s.collected / s.salesGross) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Tip icon={Receipt} label={T('Invoiced', 'المفوتر')} value={money(s.salesGross)} hint={`${s.invoiceCount} ${T('invoices', 'فاتورة')} · ${T('VAT included', 'شامل الضريبة')}`} />
        <Tip icon={Wallet} label={T('Collected', 'المحصّل')} value={money(s.collected)} hint={`${collected.toFixed(0)}% ${T('of invoiced', 'من المفوتر')}`} tone="emerald" />
        <Tip icon={AlertTriangle} label={T('Receivables', 'ذمم العملاء')} value={money(s.receivables)} hint={s.receivablesOverdue > 0 ? `${money(s.receivablesOverdue)} ${T('late on', 'متأخر على')} ${s.lateInvoiceCount}` : T('Nothing late', 'لا يوجد متأخر')} tone="terra" />
        <Tip icon={ShoppingCart} label={T('Supplier bills', 'فواتير الموردين')} value={money(s.purchasesGross)} hint={`${s.purchaseCount} ${T('bills', 'فاتورة')}`} tone="sky" />
        <Tip icon={ArrowRight} label={T('Payables', 'ذمم الموردين')} value={money(s.payables)} hint={s.payablesOverdue > 0 ? `${money(s.payablesOverdue)} ${T('overdue', 'متأخر')}` : T('All settled', 'مسدد بالكامل')} tone={s.payables ? 'red' : 'emerald'} />
        <Tip icon={Banknote} label={T('Petty cash spent', 'مصروف نقد المصروف')} value={money(s.petty)} hint={`${s.pettyDays} ${T('days logged', 'يوم مسجّل')}`} />
        <Tip icon={Wallet} label={T('Cash in hand', 'النقد المتبقي')} value={money(s.cashOnHand)} hint={s.latestDay ? `${T('Last box', 'آخر صندوق')} ${s.latestDay.date}` : T('No cash box yet', 'لا يوجد صندوق بعد')} tone={s.cashOnHand < 0 ? 'red' : 'emerald'} />
        <Tip icon={Check} label={T('Net profit', 'صافي الربح')} value={money(s.netProfit)} hint={`${s.margin.toFixed(0)}% ${T('margin on sales', 'هامش على المبيعات')}`} tone={s.netProfit >= 0 ? 'emerald' : 'red'} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title={T('Profit & loss', 'الأرباح والخسائر')} sub={T('Excludes VAT — VAT is collected for the tax office, not earned.', 'بدون الضريبة — الضريبة تُحصّل لصالح دائرة الضريبة وليست إيراداً.')}>
          <Line label={T('Sales (net of VAT)', 'المبيعات بدون ضريبة')} value={money(s.salesNet)} />
          <Line label={T('Purchases (net of VAT)', 'المشتريات بدون ضريبة')} value={`− ${money(s.purchasesNet)}`} tone="text-terra" />
          <Line label={T('Gross profit', 'الربح الإجمالي')} value={money(s.grossProfit)} strong />
          <div className="h-px bg-black/10 dark:bg-white/10 my-1.5" />
          <Line label={T('Petty cash expenses', 'مصروفات نقد المصروف')} value={`− ${money(s.petty)}`} tone="text-terra" />
          <Line label={T('Net profit', 'صافي الربح')} value={money(s.netProfit)} strong tone={s.netProfit >= 0 ? 'text-emerald-500' : 'text-red-400'} />
          <div className="mt-3"><Bar pct={s.margin} className={s.netProfit >= 0 ? 'bg-emerald-500' : 'bg-red-500'} /></div>
        </Panel>

        <Panel
          title={T('VAT position', 'موقف ضريبة القيمة المضافة')}
          sub={`${T('Company rate', 'نسبة الشركة')} ${rates.vat}% · ${T('output − input', 'المبيعات − المشتريات')}`}
          action={<button type="button" className="btn-ghost !py-1.5 !px-3 text-xs" onClick={() => onTab('purchases')}><ArrowRight size={13} />{T('Bills', 'الفواتير')}</button>}
        >
          <Line label={T('Output VAT (sales)', 'ضريبة المبيعات')} value={money(s.salesVat)} tone="text-emerald-500" />
          <Line label={T('Input VAT (purchases)', 'ضريبة المشتريات')} value={`− ${money(s.purchasesVat)}`} tone="text-terra" />
          <div className="h-px bg-black/10 dark:bg-white/10 my-1.5" />
          <Line label={T('Payable to the tax office', 'المستحق للضريبة')} value={money(s.vatDue)} strong tone={s.vatDue >= 0 ? 'text-gold' : 'text-emerald-500'} />
          <p className="text-[11px] opacity-45 mt-3 leading-snug">
            {T('A negative amount means you paid more input VAT than you charged — it carries forward.', 'القيمة السالبة تعني أن ضريبة مشترياتك أكبر من مبيعاتك — تُرحّل للفترة القادمة.')}
          </p>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel
          title={T('Last 6 months', 'آخر ٦ أشهر')}
          sub={T('Sales · purchases · petty cash, per month', 'المبيعات · المشتريات · نقد المصروف لكل شهر')}
          action={<div className="flex items-center gap-3 text-[10px] opacity-60">
            <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-gold inline-block" />{T('Sales', 'مبيعات')}</span>
            <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-terra inline-block" />{T('Bills', 'مشتريات')}</span>
            <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-sky-400 inline-block" />{T('Cash', 'نقد')}</span>
          </div>}
        >
          <div className="space-y-2.5">
            {s.byMonth.map((m) => (
              <div key={m.key} className="grid grid-cols-[46px_1fr] gap-3 items-center">
                <span className="text-[10px] opacity-50 tabular-nums">{m.label}</span>
                <div className="space-y-1">
                  <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-gold" style={{ width: `${(m.sales / max) * 100}%` }} title={money(m.sales)} /></div>
                  <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-terra" style={{ width: `${(m.purchases / max) * 100}%` }} title={money(m.purchases)} /></div>
                  <div className="h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-sky-400" style={{ width: `${(m.petty / max) * 100}%` }} title={money(m.petty)} /></div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title={T('Purchases by category', 'المشتريات حسب الفئة')} sub={T('Where the money went, VAT included.', 'أين ذهب المال، شامل الضريبة.')}>
            {s.byCat.length ? (
              <div className="space-y-2">
                {s.byCat.map((c) => (
                  <div key={c.key}>
                    <div className="flex justify-between text-[11px] mb-1"><span className="opacity-70">{T(c.en, c.ar)}</span><span className="tabular-nums">{money(c.value)}</span></div>
                    <Bar pct={s.purchasesGross ? (c.value / s.purchasesGross) * 100 : 0} className="bg-sky-400" />
                  </div>
                ))}
              </div>
            ) : <p className="text-sm opacity-50 py-4 text-center">{T('No supplier bills yet — add one in the Purchases tab.', 'لا توجد فواتير موردين بعد — أضف واحدة من تبويب المشتريات.')}</p>}
          </Panel>

          <Panel
            title={T('Quotations pipeline', 'عروض قيد الانتظار')}
            sub={T('Money quoted but not invoiced yet.', 'عروض لم تُفوتر بعد.')}
            action={<button type="button" className="btn-ghost !py-1.5 !px-3 text-xs" onClick={() => onNav('quotes')}><ExternalLink size={13} />{T('Quotes', 'العروض')}</button>}
          >
            <Line label={`${T('Open quotes', 'عروض مفتوحة')} (${s.openQuoteCount})`} value={money(s.pipeline)} />
            <Line label={`${T('Approved, not invoiced', 'معتمدة وغير مفوترة')} (${s.approvedQuoteCount})`} value={money(s.approved)} tone="text-emerald-500" />
          </Panel>

          <Panel
            title={T('Who paid', 'من دفع')}
            sub={T('Every petty expense and supplier settlement, by source.', 'كل مصروف ودفعة مورد حسب مصدر المال.')}
            action={<button type="button" className="btn-ghost !py-1.5 !px-3 text-xs" onClick={() => onTab('cash')}><ArrowRight size={13} />{T('Pocket money', 'نقد المصروف')}</button>}
          >
            {s.byPayer.length ? (
              <div className="space-y-2">
                {s.byPayer.map((p) => (
                  <div key={p.id}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="opacity-70">{T(p.en, p.ar)}</span>
                      <span className="tabular-nums">{money(p.value)}</span>
                    </div>
                    <Bar pct={(p.value / Math.max(1, s.paidByCompany + s.petty)) * 100} className={p.id === 'cash' ? 'bg-terra' : isPartner(p.id) ? 'bg-amber-500' : 'bg-sky-400'} />
                  </div>
                ))}
              </div>
            ) : <p className="text-sm opacity-50 py-4 text-center">{T('Nothing paid yet.', 'لا مدفوعات بعد.')}</p>}
            {s.partnerOut > 0 && (
              <p className="text-[11px] mt-3 leading-snug text-amber-500">
                {T(`Partners funded ${money(s.partnerOut)} — this is owed back to them.`, `مول الشركاء ${money(s.partnerOut)} — يُرد لهم.`)}
              </p>
            )}
          </Panel>
        </div>
      </div>

      <p className="text-[11px] opacity-45 leading-relaxed">
        {T(
          'How this stays balanced: sales come from the Invoices tab, supplier bills from Purchases, and everyday cash from Pocket money. Petty cash is treated as an operating expense, so it is subtracted after gross profit.',
          'كيف تتوازن الأرقام: المبيعات من تبويب الفواتير، وفواتير الموردين من المشتريات، والمصروف اليومي من نقد المصروف. يُحسب نقد المصروف كمصروف تشغيلي ويُخصم بعد الربح الإجمالي.',
        )}
      </p>
    </div>
  );
}

/* ================= Sales (read-only mirror) ================= */
function Sales({ s, onNav }) {
  const { T, money, leads, quotes, rates, customers } = useApp();
  const [q, setQ] = useState('');
  /* Customer directory first, CRM lead as the fallback for documents issued before it existed. */
  const client = (doc) => {
    const d = typeof doc === 'string' ? { clientId: doc } : (doc || {});
    const c = clientOf(d, customers, leads);
    if (!c) return '—';
    return [c.company, c.name].filter(Boolean).join(' · ') || '—';
  };
  const hit = (no, name) => !q || `${no} ${name}`.toLowerCase().includes(q.toLowerCase());
  const invRows = s.invoices.filter((r) => hit(r.inv.no, client(r.inv.clientId)));
  const qRows = quotes.filter((x) => hit(x.no, client(x.clientId)));

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Tip icon={Receipt} label={T('Invoiced', 'المفوتر')} value={money(s.salesGross)} hint={`${s.invoiceCount} ${T('invoices', 'فاتورة')}`} />
        <Tip icon={Wallet} label={T('Collected', 'المحصّل')} value={money(s.collected)} hint={T('Money in the bank', 'المال في البنك')} tone="emerald" />
        <Tip icon={AlertTriangle} label={T('Receivables', 'ذمم العملاء')} value={money(s.receivables)} hint={`${T('Overdue', 'متأخر')} ${money(s.receivablesOverdue)}`} tone="terra" />
        <Tip icon={ShoppingCart} label={T('Pipeline', 'العروض المفتوحة')} value={money(s.pipeline)} hint={`${s.openQuoteCount} ${T('open quotes', 'عرض مفتوح')}`} tone="sky" />
      </div>

      <Panel
        title={T('Invoices', 'الفواتير')}
        sub={T('Issued documents and what is still owed on each one.', 'المستندات الصادرة والمتبقي على كل منها.')}
        action={<div className="flex gap-2">
          <div className="relative hidden sm:block">
            <Search size={13} className="absolute start-2.5 top-1/2 -translate-y-1/2 opacity-40" />
            <input className="input !py-1.5 ps-8 !text-xs !w-44" placeholder={T('Search number or client', 'بحث برقم أو عميل')} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button type="button" className="btn-ghost !py-1.5 !px-3 text-xs" onClick={() => onNav('invoices')}><ExternalLink size={13} />{T('Manage invoices', 'إدارة الفواتير')}</button>
        </div>}
      >
        <div className="overflow-auto -mx-1">
          <table className="w-full text-sm">
            <thead className="text-[11px] opacity-55">
              <tr>{['#', T('Client', 'العميل'), T('Date', 'التاريخ'), T('Total', 'الإجمالي'), T('Paid', 'المدفوع'), T('Balance', 'المتبقي'), T('Status', 'الحالة')].map((h) => <th key={h} className="p-2 text-start font-semibold whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody>
              {invRows.map((r) => {
                const st = statusOf(r);
                return (
                  <tr key={r.inv.id} className="border-t border-black/5 dark:border-white/10">
                    <td className="p-2 font-semibold whitespace-nowrap">{r.inv.no}</td>
                    <td className="p-2">{client(r.inv.clientId)}</td>
                    <td className="p-2 text-xs opacity-60 whitespace-nowrap" dir="ltr">{r.inv.date}</td>
                    <td className="p-2 tabular-nums">{money(r.total)}</td>
                    <td className="p-2 tabular-nums text-emerald-500">{money(r.paid)}</td>
                    <td className={`p-2 tabular-nums font-bold ${r.balance > 0 ? 'text-terra' : 'opacity-40'}`}>{money(r.balance)}</td>
                    <td className="p-2"><span className={`badge ${BADGE[st]}`}>{T({ paid: 'Paid', partial: 'Partial', open: 'Open', overdue: 'Overdue' }[st], { paid: 'مدفوعة', partial: 'جزئي', open: 'مفتوحة', overdue: 'متأخرة' }[st])}</span></td>
                  </tr>
                );
              })}
              {!invRows.length && <tr><td colSpan="7" className="p-6 text-center opacity-50 text-sm">{T('No invoices match.', 'لا توجد فواتير مطابقة.')}</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title={T('Quotations', 'عروض الأسعار')}
        sub={T('Not revenue yet — they only become sales when invoiced.', 'ليست إيراداً بعد — تصبح مبيعات عند الفوترة.')}
        action={<button type="button" className="btn-ghost !py-1.5 !px-3 text-xs" onClick={() => onNav('quotes')}><ExternalLink size={13} />{T('Manage quotes', 'إدارة العروض')}</button>}
      >
        <div className="overflow-auto -mx-1">
          <table className="w-full text-sm">
            <thead className="text-[11px] opacity-55">
              <tr>{['#', T('Client', 'العميل'), T('Date', 'التاريخ'), T('Total', 'الإجمالي'), T('Status', 'الحالة'), ''].map((h, i) => <th key={i} className="p-2 text-start font-semibold whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody>
              {qRows.slice(0, 40).map((x) => (
                <tr key={x.id} className="border-t border-black/5 dark:border-white/10">
                  <td className="p-2 font-semibold whitespace-nowrap">{x.no}</td>
                  <td className="p-2">{client(x.clientId)}</td>
                  <td className="p-2 text-xs opacity-60 whitespace-nowrap" dir="ltr">{x.date}</td>
                  <td className="p-2 tabular-nums">{money(safeTotals(x, rates.vat).total)}</td>
                  <td className="p-2"><span className={`badge ${BADGE[x.status] || 'bg-zinc-500/20'}`}>{T({ draft: 'Draft', sent: 'Sent', approved: 'Approved', rejected: 'Rejected' }[x.status] || x.status, { draft: 'مسودة', sent: 'مرسل', approved: 'معتمد', rejected: 'مرفوض' }[x.status] || x.status)}</span></td>
                  <td className="p-2 text-xs opacity-50">{x.converted ? T('Invoiced', 'مفوتر') : ''}</td>
                </tr>
              ))}
              {!qRows.length && <tr><td colSpan="6" className="p-6 text-center opacity-50 text-sm">{T('No quotations match.', 'لا توجد عروض مطابقة.')}</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* ================= Purchases ================= */
function PurchaseEditor({ draft, onClose, onSave, onDelete }) {
  const { T, money, rates } = useApp();
  const [d, setD] = useState(draft);
  const v = purchaseView(d, rates.vat);
  const set = (p) => setD({ ...d, ...p });
  return (
    <Modal wide title={d.no} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSave(d); }} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <EntityPicker
              kind="supplier" label={T('Supplier', 'المورد')} value={d.supplierId}
              nameFallback={d.supplier}
              onPick={(e) => set({ supplierId: e ? e.id : '', supplier: e ? e.name : '' })}
            />
          </div>
          <div>
            <label className="label">{T('Category', 'الفئة')}</label>
            <select className="input" value={d.cat} onChange={(e) => set({ cat: e.target.value })}>
              {PUR_CATS.map(([k, en, ar]) => <option key={k} value={k}>{T(en, ar)}</option>)}
            </select>
          </div>
          <Field label={T('Bill date', 'تاريخ الفاتورة')} type="date" v={d.date} on={(date) => set({ date })} />
          <Field label={T('Pay by', 'تاريخ السداد')} type="date" v={d.due} on={(due) => set({ due })} />
          <div>
            <label className="label">{T('Net amount (before VAT)', 'الصافي قبل الضريبة')}</label>
            <AmountInput v={d.amount} onCommit={(amount) => set({ amount })} aria-label={T('Net amount', 'الصافي')} />
          </div>
          <div>
            <label className="label">{T('Already paid', 'المدفوع')}</label>
            <AmountInput v={d.paid} onCommit={(paid) => set({ paid })} aria-label={T('Paid', 'المدفوع')} />
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="accent-[#C9A45C]" checked={d.vat !== false} onChange={(e) => set({ vat: e.target.checked })} />
            {T('Add VAT', 'إضافة ضريبة')} <span className="tabular-nums opacity-60">{v.rate}%</span>
          </label>
          <span className="text-[11px] opacity-50">{T('Paid by', 'دُفعت من')}</span>
          <PayerSelect v={d.paidBy} kind="bill" on={(paidBy) => set({ paidBy })} className="!w-auto !py-1.5 !text-xs" />
          <select className="input !w-auto !py-1.5 !text-xs" value={d.method || 'cash'} onChange={(e) => set({ method: e.target.value })}>
            <option value="bank">{T('Bank transfer', 'حوالة بنكية')}</option>
            <option value="cash">{T('Cash', 'نقداً')}</option>
            <option value="cheque">{T('Cheque', 'شيك')}</option>
          </select>
        </div>
        <p className="text-[11px] opacity-45 -mt-1">
          {T('Supplier bills are settled from the company account, by cheque or transfer — never from the daily pocket money.', 'فواتير الموردين تُسدد من حساب الشركة بشيك أو حوالة — وليس من نقد المصروف اليومي.')}
        </p>

        <div className="rounded-xl bg-black/5 dark:bg-white/5 p-3">
          <Line label={T('Net', 'الصافي')} value={money(v.net)} />
          <Line label={T('VAT', 'الضريبة')} value={money(v.vat)} />
          <Line label={T('Total bill', 'إجمالي الفاتورة')} value={money(v.total)} strong tone="text-gold" />
          <Line label={T('Still owed', 'المتبقي للمورد')} value={money(v.balance)} tone={v.balance ? 'text-terra' : 'text-emerald-500'} />
        </div>

        <div>
          <label className="label">{T('Notes', 'ملاحظات')}</label>
          <textarea className="input" rows="2" value={d.notes || ''} onChange={(e) => set({ notes: e.target.value })} />
        </div>

        <div className="flex gap-2">
          <button className="btn-gold flex-1">{T('Save bill', 'حفظ الفاتورة')}</button>
          <button type="button" className="btn-ghost text-red-400" onClick={() => onDelete(d.id)}><Trash2 size={14} />{T('Delete', 'حذف')}</button>
        </div>
      </form>
    </Modal>
  );
}

function Purchases({ s }) {
  const { T, lang, money, rates, purchases, suppliers, upd } = useApp();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [edit, setEdit] = useState(null);

  const rows = useMemo(
    () => s.purchases
      .filter((v) => (!cat || (v.p.cat || 'other') === cat))
      .filter((v) => !q || `${v.supplier} ${v.p.no} ${v.p.notes || ''}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => String(b.p.date).localeCompare(String(a.p.date))),
    [s.purchases, q, cat],
  );

  const blank = () => ({
    id: uid('pur'), no: nextNo(purchases, 'PUR'), date: todayStr(), due: addDays(todayStr(), 30),
    supplier: '', supplierId: '', cat: 'materials', amount: 0, vat: true, vatRate: rates.vat, paid: 0,
    paidBy: 'company', method: 'bank', notes: '',
  });

  const save = (d) => {
    const sup = (suppliers || []).find((x) => x.id === d.supplierId);
    const rec = { ...d, supplier: String(sup ? sup.name : d.supplier || '').trim(), updated: new Date().toISOString() };
    upd((o) => ({
      purchases: o.purchases.some((x) => x.id === rec.id)
        ? o.purchases.map((x) => (x.id === rec.id ? rec : x))
        : [rec, ...o.purchases],
    }));
    setEdit(null);
  };

  const remove = (id) => {
    if (!confirm(T('Delete this bill?', 'حذف هذه الفاتورة؟'))) return;
    upd((o) => ({ purchases: o.purchases.filter((x) => x.id !== id) }));
    setEdit(null);
  };

  const settle = (v) => upd((o) => ({ purchases: o.purchases.map((x) => (x.id === v.p.id ? { ...x, paid: v.total } : x)) }));

  const exportCsv = () => saveCsv(`purchases-${todayStr()}.csv`, toCsv(rows, [
    { label: 'No', get: (v) => v.p.no },
    { label: 'Date', get: (v) => v.p.date },
    { label: 'Supplier', get: (v) => v.supplier },
    { label: 'Category', get: (v) => catName(PUR_CATS, v.p.cat, 'en') },
    { label: 'Net', get: (v) => v.net },
    { label: 'VAT', get: (v) => v.vat },
    { label: 'Total', get: (v) => v.total },
    { label: 'Paid', get: (v) => v.paid },
    { label: 'Balance', get: (v) => v.balance },
    { label: 'Status', get: (v) => statusOf(v) },
  ]));

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Tip icon={ShoppingCart} label={T('Bills', 'الفواتير')} value={money(s.purchasesGross)} hint={`${s.purchaseCount} ${T('bills', 'فاتورة')} · ${T('VAT', 'ضريبة')} ${money(s.purchasesVat)}`} tone="sky" />
        <Tip icon={Check} label={T('Paid to suppliers', 'المدفوع للموردين')} value={money(s.supplierPaid)} hint={T('Across all bills', 'على كل الفواتير')} tone="emerald" />
        <Tip icon={ArrowRight} label={T('Still owed', 'المتبقي للموردين')} value={money(s.payables)} hint={T('Accounts payable', 'ذمم دائنة')} tone="terra" />
        <Tip icon={AlertTriangle} label={T('Overdue bills', 'فواتير متأخرة')} value={money(s.payablesOverdue)} hint={`${s.latePurchaseCount} ${T('past their date', 'تجاوزت تاريخها')}`} tone={s.payablesOverdue ? 'red' : 'emerald'} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-[300px]">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 opacity-40" />
          <input className="input !py-2 ps-9" placeholder={T('Search supplier or number', 'بحث بمورد أو رقم')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input !w-auto !py-2 !text-xs" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">{T('All categories', 'كل الفئات')}</option>
          {PUR_CATS.map(([k, en, ar]) => <option key={k} value={k}>{T(en, ar)}</option>)}
        </select>
        <button type="button" className="btn-ghost !py-2 !px-3 text-xs" onClick={exportCsv}><Download size={14} />{T('CSV', 'CSV')}</button>
        <button type="button" className="btn-terra text-xs ms-auto" onClick={() => setEdit(blank())}><Plus size={15} />{T('New bill', 'فاتورة جديدة')}</button>
      </div>

      <div className="glass overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-[11px] opacity-55">
            <tr>{['#', T('Date', 'التاريخ'), T('Supplier', 'المورد'), T('Category', 'الفئة'), T('Net', 'الصافي'), T('VAT', 'ضريبة'), T('Total', 'الإجمالي'), T('Paid', 'المدفوع'), T('Balance', 'المتبقي'), T('Status', 'الحالة'), ''].map((h, i) => <th key={i} className="p-2.5 text-start font-semibold whitespace-nowrap">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((v) => {
              const st = statusOf(v);
              return (
                <tr key={v.p.id} className="border-t border-black/5 dark:border-white/10 hover:bg-gold/5">
                  <td className="p-2.5 font-semibold whitespace-nowrap">{v.p.no}</td>
                  <td className="p-2.5 text-xs opacity-60 whitespace-nowrap" dir="ltr">{v.p.date}</td>
                  <td className="p-2.5 min-w-[130px]">{v.supplier}</td>
                  <td className="p-2.5 text-xs opacity-60 whitespace-nowrap">{catName(PUR_CATS, v.p.cat, lang)}</td>
                  <td className="p-2.5 tabular-nums">{money(v.net)}</td>
                  <td className="p-2.5 tabular-nums opacity-70">{money(v.vat)}</td>
                  <td className="p-2.5 tabular-nums font-semibold">{money(v.total)}</td>
                  <td className="p-2.5 tabular-nums text-emerald-500">
                    {money(v.paid)}
                    {v.paid > 0.005 && <div className="text-[10px] opacity-45 whitespace-nowrap font-normal">{T(payerOf(v.p.paidBy || 'company').en, payerOf(v.p.paidBy || 'company').ar)}</div>}
                  </td>
                  <td className={`p-2.5 tabular-nums font-bold ${v.balance ? 'text-terra' : 'opacity-40'}`}>{money(v.balance)}</td>
                  <td className="p-2.5 whitespace-nowrap">
                    <span className={`badge ${BADGE[st]}`}>{T({ paid: 'Paid', partial: 'Partial', open: 'Open', overdue: 'Overdue' }[st], { paid: 'مدفوعة', partial: 'جزئي', open: 'مفتوحة', overdue: 'متأخرة' }[st])}</span>
                    {v.overdue && <span className="text-[10px] text-red-400 ms-1">{v.late}d</span>}
                  </td>
                  <td className="p-2.5 whitespace-nowrap text-end">
                    {v.balance > 0.005 && <button type="button" className="text-emerald-500 me-2" title={T('Mark fully paid', 'تعليم كمدفوعة')} onClick={() => settle(v)}><Check size={15} /></button>}
                    <button type="button" className="text-gold" title={T('Edit', 'تحرير')} onClick={() => setEdit({ ...v.p, vatRate: v.p.vatRate ?? rates.vat })}><Pencil size={14} /></button>
                  </td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan="11" className="p-8 text-center opacity-50">{T('No supplier bills yet. Add the first one to start tracking costs and VAT.', 'لا توجد فواتير موردين بعد. أضف الأولى لبدء تتبع التكاليف والضريبة.')}</td></tr>}
          </tbody>
        </table>
      </div>

      {edit && <PurchaseEditor draft={edit} onClose={() => setEdit(null)} onSave={save} onDelete={remove} />}
    </div>
  );
}

/* ================= Pocket money ================= */
function PocketMoney({ s }) {
  const { T, lang, money, cash, upd } = useApp();
  const [date, setDate] = useState(todayStr());
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [cat, setCat] = useState('other');
  const [openAmt, setOpenAmt] = useState('');
  const [paidBy, setPaidBy] = useState('cash');
  const [sup, setSup] = useState(null);

  const days = useMemo(() => cash.map(cashView).sort((a, b) => b.date.localeCompare(a.date)), [cash]);
  const day = days.find((d) => d.date === date) || null;
  const suggested = carryFrom(cash, date);

  const openDay = () => {
    const n = parseFloat(openAmt);
    const rec = { id: uid('cash'), date, open: Number.isFinite(n) ? n : suggested, expenses: [], closed: false };
    upd((o) => ({ cash: [rec, ...o.cash] }));
    setOpenAmt('');
  };

  const setOpen = (open) => upd((o) => ({ cash: o.cash.map((d) => (d.id === day.id ? { ...d, open } : d)) }));

  const addExpense = (e) => {
    e.preventDefault();
    const n = parseFloat(amount);
    if (!day || !label.trim() || !Number.isFinite(n) || n <= 0) return;
    const rec = {
      id: uid('e'), label: label.trim(), amount: n, cat, at: new Date().toTimeString().slice(0, 5),
      paidBy, supplierId: sup ? sup.id : '', supplier: sup ? sup.name : '',
    };
    upd((o) => ({ cash: o.cash.map((d) => (d.id === day.id ? { ...d, expenses: [...(d.expenses || []), rec] } : d)) }));
    setLabel(''); setAmount(''); setSup(null); setPaidBy('cash');
  };

  const delExpense = (id) => upd((o) => ({ cash: o.cash.map((d) => (d.id === day.id ? { ...d, expenses: (d.expenses || []).filter((x) => x.id !== id) } : d)) }));

  const carry = () => {
    if (!day) return;
    const next = addDays(day.date, 1);
    const exists = cash.find((d) => d.date === next);
    upd((o) => {
      const marked = o.cash.map((d) => (d.id === day.id ? { ...d, closed: true } : d));
      return exists
        ? { cash: marked }
        : { cash: [{ id: uid('cash'), date: next, open: day.remaining, expenses: [], carriedFrom: day.date }, ...marked] };
    });
    setDate(next);
  };

  const delDay = (id) => {
    if (!confirm(T('Delete this cash day and its expenses?', 'حذف يوم الصندوق ومصروفاته؟'))) return;
    upd((o) => ({ cash: o.cash.filter((d) => d.id !== id) }));
  };

  const monthKeyNow = todayStr().slice(0, 7);
  const monthSpent = days.filter((d) => d.date.slice(0, 7) === monthKeyNow).reduce((sum, d) => sum + d.spent, 0);
  const monthOutside = days.filter((d) => d.date.slice(0, 7) === monthKeyNow).reduce((sum, d) => sum + d.outside, 0);

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Tip icon={Banknote} label={T('Cash in hand', 'النقد المتبقي')} value={money(s.cashOnHand)} hint={s.latestDay ? `${T('Latest box', 'آخر صندوق')} ${s.latestDay.date}` : T('No box opened yet', 'لم يُفتح صندوق بعد')} tone={s.cashOnHand < 0 ? 'red' : 'emerald'} />
        <Tip icon={CalendarDays} label={T('Spent this month', 'مصروف هذا الشهر')} value={money(monthSpent)} hint={T('From the cash box', 'من الصندوق')} tone="terra" />
        <Tip icon={Wallet} label={T('Paid outside the box', 'مدفوع خارج الصندوق')} value={money(monthOutside)} hint={T('Company account or a partner', 'حساب الشركة أو أحد الشركاء')} tone="sky" />
        <Tip icon={Wallet} label={T('Days logged', 'أيام مسجّلة')} value={String(days.length)} hint={`${T('Total spent', 'إجمالي المصروف')} ${money(s.petty)}`} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button type="button" className="btn-ghost !py-2 !px-3 text-xs" onClick={() => setDate(addDays(date, -1))}>{T('Previous', 'السابق')}</button>
          <input type="date" className="input !w-auto !py-2" value={date} onChange={(e) => setDate(e.target.value)} />
          <button type="button" className="btn-ghost !py-2 !px-3 text-xs" onClick={() => setDate(addDays(date, 1))}>{T('Next', 'التالي')}</button>
          <button type="button" className="btn-ghost !py-2 !px-3 text-xs" onClick={() => setDate(todayStr())}>{T('Today', 'اليوم')}</button>
        </div>
        {suggested !== 0 && (
          <span className="text-[11px] opacity-55">
            {T('Carried from the previous day', 'مرحّل من اليوم السابق')}: <b className="tabular-nums">{money(suggested)}</b>
          </span>
        )}
      </div>

      {!day ? (
        <Panel title={T('No cash box for this day', 'لا يوجد صندوق لهذا اليوم')} sub={T('Set how much cash is handed over in the morning, then log what goes out.', 'حدّد المبلغ النقدي المسلّم صباحاً ثم سجّل المصروف.')}>
          <div className="flex items-end gap-2 flex-wrap max-w-md">
            <div className="flex-1 min-w-[140px]">
              <label className="label">{T('Cash handed over (JOD)', 'المبلغ المسلّم (دينار)')}</label>
              <input className="input tabular-nums" inputMode="decimal" placeholder={suggested ? String(suggested) : '0'} value={openAmt} onChange={(e) => setOpenAmt(e.target.value)} />
            </div>
            <button type="button" className="btn-gold" onClick={openDay}><Plus size={15} />{T('Open cash box', 'فتح الصندوق')}</button>
          </div>
          {suggested !== 0 && <p className="text-[11px] opacity-50 mt-2">{T('Leave it empty to carry over the previous remainder.', 'اتركه فارغاً لترحيل المتبقي من اليوم السابق.')}</p>}
        </Panel>
      ) : (
        <div className="grid xl:grid-cols-5 gap-4 items-start">
          <div className="xl:col-span-3 space-y-4">
            <Panel
              title={`${T('Cash box', 'صندوق النقد')} · ${day.date}`}
              sub={day.carriedFrom ? `${T('Carried from', 'مرحّل من')} ${day.carriedFrom}` : T('Daily pocket money', 'نقد المصروف اليومي')}
              action={<div className="flex gap-2">
                <button type="button" className="btn-ghost !py-1.5 !px-3 text-xs" onClick={carry} title={T('Create tomorrow with the remainder', 'إنشاء يوم الغد بالمتبقي')}><ArrowRight size={13} />{T('Carry over', 'ترحيل')}</button>
                <button type="button" className="btn-ghost !py-1.5 !px-3 text-xs text-red-400" onClick={() => delDay(day.id)}><Trash2 size={13} /></button>
              </div>}
            >
              <div className="grid grid-cols-3 gap-3 items-end">
                <div>
                  <label className="label">{T('Handed over', 'المسلّم')}</label>
                  <AmountInput v={day.open} onCommit={setOpen} aria-label={T('Handed over', 'المسلّم')} />
                </div>
                <div>
                  <div className="label">{T('Spent from the box', 'المصروف من الصندوق')}</div>
                  <div className="text-lg font-extrabold tabular-nums text-terra">{money(day.spent)}</div>
                  {day.outside > 0 && <div className="text-[10px] opacity-50">{T('Outside the box', 'خارج الصندوق')}: {money(day.outside)}</div>}
                </div>
                <div>
                  <div className="label">{T('Remaining', 'المتبقي')}</div>
                  <div className={`text-lg font-extrabold tabular-nums ${day.over ? 'text-red-400' : 'text-emerald-500'}`}>{money(day.remaining)}</div>
                </div>
              </div>
              <div className="mt-3"><Bar pct={day.open ? (day.spent / day.open) * 100 : 0} className={day.over ? 'bg-red-500' : 'bg-emerald-500'} /></div>
              {day.over && <p className="text-[11px] text-red-400 mt-2 flex items-center gap-1"><AlertTriangle size={12} />{T('You spent more than what was handed over.', 'صرفت أكثر من المبلغ المسلّم.')}</p>}
              <p className="text-[11px] opacity-45 mt-2">{T('Remaining cash is what you hand over for the next day — use “Carry over”.', 'المتبقي هو ما يُسلَّم لليوم التالي — استخدم "ترحيل".')}</p>
            </Panel>

            <Panel title={T('Expenses', 'المصروفات')} sub={T('Every payment of the day — from the box, the company or a partner.', 'كل دفعة في اليوم — من الصندوق أو الشركة أو أحد الشركاء.')}>
              <form onSubmit={addExpense} className="mb-3 space-y-2">
                <div className="flex gap-2 flex-wrap">
                  <select className="input !w-auto !py-2 !text-xs" value={cat} onChange={(e) => setCat(e.target.value)}>
                    {CASH_CATS.map(([k, en, ar]) => <option key={k} value={k}>{T(en, ar)}</option>)}
                  </select>
                  <input className="input flex-1 min-w-[140px] !py-2" placeholder={T('What was it for?', 'على ماذا صُرف؟')} value={label} onChange={(e) => setLabel(e.target.value)} />
                  <input className="input !w-28 !py-2 tabular-nums" inputMode="decimal" placeholder={T('Amount', 'المبلغ')} value={amount} onChange={(e) => setAmount(e.target.value)} />
                  <button className="btn-gold !py-2" disabled={!label.trim() || !parseFloat(amount)}><Plus size={14} />{T('Add', 'إضافة')}</button>
                </div>
                <div className="flex gap-2 flex-wrap items-end">
                  <div className="min-w-[150px]">
                    <label className="label">{T('Paid by', 'دُفعت من')}</label>
                    <PayerSelect v={paidBy} on={setPaidBy} className="!py-1.5 !text-xs" />
                  </div>
                  <div className="flex-1 min-w-[190px]">
                    <label className="label">{T('Supplier (optional)', 'المورد (اختياري)')}</label>
                    <EntityPicker kind="supplier" value={sup ? sup.id : ''} onPick={(x) => setSup(x)} placeholder={T('Search suppliers…', 'بحث في الموردين…')} />
                  </div>
                </div>
                <p className="text-[11px] opacity-45">
                  {T('Only “Pocket money” reduces the box. Company and partner payments are tracked separately and never touch the daily remainder.',
                    'فقط «نقد المصروف» يُخصم من الصندوق. مدفوعات الشركة والشركاء تُتابع منفصلة ولا تمس المتبقي اليومي.')}
                </p>
              </form>
              <div className="divide-y divide-black/5 dark:divide-white/10">
                {day.expenses.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 py-2 text-sm">
                    <span className="text-[10px] opacity-40 tabular-nums w-10" dir="ltr">{e.at || ''}</span>
                    <span className="badge bg-black/5 dark:bg-white/10 text-[10px] opacity-70 whitespace-nowrap">{catName(CASH_CATS, e.cat, lang)}</span>
                    <span className="flex-1 min-w-0 truncate">
                      {e.label}
                      {e.supplier && <span className="text-[10px] opacity-50"> · {e.supplier}</span>}
                    </span>
                    <span className={`badge text-[10px] whitespace-nowrap ${isCash(e.paidBy) ? 'bg-black/5 dark:bg-white/10 opacity-60' : isPartner(e.paidBy) ? 'bg-amber-500/15 text-amber-500' : 'bg-sky-500/15 text-sky-400'}`}>
                      {T(payerOf(e.paidBy).en, payerOf(e.paidBy).ar)}
                    </span>
                    <span className="tabular-nums font-semibold">{money(e.amount)}</span>
                    <button type="button" className="text-red-400/70 hover:text-red-400" onClick={() => delExpense(e.id)}><Trash2 size={13} /></button>
                  </div>
                ))}
                {!day.expenses.length && <p className="text-sm opacity-45 py-4 text-center">{T('Nothing spent yet today.', 'لا مصروفات في هذا اليوم.')}</p>}
              </div>
            </Panel>
          </div>

          <div className="xl:col-span-2 space-y-4">
            <Panel title={T('Where the cash went', 'أين ذهب النقد')} sub={T('This day, by category.', 'هذا اليوم حسب الفئة.')}>
              {day.expenses.length ? (
                <div className="space-y-2">
                  {CASH_CATS.map(([k, en, ar]) => {
                    const v = day.expenses.filter((e) => (e.cat || 'other') === k).reduce((sum, e) => sum + Number(e.amount || 0), 0);
                    if (!v) return null;
                    return (
                      <div key={k}>
                        <div className="flex justify-between text-[11px] mb-1"><span className="opacity-70">{T(en, ar)}</span><span className="tabular-nums">{money(v)}</span></div>
                        <Bar pct={day.total ? (v / day.total) * 100 : 0} className="bg-terra" />
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-xs opacity-45 py-3 text-center">{T('No expenses to break down.', 'لا مصروفات للتحليل.')}</p>}
            </Panel>

            <Panel title={T('Hand-over chain', 'سلسلة التسليم')} sub={T('Each day starts with what the previous day left.', 'كل يوم يبدأ بما تبقى من اليوم السابق.')}>
              <div className="space-y-1.5">
                {days.slice(0, 7).map((d) => (
                  <button key={d.id} type="button" onClick={() => setDate(d.date)}
                    className={`w-full flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg transition ${d.date === date ? 'bg-gold/15' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
                    <span className="tabular-nums opacity-60" dir="ltr">{d.date}</span>
                    <span className="ms-auto tabular-nums opacity-60">{money(d.open)}</span>
                    <ArrowRight size={11} className="opacity-30" />
                    <span className={`tabular-nums font-semibold ${d.over ? 'text-red-400' : 'text-emerald-500'}`}>{money(d.remaining)}</span>
                    {d.closed && <Check size={12} className="text-emerald-500" />}
                  </button>
                ))}
                {!days.length && <p className="text-xs opacity-45 py-3 text-center">{T('No days yet.', 'لا أيام بعد.')}</p>}
              </div>
            </Panel>
          </div>
        </div>
      )}

      <Panel title={T('History', 'السجل')} sub={T('Every cash day, newest first.', 'كل أيام الصندوق، الأحدث أولاً.')}
        action={<button type="button" className="btn-ghost !py-1.5 !px-3 text-xs" onClick={() => saveCsv(`petty-cash-${todayStr()}.csv`, toCsv(days, [
          { label: 'Date', get: (d) => d.date },
          { label: 'Handed over', get: (d) => d.open },
          { label: 'Spent from box', get: (d) => d.spent },
          { label: 'Paid outside', get: (d) => d.outside },
          { label: 'Remaining', get: (d) => d.remaining },
          { label: 'Expenses', get: (d) => d.count },
        ]))}><Download size={13} />{T('CSV', 'CSV')}</button>}
      >
        <div className="overflow-auto -mx-1">
          <table className="w-full text-sm">
            <thead className="text-[11px] opacity-55">
              <tr>{[T('Date', 'التاريخ'), T('Handed over', 'المسلّم'), T('Spent (box)', 'من الصندوق'), T('Outside', 'خارج الصندوق'), T('Remaining', 'المتبقي'), T('Items', 'البنود'), ''].map((h, i) => <th key={i} className="p-2 text-start font-semibold whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.id} className="border-t border-black/5 dark:border-white/10 cursor-pointer hover:bg-gold/5" onClick={() => setDate(d.date)}>
                  <td className="p-2 tabular-nums whitespace-nowrap" dir="ltr">{d.date}</td>
                  <td className="p-2 tabular-nums">{money(d.open)}</td>
                  <td className="p-2 tabular-nums text-terra">{money(d.spent)}</td>
                  <td className="p-2 tabular-nums opacity-60">{d.outside ? money(d.outside) : '—'}</td>
                  <td className={`p-2 tabular-nums font-bold ${d.over ? 'text-red-400' : 'text-emerald-500'}`}>{money(d.remaining)}</td>
                  <td className="p-2 tabular-nums opacity-60">{d.count}</td>
                  <td className="p-2 text-xs opacity-50">{d.closed ? T('Closed', 'مغلق') : T('Open', 'مفتوح')}</td>
                </tr>
              ))}
              {!days.length && <tr><td colSpan="7" className="p-6 text-center opacity-50">{T('Open the first cash box above.', 'افتح أول صندوق من الأعلى.')}</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* ================= Shell of the accounting tab ================= */
const TABS = [
  ['overview', Wallet, 'Overview', 'الملخص'],
  ['sales', Receipt, 'Sales', 'المبيعات'],
  ['purchases', ShoppingCart, 'Purchases', 'المشتريات'],
  ['cash', Banknote, 'Pocket money', 'نقد المصروف'],
  ['directory', BookUser, 'Directory', 'العملاء والموردون'],
];

export default function Accounting({ onNav }) {
  const { T, invoices, quotes, purchases, cash, rates, customers, suppliers } = useApp();
  const [tab, setTab] = useState('overview');
  const s = useMemo(() => accountingSummary({ invoices, quotes, purchases, cash, rates }), [invoices, quotes, purchases, cash, rates]);
  const count = (k) => (k === 'sales' ? s.invoiceCount
    : k === 'purchases' ? s.purchaseCount
      : k === 'cash' ? s.pettyDays
        : k === 'directory' ? (customers || []).length + (suppliers || []).length
          : null);

  return (
    <div>
      {/* sticky toolbar: switch a book without losing your place */}
      <div className="sticky top-[49px] md:top-[53px] z-10 -mx-4 md:-mx-8 px-4 md:px-8 py-3 mb-4 bg-cream-50/92 dark:bg-ink/92 backdrop-blur border-b border-black/5 dark:border-white/10">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5 overflow-x-auto max-w-full">
            {TABS.map(([k, Icon, en, ar]) => (
              <button key={k} type="button" onClick={() => setTab(k)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${tab === k ? 'bg-gold text-ink shadow-sm' : 'opacity-70 hover:opacity-100'}`}>
                <Icon size={13} />{T(en, ar)}{count(k) != null && <span className="opacity-60">({count(k)})</span>}
              </button>
            ))}
          </div>
          <div className="ms-auto flex items-center gap-3 text-[11px]">
            <span className="opacity-45 hidden sm:inline">{T('Edits save instantly to the server.', 'التعديلات تُحفظ فوراً على الخادم.')}</span>
          </div>
        </div>
      </div>

      {tab === 'overview' && <Overview s={s} onTab={setTab} onNav={onNav} />}
      {tab === 'sales' && <Sales s={s} onNav={onNav} />}
      {tab === 'purchases' && <Purchases s={s} />}
      {tab === 'cash' && <PocketMoney s={s} />}
      {tab === 'directory' && <Directory />}
    </div>
  );
}
