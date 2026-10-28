import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard, Tag, Users, FileText, Hammer, Receipt, Sun, Moon, Languages, Globe, Plus, RotateCcw, Trash2, Kanban, Table2, LogOut, Download, Upload, Images, Building2, Ruler, AlertTriangle, Percent, Wallet,
  Search, ExternalLink, PanelLeftClose, ChevronsRight, ChevronRight, Menu, X, Eye, EyeOff, ArrowRight, Check,
} from 'lucide-react';
import Logo, { Mark } from './Logo.jsx';
import { CatalogEditor, ContentManager } from './AdminContent.jsx';
import { signageQuote, printQuote, addonOn } from './pricing.js';
import CompanySettings from './AdminCompany.jsx';
import Surveys from './AdminSurveys.jsx';
import { Quotes, Orders, Invoices } from './AdminDocs.jsx';
import Accounting from './AdminAccounting.jsx';
import { Modal, Stat, Badge, FileLink, Field, stageName, Dialog, Kbd, Skeleton } from './ui.jsx';
import { sb, serverHealth } from './api.js';
import { useApp, totals, LEAD_STAGES, LEAD_CATS, ORDER_STAGES, QUOTE_STATUS, DEFAULT_RATES } from './store.jsx';
import { buildStats } from './adminStats.js';

const DEPT_COLOR = { signage: '#C9A45C', booths: '#5B8FB9', printing: '#CB6B47', social: '#8E7CC3', marketing: '#7DA7A1', general: '#9CA3AF' };
const TONE = { gold: 'text-gold', emerald: 'text-emerald-500', red: 'text-red-400', sky: 'text-sky-400', terra: 'text-terra', violet: 'text-violet-400' };
const FUNNEL_BAR = ['bg-sky-400', 'bg-sky-400', 'bg-violet-400', 'bg-gold', 'bg-amber-400', 'bg-emerald-500', 'bg-red-400'];

/* ================= Dashboard building blocks ================= */
const TONE_HEX = { gold: '#C9A45C', emerald: '#10b981', red: '#f87171', sky: '#38bdf8', terra: '#CB6B47', violet: '#a78bfa' };

function Panel({ title, sub, action, className = '', children }) {
  return (
    <section className={`glass p-5 ${className}`}>
      <div className="panel-head mb-4 flex items-start gap-3 pb-3">
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

function MiniBar({ pct, className = 'bg-gold' }) {
  const w = Math.max(0, Math.min(100, Number(pct) || 0));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line/10">
      <div className={`h-full rounded-full transition-[width] duration-500 ${className}`} style={{ width: `${w}%` }} />
    </div>
  );
}

function Kpi({ icon: Icon, label, value, hint, tone = 'gold', bar }) {
  return (
    <div className="glass stat-card group p-5">
      <span
        className="pointer-events-none absolute -end-10 -top-14 h-32 w-32 rounded-full opacity-[0.10] blur-2xl transition-opacity duration-500 group-hover:opacity-25"
        style={{ background: TONE_HEX[tone] }}
        aria-hidden="true"
      />
      <div className="relative flex items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-line/10 bg-surface-2/80" style={{ color: TONE_HEX[tone] }}>
          <Icon size={13} />
        </span>
        <span className="stat-label truncate">{label}</span>
      </div>
      <div className={`stat-value relative mt-3 text-[26px] ${TONE[tone]}`}>{value}</div>
      {bar != null && <div className="relative mt-3"><MiniBar pct={bar} className={tone === 'emerald' ? 'bg-emerald-500' : tone === 'red' ? 'bg-red-500' : 'bg-gold'} /></div>}
      {hint && <div className="relative mt-2 text-[11px] leading-snug text-subtle">{hint}</div>}
    </div>
  );
}

function Tile({ label, value, hint, tone = 'gold' }) {
  return (
    <div className="glass stat-card flex items-center gap-3 px-4 py-3.5">
      <span className="h-9 w-1 shrink-0 rounded-full opacity-80" style={{ background: TONE_HEX[tone] }} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="stat-label">{label}</div>
        <div className={`stat-value mt-1 text-[17px] ${TONE[tone]}`}>{value}</div>
      </div>
      <div className="max-w-[45%] text-end text-[10px] leading-tight text-subtle">{hint}</div>
    </div>
  );
}

const Empty = ({ children }) => <p className="py-6 text-center text-sm text-subtle">{children}</p>;

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
    <div className="space-y-5">
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
          action={<span className="text-[11px] text-subtle">{T('Outstanding', 'المتبقي')} <span className="font-semibold text-fg">{money(s.outstanding)}</span></span>}>
          <div className="flex h-44 items-end gap-2 sm:gap-3">
            {s.byMonth.map((m) => (
              <div key={m.key} className="group/bar flex h-full flex-1 flex-col items-center justify-end gap-2">
                <div className="flex h-full w-full items-end justify-center gap-1">
                  <div className="w-1/3 max-w-[26px] rounded-t-md bg-gradient-to-t from-gold/55 to-gold transition-all duration-500 group-hover/bar:from-gold/75" title={`${T('Invoiced', 'مفوتر')}: ${money(m.invoiced)}`} style={{ height: `${(m.invoiced / maxMonth) * 100}%`, minHeight: m.invoiced > 0 ? 4 : 0 }} />
                  <div className="w-1/3 max-w-[26px] rounded-t-md bg-gradient-to-t from-emerald-600/55 to-emerald-400 transition-all duration-500 group-hover/bar:from-emerald-600/75" title={`${T('Collected', 'محصّل')}: ${money(m.collected)}`} style={{ height: `${(m.collected / maxMonth) * 100}%`, minHeight: m.collected > 0 ? 4 : 0 }} />
                </div>
                <span className="whitespace-nowrap text-[10px] font-medium text-subtle">{monthName(m.key)}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title={T('Revenue by department', 'الإيرادات حسب القسم')} sub={T('Share of invoiced value', 'حصة القيمة المفوترة')}>
          {s.byDept.length === 0 ? <Empty>{T('No invoices yet.', 'لا توجد فواتير.')}</Empty> : (
            <div className="space-y-3">
              {s.byDept.map((d) => (
                <div key={d.key}>
                  <div className="mb-1 flex justify-between gap-2 text-[11px]"><span className="truncate text-muted">{deptName(d.key)}</span><span className="whitespace-nowrap font-semibold tabular-nums">{pc(d.share)}<span className="text-subtle"> · {money(d.value)}</span></span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-line/10"><div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, d.share)}%`, background: DEPT_COLOR[d.key] || '#9CA3AF' }} /></div>
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
                  <div className="mb-1 flex justify-between text-[11px]"><span className="text-muted">{stageName(LEAD_STAGES, f.key, lang)}</span><span className="font-semibold tabular-nums">{f.count}<span className="text-subtle"> · {Math.round((f.count / Math.max(1, leads.length)) * 100)}%</span></span></div>
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
                  <div className="mb-1 flex justify-between gap-2 text-[11px]"><span className={i === 0 ? 'text-muted' : 'text-red-400'}>{lang === 'ar' ? a.ar : a.en}</span><span className="whitespace-nowrap font-semibold tabular-nums">{money(a.amount)}<span className="text-subtle"> ({a.count})</span></span></div>
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
              <div key={c.id} className="flex items-center gap-3 border-b border-line/10 py-2.5 text-sm last:border-0">
                <span className="flex-1 truncate font-medium">{c.name}</span>
                <span className="whitespace-nowrap font-semibold tabular-nums text-emerald-500">{money(c.collected)}</span>
                {c.balance > 0 && <span className="whitespace-nowrap text-[10px] text-terra">{money(c.balance)} {T('due', 'مستحق')}</span>}
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
                <thead className="text-[11px] text-subtle"><tr>{[T('Invoice', 'الفاتورة'), T('Client', 'العميل'), T('Due', 'الاستحقاق'), T('Late', 'التأخير'), T('Balance', 'المتبقي')].map((h) => <th key={h} className="whitespace-nowrap px-2 py-2 text-start font-semibold uppercase tracking-[0.08em]">{h}</th>)}</tr></thead>
                <tbody>{s.overdueList.map((o) => (
                  <tr key={o.id} className="border-t border-line/10 transition hover:bg-surface-2/50">
                    <td className="whitespace-nowrap px-2 py-2 font-semibold">{o.no}</td>
                    <td className="max-w-[170px] truncate px-2 py-2">{o.client}</td>
                    <td className="px-2 py-2 text-xs text-muted" dir="ltr">{o.due}</td>
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
              <div key={l.id} className="flex items-center justify-between gap-2 border-b border-line/10 py-2.5 text-sm last:border-0">
                <span className="truncate font-medium">{l.name} <span className="font-normal text-subtle">· {l.company}</span></span>
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
      <div className="seg mb-4 w-full">
        {[['signage', T('Signage', 'آرمات')], ['print', T('Printing', 'مطبوعات')]].map(([k, l]) => (
          <button key={k} type="button" onClick={() => setMode(k)} data-active={mode === k}
            className="seg-tab flex-1 justify-center">{l}</button>
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
          <div className="border-t border-line/15 pt-2">
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
                className={`badge border transition tabular-nums ${pr.qty === q ? 'bg-gold text-ink border-gold' : 'border-line/15'}`}>
                {q.toLocaleString('en-US')}{rates.mult.qty[q] < 1 && <span className="opacity-60"> −{Math.round((1 - rates.mult.qty[q]) * 100)}%</span>}
              </button>))}
            </div></div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(pq.mult).map(([k, v]) => (
              <span key={k} className={`badge tabular-nums ${v === 1 ? 'bg-black/5 dark:bg-white/5 opacity-50' : 'bg-gold/15 text-gold'}`}>{MULT[k]} ×{v}</span>
            ))}
          </div>
        </div>)}

      <div className="border-t border-line/15 mt-4 pt-3">
        <PriceRow label={T('Subtotal before VAT', 'المجموع قبل الضريبة')} value={money(total)} />
        <PriceRow label={`${T('VAT', 'ضريبة')} ${vat}%`} value={money((total * vat) / 100)} muted />
        <div className="flex items-baseline gap-3 pt-2 mt-1 border-t border-line/10">
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
  const { T, rates, upd, resetAll, leads, quotes, orders, invoices, surveys, purchases, cash, customers, suppliers, content, company } = useApp();
  const [g, setG] = useState('area');
  const [q, setQ] = useState('');
  const cur = PRICE_GROUPS.find((x) => x[0] === g) || PRICE_GROUPS[0];
  const count = (key) => Object.keys(rates[key] || {}).length;
  const exportData = () => {
    const data = JSON.stringify({ version: 4, rates, content, company, leads, quotes, orders, invoices, surveys, purchases, cash, customers, suppliers }, null, 1);
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
        ['rates', 'content', 'company', 'leads', 'quotes', 'orders', 'invoices', 'surveys', 'purchases', 'cash', 'customers', 'suppliers'].forEach((k) => { if (d[k]) pick[k] = d[k]; });
        upd(pick);
      } catch { alert(T('Invalid backup file', 'ملف نسخة احتياطية غير صالح')); }
    });
  };
  return (
    <div>
      {/* sticky toolbar: switch catalog + search without losing your place in a long list */}
      <div className="sticky top-16 z-10 -mx-4 mb-4 border-b border-line/10 bg-canvas/80 px-4 py-3 backdrop-blur-xl md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <div className="seg">
            {PRICE_GROUPS.map(([k, en, ar]) => (
              <button key={k} type="button" onClick={() => { setG(k); setQ(''); }} data-active={g === k} className="seg-tab">
                {T(en, ar)} <span className="tabular-nums opacity-60">({count(k)})</span>
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
  const CatDot = ({ l }) => { const c = catOf(l); return <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted"><i className="h-2 w-2 shrink-0 rounded-full" style={{ background: c[3] }} />{lang === 'ar' ? c[2] : c[1]}</span>; };
  const setStage = (id, stage) => upd((o) => ({ leads: o.leads.map((l) => (l.id === id ? { ...l, stage } : l)) }));
  const patchLead = (id, p) => upd((o) => ({ leads: o.leads.map((l) => (l.id === id ? { ...l, ...p } : l)) }));
  const Select = ({ l }) => <select className="input !py-1 !text-xs" value={l.stage} onChange={(e) => setStage(l.id, e.target.value)} onClick={(e) => e.stopPropagation()}>{LEAD_STAGES.map(([k, en, ar]) => <option key={k} value={k}>{lang === 'ar' ? ar : en}</option>)}</select>;
  const client = leads.find((l) => l.id === sel);
  const balance = (cid) => invoices.filter((i) => i.clientId === cid).reduce((s, i) => s + totals(i, rates.vat).total - i.payments.reduce((a, p) => a + Number(p.amount), 0), 0);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="seg">
          <button type="button" onClick={() => setView('kanban')} data-active={view === 'kanban'} className="seg-tab"><Kanban size={13} />Kanban</button>
          <button type="button" onClick={() => setView('table')} data-active={view === 'table'} className="seg-tab"><Table2 size={13} />{T('Table', 'جدول')}</button>
        </div>
        <button className="btn-terra ms-auto" onClick={() => setAdding(true)}><Plus size={15} />{T('Add Lead', 'عميل جديد')}</button>
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {[['all', 'All', 'الكل', '#C9A45C'], ...LEAD_CATS].map(([k, en, ar, col]) => (
          <button key={k} type="button" onClick={() => setCatF(k)} className={`chip !py-1 ${catF === k ? '!border-line/10 !bg-surface !text-fg shadow-soft' : ''}`}>
            <i className="h-2 w-2 rounded-full" style={{ background: col }} />{lang === 'ar' ? ar : en}
            <span className="tabular-nums text-subtle">{k === 'all' ? allLeads.length : allLeads.filter((l) => (l.category || 'general') === k).length}</span>
          </button>))}
      </div>
      {view === 'kanban' ? <div className="flex gap-3 overflow-x-auto pb-3">
        {LEAD_STAGES.map(([k]) => <div key={k} className="w-[248px] min-w-[248px] glass p-3">
          <div className="mb-3 flex items-center justify-between gap-2 border-b border-line/10 pb-2.5">
            <Badge id={k}>{stageName(LEAD_STAGES, k, lang)}</Badge>
            <span className="rounded-full bg-line/[0.07] px-2 text-[10px] font-bold tabular-nums text-subtle">{shown.filter((l) => l.stage === k).length}</span>
          </div>
          <div className="space-y-2">{shown.filter((l) => l.stage === k).map((l) => <div key={l.id} onClick={() => setSel(l.id)} className="group cursor-pointer space-y-2 rounded-xl border border-line/10 bg-surface-2/60 p-3 transition duration-300 hover:-translate-y-0.5 hover:border-gold/40 hover:bg-surface-2 hover:shadow-soft">
            <div className="text-sm font-semibold leading-tight">{l.name}</div><div className="truncate text-xs text-muted">{l.company}</div><div className="flex items-center justify-between gap-1"><CatDot l={l} /><span className="truncate text-[10px] text-subtle">{l.source}</span></div><Select l={l} /></div>)}</div></div>)}
      </div> : <div className="glass overflow-auto"><table className="w-full text-sm"><thead><tr>{[T('Client', 'العميل'), T('Company', 'الشركة'), T('Phone', 'الهاتف'), T('Category', 'الفئة'), T('Source', 'المصدر'), T('Stage', 'المرحلة')].map((h) => <th key={h} className="p-3 text-start">{h}</th>)}</tr></thead>
        <tbody>{shown.map((l) => <tr key={l.id} onClick={() => setSel(l.id)} className="cursor-pointer border-t border-line/10"><td className="p-3 font-semibold">{l.name}</td><td className="p-3 text-muted">{l.company}</td><td className="p-3 text-xs" dir="ltr">{l.phone}</td><td className="p-3"><CatDot l={l} /></td><td className="p-3 text-xs text-subtle">{l.source}</td><td className="p-3 w-44"><Select l={l} /></td></tr>)}</tbody></table></div>}
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

/* ================= Command palette (⌘K) ================= */
function CommandPalette({ groups, onClose, onPick }) {
  const { T } = useApp();
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const items = useMemo(() => groups.flatMap(([g, list]) => list.map(([id, Icon, l]) => ({ id, Icon, l, g }))), [groups]);
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return term ? items.filter((it) => `${it.l} ${it.g} ${it.id}`.toLowerCase().includes(term)) : items;
  }, [q, items]);
  useEffect(() => { setI(0); }, [q]);
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setI((n) => (list.length ? (n + 1) % list.length : 0)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setI((n) => (list.length ? (n - 1 + list.length) % list.length : 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); const it = list[i]; if (it) onPick(it.id); }
  };
  return (
    <Dialog onClose={onClose} label={T('Command palette', 'لوحة الأوامر')} size="lg" className="p-2">
      <div className="flex items-center gap-3 border-b border-line/10 px-3 pb-3 pt-1">
        <Search size={17} className="shrink-0 text-subtle" />
        <input
          autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown}
          placeholder={T('Jump to a page…', 'انتقل إلى صفحة…')} aria-label={T('Search pages', 'ابحث في الصفحات')}
          className="w-full bg-transparent text-sm outline-none placeholder:text-subtle"
        />
        <Kbd>esc</Kbd>
      </div>
      <div className="max-h-[52vh] overflow-y-auto py-2">
        {list.length === 0 && <p className="px-3 py-8 text-center text-sm text-subtle">{T('No matching pages.', 'لا صفحات مطابقة.')}</p>}
        {list.map(({ id, Icon, l, g }, n) => (
          <button
            key={id} type="button" onMouseEnter={() => setI(n)} onClick={() => onPick(id)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm transition ${n === i ? 'bg-gold/15' : 'hover:bg-surface-2'}`}
          >
            <Icon size={16} className={n === i ? 'text-gold' : 'text-subtle'} />
            <span className="font-medium">{l}</span>
            <span className="ms-auto text-[10px] uppercase tracking-[0.14em] text-subtle">{g}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-4 border-t border-line/10 px-3 pt-3 text-[11px] text-subtle">
        <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd>{T('navigate', 'تنقّل')}</span>
        <span className="flex items-center gap-1"><Kbd>↵</Kbd>{T('open', 'فتح')}</span>
      </div>
    </Dialog>
  );
}

/* ================= Sidebar navigation ================= */
function SidebarNav({ groups, tab, badges, onPick, compact }) {
  return (
    <nav className="space-y-5 px-2.5 pb-2">
      {groups.map(([label, list]) => (
        <div key={label}>
          {compact
            ? <div className="mx-2 mb-2 h-px bg-line/10" aria-hidden="true" />
            : <div className="mb-2 px-2.5 text-[9.5px] font-bold uppercase tracking-[0.18em] text-subtle">{label}</div>}
          <div className="space-y-0.5">
            {list.map(([id, Icon, l]) => {
              const n = badges[id] || 0;
              return (
                <button
                  key={id} type="button" onClick={() => onPick(id)} data-active={tab === id}
                  title={compact ? l : undefined} aria-label={compact ? l : undefined}
                  aria-current={tab === id ? 'page' : undefined}
                  className={`nav-item relative w-full ${compact ? 'justify-center !px-0' : ''}`}
                >
                  <Icon size={17} className="shrink-0" />
                  {!compact && <span className="truncate">{l}</span>}
                  {n > 0 && (compact
                    ? <span className="absolute end-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-terra" aria-hidden="true" />
                    : <span className="ms-auto rounded-full bg-terra px-1.5 text-[10px] font-bold leading-[18px] text-white">{n}</span>)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

/* Icon button tuned for the sidebar (light by default, follows the theme tokens). */
const SideBtn = ({ icon: Icon, label, onClick, tone }) => (
  <button
    type="button" onClick={onClick} title={label} aria-label={label}
    className={`grid h-9 flex-1 place-items-center rounded-xl transition duration-200 ${tone === 'terra' ? 'bg-terra/90 text-white hover:bg-terra' : 'text-subtle hover:bg-line/10 hover:text-fg'}`}
  >
    <Icon size={16} />
  </button>
);

/* Skeleton shown while the session is checked, so a signed-in admin never sees the login form flash. */
function Boot() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm space-y-4" role="status" aria-label="Loading">
        <Skeleton className="mx-auto h-10 w-10 rounded-xl" />
        <Skeleton className="mx-auto h-3 w-32" />
        <div className="space-y-3 pt-4">
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/* ================= Login ================= */
function Login() {
  const { T } = useApp();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink p-4 text-cream sm:p-6">
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-45" aria-hidden="true" />

      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-[30px] border border-white/12 bg-white/[0.03] shadow-[0_60px_140px_-60px_rgb(0_0_0/.95)] backdrop-blur-xl lg:grid-cols-2">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gold" aria-hidden="true" />
        {/* Brand panel */}
        <div className="hidden flex-col justify-between border-e border-white/10 bg-white/[0.015] p-9 lg:flex">
          <Logo className="h-11" />
          <div className="space-y-4">
            <p className="eyebrow text-gold">{T('ArtSpace · Amman', 'آرت سبيس · عمّان')}</p>
            <h2 className="text-[26px] font-extrabold leading-snug tracking-tight">
              {T('Run the studio from one clean console.', 'أدر الاستوديو من لوحة واحدة مرتّبة.')}
            </h2>
            <p className="text-sm leading-relaxed text-cream/50">
              {T('Leads, quotations, production and accounting — all in one place.', 'العملاء، عروض الأسعار، التنفيذ والمحاسبة — في مكان واحد.')}
            </p>
          </div>
          <ul className="space-y-2.5 text-[13px] text-cream/60">
            {[
              T('Live pipeline and revenue indicators', 'مؤشرات مباشرة لخط المبيعات والإيرادات'),
              T('One-click quotation to invoice', 'تحويل العرض إلى فاتورة بنقرة واحدة'),
              T('Bilingual, print-ready documents', 'مستندات جاهزة للطباعة بالعربية والإنجليزية'),
            ].map((x) => (
              <li key={x} className="flex items-start gap-2.5"><Check size={15} className="mt-0.5 shrink-0 text-gold" />{x}</li>
            ))}
          </ul>
          <p className="text-[11px] tracking-wide text-cream/25">© {new Date().getFullYear()} ArtSpace Jo</p>
        </div>

        {/* Form panel */}
        <form onSubmit={submit} className="p-7 sm:p-9">
          <div className="mb-8 lg:hidden"><Logo className="h-9" /></div>
          <p className="eyebrow text-gold">{T('Admin access', 'دخول الإدارة')}</p>
          <h1 className="mt-2.5 text-xl font-extrabold tracking-tight">{T('Sign in', 'تسجيل الدخول')}</h1>
          <p className="mt-1.5 text-xs text-cream/45">{T('Authorised staff only.', 'للموظفين المصرّح لهم فقط.')}</p>

          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="as-email" className="label !text-cream/55">{T('Email', 'البريد الإلكتروني')}</label>
              <input
                id="as-email" type="email" required={needsEmail === true} autoFocus={needsEmail === true}
                autoComplete="username" className="input" placeholder="name@artspace.jo"
                value={email} onChange={(e) => { setEmail(e.target.value); setErr(''); }}
              />
            </div>
            <div>
              <label htmlFor="as-pw" className="label !text-cream/55">{T('Password', 'كلمة المرور')}</label>
              <div className="relative">
                <input
                  id="as-pw" type={show ? 'text' : 'password'} required autoFocus={needsEmail === false}
                  autoComplete="current-password" className="input pe-11" placeholder="••••••••"
                  value={pw} onChange={(e) => { setPw(e.target.value); setErr(''); }}
                />
                <button
                  type="button" onClick={() => setShow((v) => !v)}
                  aria-label={show ? T('Hide password', 'إخفاء كلمة المرور') : T('Show password', 'إظهار كلمة المرور')}
                  className="absolute end-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-cream/40 transition hover:bg-white/10 hover:text-cream"
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {err && (
            <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />{err}
            </p>
          )}
          {needsEmail === true && !err && (
            <p className="mt-3 text-[11px] text-cream/40">{T('Sign in with the admin email and password.', 'سجّل الدخول ببريد المسؤول وكلمة المرور.')}</p>
          )}

          <button disabled={busy} className="btn-gold mt-6 w-full">{busy ? T('Signing in…', 'جارٍ الدخول…') : T('Sign In', 'دخول')}</button>
          <button
            type="button" onClick={() => location.assign('/')}
            className="btn-ghost mt-2.5 w-full !border-white/15 !text-xs text-cream/70 hover:!bg-white/10"
          >
            {T('Back to website', 'العودة للموقع')}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ================= Shell ================= */
export default function Admin() {
  const { T, lang, dark, upd, auth, leads, quotes, surveys } = useApp();
  const [tab, setTab] = useState('dash');
  const [navOpen, setNavOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('as_sidebar') === '1'; } catch { return false; }
  });
  const [checking, setChecking] = useState(true);

  // A quick session probe: keeps the sign-in form from flashing for already-authenticated staff.
  useEffect(() => {
    let alive = true;
    Promise.resolve(sb.auth.getSession()).then(() => { if (alive) setChecking(false); }).catch(() => { if (alive) setChecking(false); });
    return () => { alive = false; };
  }, []);
  useEffect(() => { if (auth) setChecking(false); }, [auth]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); setPalette((v) => !v); }
      else if (e.key === 'Escape') setNavOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  if (checking && !auth) return <Boot />;
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
  const groupLabel = (groups.find(([, list]) => list.some(([id]) => id === current[0])) || [])[0] || '';
  const View = { dash: Dashboard, accounting: Accounting, pricing: Pricing, content: ContentManager, crm: CRM, surveys: Surveys, quotes: Quotes, orders: Orders, invoices: Invoices, company: CompanySettings }[tab] || Dashboard;

  const go = (id) => { setTab(id); setPalette(false); setNavOpen(false); };
  const toggleSidebar = () => setCollapsed((v) => {
    const next = !v;
    try { localStorage.setItem('as_sidebar', next ? '1' : '0'); } catch { /* storage may be blocked */ }
    return next;
  });

  return (
    <div className="min-h-screen md:flex">
      {/* ---------- Desktop sidebar ---------- */}
      <aside
        className={`admin-aside no-print sticky top-0 hidden h-screen shrink-0 flex-col border-e border-line/10 transition-[width] duration-300 ease-spring md:flex ${collapsed ? 'w-[76px]' : 'w-[264px]'}`}
      >
        <div className={`flex h-16 shrink-0 items-center border-b border-line/10 ${collapsed ? 'justify-center px-2' : 'gap-2.5 px-4'}`}>
          {collapsed ? <Mark className="h-8" variant={dark ? 'color' : 'mono-dark'} /> : (
            <>
              <Logo className="h-8" dark={dark} />
              <span className="ms-auto rounded-full border border-line/12 bg-line/[0.05] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-subtle">{T('Admin', 'الإدارة')}</span>
            </>
          )}
        </div>

        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto py-4">
          <SidebarNav groups={groups} tab={tab} badges={badges} onPick={go} compact={collapsed} />
        </div>

        <div className="shrink-0 space-y-1 border-t border-line/10 bg-line/[0.04] p-2.5">
          <button
            type="button" onClick={toggleSidebar} aria-label={T('Toggle sidebar', 'إظهار/إخفاء القائمة')}
            title={collapsed ? T('Expand', 'توسيع') : T('Collapse', 'تصغير')}
            className={`nav-item w-full ${collapsed ? 'justify-center !px-0' : ''}`}
          >
            {collapsed ? <ChevronsRight size={17} className="shrink-0 rtl:rotate-180" /> : <PanelLeftClose size={17} className="shrink-0 rtl:rotate-180" />}
            {!collapsed && <span className="truncate">{T('Collapse', 'تصغير')}</span>}
          </button>
          <div className="flex gap-1">
            <SideBtn icon={Languages} label={lang === 'ar' ? 'English' : 'العربية'} onClick={() => upd({ lang: lang === 'ar' ? 'en' : 'ar' })} />
            <SideBtn icon={dark ? Sun : Moon} label={T('Theme', 'المظهر')} onClick={() => upd({ dark: !dark })} />
            <SideBtn icon={Globe} label={T('View Website', 'عرض الموقع')} onClick={() => location.assign('/')} tone="terra" />
            <SideBtn icon={LogOut} label={T('Logout', 'خروج')} onClick={() => { sb.auth.signOut(); location.assign('/'); }} />
          </div>
        </div>
      </aside>

      {/* ---------- Main column ---------- */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-2.5 border-b border-line/10 bg-canvas/80 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-canvas/60 md:px-8">
          <button type="button" onClick={() => setNavOpen(true)} aria-label={T('Open menu', 'فتح القائمة')} className="icon-btn md:hidden">
            <Menu size={18} />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-subtle">
              <span className="truncate">{groupLabel}</span>
              <ChevronRight size={11} className="shrink-0 rtl:rotate-180" />
              <span className="truncate text-gold">{current[2]}</span>
            </div>
            <h1 className="truncate text-[17px] font-extrabold leading-tight tracking-tight">{current[2]}</h1>
          </div>

          <button
            type="button" onClick={() => setPalette(true)}
            className="hidden items-center gap-2 rounded-full border border-line/12 bg-surface/60 px-3.5 py-2 text-xs font-medium text-subtle shadow-soft transition hover:border-gold/40 hover:text-fg lg:flex"
          >
            <Search size={14} />{T('Search', 'بحث')}
            <Kbd>{typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K'}</Kbd>
          </button>
          <button type="button" onClick={() => setPalette(true)} aria-label={T('Search', 'بحث')} className="icon-btn lg:hidden"><Search size={17} /></button>
          <button type="button" onClick={() => upd({ lang: lang === 'ar' ? 'en' : 'ar' })} aria-label={T('Language', 'اللغة')} className="icon-btn hidden sm:inline-grid"><Languages size={17} /></button>
          <button type="button" onClick={() => upd({ dark: !dark })} aria-label={T('Theme', 'المظهر')} className="icon-btn">{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
          <button type="button" onClick={() => location.assign('/')} className="btn-terra btn-sm hidden sm:inline-flex"><Globe size={14} />{T('Website', 'الموقع')}</button>
          <button type="button" onClick={() => { sb.auth.signOut(); location.assign('/'); }} aria-label={T('Logout', 'خروج')} title={T('Logout', 'خروج')} className="icon-btn"><LogOut size={17} /></button>
        </header>

        <div className="w-full max-w-[1500px] flex-1 px-4 pb-12 pt-5 md:px-8 md:pb-16 md:pt-7">
          <View onNav={go} />
        </div>
      </main>

      {/* ---------- Mobile drawer ---------- */}
      {navOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 animate-fade bg-black/60 backdrop-blur-sm" onClick={() => setNavOpen(false)} aria-hidden="true" />
          <div className="admin-aside no-print absolute inset-y-0 start-0 flex w-[282px] animate-fade flex-col border-e border-line/10 shadow-lift">
            <div className="flex h-16 shrink-0 items-center gap-3 border-b border-line/10 px-4">
              <Logo className="h-8" dark={dark} />
              <button type="button" onClick={() => setNavOpen(false)} aria-label={T('Close menu', 'إغلاق القائمة')} className="ms-auto grid h-9 w-9 place-items-center rounded-xl text-subtle transition hover:bg-line/10 hover:text-fg">
                <X size={18} />
              </button>
            </div>
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto py-4">
              <SidebarNav groups={groups} tab={tab} badges={badges} onPick={go} />
            </div>
            <div className="flex gap-1 border-t border-line/10 p-2.5">
              <SideBtn icon={Languages} label={lang === 'ar' ? 'English' : 'العربية'} onClick={() => upd({ lang: lang === 'ar' ? 'en' : 'ar' })} />
              <SideBtn icon={dark ? Sun : Moon} label={T('Theme', 'المظهر')} onClick={() => upd({ dark: !dark })} />
              <SideBtn icon={Globe} label={T('View Website', 'عرض الموقع')} onClick={() => location.assign('/')} tone="terra" />
              <SideBtn icon={LogOut} label={T('Logout', 'خروج')} onClick={() => { sb.auth.signOut(); location.assign('/'); }} />
            </div>
          </div>
        </div>
      )}

      {palette && <CommandPalette groups={groups} onClose={() => setPalette(false)} onPick={go} />}
    </div>
  );
}
