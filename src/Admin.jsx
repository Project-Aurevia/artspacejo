import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard, Tag, Users, FileText, Hammer, Receipt, Sun, Moon, Languages, Globe, Plus, RotateCcw, Trash2, Kanban, Table2, LogOut, Download, Upload, Images, Building2, Ruler, AlertTriangle, Percent, Wallet,
  Search, ExternalLink,
} from 'lucide-react';
import Logo from './Logo.jsx';
import { CatalogEditor, ContentManager } from './AdminContent.jsx';
import { signageQuote, printQuote, addonOn } from './pricing.js';
import CompanySettings from './AdminCompany.jsx';
import Surveys from './AdminSurveys.jsx';
import { Quotes, Orders, Invoices } from './AdminDocs.jsx';
import Accounting from './AdminAccounting.jsx';
import { Modal, Stat, Badge, FileLink, Field, stageName } from './ui.jsx';
import { sb, serverHealth } from './api.js';
import { useApp, totals, LEAD_STAGES, LEAD_CATS, ORDER_STAGES, QUOTE_STATUS, DEFAULT_RATES } from './store.jsx';
import { buildStats } from './adminStats.js';

const DEPT_COLOR = { signage: '#C9A45C', booths: '#5B8FB9', printing: '#CB6B47', social: '#8E7CC3', marketing: '#7DA7A1', general: '#9CA3AF' };
const TONE = { gold: 'text-gold', emerald: 'text-emerald-500', red: 'text-red-400', sky: 'text-sky-400', terra: 'text-terra', violet: 'text-violet-400' };
const FUNNEL_BAR = ['bg-sky-400', 'bg-sky-400', 'bg-violet-400', 'bg-gold', 'bg-amber-400', 'bg-emerald-500', 'bg-red-400'];

/* ================= Dashboard building blocks ================= */
function Panel({ title, sub, action, className = '', children }) {
  return (
    <section className={`glass p-5 ${className}`}>
      <div className="flex items-start gap-3 mb-4">
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

function MiniBar({ pct, className = 'bg-gold' }) {
  const w = Math.max(0, Math.min(100, Number(pct) || 0));
  return <div className="h-1.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden"><div className={`h-full rounded-full ${className}`} style={{ width: `${w}%` }} /></div>;
}

function Kpi({ icon: Icon, label, value, hint, tone = 'gold', bar }) {
  return (
    <div className="glass p-5">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide opacity-60"><Icon size={14} className={TONE[tone]} />{label}</div>
      <div className={`text-[26px] leading-tight font-extrabold mt-2 ${TONE[tone]}`}>{value}</div>
      {bar != null && <div className="mt-3"><MiniBar pct={bar} className={tone === 'emerald' ? 'bg-emerald-500' : tone === 'red' ? 'bg-red-500' : 'bg-gold'} /></div>}
      {hint && <div className="text-[11px] opacity-50 mt-2 leading-snug">{hint}</div>}
    </div>
  );
}

function Tile({ label, value, hint, tone = 'gold' }) {
  return (
    <div className="glass px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wide font-semibold opacity-50">{label}</div>
        <div className={`text-lg font-extrabold mt-0.5 ${TONE[tone]}`}>{value}</div>
      </div>
      <div className="text-[10px] opacity-45 text-end leading-tight max-w-[45%]">{hint}</div>
    </div>
  );
}

const Empty = ({ children }) => <p className="text-sm opacity-50 py-6 text-center">{children}</p>;

/* ================= Dashboard ================= */
function Dashboard({ onNav }) {
  const { T, money, lang, rates, quotes, orders, leads, invoices } = useApp();
  // One pass over the data; the memo keeps typing elsewhere snappy on big data sets.
  const s = useMemo(() => buildStats({ leads, quotes, orders, invoices, rates }), [leads, quotes, orders, invoices, rates]);
  const pc = (n) => `${Math.round((Number(n) || 0) * 10) / 10}%`;
  const monthName = (key) => {
    const [y, m] = String(key).split('-').map(Number);
    return new Date(y, (m || 1) - 1, 1).toLocaleDateString(lang === 'ar' ? 'ar-JO' : 'en-GB', { month: 'short' });
  };
  const maxMonth = Math.max(1, ...s.byMonth.map((m) => Math.max(m.invoiced, m.collected)));
  const maxFunnel = Math.max(1, ...s.funnel.map((f) => f.count));
  const deptName = (k) => ({
    signage: T('Signage', 'آرمات'), booths: T('Booths', 'بوثات'), printing: T('Printing', 'مطبوعات'),
    social: T('Social Media', 'سوشيال'), marketing: T('Strategy', 'استشارات'),
  }[k] || T('Other / mixed', 'أخرى / متنوع'));
  const openInvoices = () => onNav && onNav('invoices');

  return (
    <div className="space-y-4">
      {/* headline commercial KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Receipt} label={T('Total sales', 'إجمالي المبيعات')} value={money(s.sales)}
          hint={`${s.invoiceCount} ${T('invoices', 'فاتورة')} · ${T('avg', 'متوسط')} ${money(s.avgInvoice)}`} />
        <Kpi icon={Wallet} label={T('Collected', 'المحصّل')} value={money(s.collected)} tone="emerald" bar={s.collectionRate}
          hint={`${T('Collection rate', 'نسبة التحصيل')} ${pc(s.collectionRate)}`} />
        <Kpi icon={AlertTriangle} label={T('Delayed payments', 'الدفعات المتأخرة')} value={money(s.overdue)} tone="red"
          hint={s.overdueCount ? `${s.overdueCount} ${T('invoices past due', 'فاتورة متأخرة')}` : T('Nothing overdue', 'لا يوجد تأخير')} />
        <Kpi icon={Percent} label={T('Conversion rate', 'نسبة التحويل')} value={pc(s.conversion)} tone="sky"
          hint={`${s.won}/${leads.length} ${T('leads won', 'عميل تم ربحه')} · ${T('win rate', 'نسبة الفوز')} ${pc(s.winRate)}`} />
      </div>

      {/* secondary money-at-a-glance strip */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label={T('Outstanding, not due', 'مستحق غير متأخر')} value={money(s.notYetDue)} hint={T('invoiced, awaiting payment', 'مفوتر بانتظار السداد')} />
        <Tile label={T('Open pipeline', 'قيمة العروض المفتوحة')} value={money(s.pipeline)} tone="sky" hint={`${s.openQuotes} ${T('quotations', 'عرض سعر')}`} />
        <Tile label={T('Approved, not invoiced', 'معتمد غير مفوتر')} value={money(s.approved)} tone="violet" hint={`${s.approvedQuotes} ${T('ready to bill', 'جاهز للفوترة')}`} />
        <Tile label={T('In production', 'قيد التنفيذ')} value={money(s.activeOrderValue)} tone="terra" hint={`${s.activeOrders} ${T('active orders', 'طلب نشط')}`} />
      </div>

      {/* trend + department split */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title={T('Cash flow — last 6 months', 'التدفق النقدي — آخر 6 أشهر')}
          sub={T('Gold = invoiced · Green = collected', 'ذهبي = مفوتر · أخضر = محصّل')}
          action={<span className="text-[11px] opacity-50">{T('Outstanding', 'المتبقي')} {money(s.outstanding)}</span>}>
          <div className="flex items-end gap-2 sm:gap-3 h-44">
            {s.byMonth.map((m) => (
              <div key={m.key} className="flex-1 h-full flex flex-col justify-end items-center gap-2">
                <div className="flex items-end justify-center gap-1 w-full h-full">
                  <div className="w-1/3 max-w-[26px] rounded-t-md bg-gold/80" title={`${T('Invoiced', 'مفوتر')}: ${money(m.invoiced)}`} style={{ height: `${(m.invoiced / maxMonth) * 100}%`, minHeight: m.invoiced > 0 ? 4 : 0 }} />
                  <div className="w-1/3 max-w-[26px] rounded-t-md bg-emerald-500/80" title={`${T('Collected', 'محصّل')}: ${money(m.collected)}`} style={{ height: `${(m.collected / maxMonth) * 100}%`, minHeight: m.collected > 0 ? 4 : 0 }} />
                </div>
                <span className="text-[10px] opacity-60 whitespace-nowrap">{monthName(m.key)}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title={T('Revenue by department', 'الإيرادات حسب القسم')} sub={T('Share of invoiced value', 'حصة القيمة المفوترة')}>
          {s.byDept.length === 0 ? <Empty>{T('No invoices yet.', 'لا توجد فواتير.')}</Empty> : (
            <div className="space-y-3">
              {s.byDept.map((d) => (
                <div key={d.key}>
                  <div className="flex justify-between gap-2 text-[11px] mb-1"><span className="opacity-70 truncate">{deptName(d.key)}</span><span className="font-semibold whitespace-nowrap">{pc(d.share)}<span className="opacity-40"> · {money(d.value)}</span></span></div>
                  <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(100, d.share)}%`, background: DEPT_COLOR[d.key] || '#9CA3AF' }} /></div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* funnel + aging + clients */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title={T('Sales funnel', 'مسار البيع')} sub={T('Leads by stage', 'العملاء حسب المرحلة')}>
          {leads.length === 0 ? <Empty>{T('No leads yet.', 'لا يوجد عملاء بعد.')}</Empty> : (
            <div className="space-y-2.5">
              {s.funnel.map((f, i) => (
                <div key={f.key}>
                  <div className="flex justify-between text-[11px] mb-1"><span className="opacity-70">{stageName(LEAD_STAGES, f.key, lang)}</span><span className="font-semibold">{f.count}<span className="opacity-40"> · {Math.round((f.count / Math.max(1, leads.length)) * 100)}%</span></span></div>
                  <MiniBar pct={(f.count / maxFunnel) * 100} className={FUNNEL_BAR[i] || 'bg-gold'} />
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title={T('Outstanding by age', 'الأرصدة حسب العمر')} sub={T('How late the money is', 'مدى تأخر التحصيل')}>
          {s.outstanding <= 0 ? <Empty>{T('Everything is collected.', 'كل المبالغ محصّلة.')}</Empty> : (
            <div className="space-y-3">
              {s.aging.map((a, i) => (
                <div key={a.key}>
                  <div className="flex justify-between gap-2 text-[11px] mb-1"><span className={i === 0 ? 'opacity-70' : 'text-red-400'}>{lang === 'ar' ? a.ar : a.en}</span><span className="font-semibold whitespace-nowrap">{money(a.amount)}<span className="opacity-40"> ({a.count})</span></span></div>
                  <MiniBar pct={s.outstanding ? (a.amount / s.outstanding) * 100 : 0} className={i === 0 ? 'bg-gold' : i < 3 ? 'bg-amber-500' : 'bg-red-500'} />
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title={T('Top clients', 'أفضل العملاء')} sub={T('By cash collected', 'حسب المبالغ المحصّلة')}
          action={<button type="button" className="text-[11px] text-gold" onClick={() => onNav && onNav('crm')}>{T('CRM', 'العملاء')}</button>}>
          {s.topClients.length === 0 ? <Empty>{T('No invoices yet.', 'لا توجد فواتير.')}</Empty> : (
            <div>{s.topClients.map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-2 border-b border-black/5 dark:border-white/10 last:border-0 text-sm">
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-emerald-500 font-semibold whitespace-nowrap">{money(c.collected)}</span>
                {c.balance > 0 && <span className="text-[10px] text-terra whitespace-nowrap">{money(c.balance)} {T('due', 'مستحق')}</span>}
              </div>
            ))}</div>
          )}
        </Panel>
      </div>

      {/* delayed payments + newest leads */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title={T('Delayed payments', 'الدفعات المتأخرة')}
          sub={s.overdueCount ? `${s.overdueCount} ${T('invoices · most overdue first', 'فاتورة · الأكثر تأخراً أولاً')}` : T('Nothing overdue', 'لا يوجد تأخير')}
          action={<button type="button" className="btn-ghost !py-1.5 !px-3 text-[11px]" onClick={openInvoices}><Receipt size={13} />{T('Invoices', 'الفواتير')}</button>}>
          {s.overdueList.length === 0 ? <Empty>{T('No invoice is past its due date.', 'لا توجد فاتورة تجاوزت تاريخ استحقاقها.')}</Empty> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] opacity-50"><tr>{[T('Invoice', 'الفاتورة'), T('Client', 'العميل'), T('Due', 'الاستحقاق'), T('Late', 'التأخير'), T('Balance', 'المتبقي')].map((h) => <th key={h} className="text-start px-2 py-2 font-semibold">{h}</th>)}</tr></thead>
                <tbody>{s.overdueList.map((o) => (
                  <tr key={o.id} className="border-t border-black/5 dark:border-white/10">
                    <td className="px-2 py-2 font-semibold whitespace-nowrap">{o.no}</td>
                    <td className="px-2 py-2 truncate max-w-[170px]">{o.client}</td>
                    <td className="px-2 py-2 text-xs opacity-60" dir="ltr">{o.due}</td>
                    <td className="px-2 py-2"><span className="badge bg-red-500/15 text-red-400 whitespace-nowrap">{o.late} {T('days', 'يوم')}</span></td>
                    <td className="px-2 py-2 font-bold text-terra whitespace-nowrap">{money(o.balance)}</td>
                  </tr>))}</tbody>
              </table>
            </div>
          )}
        </Panel>
        <Panel title={T('Latest leads', 'أحدث العملاء')} sub={`${s.newLeads} ${T('waiting for first contact', 'بانتظار أول تواصل')}`}>
          {leads.length === 0 ? <Empty>{T('No leads yet.', 'لا يوجد عملاء بعد.')}</Empty> : (
            <div>{leads.slice(0, 5).map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-2 text-sm py-2 border-b border-black/5 dark:border-white/10 last:border-0">
                <span className="truncate">{l.name} <span className="opacity-50">· {l.company}</span></span>
                <Badge id={l.stage}>{stageName(LEAD_STAGES, l.stage, lang)}</Badge>
              </div>
            ))}</div>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ================= Pricing ================= */
const PRICE_GROUPS = [
  ['area', 'Materials', 'المواد', 'per m²', 'للمتر المربع'],
  ['addons', 'Add-ons', 'الإضافات', 'per m² or flat', 'للمتر أو مقطوع'],
  ['print', 'Printing', 'المطبوعات', 'per piece', 'للقطعة'],
  ['packages', 'Social packages', 'باقات السوشيال', 'per month', 'شهرياً'],
  ['marketing', 'Strategy', 'الاستراتيجيات', 'flat', 'مقطوع'],
];
const LAM_NAME = { none: ['None', 'بدون'], matt: ['Matt', 'مطفي'], gloss: ['Gloss', 'لامع'], uv: ['Spot UV', 'UV موضعي'] };

const PriceRow = ({ label, value, muted }) => (
  <div className="flex items-baseline gap-3 text-sm py-0.5">
    <span className={`flex-1 min-w-0 truncate ${muted ? 'opacity-55' : 'opacity-80'}`}>{label}</span>
    <span className="tabular-nums shrink-0 font-semibold">{value}</span>
  </div>
);

/** Runs the exact same formulas as the public calculator, so the owner sees what the customer sees. */
function PricePreview({ onManage }) {
  const { T, tx, lang, money, rates } = useApp();
  const [mode, setMode] = useState('signage');
  const [mat, setMat] = useState('');
  const [dim, setDim] = useState({ w: 4, h: 1 });
  const [sel, setSel] = useState({});
  const [pr, setPr] = useState({ item: '', size: '', paper: 350, lam: 'matt', sides: 2, qty: 500 });

  const areaKeys = Object.keys(rates.area || {});
  const printKeys = Object.keys(rates.print || {});
  const matKey = areaKeys.includes(mat) ? mat : areaKeys[0];
  const itKey = printKeys.includes(pr.item) ? pr.item : printKeys[0];
  const sg = useMemo(() => signageQuote(rates, { mat: matKey, w: dim.w, h: dim.h, sel }), [rates, matKey, dim, sel]);
  const pq = useMemo(() => printQuote(rates, { item: itKey, size: pr.size, paper: pr.paper, lam: pr.lam, sides: pr.sides, qty: pr.qty }), [rates, itKey, pr]);
  const vat = Number(rates.vat) || 0;
  const total = mode === 'signage' ? sg.total : pq.total;
  const MULT = { size: T('size', 'مقاس'), paper: T('paper', 'ورق'), lam: T('finish', 'تشطيب'), sides: T('sides', 'جهات'), qty: T('qty', 'كمية') };
  const lamName = (k) => { const n = LAM_NAME[k]; return n ? (lang === 'ar' ? n[1] : n[0]) : k; };

  return (
    <section className="glass p-5 xl:sticky xl:top-[112px]">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-bold text-sm leading-tight">{T('Live customer preview', 'معاينة مباشرة كما يراها العميل')}</h3>
        <span className="badge bg-emerald-500/15 text-emerald-500 ms-auto">{T('real-time', 'فوري')}</span>
      </div>
      <div className="flex gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5 mb-4">
        {[['signage', T('Signage', 'آرمات')], ['print', T('Printing', 'مطبوعات')]].map(([k, l]) => (
          <button key={k} type="button" onClick={() => setMode(k)}
            className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${mode === k ? 'bg-gold text-ink shadow-sm' : 'opacity-70 hover:opacity-100'}`}>{l}</button>
        ))}
      </div>

      {mode === 'signage' && (!matKey
        ? <p className="text-sm opacity-50 py-6 text-center">{T('Add a material first.', 'أضف مادة أولاً.')}</p>
        : <div className="space-y-3">
          <div><label className="label">{T('Material', 'الصنف')}</label>
            <select className="input" value={matKey} onChange={(e) => setMat(e.target.value)}>
              {areaKeys.map((k) => <option key={k} value={k}>{tx(rates.area[k])}</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-2">
            {[['w', T('Width (m)', 'العرض (م)')], ['h', T('Height (m)', 'الارتفاع (م)')]].map(([k, l]) => (
              <div key={k}><label className="label">{l}</label>
                <input type="number" step="0.1" min="0" className="input tabular-nums" value={dim[k]} onChange={(e) => setDim({ ...dim, [k]: parseFloat(e.target.value) || 0 })} /></div>
            ))}
          </div>
          <div className="rounded-lg bg-gold/15 px-3 py-2 text-xs">{T('Area', 'المساحة')}: {dim.w} × {dim.h} = <b className="text-gold">{sg.area.toFixed(2)} m²</b></div>
          {Object.keys(rates.addons || {}).length > 0 && <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold opacity-55">{T('Add-ons', 'الإضافات')}</span>
              <span className="text-[10px] opacity-35">{T('tick to test', 'حدّد للتجربة')}</span>
              <button type="button" onClick={() => onManage('addons')} className="text-[10px] opacity-50 hover:opacity-100 hover:text-gold ms-auto flex items-center gap-1">
                <Tag size={11} />{T('Edit this list', 'تحرير هذه القائمة')}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
              {Object.entries(rates.addons).map(([k, a]) => {
                const on = addonOn(a, sel, k);
                return (
                  <label key={k} className="flex items-start gap-1.5 text-xs cursor-pointer min-w-0">
                    <input type="checkbox" className="accent-[#C9A45C] shrink-0 mt-0.5" checked={on} onChange={(e) => setSel({ ...sel, [k]: e.target.checked })} />
                    <span className="min-w-0">
                      <span className={`block truncate ${on ? '' : 'opacity-55'}`}>{tx(a)}</span>
                      <span className="block text-[10px] opacity-35 truncate">{a.unit === 'flat' ? T('flat fee', 'مبلغ مقطوع') : T('per m²', 'للمتر المربع')} · {money(a.price)}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>}
          <div className="border-t border-black/10 dark:border-white/10 pt-2">
            {sg.lines.map((l) => <PriceRow key={l.k} label={tx(l)} value={money(l.v)} muted={l.k !== 'mat'} />)}
          </div>
        </div>)}

      {mode === 'print' && (!itKey
        ? <p className="text-sm opacity-50 py-6 text-center">{T('Add a printing item first.', 'أضف منتج طباعة أولاً.')}</p>
        : <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <label className="label !mb-0">{T('Item', 'المنتج')}</label>
              <button type="button" onClick={() => onManage('print')} className="text-[10px] opacity-50 hover:opacity-100 hover:text-gold ms-auto flex items-center gap-1">
                <Tag size={11} />{T('Edit this list', 'تحرير هذه القائمة')}
              </button>
            </div>
            <select className="input" value={itKey} onChange={(e) => setPr({ ...pr, item: e.target.value, size: '' })}>
              {printKeys.map((k) => <option key={k} value={k}>{tx(rates.print[k])}</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label">{T('Size', 'المقاس')}</label>
              <select className="input" value={pq.size} onChange={(e) => setPr({ ...pr, size: e.target.value })}>{pq.sizes.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
            <div><label className="label">{T('Paper', 'الورق')}</label>
              <select className="input" value={pr.paper} onChange={(e) => setPr({ ...pr, paper: +e.target.value })}>{Object.keys(rates.mult?.paper || {}).map((g) => <option key={g} value={g}>{g} g</option>)}</select></div>
            <div><label className="label">{T('Finish', 'التشطيب')}</label>
              <select className="input" value={pr.lam} onChange={(e) => setPr({ ...pr, lam: e.target.value })}>{Object.keys(rates.mult?.lam || {}).map((k) => <option key={k} value={k}>{lamName(k)}</option>)}</select></div>
            <div><label className="label">{T('Sides', 'الجهات')}</label>
              <select className="input" value={pr.sides} onChange={(e) => setPr({ ...pr, sides: +e.target.value })}>{Object.keys(rates.mult?.sides || {}).map((s) => <option key={s} value={s}>{Number(s) === 2 ? T('Double side', 'وجهين') : T('Single side', 'وجه واحد')}</option>)}</select></div>
          </div>
          <div><label className="label">{T('Quantity', 'الكمية')}</label>
            <div className="flex gap-1.5 flex-wrap">{Object.keys(rates.mult?.qty || {}).map(Number).map((q) => (
              <button key={q} type="button" onClick={() => setPr({ ...pr, qty: q })}
                className={`badge border transition tabular-nums ${pr.qty === q ? 'bg-gold text-ink border-gold' : 'border-black/10 dark:border-white/15'}`}>
                {q.toLocaleString('en-US')}{rates.mult.qty[q] < 1 && <span className="opacity-60"> −{Math.round((1 - rates.mult.qty[q]) * 100)}%</span>}
              </button>))}
            </div></div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(pq.mult).map(([k, v]) => (
              <span key={k} className={`badge tabular-nums ${v === 1 ? 'bg-black/5 dark:bg-white/5 opacity-50' : 'bg-gold/15 text-gold'}`}>{MULT[k]} ×{v}</span>
            ))}
          </div>
        </div>)}

      <div className="border-t border-black/10 dark:border-white/10 mt-4 pt-3">
        <PriceRow label={T('Subtotal before VAT', 'المجموع قبل الضريبة')} value={money(total)} />
        <PriceRow label={`${T('VAT', 'ضريبة')} ${vat}%`} value={money((total * vat) / 100)} muted />
        <div className="flex items-baseline gap-3 pt-2 mt-1 border-t border-black/5 dark:border-white/10">
          <span className="flex-1 text-sm font-bold">{T('Customer pays', 'يدفع العميل')}</span>
          <span className="text-xl font-extrabold text-gold tabular-nums">{money(total * (1 + vat / 100))}</span>
        </div>
        {mode === 'print' && <p className="text-[11px] opacity-45 mt-1 tabular-nums">{T('Unit price', 'سعر الوحدة')}: {money(pq.unit)} × {pq.pieces.toLocaleString('en-US')}</p>}
      </div>
    </section>
  );
}

function Multipliers() {
  const { T, lang, rates, upd } = useApp();
  const set = (g, k, v) => upd((o) => ({ rates: { ...o.rates, mult: { ...o.rates.mult, [g]: { ...o.rates.mult[g], [k]: v } } } }));
  const label = (g, k) => {
    if (g === 'paper') return `${k} g`;
    if (g === 'sides') return Number(k) === 2 ? T('Double side', 'وجهين') : T('Single side', 'وجه واحد');
    if (g === 'lam') { const n = LAM_NAME[k]; return n ? (lang === 'ar' ? n[1] : n[0]) : k; }
    if (g === 'qty') return Number(k).toLocaleString('en-US');
    return k;
  };
  const groups = [
    ['size', T('Size', 'المقاس')],
    ['paper', T('Paper weight', 'وزن الورق')],
    ['lam', T('Finish', 'التشطيب')],
    ['sides', T('Sides', 'الجهات')],
    ['qty', T('Quantity tier', 'شريحة الكمية')],
  ];
  return (
    <Panel
      title={<span className="text-gold">{T('Printing multipliers', 'معاملات المطبوعات')}</span>}
      sub={T('The printing base price is quoted for A5 · 150 g · no finish · single side · 100 pcs. Each choice multiplies that base; the quantity row is a per-piece discount.', 'السعر الأساسي للمطبوعات محسوب على A5 · 150غ · بدون سلوفان · وجه واحد · 100 قطعة. كل خيار يضرب هذا الأساس، وشريحة الكمية هي خصم على سعر القطعة.')}
    >
      <div className="grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {groups.map(([g, title]) => (
          <div key={g}>
            <div className="text-[10px] font-bold uppercase tracking-wide opacity-50 mb-2">{title}</div>
            <div className="space-y-1.5">
              {Object.entries(rates.mult?.[g] || {}).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5">
                  <span className="flex-1 min-w-0 truncate text-xs opacity-75">{label(g, k)}</span>
                  <input type="number" step="0.05" min="0" className="input !w-[72px] !py-1 text-end tabular-nums" value={v}
                    onChange={(e) => set(g, k, parseFloat(e.target.value) || 0)} aria-label={title} />
                  <span className={`text-[10px] w-10 text-end tabular-nums ${v < 1 ? 'text-emerald-500' : v > 1 ? 'text-gold' : 'opacity-35'}`}>
                    {v === 1 ? '×1' : v < 1 ? `−${Math.round((1 - v) * 100)}%` : `+${Math.round((v - 1) * 100)}%`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Pricing() {
  const { T, rates, upd, resetAll, leads, quotes, orders, invoices, surveys, purchases, cash, content, company } = useApp();
  const [g, setG] = useState('area');
  const [q, setQ] = useState('');
  const cur = PRICE_GROUPS.find((x) => x[0] === g) || PRICE_GROUPS[0];
  const count = (key) => Object.keys(rates[key] || {}).length;
  const exportData = () => {
    const data = JSON.stringify({ version: 3, rates, content, company, leads, quotes, orders, invoices, surveys, purchases, cash }, null, 1);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    a.download = `artspace-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };
  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    file.text().then((txt) => {
      try {
        const d = JSON.parse(txt);
        if (!d || typeof d !== 'object' || !d.rates) throw new Error('bad');
        if (!confirm(T('Replace current data with this backup?', 'استبدال البيانات الحالية بهذه النسخة؟'))) return;
        const pick = {};
        ['rates', 'content', 'company', 'leads', 'quotes', 'orders', 'invoices', 'surveys', 'purchases', 'cash'].forEach((k) => { if (d[k]) pick[k] = d[k]; });
        upd(pick);
      } catch { alert(T('Invalid backup file', 'ملف نسخة احتياطية غير صالح')); }
    });
  };
  return (
    <div>
      {/* sticky toolbar: switch catalog + search without losing your place in a long list */}
      <div className="sticky top-[49px] md:top-[53px] z-10 -mx-4 md:-mx-8 px-4 md:px-8 py-3 mb-4 bg-cream-50/92 dark:bg-ink/92 backdrop-blur border-b border-black/5 dark:border-white/10">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5 overflow-x-auto max-w-full">
            {PRICE_GROUPS.map(([k, en, ar]) => (
              <button key={k} type="button" onClick={() => { setG(k); setQ(''); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${g === k ? 'bg-gold text-ink shadow-sm' : 'opacity-70 hover:opacity-100'}`}>
                {T(en, ar)} <span className="opacity-60">({count(k)})</span>
              </button>
            ))}
          </div>
          <a href="/#calculator" target="_blank" rel="noreferrer" className="btn-ghost !py-2 !px-3 text-xs ms-auto">
            <ExternalLink size={14} />{T('Open website calculator', 'فتح حاسبة الموقع')}
          </a>
        </div>
        <div className="flex items-center gap-3 flex-wrap mt-2">
          <div className="relative flex-1 min-w-[160px] max-w-[280px]">
            <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 opacity-40" />
            <input className="input !py-2 ps-9" placeholder={`${T('Search', 'بحث')} · ${T(cur[1], cur[2])}`} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <span className="text-[11px] opacity-45">{T('Edits save instantly to the website.', 'التعديلات تُحفظ فوراً في الموقع.')}</span>
        </div>
      </div>

      <div className="grid xl:grid-cols-5 gap-4 items-start">
        <div className="xl:col-span-3">
          <CatalogEditor g={g} unit={T(cur[3], cur[4])} q={q} onAdd={() => setQ('')} />
          <p className="text-[11px] opacity-45 mt-2">{T('Click a row to rename it, edit its description, department or order. Prices, the charging basis and "ticked by default" are edited right in the row and save as you type.', 'اضغط أي صف لتغيير الاسم أو الوصف أو القسم أو الترتيب. السعر وطريقة الاحتساب وخيار "محدد افتراضياً" تُعدّل من الصف نفسه وتُحفظ أثناء الكتابة.')}</p>
        </div>
        <div className="xl:col-span-2"><PricePreview onManage={setG} /></div>
      </div>

      <div className="mt-4"><Multipliers /></div>

      <section className="glass p-5 mt-4">
        <h3 className="font-bold text-sm text-gold">{T('Tax, backup & reset', 'الضريبة والنسخ الاحتياطي')}</h3>
        <p className="text-[11px] opacity-50 mt-1 mb-4">{T('VAT applies to every quote, order and invoice. Export a copy before you reset anything.', 'الضريبة تُطبّق على كل عرض وطلب وفاتورة. صدّر نسخة قبل أي إعادة ضبط.')}</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-3 text-sm">
              <span className="flex-1">{T('VAT %', 'ضريبة القيمة المضافة %')}</span>
              <input type="number" className="input !w-24 text-end tabular-nums" value={rates.vat} onChange={(e) => upd((o) => ({ rates: { ...o.rates, vat: parseFloat(e.target.value) || 0 } }))} />
            </div>
            <div className="flex gap-2 mt-4 flex-wrap">
              <button className="btn-ghost text-xs" onClick={exportData}><Download size={14} />{T('Export backup', 'تصدير نسخة احتياطية')}</button>
              <label className="btn-ghost text-xs cursor-pointer"><Upload size={14} />{T('Import backup', 'استيراد نسخة')}<input type="file" accept="application/json" className="hidden" onChange={importData} /></label>
            </div>
          </div>
          <div className="rounded-xl border border-red-500/25 p-3">
            <div className="text-[11px] font-semibold text-red-400 flex items-center gap-1.5 mb-2"><AlertTriangle size={13} />{T('Danger zone', 'منطقة الخطر')}</div>
            <div className="flex gap-2 flex-wrap">
              <button className="btn-ghost text-xs" onClick={() => confirm(T('Reset every price to the factory defaults?', 'إعادة كل الأسعار إلى القيم الافتراضية؟')) && upd({ rates: JSON.parse(JSON.stringify(DEFAULT_RATES)) })}><RotateCcw size={14} />{T('Reset prices', 'إعادة الأسعار')}</button>
              <button className="btn-ghost text-xs text-red-400" onClick={() => confirm(T('Reset website settings on this browser?', 'إعادة ضبط إعدادات الموقع على هذا المتصفح؟')) && resetAll()}><Trash2 size={14} />{T('Reset local settings', 'إعادة ضبط الإعدادات المحلية')}</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ================= CRM ================= */
function CRM() {
  const { T, lang, leads, upd, quotes, orders, invoices, rates, money, addLeadLocal } = useApp();
  const [view, setView] = useState('kanban');
  const [sel, setSel] = useState(null);
  const [adding, setAdding] = useState(false);
  const [catF, setCatF] = useState('all');
  const [nf, setNf] = useState({ name: '', company: '', phone: '', email: '', notes: '', category: 'general' });
  const allLeads = leads;
  const shown = leads.filter((l) => catF === 'all' || (l.category || 'general') === catF);
  const catOf = (l) => LEAD_CATS.find((c) => c[0] === (l.category || 'general')) || LEAD_CATS[LEAD_CATS.length - 1];
  const CatDot = ({ l }) => { const c = catOf(l); return <span className="inline-flex items-center gap-1 text-[10px] opacity-80"><i className="w-2 h-2 rounded-full inline-block" style={{ background: c[3] }} />{lang === 'ar' ? c[2] : c[1]}</span>; };
  const setStage = (id, stage) => upd((o) => ({ leads: o.leads.map((l) => (l.id === id ? { ...l, stage } : l)) }));
  const patchLead = (id, p) => upd((o) => ({ leads: o.leads.map((l) => (l.id === id ? { ...l, ...p } : l)) }));
  const Select = ({ l }) => <select className="input !py-1 !text-xs" value={l.stage} onChange={(e) => setStage(l.id, e.target.value)} onClick={(e) => e.stopPropagation()}>{LEAD_STAGES.map(([k, en, ar]) => <option key={k} value={k}>{lang === 'ar' ? ar : en}</option>)}</select>;
  const client = leads.find((l) => l.id === sel);
  const balance = (cid) => invoices.filter((i) => i.clientId === cid).reduce((s, i) => s + totals(i, rates.vat).total - i.payments.reduce((a, p) => a + Number(p.amount), 0), 0);
  return (
    <div>
      <div className="flex gap-2 mb-3">
        <button className={`btn ${view === 'kanban' ? 'bg-gold text-ink' : 'btn-ghost'}`} onClick={() => setView('kanban')}><Kanban size={15} />Kanban</button>
        <button className={`btn ${view === 'table' ? 'bg-gold text-ink' : 'btn-ghost'}`} onClick={() => setView('table')}><Table2 size={15} />{T('Table', 'جدول')}</button>
        <button className="btn-terra ms-auto" onClick={() => setAdding(true)}><Plus size={15} />{T('Add Lead', 'عميل جديد')}</button>
      </div>
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {[['all', 'All', 'الكل', '#C9A45C'], ...LEAD_CATS].map(([k, en, ar, col]) => (
          <button key={k} onClick={() => setCatF(k)} className={`badge !py-1 !px-3 border transition ${catF === k ? 'bg-gold text-ink border-gold' : 'border-black/10 dark:border-white/15'}`}>
            <i className="w-2 h-2 rounded-full inline-block me-1.5" style={{ background: col }} />{lang === 'ar' ? ar : en} <span className="opacity-60">({k === 'all' ? allLeads.length : allLeads.filter((l) => (l.category || 'general') === k).length})</span>
          </button>))}
      </div>
      {view === 'kanban' ? <div className="flex gap-3 overflow-x-auto pb-3">
        {LEAD_STAGES.map(([k]) => <div key={k} className="min-w-[230px] w-[230px] glass p-3"><div className="flex justify-between mb-3"><Badge id={k}>{stageName(LEAD_STAGES, k, lang)}</Badge><span className="text-xs opacity-60">{shown.filter((l) => l.stage === k).length}</span></div>
          <div className="space-y-2">{shown.filter((l) => l.stage === k).map((l) => <div key={l.id} onClick={() => setSel(l.id)} className="bg-white/70 dark:bg-white/5 rounded-xl p-3 cursor-pointer hover:ring-1 ring-gold transition space-y-2">
            <div className="font-semibold text-sm">{l.name}</div><div className="text-xs opacity-60">{l.company}</div><div className="flex justify-between items-center gap-1"><CatDot l={l} /><span className="text-[10px] opacity-50">{l.source}</span></div><Select l={l} /></div>)}</div></div>)}
      </div> : <div className="glass overflow-auto"><table className="w-full text-sm"><thead className="text-xs opacity-60"><tr>{[T('Client', 'العميل'), T('Company', 'الشركة'), T('Phone', 'الهاتف'), T('Category', 'الفئة'), T('Source', 'المصدر'), T('Stage', 'المرحلة')].map((h) => <th key={h} className="p-3 text-start">{h}</th>)}</tr></thead>
        <tbody>{shown.map((l) => <tr key={l.id} onClick={() => setSel(l.id)} className="border-t border-black/5 dark:border-white/10 cursor-pointer hover:bg-gold/5"><td className="p-3">{l.name}</td><td className="p-3">{l.company}</td><td className="p-3" dir="ltr">{l.phone}</td><td className="p-3"><CatDot l={l} /></td><td className="p-3 text-xs">{l.source}</td><td className="p-3 w-44"><Select l={l} /></td></tr>)}</tbody></table></div>}
      {client && <Modal title={client.name} onClose={() => setSel(null)}>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[['name', T('Name', 'الاسم')], ['company', T('Company', 'الشركة')], ['phone', T('Phone', 'الهاتف')], ['email', T('Email', 'البريد')], ['tax', T('Tax No.', 'الرقم الضريبي')]].map(([k, l]) => <Field key={k} label={l} v={client[k]} on={(v) => patchLead(client.id, { [k]: v })} />)}
          <div><label className="label">{T('Stage', 'المرحلة')}</label><select className="input" value={client.stage} onChange={(e) => setStage(client.id, e.target.value)}>{LEAD_STAGES.map(([k, en, ar]) => <option key={k} value={k}>{lang === 'ar' ? ar : en}</option>)}</select></div>
          <div><label className="label">{T('Category', 'الفئة')}</label><select className="input" value={client.category || 'general'} onChange={(e) => patchLead(client.id, { category: e.target.value })}>{LEAD_CATS.map(([k, en, ar]) => <option key={k} value={k}>{lang === 'ar' ? ar : en}</option>)}</select></div>
          <div className="col-span-2"><label className="label">{T('Notes', 'ملاحظات')}</label><textarea className="input" rows="2" value={client.notes || ''} onChange={(e) => patchLead(client.id, { notes: e.target.value })} /></div>
          {client.file && <FileLink name={client.file} path={client.filePath} />}
          <div className="text-xs opacity-50 col-span-2 flex items-center">{client.source} · {client.date}<button className="ms-auto text-red-400 flex items-center gap-1" onClick={() => { if (confirm(T('Delete this client and all their quotes, orders and invoices?', 'حذف العميل وكل عروضه وطلباته وفواتيره؟'))) { const cid = client.id; setSel(null); upd((o) => ({ leads: o.leads.filter((l) => l.id !== cid), quotes: o.quotes.filter((x) => x.clientId !== cid), orders: o.orders.filter((x) => x.clientId !== cid), invoices: o.invoices.filter((x) => x.clientId !== cid) })); } }}><Trash2 size={13} />{T('Delete client', 'حذف العميل')}</button></div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4"><Stat l={T('Quotations', 'عروض')} v={quotes.filter((q) => q.clientId === client.id).length} /><Stat l={T('Orders', 'طلبات')} v={orders.filter((o) => o.clientId === client.id).length} /><Stat l={T('Unpaid', 'غير مدفوع')} v={money(balance(client.id))} c="text-red-400" /></div>
        <h4 className="font-bold text-sm mb-2">{T('History', 'السجل')}</h4>
        {quotes.filter((q) => q.clientId === client.id).map((q) => <div key={q.id} className="flex justify-between text-sm py-1"><span>{q.no}</span><span>{money(totals(q, rates.vat).total)}</span><Badge id={q.status}>{stageName(QUOTE_STATUS, q.status, lang)}</Badge></div>)}
        {orders.filter((o) => o.clientId === client.id).map((o) => <div key={o.id} className="flex justify-between text-sm py-1"><span>{o.title}</span><Badge id="approved">{stageName(ORDER_STAGES, o.stage, lang)}</Badge></div>)}
        {invoices.filter((i) => i.clientId === client.id).map((i) => <div key={i.id} className="text-sm py-1">{i.no} — {money(totals(i, rates.vat).total)}</div>)}
      </Modal>}
      {adding && <Modal title={T('Add Lead', 'إضافة عميل')} onClose={() => setAdding(false)}>
        <form className="grid grid-cols-2 gap-3" onSubmit={(e) => { e.preventDefault(); addLeadLocal({ ...nf, source: 'Manual' }); setAdding(false); setNf({ name: '', company: '', phone: '', email: '', notes: '', category: 'general' }); }}>
          {[['name', T('Name', 'الاسم')], ['company', T('Company', 'الشركة')], ['phone', T('Phone', 'الهاتف')], ['email', T('Email', 'البريد')]].map(([k, l]) => <div key={k}><label className="label">{l}</label><input required={k === 'name'} className="input" value={nf[k]} onChange={(e) => setNf({ ...nf, [k]: e.target.value })} /></div>)}
          <div className="col-span-2"><label className="label">{T('Category', 'الفئة')}</label><select className="input" value={nf.category} onChange={(e) => setNf({ ...nf, category: e.target.value })}>{LEAD_CATS.map(([k, en, ar]) => <option key={k} value={k}>{lang === 'ar' ? ar : en}</option>)}</select></div>
          <div className="col-span-2"><label className="label">{T('Notes', 'ملاحظات')}</label><textarea className="input" value={nf.notes} onChange={(e) => setNf({ ...nf, notes: e.target.value })} /></div>
          <button className="btn-gold col-span-2">{T('Save', 'حفظ')}</button></form></Modal>}
    </div>
  );
}

/* ================= Login ================= */
function Login() {
  const { T, upd } = useApp();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  // The server decides the shape of the account: email + password, or password only.
  const [needsEmail, setNeedsEmail] = useState(null);
  useEffect(() => {
    let alive = true;
    serverHealth().then((h) => { if (alive && h && h.ok) setNeedsEmail(!!h.authEmail); });
    return () => { alive = false; };
  }, []);
  const submit = async (e) => {
    e.preventDefault();
    if (needsEmail && !email.trim()) return setErr(T('Enter the admin email.', 'أدخل بريد المسؤول.'));
    if (!pw) return setErr(T('Enter the password.', 'أدخل كلمة المرور.'));
    setBusy(true);
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: pw });
    setBusy(false);
    if (error) setErr(error.status === 429 ? T('Too many attempts. Try again in 15 minutes.', 'محاولات كثيرة. حاول بعد 15 دقيقة.') : T('Invalid credentials.', 'بيانات الدخول غير صحيحة.'));
    // onAuthStateChange sets auth on success
  };
  return (
    <div className="min-h-screen grid place-items-center bg-ink text-cream p-4">
      <form onSubmit={submit} className="glass !bg-white/5 !border-white/10 p-8 w-full max-w-sm space-y-4">
        <div className="flex justify-center"><Logo className="h-12" /></div>
        <h1 className="text-center font-bold text-lg">{T('Admin Sign In', 'تسجيل دخول الإدارة')}</h1>
        <input type="email" required={needsEmail === true} autoFocus={needsEmail === true} autoComplete="username" className="input" placeholder={T('Email', 'البريد الإلكتروني')} value={email} onChange={(e) => { setEmail(e.target.value); setErr(''); }} />
        <input type="password" required autoFocus={needsEmail === false} autoComplete="current-password" className="input" placeholder={T('Password', 'كلمة المرور')} value={pw} onChange={(e) => { setPw(e.target.value); setErr(''); }} />
        {err && <p className="text-xs text-red-400">{err}</p>}
        {needsEmail === true && !err && <p className="text-[11px] text-cream/50 text-center">{T('Sign in with the admin email and password.', 'سجّل الدخول ببريد المسؤول وكلمة المرور.')}</p>}
        <button disabled={busy} className="btn-gold w-full">{T('Sign In', 'دخول')}</button>
        <button type="button" className="btn-ghost !border-white/20 w-full text-xs" onClick={() => location.assign('/')}>{T('Back to website', 'العودة للموقع')}</button>
      </form>
    </div>
  );
}

/* ================= Shell ================= */
export default function Admin() {
  const { T, lang, dark, upd, auth, leads, quotes, surveys } = useApp();
  const [tab, setTab] = useState('dash');
  if (!auth) return <Login />;
  const badges = { crm: leads.filter((l) => l.stage === 'new').length, quotes: quotes.filter((q) => q.status === 'draft' && !q.converted).length, surveys: surveys.filter((s) => s.status === 'new').length };
  // Grouped so nine destinations read as three questions: what happened, what's sold, what's published.
  const groups = [
    [T('Overview', 'نظرة عامة'), [['dash', LayoutDashboard, T('Dashboard', 'لوحة المؤشرات')]]],
    [T('Sales', 'المبيعات'), [['crm', Users, 'CRM'], ['quotes', FileText, T('Quotations', 'عروض الأسعار')], ['invoices', Receipt, T('Invoices', 'الفواتير')]]],
    [T('Finance', 'المالية'), [['accounting', Wallet, T('Accounting', 'المحاسبة')]]],
    [T('Delivery', 'التنفيذ'), [['surveys', Ruler, T('Site Surveys', 'معاينات المواقع')], ['orders', Hammer, T('Production', 'الطلبات والتنفيذ')]]],
    [T('Website', 'الموقع'), [['pricing', Tag, T('Calculator & Pricing', 'الحاسبة والأسعار')], ['content', Images, T('Website Content', 'محتوى الموقع')], ['company', Building2, T('Company & Quote Style', 'الشركة وشكل العروض')]]],
  ];
  const tabs = groups.flatMap(([, list]) => list);
  const current = tabs.find((t) => t[0] === tab) || tabs[0];
  const View = { dash: Dashboard, accounting: Accounting, pricing: Pricing, content: ContentManager, crm: CRM, surveys: Surveys, quotes: Quotes, orders: Orders, invoices: Invoices, company: CompanySettings }[tab];
  return (
    <div className="min-h-screen md:flex">
      <aside className="md:w-64 shrink-0 bg-ink text-cream no-print md:sticky md:top-0 md:h-screen md:overflow-y-auto">
        <div className="p-4 flex items-center gap-3">
          <Logo className="h-8" />
          <span className="ms-auto text-[10px] uppercase tracking-widest opacity-40">{T('Admin', 'الإدارة')}</span>
        </div>
        <nav className="px-3 pb-3 flex md:block gap-1 overflow-x-auto md:space-y-4 md:overflow-visible">
          {groups.map(([label, list]) => (
            <div key={label} className="contents md:block">
              <div className="hidden md:block text-[10px] uppercase tracking-wider opacity-40 px-3 mb-1.5">{label}</div>
              <div className="flex md:block gap-1 md:space-y-1">
                {list.map(([id, Icon, l]) => <button key={id} type="button" onClick={() => setTab(id)} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm whitespace-nowrap transition md:w-full ${tab === id ? 'bg-gold text-ink font-bold' : 'hover:bg-white/10'}`}><Icon size={17} />{l}
                  {badges[id] > 0 && <span className="ms-auto bg-terra text-white text-[10px] rounded-full min-w-[18px] h-[18px] px-1 grid place-items-center">{badges[id]}</span>}</button>)}
              </div>
            </div>
          ))}
        </nav>
        <div className="px-3 pb-5 flex md:flex-col gap-2 md:mt-2">
          <button type="button" className="btn-ghost !border-white/20 !text-sm" onClick={() => upd({ lang: lang === 'ar' ? 'en' : 'ar' })}><Languages size={15} />{lang === 'ar' ? 'English' : 'العربية'}</button>
          <button type="button" className="btn-ghost !border-white/20 !text-sm" onClick={() => upd({ dark: !dark })}>{dark ? <Sun size={15} /> : <Moon size={15} />}</button>
          <button type="button" className="btn-terra !text-sm" onClick={() => location.assign('/')}><Globe size={15} />{T('View Website', 'عرض الموقع')}</button>
          <button type="button" className="btn-ghost !border-white/20 !text-sm" onClick={() => { sb.auth.signOut(); location.assign('/'); }}><LogOut size={15} />{T('Logout', 'خروج')}</button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-20 no-print border-b border-black/5 dark:border-white/10 bg-cream-50/85 dark:bg-ink/85 backdrop-blur px-4 md:px-8 py-3">
          <h1 className="text-lg md:text-xl font-extrabold leading-tight">{current[2]}</h1>
        </header>
        <div className="px-4 md:px-8 py-5 w-full max-w-[1500px]">
          <View onNav={setTab} />
        </div>
      </main>
    </div>
  );
}
