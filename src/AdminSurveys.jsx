import React, { useState } from 'react';
import { Ruler, MapPin, Calendar, Trash2, ExternalLink, Phone } from 'lucide-react';
import { useApp, SURVEY_STATUS, LEAD_CATS } from './store.jsx';
import { Modal, Badge, FileLink, Field } from './ui.jsx';

const TYPES = { signage: ['Signage / Facade', 'آرمة / واجهة'], booth: ['Exhibition booth', 'بوث معارض'], glass: ['Glass / Interior', 'زجاج / ديكور'], other: ['Other', 'أخرى'] };
const TIMES = { morning: ['Morning', 'صباحاً'], noon: ['Afternoon', 'ظهراً'], evening: ['Evening', 'مساءً'] };
const TONE = { new: 'sent', scheduled: 'contacted', done: 'won', cancelled: 'lost' };

export default function Surveys() {
  const { T, lang, surveys, leads, upd } = useApp();
  const [id, setId] = useState(null);
  const [filter, setFilter] = useState('all');
  const sv = surveys.find((s) => s.id === id);
  const lead = (s) => leads.find((l) => l.id === s.clientId);
  const label = (list, k) => (list[k] ? list[k][lang === 'ar' ? 1 : 0] : k || '—');
  const stName = (k) => { const s = SURVEY_STATUS.find((x) => x[0] === k); return s ? s[lang === 'ar' ? 2 : 1] : k; };
  const patch = (p) => {
    upd((o) => ({ surveys: o.surveys.map((s) => (s.id === id ? { ...s, ...p } : s)) }));
    // keep the CRM in sync: a scheduled survey moves the lead to "Site Measurement"
    if (p.status === 'scheduled') upd((o) => ({ leads: o.leads.map((l) => (l.id === sv.clientId && ['new', 'contacted'].includes(l.stage) ? { ...l, stage: 'measure' } : l)) }));
  };
  const list = surveys.filter((s) => filter === 'all' || s.status === filter).sort((a, b) => String(a.preferredDate || a.date).localeCompare(String(b.preferredDate || b.date)));
  const cat = LEAD_CATS.find((c) => c[0] === 'survey');
  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {[['all', T('All', 'الكل')], ...SURVEY_STATUS.map(([k, en, ar]) => [k, lang === 'ar' ? ar : en])].map(([k, l]) => (
          <button key={k} className={`btn !py-1.5 ${filter === k ? 'bg-gold text-ink' : 'btn-ghost'}`} onClick={() => setFilter(k)}>{l}{k !== 'all' && <span className="opacity-60 text-xs">({surveys.filter((s) => s.status === k).length})</span>}</button>
        ))}
      </div>
      <div className="glass overflow-auto">
        <table className="w-full text-sm"><thead className="text-xs opacity-60"><tr>{[T('Client', 'العميل'), T('Type', 'النوع'), T('Address', 'العنوان'), T('Preferred', 'الموعد المفضل'), T('Status', 'الحالة')].map((h) => <th key={h} className="p-3 text-start">{h}</th>)}</tr></thead>
          <tbody>{list.map((s) => <tr key={s.id} onClick={() => setId(s.id)} className="border-t border-black/5 dark:border-white/10 cursor-pointer hover:bg-gold/5">
            <td className="p-3 font-semibold">{lead(s)?.name}<div className="text-xs opacity-50">{lead(s)?.company}</div></td>
            <td className="p-3">{label(TYPES, s.type)}</td>
            <td className="p-3 max-w-[260px] truncate">{s.address}{s.city && ` · ${s.city}`}</td>
            <td className="p-3">{s.scheduledAt || s.preferredDate || '—'} {s.preferredTime && <span className="text-xs opacity-60">({label(TIMES, s.preferredTime)})</span>}</td>
            <td className="p-3"><Badge id={TONE[s.status]}>{stName(s.status)}</Badge></td></tr>)}
            {!list.length && <tr><td colSpan="5" className="p-6 text-center opacity-60">{T('No site survey requests yet. They arrive here from the website “Site Survey” button.', 'لا توجد طلبات معاينة بعد. تصل هنا من زر «معاينة الموقع» في الموقع.')}</td></tr>}</tbody></table>
      </div>
      {sv && <Modal wide title={`${T('Site Survey', 'معاينة موقع')} — ${lead(sv)?.name || ''}`} onClose={() => setId(null)}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="text-sm space-y-1.5">
            <div className="flex items-center gap-2"><Ruler size={14} className="text-gold" />{label(TYPES, sv.type)}</div>
            <div className="flex items-center gap-2"><MapPin size={14} className="text-gold" />{sv.address}{sv.city && ` · ${sv.city}`}</div>
            {sv.mapUrl && <a className="flex items-center gap-2 text-gold underline" href={sv.mapUrl} target="_blank" rel="noreferrer noopener"><ExternalLink size={14} />{T('Open in Maps', 'فتح في الخرائط')}</a>}
            <div className="flex items-center gap-2"><Calendar size={14} className="text-gold" />{sv.preferredDate || '—'} {sv.preferredTime && `(${label(TIMES, sv.preferredTime)})`}</div>
            {lead(sv) && <div className="flex items-center gap-2" dir="ltr"><Phone size={14} className="text-gold" />{lead(sv).phone} {lead(sv).email && `· ${lead(sv).email}`}</div>}
            {sv.notes && <p className="opacity-70 pt-1">{sv.notes}</p>}
            {lead(sv)?.file && <FileLink name={lead(sv).file} path={lead(sv).filePath} />}
          </div>
          <div className="space-y-3">
            <div><label className="label">{T('Status', 'الحالة')}</label><select className="input" value={sv.status} onChange={(e) => patch({ status: e.target.value })}>{SURVEY_STATUS.map(([k, en, ar]) => <option key={k} value={k}>{lang === 'ar' ? ar : en}</option>)}</select></div>
            <Field label={T('Scheduled date', 'الموعد المؤكد')} type="date" v={sv.scheduledAt} on={(scheduledAt) => patch({ scheduledAt, ...(scheduledAt && sv.status === 'new' ? { status: 'scheduled' } : {}) })} />
            <Field label={T('Assigned engineer', 'المهندس المسؤول')} v={sv.assignee} on={(assignee) => patch({ assignee })} />
          </div>
          <div className="sm:col-span-2"><label className="label">{T('Measurements / findings', 'القياسات / الملاحظات')}</label><textarea className="input" rows="4" value={sv.result || ''} onChange={(e) => patch({ result: e.target.value })} /></div>
        </div>
        <div className="flex gap-2 mt-4 flex-wrap">
          <button className="btn-ghost text-red-400 ms-auto" onClick={() => { if (confirm(T('Delete this survey?', 'حذف المعاينة؟'))) { upd((o) => ({ surveys: o.surveys.filter((s) => s.id !== id) })); setId(null); } }}><Trash2 size={15} />{T('Delete', 'حذف')}</button>
        </div>
        <span className="hidden">{cat?.[0]}</span>
      </Modal>}
    </div>
  );
}
