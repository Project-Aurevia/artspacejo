import React, { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, ImagePlus, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp, uid, CATS } from './store.jsx';
import { uploadMedia } from './api.js';

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
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  // Cards are collapsed by default: the board is scannable instead of one long scroll.
  const [open, setOpen] = useState(() => new Set());

  const setList = (name, fn) => upd((o) => ({ content: { ...o.content, [name]: fn(o.content[name] || []) } }));
  const edit = (name, id, p) => setList(name, (l) => l.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const del = (name, id) => confirm(T('Delete this item?', 'حذف هذا العنصر؟')) && setList(name, (l) => l.filter((x) => x.id !== id));
  const mv = (name, i, d) => setList(name, (l) => move(l, i, d));
  const add = (name, item) => {
    const id = uid('c');
    setList(name, (l) => [{ id, ...item }, ...l]);
    setOpen((o) => new Set(o).add(id)); // open the blank card so it is obvious what to fill in
  };
  const toggle = (id) => setOpen((o) => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const tabs = [['projects', T('Project Showcases', 'أعمال ومشاريع')], ['testimonials', T('Testimonials', 'آراء العملاء')], ['clients', T('Key Clients', 'عملاؤنا')]];
  const all = content[tab] || [];
  const txt = (v) => (v && typeof v === 'object' ? `${v.en || ''} ${v.ar || ''}` : String(v || ''));
  const needle = q.trim().toLowerCase();
  const list = all.filter((x) => (tab !== 'projects' || cat === 'all' || x.cat === cat) && (!needle || txt(x.title || x.name).toLowerCase().includes(needle)));
  const catName = (k) => { const c = CATS.find((x) => x[0] === k); return c ? (lang === 'ar' ? c[2] : c[1]) : k; };
  const allOpen = list.length > 0 && list.every((x) => open.has(x.id));
  const NEW = {
    projects: { cat: 'signage', title: { en: 'New project', ar: 'مشروع جديد' }, desc: { en: '', ar: '' }, image: '' },
    testimonials: { name: { en: 'Client name', ar: 'اسم العميل' }, role: { en: 'Title, Company', ar: 'المسمى، الشركة' }, quote: { en: '', ar: '' }, rating: 5 },
    clients: { name: { en: 'New client', ar: 'عميل جديد' }, logo: '' },
  };

  return (
    <div>
      {/* sticky control bar so filters stay reachable while editing */}
      <div className="sticky top-[49px] md:top-[53px] z-10 -mx-4 md:-mx-8 px-4 md:px-8 py-3 mb-4 bg-cream-50/92 dark:bg-ink/92 backdrop-blur border-b border-black/5 dark:border-white/10">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5">
            {tabs.map(([k, l]) => (
              <button key={k} type="button" onClick={() => { setTab(k); setCat('all'); setQ(''); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${tab === k ? 'bg-gold text-ink shadow-sm' : 'opacity-70 hover:opacity-100'}`}>
                {l} <span className="opacity-60">({(content[k] || []).length})</span>
              </button>
            ))}
          </div>
          <button type="button" className="btn-terra !py-2 !px-3 text-xs ms-auto" onClick={() => add(tab, NEW[tab])}><Plus size={14} />{T('Add new', 'إضافة جديد')}</button>
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-2">
          <div className="relative flex-1 min-w-[160px] max-w-[260px]">
            <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 opacity-40" />
            <input className="input !py-2 ps-9" placeholder={T('Search…', 'بحث…')} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {tab === 'projects' && [{ k: 'all', l: T('All', 'الكل') }, ...CATS.map(([k, en, ar]) => ({ k, l: lang === 'ar' ? ar : en }))].map(({ k, l }) => (
            <button key={k} type="button" onClick={() => setCat(k)}
              className={`badge !py-1 !px-2.5 border transition ${cat === k ? 'bg-gold text-ink border-gold' : 'border-black/10 dark:border-white/15'}`}>
              {l} <span className="opacity-50">({k === 'all' ? all.length : all.filter((x) => x.cat === k).length})</span>
            </button>
          ))}
          <span className="text-[10px] opacity-40 ms-auto">{list.length}/{all.length}</span>
          {list.length > 1 && <button type="button" className="btn-ghost !py-1.5 !px-2.5 text-[11px]" onClick={() => setOpen(allOpen ? new Set() : new Set(list.map((x) => x.id)))}>{allOpen ? T('Collapse all', 'طي الكل') : T('Expand all', 'توسيع الكل')}</button>}
        </div>
      </div>

      <p className="text-xs opacity-60 mb-3">{T('Changes appear instantly on the public website. Click a card to edit it; use ↑ ↓ to reorder.', 'التغييرات تظهر فوراً في الموقع. اضغط البطاقة للتحرير، واستخدم ↑ ↓ لإعادة الترتيب.')}</p>

      {all.length === 0 && <div className="glass p-8 text-center text-sm opacity-60">{T('Nothing here yet. Click "Add new".', 'لا يوجد شيء بعد. اضغط "إضافة جديد".')}</div>}
      {all.length > 0 && list.length === 0 && <div className="glass p-8 text-center text-sm opacity-60">{T('No matching items. Clear the search or filter.', 'لا توجد عناصر مطابقة. امسح البحث أو الفلتر.')}</div>}

      {tab === 'projects' && <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3 items-start">
        {list.map((p) => {
          const i = all.indexOf(p);
          const isOpen = open.has(p.id);
          return (
            <div key={p.id} className={`glass overflow-hidden transition ${isOpen ? 'sm:col-span-2 2xl:col-span-3' : 'hover:ring-1 hover:ring-gold/40'}`}>
              <div className="flex items-center gap-3 p-3">
                <div className="w-14 h-14 rounded-lg bg-black/10 dark:bg-white/10 overflow-hidden grid place-items-center shrink-0">
                  {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : <ImagePlus size={16} className="opacity-40" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">{txt(p.title) || T('Untitled', 'بدون عنوان')}</div>
                  <div className="flex items-center gap-2 mt-1"><span className="badge bg-gold/15 text-gold">{catName(p.cat)}</span><span className="text-[10px] opacity-40">#{i + 1}</span>{!p.image && <span className="text-[10px] text-terra">{T('no photo', 'بدون صورة')}</span>}</div>
                </div>
                <button type="button" onClick={() => toggle(p.id)} className="btn-ghost !p-2 shrink-0" title={isOpen ? T('Collapse', 'طي') : T('Edit', 'تحرير')}>{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
              </div>
              {isOpen && <div className="px-3 pb-3 pt-3 border-t border-black/5 dark:border-white/10 space-y-3">
                <div className="flex gap-4 flex-wrap md:flex-nowrap items-start">
                  <ImgPick value={p.image} on={(image) => edit('projects', p.id, { image })} label={T('Upload photo', 'رفع صورة')} />
                  <div className="flex-1 min-w-[240px] space-y-3">
                    <div><label className="label">{T('Category', 'الفئة')}</label>
                      <select className="input" value={p.cat} onChange={(e) => edit('projects', p.id, { cat: e.target.value })}>{CATS.map(([k, en, ar]) => <option key={k} value={k}>{lang === 'ar' ? ar : en}</option>)}</select></div>
                    <Pair label={T('Title', 'العنوان')} v={p.title} on={(title) => edit('projects', p.id, { title })} />
                    <Pair area label={T('Description', 'الوصف')} v={p.desc} on={(desc) => edit('projects', p.id, { desc })} />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Ctl i={i} n={all.length} up={() => mv('projects', i, -1)} down={() => mv('projects', i, 1)} del={() => del('projects', p.id)} />
                  <button type="button" className="btn-gold !py-1.5 !px-3 text-[11px] ms-auto" onClick={() => toggle(p.id)}>{T('Done', 'تم')}</button>
                </div>
              </div>}
            </div>
          );
        })}
      </div>}

      {tab === 'testimonials' && <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3 items-start">
        {list.map((t) => {
          const i = all.indexOf(t);
          const isOpen = open.has(t.id);
          return (
            <div key={t.id} className={`glass overflow-hidden transition ${isOpen ? 'md:col-span-2 2xl:col-span-3' : 'hover:ring-1 hover:ring-gold/40'}`}>
              <div className="flex items-start gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">{txt(t.name) || T('Unnamed', 'بدون اسم')}</div>
                  <div className="text-[11px] opacity-60 truncate">{txt(t.role)}</div>
                  <div className="text-gold text-xs mt-1">{'★'.repeat(Number(t.rating) || 5)}</div>
                  {!isOpen && <p className="text-xs opacity-50 mt-1 line-clamp-2">{txt(t.quote)}</p>}
                </div>
                <button type="button" onClick={() => toggle(t.id)} className="btn-ghost !p-2 shrink-0">{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
              </div>
              {isOpen && <div className="px-3 pb-3 pt-3 border-t border-black/5 dark:border-white/10 space-y-3">
                <Pair label={T('Client name', 'اسم العميل')} v={t.name} on={(name) => edit('testimonials', t.id, { name })} />
                <Pair label={T('Role / company', 'المسمى / الشركة')} v={t.role} on={(role) => edit('testimonials', t.id, { role })} />
                <Pair area label={T('Testimonial', 'الشهادة')} v={t.quote} on={(quote) => edit('testimonials', t.id, { quote })} />
                <div className="flex items-end gap-3 flex-wrap">
                  <div><label className="label">{T('Rating', 'التقييم')}</label>
                    <select className="input !w-28" value={t.rating} onChange={(e) => edit('testimonials', t.id, { rating: +e.target.value })}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)}</option>)}</select></div>
                  <Ctl i={i} n={all.length} up={() => mv('testimonials', i, -1)} down={() => mv('testimonials', i, 1)} del={() => del('testimonials', t.id)} />
                  <button type="button" className="btn-gold !py-1.5 !px-3 text-[11px] ms-auto" onClick={() => toggle(t.id)}>{T('Done', 'تم')}</button>
                </div>
              </div>}
            </div>
          );
        })}
      </div>}

      {tab === 'clients' && <>
        <p className="text-xs text-terra mb-3">{T('Tip: upload each company\'s official logo (PNG with transparent background works best). Until then a styled name badge is shown.', 'نصيحة: ارفع الشعار الرسمي لكل شركة (يفضل PNG بخلفية شفافة). حتى ذلك الحين يظهر اسم الشركة بتصميم أنيق.')}</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 items-start">
          {list.map((c) => {
            const i = all.indexOf(c);
            return (
              <div key={c.id} className="glass p-3 flex gap-3 items-start">
                <ImgPick fit="contain" value={c.logo} on={(logo) => edit('clients', c.id, { logo })} label={T('Logo', 'الشعار')} />
                <div className="flex-1 min-w-0">
                  <Pair label={T('Company name', 'اسم الشركة')} v={c.name} on={(name) => edit('clients', c.id, { name })} />
                  <div className="mt-2"><Ctl i={i} n={all.length} up={() => mv('clients', i, -1)} down={() => mv('clients', i, 1)} del={() => del('clients', c.id)} /></div>
                </div>
              </div>
            );
          })}
        </div>
      </>}
    </div>
  );
}
