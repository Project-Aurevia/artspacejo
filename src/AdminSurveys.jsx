import React, { useState } from 'react';
import {
  Ruler, MapPin, Calendar, Trash2, ExternalLink, Phone, Search, ClipboardList, Clock, CheckCircle2, XCircle,
} from 'lucide-react';
import { useApp, SURVEY_STATUS } from './store.jsx';
import { Modal, Badge, FileLink, Field, EmptyState } from './ui.jsx';

const TYPES = { signage: ['Signage / Facade', 'آرمة / واجهة'], booth: ['Exhibition booth', 'بوث معارض'], glass: ['Glass / Interior', 'زجاج / ديكور'], other: ['Other', 'أخرى'] };
const TIMES = { morning: ['Morning', 'صباحاً'], noon: ['Afternoon', 'ظهراً'], evening: ['Evening', 'مساءً'] };
const TONE = { new: 'sent', scheduled: 'contacted', done: 'won', cancelled: 'lost' };
const KPI_TONE = { gold: 'text-gold', emerald: 'text-emerald-500', terra: 'text-terra', sky: 'text-sky-400', red: 'text-red-400' };

function Kpi({ icon: Icon, label, value, hint, tone = 'gold' }) {
  return (
    <div className="glass stat-card p-4">
      <div className="flex items-center gap-2"><Icon size={14} className={`shrink-0 ${KPI_TONE[tone]}`} /><span className="stat-label truncate">{label}</span></div>
      <div className={`stat-value mt-2 text-[24px] ${KPI_TONE[tone]}`}>{value}</div>
      {hint && <div className="mt-1.5 text-[11px] leading-snug text-subtle">{hint}</div>}
    </div>
  );
}

/** One line of the request card: gold icon, label above, value below. */
function Detail({ icon: Icon, label, children, href }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-line/10 bg-surface-2/70 text-gold"><Icon size={13} /></span>
      <div className="min-w-0">
        <div className="stat-label">{label}</div>
        {href
          ? <a className="flex items-center gap-1 text-sm font-medium text-gold hover:underline" href={href} target="_blank" rel="noreferrer noopener">{children}<ExternalLink size={12} /></a>
          : <div className="text-sm leading-snug">{children}</div>}
      </div>
    </div>
  );
}

export default function Surveys() {
  const { T, lang, surveys, leads, upd } = useApp();
  const [id, setId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [find, setFind] = useState('');
  const sv = surveys.find((s) => s.id === id);
  const lead = (s) => leads.find((l) => l.id === s.clientId);
  const label = (list, k) => (list[k] ? list[k][lang === 'ar' ? 1 : 0] : k || '—');
  const stName = (k) => { const s = SURVEY_STATUS.find((x) => x[0] === k); return s ? s[lang === 'ar' ? 2 : 1] : k; };
  const patch = (p) => {
    upd((o) => ({ surveys: o.surveys.map((s) => (s.id === id ? { ...s, ...p } : s)) }));
    // keep the CRM in sync: a scheduled survey moves the lead to "Site Measurement"
    if (p.status === 'scheduled') upd((o) => ({ leads: o.leads.map((l) => (l.id === sv.clientId && ['new', 'contacted'].includes(l.stage) ? { ...l, stage: 'measure' } : l)) }));
  };
  const term = find.trim().toLowerCase();
  const list = surveys
    .filter((s) => filter === 'all' || s.status === filter)
    .filter((s) => {
      if (!term) return true;
      const l = lead(s);
      return `${l?.name || ''} ${l?.company || ''} ${s.address || ''} ${s.city || ''}`.toLowerCase().includes(term);
    })
    .sort((a, b) => String(a.preferredDate || a.date).localeCompare(String(b.preferredDate || b.date)));

  const countOf = (k) => surveys.filter((s) => s.status === k).length;
  const nextVisit = surveys
    .map((s) => s.scheduledAt || s.preferredDate)
    .filter(Boolean)
    .sort()[0];

  const remove = () => {
    if (!confirm(T('Delete this survey?', 'حذف المعاينة؟'))) return;
    upd((o) => ({ surveys: o.surveys.filter((s) => s.id !== id) }));
    setId(null);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={ClipboardList} label={T('Survey requests', 'طلبات المعاينة')} value={String(surveys.length)} hint={T('From the website form', 'من نموذج الموقع')} />
        <Kpi icon={Clock} label={T('Awaiting scheduling', 'بانتظار الجدولة')} value={String(countOf('new'))} hint={T('New requests to call back', 'طلبات جديدة للتواصل')} tone={countOf('new') ? 'terra' : 'emerald'} />
        <Kpi icon={Calendar} label={T('Scheduled', 'مجدولة')} value={String(countOf('scheduled'))} hint={nextVisit ? `${T('Next visit', 'أقرب موعد')}: ${nextVisit}` : T('Nothing booked', 'لا مواعيد')} tone="sky" />
        <Kpi icon={CheckCircle2} label={T('Completed', 'منجزة')} value={String(countOf('done'))} hint={`${countOf('cancelled')} ${T('cancelled', 'ملغاة')}`} tone="emerald" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="seg">
          {[['all', T('All', 'الكل')], ...SURVEY_STATUS.map(([k, en, ar]) => [k, lang === 'ar' ? ar : en])].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setFilter(k)} data-active={filter === k} className="seg-tab">
              {l}<span className="tabular-nums opacity-60">({k === 'all' ? surveys.length : countOf(k)})</span>
            </button>
          ))}
        </div>
        <div className="relative min-w-[180px] max-w-[320px] flex-1">
          <Search size={14} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-subtle" />
          <input className="input !py-2 ps-9" placeholder={T('Search client or address…', 'ابحث بعميل أو عنوان…')} value={find} onChange={(e) => setFind(e.target.value)} aria-label={T('Search surveys', 'ابحث في المعاينات')} />
        </div>
        <span className="ms-auto hidden text-[11px] tabular-nums text-subtle sm:inline">{list.length} / {surveys.length}</span>
      </div>

      <div className="glass overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>{[T('Client', 'العميل'), T('Type', 'النوع'), T('Address', 'العنوان'), T('Preferred', 'الموعد المفضل'), T('Status', 'الحالة')].map((h, i) => <th key={h} className={`p-3 whitespace-nowrap ${i === 4 ? 'text-end' : 'text-start'}`}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id} onClick={() => setId(s.id)} className="cursor-pointer border-t border-line/10">
                <td className="min-w-[140px] p-3">
                  <div className="font-semibold">{lead(s)?.name || '—'}</div>
                  {lead(s)?.company && <div className="mt-0.5 text-xs text-subtle">{lead(s).company}</div>}
                </td>
                <td className="whitespace-nowrap p-3 text-muted">{label(TYPES, s.type)}</td>
                <td className="max-w-[260px] truncate p-3 text-muted">{s.address}{s.city && ` · ${s.city}`}</td>
                <td className="whitespace-nowrap p-3 text-xs">
                  {s.scheduledAt || s.preferredDate || '—'}
                  {s.preferredTime && <span className="text-subtle"> ({label(TIMES, s.preferredTime)})</span>}
                </td>
                <td className="p-3 text-end"><Badge id={TONE[s.status]}>{stName(s.status)}</Badge></td>
              </tr>
            ))}
            {!list.length && (
              <tr>
                <td colSpan="5" className="p-0">
                  <EmptyState
                    icon={ClipboardList}
                    title={surveys.length ? T('No requests match this filter.', 'لا طلبات مطابقة لهذا الفلتر.') : T('No site survey requests yet.', 'لا توجد طلبات معاينة بعد.')}
                    sub={surveys.length ? T('Clear the search or pick another status.', 'امسح البحث أو اختر حالة أخرى.') : T('They arrive here from the website “Site Survey” button.', 'تصل هنا من زر «معاينة الموقع» في الموقع.')}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {sv && <Modal wide title={`${T('Site Survey', 'معاينة موقع')} — ${lead(sv)?.name || ''}`} onClose={() => setId(null)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-line/10 bg-surface-2/40 p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="stat-label">{T('Request details', 'تفاصيل الطلب')}</span>
              <Badge id={TONE[sv.status]}>{stName(sv.status)}</Badge>
            </div>
            <Detail icon={Ruler} label={T('Type', 'النوع')}>{label(TYPES, sv.type)}</Detail>
            <Detail icon={MapPin} label={T('Site address', 'عنوان الموقع')}>{sv.address || '—'}{sv.city && ` · ${sv.city}`}</Detail>
            {sv.mapUrl && <Detail icon={ExternalLink} label={T('Location', 'الموقع')} href={sv.mapUrl}>{T('Open in Maps', 'فتح في الخرائط')}</Detail>}
            <Detail icon={Calendar} label={T('Preferred time', 'الموعد المفضل')}>
              {sv.preferredDate || '—'}{sv.preferredTime && ` (${label(TIMES, sv.preferredTime)})`}
            </Detail>
            {lead(sv) && <Detail icon={Phone} label={T('Contact', 'التواصل')}><span dir="ltr">{lead(sv).phone}</span>{lead(sv).email && <div className="text-[11px] text-subtle" dir="ltr">{lead(sv).email}</div>}</Detail>}
            {sv.notes && <p className="mt-2 border-t border-line/10 pt-2 text-xs leading-relaxed text-muted">{sv.notes}</p>}
            {lead(sv)?.file && <div className="mt-2"><FileLink name={lead(sv).file} path={lead(sv).filePath} /></div>}
          </div>

          <div className="space-y-3">
            <div>
              <label className="label">{T('Status', 'الحالة')}</label>
              <select className="input" value={sv.status} onChange={(e) => patch({ status: e.target.value })}>{SURVEY_STATUS.map(([k, en, ar]) => <option key={k} value={k}>{lang === 'ar' ? ar : en}</option>)}</select>
            </div>
            <Field label={T('Scheduled date', 'الموعد المؤكد')} type="date" v={sv.scheduledAt} on={(scheduledAt) => patch({ scheduledAt, ...(scheduledAt && sv.status === 'new' ? { status: 'scheduled' } : {}) })} />
            <Field label={T('Assigned engineer', 'المهندس المسؤول')} v={sv.assignee} on={(assignee) => patch({ assignee })} />
            <p className="flex items-center gap-1.5 text-[11px] leading-relaxed text-subtle">
              {sv.status === 'done' ? <CheckCircle2 size={12} className="shrink-0 text-emerald-500" /> : sv.status === 'cancelled' ? <XCircle size={12} className="shrink-0 text-red-400" /> : <Clock size={12} className="shrink-0" />}
              {T('Scheduling a survey moves the client to “Site Measurement” in the CRM.', 'جدولة المعاينة تنقل العميل إلى «رفع قياسات» في إدارة العملاء.')}
            </p>
          </div>

          <div className="sm:col-span-2">
            <label className="label">{T('Measurements / findings', 'القياسات / الملاحظات')}</label>
            <textarea className="input" rows="4" value={sv.result || ''} onChange={(e) => patch({ result: e.target.value })} placeholder={T('Sizes, materials, site constraints…', 'المقاسات، المواد، ملاحظات الموقع…')} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line/10 pt-4">
          <span className="text-[11px] tabular-nums text-subtle">{sv.date || sv.preferredDate || ''}</span>
          <button className="btn-ghost btn-sm ms-auto text-red-400" onClick={remove}><Trash2 size={14} />{T('Delete', 'حذف')}</button>
        </div>
      </Modal>}
    </div>
  );
}
