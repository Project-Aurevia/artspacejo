import React, { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, ImagePlus } from 'lucide-react';
import { useApp, uid, CATS } from './store.jsx';
import { uploadMedia } from './supabase.js';

/* ---------- small shared inputs (module-level so inputs never lose focus) ---------- */
export function Pair({ label, v, on, area }) {
  const Tag = area ? 'textarea' : 'input';
  return (
    <div>
      <label className="label">{label}</label>
      <div className="grid grid-cols-2 gap-2">
        <Tag className="input" dir="ltr" placeholder="EN" rows={area ? 2 : undefined} value={v?.en || ''} onChange={(e) => on({ ar: v?.ar, en: e.target.value })} />
        <Tag className="input" dir="rtl" placeholder="AR" rows={area ? 2 : undefined} value={v?.ar || ''} onChange={(e) => on({ en: v?.en, ar: e.target.value })} />
      </div>
    </div>
  );
}

export function ImgPick({ value, on, fit = 'cover', label }) {
  const { T } = useApp();
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true);
    try { on(await uploadMedia(f)); } catch { alert(T('Could not read this image.', 'تعذرت قراءة هذه الصورة.')); }
    setBusy(false);
  };
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 h-24 rounded-lg bg-black/10 dark:bg-white/10 overflow-hidden grid place-items-center shrink-0">
        {value ? <img src={value} alt="" className={`w-full h-full ${fit === 'contain' ? 'object-contain p-2' : 'object-cover'}`} /> : <ImagePlus className="opacity-40" />}
      </div>
      <div className="space-y-1">
        <label className="btn-ghost text-xs cursor-pointer">{busy ? '…' : label}<input type="file" accept="image/*" className="hidden" onChange={pick} /></label>
        {value && <button type="button" className="text-xs text-red-400 block" onClick={() => on('')}>{T('Remove image', 'إزالة الصورة')}</button>}
      </div>
    </div>
  );
}

const Ctl = ({ i, n, up, down, del }) => (
  <div className="flex md:flex-col gap-1 shrink-0">
    <button type="button" disabled={i === 0} onClick={up} className="btn-ghost !p-2 disabled:opacity-30"><ArrowUp size={14} /></button>
    <button type="button" disabled={i === n - 1} onClick={down} className="btn-ghost !p-2 disabled:opacity-30"><ArrowDown size={14} /></button>
    <button type="button" onClick={del} className="btn-ghost !p-2 !text-red-400"><Trash2 size={14} /></button>
  </div>
);

const move = (arr, i, d) => {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const n = [...arr];
  [n[i], n[j]] = [n[j], n[i]];
  return n;
};

/* ================= Calculator catalog editor ================= */
const NEW_ITEM = {
  area: { en: 'New material', ar: 'صنف جديد', price: 0, dept: 'signage' },
  addons: { en: 'New add-on', ar: 'إضافة جديدة', price: 0, unit: 'm2', on: false },
  print: { en: 'New print item', ar: 'منتج مطبوع جديد', price: 0, sizes: ['A4'] },
  packages: { en: 'New package', ar: 'باقة جديدة', price: 0, dept: 'social', features: { en: [], ar: [] } },
  marketing: { en: 'New service', ar: 'خدمة جديدة', price: 0, dept: 'marketing' },
};

export function CatalogGroup({ g, title, unit }) {
  const { T, rates, upd } = useApp();
  const entries = Object.entries(rates[g] || {});
  const patch = (k, p) => upd((o) => ({ rates: { ...o.rates, [g]: { ...o.rates[g], [k]: { ...o.rates[g][k], ...p } } } }));
  const remove = (k) => {
    if (!confirm(T('Delete this item? It disappears from the website calculator.', 'حذف هذا العنصر؟ سيختفي من الحاسبة في الموقع.'))) return;
    upd((o) => { const n = { ...o.rates[g] }; delete n[k]; return { rates: { ...o.rates, [g]: n } }; });
  };
  const add = () => upd((o) => ({ rates: { ...o.rates, [g]: { ...o.rates[g], [uid('x')]: { ...NEW_ITEM[g] } } } }));
  const lines = (txt) => txt.split('\n').map((s) => s.trim()).filter(Boolean);

  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gold">{title}</h3>
        <button type="button" className="btn-gold !py-1.5 text-xs" onClick={add}><Plus size={14} />{T('Add', 'إضافة')}</button>
      </div>
      {entries.length === 0 && <p className="text-xs opacity-60">{T('Empty — add your first item.', 'فارغ — أضف أول عنصر.')}</p>}
      <div className="space-y-3">
        {entries.map(([k, m]) => (
          <div key={k} className="rounded-xl border border-black/10 dark:border-white/10 p-3 space-y-2">
            <div className="flex gap-2 items-start">
              <div className="flex-1"><Pair label={T('Name', 'الاسم')} v={{ en: m.en, ar: m.ar }} on={(x) => patch(k, { en: x.en, ar: x.ar })} /></div>
              <button type="button" className="text-red-400 mt-6" onClick={() => remove(k)}><Trash2 size={16} /></button>
            </div>
            <Pair label={T('Description (shown to customers)', 'الوصف (يظهر للعملاء)')} v={{ en: m.den, ar: m.dar }} on={(x) => patch(k, { den: x.en, dar: x.ar })} />
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="label">{T('Price (JOD)', 'السعر (دينار)')}</label>
                <div className="flex items-center gap-2">
                  <input type="number" step="0.01" className="input !w-28" value={m.price} onChange={(e) => patch(k, { price: parseFloat(e.target.value) || 0 })} />
                  <span className="text-xs opacity-60">{g === 'addons' ? (m.unit === 'flat' ? T('flat', 'مقطوع') : '/ m²') : unit}</span>
                </div>
              </div>
              {g === 'addons' && <>
                <div><label className="label">{T('Charged', 'طريقة الاحتساب')}</label>
                  <select className="input" value={m.unit || 'm2'} onChange={(e) => patch(k, { unit: e.target.value })}>
                    <option value="m2">{T('per m²', 'للمتر المربع')}</option><option value="flat">{T('flat fee', 'مبلغ مقطوع')}</option></select></div>
                <label className="flex items-center gap-2 text-sm pb-2"><input type="checkbox" className="accent-[#C9A45C]" checked={!!m.on} onChange={(e) => patch(k, { on: e.target.checked })} />{T('Pre-selected', 'محدد افتراضياً')}</label>
              </>}
              {g === 'print' && <div className="flex-1 min-w-[180px]"><label className="label">{T('Available sizes (comma separated)', 'المقاسات المتاحة (مفصولة بفاصلة)')}</label>
                <input className="input" defaultValue={(m.sizes || []).join(', ')} onBlur={(e) => patch(k, { sizes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} /></div>}
              {g === 'packages' && <label className="flex items-center gap-2 text-sm pb-2"><input type="checkbox" className="accent-[#C9A45C]" checked={!!m.popular} onChange={(e) => patch(k, { popular: e.target.checked })} />{T('Mark as "Most Popular"', 'علامة "الأكثر طلباً"')}</label>}
            </div>
            {g === 'packages' && <div className="grid grid-cols-2 gap-2">
              <div><label className="label">{T('Features EN (one per line)', 'المزايا EN (سطر لكل ميزة)')}</label>
                <textarea rows="4" dir="ltr" className="input" defaultValue={(m.features?.en || []).join('\n')} onBlur={(e) => patch(k, { features: { ...m.features, en: lines(e.target.value) } })} /></div>
              <div><label className="label">{T('Features AR (one per line)', 'المزايا AR (سطر لكل ميزة)')}</label>
                <textarea rows="4" dir="rtl" className="input" defaultValue={(m.features?.ar || []).join('\n')} onBlur={(e) => patch(k, { features: { ...m.features, ar: lines(e.target.value) } })} /></div>
            </div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= Website content manager ================= */
export function ContentManager() {
  const { T, lang, content, upd } = useApp();
  const [tab, setTab] = useState('projects');
  const setList = (name, fn) => upd((o) => ({ content: { ...o.content, [name]: fn(o.content[name] || []) } }));
  const edit = (name, id, p) => setList(name, (l) => l.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const del = (name, id) => confirm(T('Delete this item?', 'حذف هذا العنصر؟')) && setList(name, (l) => l.filter((x) => x.id !== id));
  const mv = (name, i, d) => setList(name, (l) => move(l, i, d));
  const add = (name, item) => setList(name, (l) => [{ id: uid('c'), ...item }, ...l]);

  const tabs = [['projects', T('Project Showcases', 'أعمال ومشاريع')], ['testimonials', T('Testimonials', 'آراء العملاء')], ['clients', T('Key Clients', 'عملاؤنا')]];
  const list = content[tab] || [];

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap items-center">
        {tabs.map(([k, l]) => <button key={k} type="button" onClick={() => setTab(k)} className={`btn ${tab === k ? 'bg-gold text-ink' : 'btn-ghost'}`}>{l} <span className="text-[10px] opacity-70">({(content[k] || []).length})</span></button>)}
        <button type="button" className="btn-terra ms-auto" onClick={() => add(tab, {
          projects: { cat: 'signage', title: { en: 'New project', ar: 'مشروع جديد' }, desc: { en: '', ar: '' }, image: '' },
          testimonials: { name: { en: 'Client name', ar: 'اسم العميل' }, role: { en: 'Title, Company', ar: 'المسمى، الشركة' }, quote: { en: '', ar: '' }, rating: 5 },
          clients: { name: { en: 'New client', ar: 'عميل جديد' }, logo: '' },
        }[tab])}><Plus size={15} />{T('Add new', 'إضافة جديد')}</button>
      </div>
      <p className="text-xs opacity-60">{T('Changes appear instantly on the public website. Use the arrows to reorder.', 'التغييرات تظهر فوراً في الموقع. استخدم الأسهم لإعادة الترتيب.')}</p>
      {list.length === 0 && <div className="glass p-8 text-center text-sm opacity-60">{T('Nothing here yet. Click "Add new".', 'لا يوجد شيء بعد. اضغط "إضافة جديد".')}</div>}

      {tab === 'projects' && list.map((p, i) => (
        <div key={p.id} className="glass p-4 flex gap-4 flex-wrap md:flex-nowrap items-start">
          <ImgPick value={p.image} on={(image) => edit('projects', p.id, { image })} label={T('Upload photo', 'رفع صورة')} />
          <div className="flex-1 min-w-[240px] space-y-3">
            <div><label className="label">{T('Category', 'الفئة')}</label>
              <select className="input" value={p.cat} onChange={(e) => edit('projects', p.id, { cat: e.target.value })}>{CATS.map(([k, en, ar]) => <option key={k} value={k}>{lang === 'ar' ? ar : en}</option>)}</select></div>
            <Pair label={T('Title', 'العنوان')} v={p.title} on={(title) => edit('projects', p.id, { title })} />
            <Pair area label={T('Description', 'الوصف')} v={p.desc} on={(desc) => edit('projects', p.id, { desc })} />
          </div>
          <Ctl i={i} n={list.length} up={() => mv('projects', i, -1)} down={() => mv('projects', i, 1)} del={() => del('projects', p.id)} />
        </div>
      ))}

      {tab === 'testimonials' && list.map((t, i) => (
        <div key={t.id} className="glass p-4 flex gap-4 flex-wrap md:flex-nowrap items-start">
          <div className="flex-1 min-w-[240px] space-y-3">
            <Pair label={T('Client name', 'اسم العميل')} v={t.name} on={(name) => edit('testimonials', t.id, { name })} />
            <Pair label={T('Role / company', 'المسمى / الشركة')} v={t.role} on={(role) => edit('testimonials', t.id, { role })} />
            <Pair area label={T('Testimonial', 'الشهادة')} v={t.quote} on={(quote) => edit('testimonials', t.id, { quote })} />
            <div><label className="label">{T('Rating', 'التقييم')}</label>
              <select className="input !w-28" value={t.rating} onChange={(e) => edit('testimonials', t.id, { rating: +e.target.value })}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)}</option>)}</select></div>
          </div>
          <Ctl i={i} n={list.length} up={() => mv('testimonials', i, -1)} down={() => mv('testimonials', i, 1)} del={() => del('testimonials', t.id)} />
        </div>
      ))}

      {tab === 'clients' && <>
        <p className="text-xs text-terra">{T('Tip: upload each company\'s official logo (PNG with transparent background works best). Until then a styled name badge is shown.', 'نصيحة: ارفع الشعار الرسمي لكل شركة (يفضل PNG بخلفية شفافة). حتى ذلك الحين يظهر اسم الشركة بتصميم أنيق.')}</p>
        {list.map((c, i) => (
          <div key={c.id} className="glass p-4 flex gap-4 flex-wrap md:flex-nowrap items-center">
            <ImgPick fit="contain" value={c.logo} on={(logo) => edit('clients', c.id, { logo })} label={T('Upload logo', 'رفع الشعار')} />
            <div className="flex-1 min-w-[240px]"><Pair label={T('Company name', 'اسم الشركة')} v={c.name} on={(name) => edit('clients', c.id, { name })} /></div>
            <Ctl i={i} n={list.length} up={() => mv('clients', i, -1)} down={() => mv('clients', i, 1)} del={() => del('clients', c.id)} />
          </div>
        ))}
      </>}
    </div>
  );
}
