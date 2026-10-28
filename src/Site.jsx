import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Sun, Moon, Languages, ShieldCheck, ShoppingCart, Signpost, Printer, Share2, Compass, Check, X, Trash2, Upload,
  Layers, Lightbulb, PanelTop, Store, Palette, Calculator, ArrowRight, Phone, Mail, MapPin, Send, Menu, Ruler, CalendarCheck, MessageCircle,
} from 'lucide-react';
import Logo, { Mark } from './Logo.jsx';
import { useApp, uid, CATS } from './store.jsx';
import { signageQuote, printQuote, addonOn } from './pricing.js';
import { uploadFile } from './api.js';

/* ================= Header ================= */
function Header({ onCart }) {
  const { T, lang, dark, upd, cart } = useApp();
  const [open, setOpen] = useState(false);
  const links = [
    ['signage', T('Signage & Booths', 'آرمات ومعارض')],
    ['printing', T('Printing', 'مطبوعات')],
    ['social', T('Social Media', 'سوشيال ميديا')],
    ['marketing', T('Strategy', 'استشارات')],
    ['calculator', T('Calculator', 'الحاسبة')],
    ['portfolio', T('Portfolio', 'أعمالنا')],
    ['testimonials', T('Reviews', 'آراء العملاء')],
  ];
  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-ink/80 backdrop-blur-xl border-b border-white/10 text-cream">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 h-16">
        <a href="#top"><Logo className="h-9" /></a>
        <nav className="hidden lg:flex gap-6 text-sm">
          {links.map(([id, l]) => <a key={id} href={`#${id}`} className="hover:text-gold transition">{l}</a>)}
        </nav>
        <div className="flex items-center gap-2">
          <button className="btn-ghost !px-3 !py-2 !border-white/20" onClick={() => upd({ lang: lang === 'ar' ? 'en' : 'ar' })}><Languages size={16} />{lang === 'ar' ? 'EN' : 'عربي'}</button>
          <button className="btn-ghost !px-3 !py-2 !border-white/20" onClick={() => upd({ dark: !dark })}>{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
          <button className="btn-ghost !px-3 !py-2 !border-white/20 relative" onClick={onCart}><ShoppingCart size={16} />{cart.length > 0 && <span className="absolute -top-1 -end-1 bg-terra text-[10px] rounded-full w-4 h-4 grid place-items-center">{cart.length}</span>}</button>
          <button className="lg:hidden btn-ghost !px-3 !py-2 !border-white/20" aria-label="Menu" onClick={() => setOpen(!open)}><Menu size={16} /></button>
        </div>
      </div>
      {open && <div className="lg:hidden px-4 pb-4 flex flex-col gap-3 text-sm">{links.map(([id, l]) => <a key={id} href={`#${id}`} onClick={() => setOpen(false)}>{l}</a>)}</div>}
    </header>
  );
}

/* ================= Shared bits ================= */
const Section = ({ id, kicker, title, sub, children }) => (
  <section id={id} className="py-20 px-4 scroll-mt-16">
    <div className="max-w-7xl mx-auto">
      <p className="text-gold text-xs font-bold tracking-[0.25em] uppercase mb-2">{kicker}</p>
      <h2 className="text-3xl md:text-4xl font-extrabold mb-3">{title}</h2>
      {sub && <p className="opacity-70 max-w-3xl mb-10">{sub}</p>}
      {children}
    </div>
  </section>
);

function ServiceGroup({ icon: Icon, title, items }) {
  return (
    <div className="glass p-6 card-hover">
      <div className="flex items-center gap-3 mb-4"><span className="w-10 h-10 rounded-xl bg-gold/15 text-gold grid place-items-center"><Icon size={20} /></span><h3 className="font-bold text-lg">{title}</h3></div>
      <ul className="space-y-2 text-sm opacity-80">{items.map((x) => <li key={x} className="flex gap-2"><Check size={15} className="text-terra mt-0.5 shrink-0" />{x}</li>)}</ul>
    </div>
  );
}

/* ================= Hero ================= */
function Hero({ onSurvey, onVisit }) {
  const { T } = useApp();
  return (
    <section id="top" className="relative pt-32 pb-24 px-4 bg-ink text-cream overflow-hidden">
      <div className="absolute -top-20 -end-20 w-96 h-96 rounded-full bg-terra/20 blur-3xl" />
      <div className="absolute bottom-0 -start-20 w-96 h-96 rounded-full bg-gold/15 blur-3xl" />
      <div className="relative max-w-7xl mx-auto grid md:grid-cols-2 gap-10 items-center">
        <div>
          <span className="badge bg-gold/20 text-gold mb-4">{T('Full-Service Advertising Agency', 'وكالة دعاية وإعلان متكاملة')}</span>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-5">
            {T('We build brands you can ', 'نصنع علامات تجارية ')}<span className="text-gold">{T('see, touch & feel.', 'تُرى وتُلمس وتُحَس.')}</span>
          </h1>
          <p className="opacity-75 mb-8 max-w-lg">{T('Signage & facades, exhibition booths, commercial printing, social media management and marketing strategy — under one roof, with instant online pricing.', 'آرمات وواجهات، تجهيز معارض، مطبوعات تجارية، إدارة سوشيال ميديا واستشارات تسويقية — تحت سقف واحد مع تسعير فوري أونلاين.')}</p>
          <div className="flex flex-wrap gap-3">
            <a href="#calculator" className="btn-gold"><Calculator size={16} />{T('Instant Quote', 'احسب سعرك فوراً')}</a>
            <a href="#marketing" className="btn-ghost !border-white/25">{T('Book Strategy Session', 'احجز جلسة استشارية')}<ArrowRight size={16} className="rtl:rotate-180" /></a>
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            <button type="button" onClick={onSurvey} className="btn-terra"><Ruler size={16} />{T('Site Survey', 'معاينة الموقع (Site Survey)')}</button>
            <button type="button" onClick={onVisit} className="btn-ghost !border-white/25"><CalendarCheck size={16} />{T('Request a Visit', 'اطلب زيارة')}</button>
          </div>
          <div className="flex gap-8 mt-10 text-sm">
            {[['850+', T('Projects', 'مشروع')], ['12', T('Years', 'سنة خبرة')], ['4', T('Departments', 'أقسام')]].map(([n, l]) => <div key={l}><div className="text-2xl font-extrabold text-gold">{n}</div><div className="opacity-60">{l}</div></div>)}
          </div>
        </div>
        <div className="flex justify-center"><Mark className="h-72 md:h-96 drop-shadow-[0_0_40px_rgba(201,164,92,.25)] animate-pulse [animation-duration:5s]" /></div>
      </div>
    </section>
  );
}

/* ================= Generic website form modal (Site Survey / Visit) ================= */
function FormModal({ kind, title, intro, onClose, children }) {
  const { T, sendForm } = useApp();
  const empty = { name: '', company: '', phone: '', email: '', notes: '', website: '', address: '', city: '', mapUrl: '', type: 'signage', preferredDate: '', preferredTime: '' };
  const [f, setF] = useState(empty);
  const [fileObj, setFileObj] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const today = new Date().toISOString().slice(0, 10);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    const filePath = fileObj ? await uploadFile(fileObj) : '';
    const r = await sendForm(kind, {
      name: f.name, company: f.company, phone: f.phone, email: f.email, notes: f.notes, website: f.website,
      file: fileObj?.name || '', filePath,
      survey: { address: f.address, city: f.city, mapUrl: f.mapUrl, type: f.type, preferredDate: f.preferredDate, preferredTime: f.preferredTime, notes: f.notes },
    });
    setBusy(false);
    if (r.error) setErr(r.error); else setDone(true);
  };
  const types = [['signage', T('Signage / Facade', 'آرمة / واجهة')], ['booth', T('Exhibition booth', 'بوث معارض')], ['glass', T('Glass / Interior branding', 'تغليف زجاج / ديكور')], ['other', T('Other', 'أخرى')]];
  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur grid place-items-center p-4 text-ink dark:text-cream" onClick={onClose}>
      <div className="glass !bg-white dark:!bg-ink-2 p-6 w-full max-w-lg max-h-[92vh] overflow-auto" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between mb-1"><h3 className="font-bold text-lg">{title}</h3><button onClick={onClose} aria-label="Close"><X /></button></div>
        <p className="text-xs opacity-60 mb-4">{intro}</p>
        {done ? <div className="text-center py-8"><Check className="mx-auto text-gold" size={44} /><p className="font-bold mt-2">{T('Request received!', 'تم استلام طلبك!')}</p><p className="text-sm opacity-70 mt-1">{T('Our team will contact you to confirm the appointment.', 'سيتواصل معك فريقنا لتأكيد الموعد.')}</p><button className="btn-gold mt-5" onClick={onClose}>{T('Close', 'إغلاق')}</button></div> :
          <form className="grid sm:grid-cols-2 gap-3" onSubmit={submit}>
            {/* honeypot — hidden from people, bots fill it */}
            <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" name="website" value={f.website} onChange={set('website')} />
            <div><label className="label">{T('Name', 'الاسم')} *</label><input required maxLength={120} className="input" value={f.name} onChange={set('name')} /></div>
            <div><label className="label">{T('Company', 'الشركة')}</label><input maxLength={160} className="input" value={f.company} onChange={set('company')} /></div>
            <div><label className="label">{T('Phone / WhatsApp', 'هاتف / واتساب')} *</label><input required maxLength={40} dir="ltr" className="input" value={f.phone} onChange={set('phone')} /></div>
            <div><label className="label">{T('Email', 'البريد')}</label><input type="email" maxLength={120} dir="ltr" className="input" value={f.email} onChange={set('email')} /></div>
            {kind === 'survey' && <>
              <div className="sm:col-span-2"><label className="label">{T('What needs measuring?', 'ما المطلوب معاينته؟')}</label><div className="flex flex-wrap gap-2">{types.map(([k, l]) => <button type="button" key={k} onClick={() => setF({ ...f, type: k })} className={`btn-ghost !py-1.5 text-xs ${f.type === k ? '!bg-gold !text-ink' : ''}`}>{l}</button>)}</div></div>
              <div><label className="label">{T('City / area', 'المدينة / المنطقة')}</label><input maxLength={80} className="input" value={f.city} onChange={set('city')} /></div>
              <div><label className="label">{T('Google Maps link', 'رابط خرائط جوجل')}</label><input type="url" maxLength={400} dir="ltr" className="input" placeholder="https://maps.google.com/…" value={f.mapUrl} onChange={set('mapUrl')} /></div>
              <div className="sm:col-span-2"><label className="label">{T('Site address', 'عنوان الموقع')} *</label><input required maxLength={300} className="input" value={f.address} onChange={set('address')} /></div>
            </>}
            <div><label className="label">{T('Preferred date', 'التاريخ المفضل')}</label><input type="date" min={today} className="input" value={f.preferredDate} onChange={set('preferredDate')} /></div>
            <div><label className="label">{T('Preferred time', 'الوقت المفضل')}</label><select className="input" value={f.preferredTime} onChange={set('preferredTime')}><option value="">—</option><option value="morning">{T('Morning (9–12)', 'صباحاً (9–12)')}</option><option value="noon">{T('Afternoon (12–4)', 'ظهراً (12–4)')}</option><option value="evening">{T('Evening (4–7)', 'مساءً (4–7)')}</option></select></div>
            <div className="sm:col-span-2"><label className="label">{T('Notes', 'ملاحظات')}</label><textarea rows="3" maxLength={1500} className="input" value={f.notes} onChange={set('notes')} /></div>
            {kind === 'survey' && <label className="btn-ghost sm:col-span-2 cursor-pointer text-xs"><Upload size={14} />{fileObj?.name || T('Attach photos / plan (optional)', 'أرفق صوراً / مخططاً (اختياري)')}<input type="file" className="hidden" onChange={(e) => setFileObj(e.target.files[0] || null)} /></label>}
            {children}
            {err && <p className="sm:col-span-2 text-xs text-red-500">{err}</p>}
            <button disabled={busy} className="btn-terra sm:col-span-2 disabled:opacity-60"><Send size={14} />{busy ? T('Sending…', 'جارٍ الإرسال…') : T('Send request', 'إرسال الطلب')}</button>
          </form>}
      </div>
    </div>, document.body
  );
}

function BoothBrief() {
  const { T, sendForm } = useApp();
  const [f, setF] = useState({ name: '', phone: '', file: null, website: '' });
  const [state, setState] = useState('idle');
  const [err, setErr] = useState('');
  const send = async (e) => {
    e.preventDefault();
    setState('busy'); setErr('');
    const filePath = await uploadFile(f.file);
    const r = await sendForm('booth', { name: f.name, phone: f.phone, company: T('Custom booth brief', 'طلب بوث مخصص'), notes: `Custom booth brief — floor plan / 3D file${f.file ? ': ' + f.file.name : ''}`, file: f.file?.name || '', filePath, website: f.website });
    if (r.error) { setErr(r.error); setState('idle'); } else setState('done');
  };
  if (state === 'done') return <p className="text-sm text-gold font-semibold flex gap-2"><Check size={16} />{T('Brief received — our team will contact you.', 'تم استلام الموجز — سيتواصل معك فريقنا.')}</p>;
  return (
    <form onSubmit={send} className="space-y-2">
      <label className="btn-ghost cursor-pointer text-xs w-full"><Upload size={14} />{f.file?.name || T('Upload floor plan / 3D brief', 'ارفع المخطط الأرضي / موجز 3D')}
        <input type="file" className="hidden" onChange={(e) => setF({ ...f, file: e.target.files[0] || null })} /></label>
      {f.file && <>
        <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" name="website" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} />
        <input required maxLength={120} className="input" placeholder={T('Your name', 'الاسم')} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input required maxLength={40} dir="ltr" className="input" placeholder={T('Phone / WhatsApp', 'هاتف / واتساب')} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        {err && <p className="text-xs text-red-500">{err}</p>}
        <button disabled={state === 'busy'} className="btn-terra w-full text-xs"><Send size={14} />{state === 'busy' ? '…' : T('Send brief', 'إرسال الموجز')}</button>
      </>}
    </form>
  );
}

/* ================= Services ================= */
function Services({ onBook }) {
  const { T, lang, rates, tx, money, upd, cart } = useApp();
  const addPkg = (k) => {
    const p = rates.packages[k];
    upd({ cart: [...cart, { id: uid('i'), label: { en: `Social Media Package — ${p.en}`, ar: `باقة سوشيال ميديا — ${p.ar}` }, detail: T('Monthly', 'شهري'), dept: 'social', price: p.price }] });
  };
  return (
    <>
      <Section id="signage" kicker="A" title={T('Signage, Cladding & Exhibition Booths', 'تنفيذ الآرمات والواجهات وتجهيز المعارض')} sub={T('From shop signs to double-deck exhibition stands — designed, fabricated and installed in-house.', 'من آرمات المحلات إلى بوثات المعارض ذات الطابقين — تصميم وتصنيع وتركيب بإشراف كامل.')}>
        <div className="grid md:grid-cols-3 gap-5">
          <ServiceGroup icon={PanelTop} title={T('Flex & Banner', 'بانر وفليكس')} items={[T('Indoor / Outdoor Banners', 'بانرات داخلية وخارجية'), T('Backlit Flex', 'فليكس مضيء (Backlit)'), T('Vinyl Stickers & One-Way Vision', 'ستيكر فينيل ورؤية باتجاه واحد'), T('Roll-ups & Pop-ups', 'رول أب وبوب أب')]} />
          <ServiceGroup icon={Lightbulb} title={T('Alucobond & Cladding', 'ألكوبوند وتكسيات واجهات')} items={[T('ACP Cladding', 'تكسية ألكوبوند ACP'), T('3D Acrylic Letters', 'حروف بارزة أكريليك'), T('Stainless Steel Letters', 'حروف ستانلس ستيل'), T('Neon Flex & LED Front/Back-lit', 'نيون فليكس وإضاءة أمامية/خلفية')]} />
          <ServiceGroup icon={Layers} title={T('Securit Glass Works', 'واجهات وقواطع سيكوريت')} items={[T('Tempered glass facades', 'واجهات زجاج سيكوريت'), T('Frosted film stickers', 'ستيكر فروستد'), T('UV glass printing', 'طباعة UV على الزجاج'), T('Office partitions', 'قواطع مكاتب')]} />
        </div>
        <div className="grid md:grid-cols-2 gap-5 mt-5">
          <div className="glass p-6 card-hover"><div className="flex items-center gap-2 mb-3 text-gold"><Store /><h3 className="font-bold text-lg text-current">{T('Standard Shell Scheme Booths', 'بوثات ستاندرد')}</h3></div>
            <p className="text-sm opacity-80">{T('Modular setups, fascia board branding, spotlights, basic counter & reception.', 'تجهيز مودولار، لوحة فاشيا بالهوية، سبوت لايت، كاونتر واستقبال أساسي.')}</p></div>
          <div className="glass p-6 card-hover"><div className="flex items-center gap-2 mb-3 text-terra"><Store /><h3 className="font-bold text-lg">{T('Customized Luxury Booths', 'بوثات كستمايزد مخصصة')}</h3></div>
            <p className="text-sm opacity-80 mb-3">{T('3D carpentry, double-deck, LED video walls, interactive kiosks, VIP lounge.', 'نجارة ثلاثية الأبعاد، طابقين، شاشات LED، أكشاك تفاعلية، صالة VIP.')}</p>
            <BoothBrief />
          </div>
        </div>
      </Section>

      <div className="bg-cream/40 dark:bg-white/[0.03]">
        <Section id="printing" kicker="B" title={T('Commercial & Offset / Digital Printing', 'المطبوعات التجارية والدعائية')}>
          <div className="grid md:grid-cols-4 gap-5">
            <ServiceGroup icon={Printer} title={T('Business Cards', 'كروت أعمال')} items={[T('Matt / Glossy', 'مات / لامع'), 'Spot UV', T('Textured paper', 'ورق مخمل'), T('Foil stamping', 'طباعة فويل')]} />
            <ServiceGroup icon={Printer} title={T('Flyers & Catalogs', 'فلايرات وكتالوجات')} items={[T('Flyers', 'فلايرات'), T('Brochures', 'بروشورات'), T('Catalogs', 'كتالوجات')]} />
            <ServiceGroup icon={Printer} title={T('Corporate Stationery', 'القرطاسية المؤسسية')} items={[T('Letterheads & Envelopes', 'ورق رسمي وظروف'), T('Folders', 'فولدرات'), T('NCR receipt/invoice books', 'سندات قبض وصرف وفواتير مكربنة')]} />
            <ServiceGroup icon={Printer} title={T('Packaging & Giveaways', 'التغليف والهدايا')} items={[T('Paper & carton bags, boxes', 'أكياس ورقية وكرتونية وبوكسات'), T('Shields & awards', 'دروع'), T('Pens, mugs, notebooks, T-shirts', 'أقلام، مجات، دفاتر، تيشيرتات')]} />
          </div>
        </Section>
      </div>

      <Section id="social" kicker="C" title={T('Social Media Design & Management', 'تصميم وإدارة السوشيال ميديا')} sub={T('Full visual identity, creative content, motion/Reels and monthly account management.', 'هوية بصرية كاملة، تصاميم، موشن/ريلز، وإدارة شهرية متكاملة للحسابات.')}>
        <div className="grid md:grid-cols-3 gap-5 mb-6">
          <ServiceGroup icon={Palette} title={T('Visual Identity', 'الهوية البصرية')} items={[T('Logo & brand guidelines', 'الشعار ودليل الهوية'), T('Full branding package', 'باقة هوية كاملة')]} />
          <ServiceGroup icon={Share2} title={T('Creative Designs', 'التصاميم الإبداعية')} items={[T('Posts, Stories, Carousels', 'بوستات، ستوريز، كاروسيل'), T('Motion graphics & Reels', 'موشن جرافيك وريلز')]} />
          <ServiceGroup icon={Share2} title={T('Account Management', 'إدارة الحسابات')} items={[T('Copywriting & scheduling', 'كتابة المحتوى والجدولة'), T('Replies & community', 'الردود وإدارة المجتمع'), T('Paid campaigns / Media Buying', 'حملات ممولة وشراء إعلانات')]} />
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {Object.entries(rates.packages).map(([k, p]) => (
            <div key={k} className={`glass p-7 card-hover relative ${p.popular ? 'ring-2 ring-gold' : ''}`}>
              {p.popular && <span className="badge bg-gold text-ink absolute -top-3 start-6">{T('Most Popular', 'الأكثر طلباً')}</span>}
              <h3 className="font-bold text-xl">{tx(p)}</h3>
              <div className="my-3"><span className="text-3xl font-extrabold text-gold">{money(p.price)}</span><span className="text-xs opacity-60"> / {T('month', 'شهر')}</span></div>
              <ul className="space-y-2 text-sm mb-6">{(p.features?.[lang] || []).map((f) => <li key={f} className="flex gap-2"><Check size={15} className="text-terra mt-0.5 shrink-0" />{f}</li>)}</ul>
              <button className="btn-gold w-full" onClick={() => addPkg(k)}>{T('Subscribe', 'اشترك الآن')}</button>
              <button className="btn-ghost w-full mt-2 text-xs" onClick={onBook}>{T('Request Custom Package', 'اطلب باقة مخصصة')}</button>
            </div>
          ))}
        </div>
      </Section>

      <Consult />
    </>
  );
}

/* ================= Consultation funnel (D) ================= */
function Consult() {
  const { T, sendForm, lang } = useApp();
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ industry: '', market: '', budget: '', name: '', phone: '', email: '' });
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const industries = [T('Retail', 'تجزئة'), T('Restaurants & Cafés', 'مطاعم ومقاهي'), T('Real Estate', 'عقارات'), T('Healthcare', 'صحة'), T('Tech / SaaS', 'تكنولوجيا'), T('Education', 'تعليم')];
  const budgets = ['< 1,000', '1,000 – 5,000', '5,000 – 20,000', '20,000+'];
  const submit = async () => {
    setErr('');
    const r = await sendForm('consult', { name: f.name, company: f.industry, phone: f.phone, email: f.email, notes: `Strategy session — Industry: ${f.industry}, Market: ${f.market}, Budget: ${f.budget} JOD` });
    if (r.error) setErr(r.error); else setDone(true);
  };
  return (
    <div className="bg-ink text-cream">
      <Section id="marketing" kicker="D" title={T('Strategic Marketing, Research & Consultancy', 'التسويق والدراسات والاستشارات')} sub={T('Know the market before you spend a single dinar on ads.', 'اعرف السوق قبل أن تصرف ديناراً واحداً على الإعلان.')}>
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              [T('Market Research & Feasibility', 'دراسات السوق وتحليل الجدوى'), T('Pre-campaign validation', 'قبل إطلاق الحملات')],
              [T('Competitor & SWOT Analysis', 'تحليل المنافسين و SWOT'), T('Find marketing gaps', 'اكتشاف الفجوات التسويقية')],
              [T('Persona & GTM Strategy', 'الشخصيات واستراتيجية GTM'), T('Target audience mapping', 'تحديد الجمهور المستهدف')],
              [T('360° Campaign Masterplan', 'خطة حملة 360°'), T('Online + Offline execution plan', 'خطة أونلاين وأوفلاين متكاملة')],
            ].map(([a, b]) => <div key={a} className="glass p-5 !bg-white/5 !border-white/10"><Compass className="text-gold mb-2" /><div className="font-bold mb-1">{a}</div><div className="text-xs opacity-60">{b}</div></div>)}
          </div>
          <div className="glass !bg-white/5 !border-white/10 p-6">
            <h3 className="font-bold text-lg mb-1">{T('Book a Strategy Session', 'احجز جلسة استراتيجية')}</h3>
            <div className="flex gap-1 mb-5">{[1, 2, 3].map((n) => <div key={n} className={`h-1 flex-1 rounded ${step >= n || done ? 'bg-gold' : 'bg-white/15'}`} />)}</div>
            {done ? <div className="text-center py-8"><Check className="mx-auto text-gold mb-2" size={40} /><p className="font-bold">{T('Request received! We will contact you within 24h.', 'تم استلام طلبك! سنتواصل معك خلال 24 ساعة.')}</p></div> : <>
              {step === 1 && <div><label className="label">{T('Your industry', 'مجال عملك')}</label><div className="grid grid-cols-2 gap-2">{industries.map((i) => <button key={i} onClick={() => setF({ ...f, industry: i })} className={`btn-ghost !border-white/20 ${f.industry === i ? '!bg-gold !text-ink' : ''}`}>{i}</button>)}</div></div>}
              {step === 2 && <div className="space-y-3"><div><label className="label">{T('Target market', 'السوق المستهدف')}</label><input className="input" placeholder={T('e.g. Amman, Gulf, B2B...', 'مثال: عمّان، الخليج، B2B...')} value={f.market} onChange={set('market')} /></div>
                <div><label className="label">{T('Budget (JOD)', 'الميزانية (دينار)')}</label><div className="grid grid-cols-2 gap-2">{budgets.map((b) => <button key={b} onClick={() => setF({ ...f, budget: b })} className={`btn-ghost !border-white/20 ${f.budget === b ? '!bg-gold !text-ink' : ''}`}>{b}</button>)}</div></div></div>}
              {step === 3 && <div className="space-y-3">{[['name', T('Full name', 'الاسم')], ['phone', T('Phone / WhatsApp', 'هاتف / واتساب')], ['email', T('Email', 'البريد')]].map(([k, l]) => <div key={k}><label className="label">{l}</label><input className="input" value={f[k]} onChange={set(k)} /></div>)}</div>}
              {err && <p className="text-xs text-red-400 mt-3">{err}</p>}
              <div className="flex justify-between mt-6">
                <button disabled={step === 1} className="btn-ghost !border-white/20 disabled:opacity-30" onClick={() => setStep(step - 1)}>{T('Back', 'رجوع')}</button>
                {step < 3 ? <button className="btn-gold" disabled={(step === 1 && !f.industry) || (step === 2 && !f.budget)} onClick={() => setStep(step + 1)}>{T('Next', 'التالي')}</button>
                  : <button className="btn-terra" disabled={!f.name || !f.phone} onClick={submit}><Send size={14} />{T('Book Session', 'احجز الجلسة')}</button>}
              </div></>}
          </div>
        </div>
      </Section>
    </div>
  );
}

/* ================= Smart Calculator ================= */
const Num = ({ l, v, on }) => <div><label className="label">{l}</label><input type="number" min="0" step="0.1" className="input" value={v} onChange={(e) => on(parseFloat(e.target.value) || 0)} /></div>;
const Sel = ({ l, v, on, opts }) => <div><label className="label">{l}</label><select className="input" value={v} onChange={(e) => on(e.target.value)}>{opts.map(([val, lab]) => <option key={val} value={val}>{lab}</option>)}</select></div>;
const Chk = ({ l, v, on }) => <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" className="accent-[#C9A45C] w-4 h-4" checked={v} onChange={(e) => on(e.target.checked)} />{l}</label>;

function CalculatorSection() {
  const { T, tx, lang, money, rates, cart, upd } = useApp();
  const [cat, setCat] = useState('signage');
  const [sg, setSg] = useState({ mat: '', w: 4, h: 1 });
  const [sel, setSel] = useState({});
  const [pr, setPr] = useState({ item: '', size: '', paper: 350, lam: 'matt', sides: 2, qty: 500 });
  const desc = (m) => (m ? (lang === 'ar' ? m.dar : m.den) : '');
  const LAM = { none: T('None', 'بدون'), matt: T('Matt cellophane', 'سلوفان مات'), gloss: T('Gloss cellophane', 'سلوفان لامع'), uv: 'Spot UV' };

  /* --- signage / booths: everything comes from admin-editable rates --- */
  const matKey = rates.area[sg.mat] ? sg.mat : Object.keys(rates.area)[0];
  const mat = rates.area[matKey];
  const isOn = (k) => addonOn(rates.addons[k], sel, k);
  // Same helper the admin price preview uses, so the two can never disagree.
  const sgCalc = useMemo(() => signageQuote(rates, { mat: matKey, w: sg.w, h: sg.h, sel }), [sg, sel, rates, matKey]);

  /* --- printing --- */
  const itKey = rates.print[pr.item] ? pr.item : Object.keys(rates.print)[0];
  const it = rates.print[itKey];
  const sizes = it?.sizes?.length ? it.sizes : ['A4'];
  const size = sizes.includes(pr.size) ? pr.size : sizes[0];
  const prCalc = useMemo(() => printQuote(rates, { item: itKey, size, paper: pr.paper, lam: pr.lam, sides: pr.sides, qty: pr.qty }), [pr, rates, itKey, size]);

  const push = (item) => upd({ cart: [...cart, { id: uid('i'), ...item }] });
  const addSg = () => push({
    label: { en: mat.en, ar: mat.ar }, dept: 'signage', price: sgCalc.total,
    detail: `${sg.w} × ${sg.h} = ${sgCalc.area.toFixed(2)} m²${sgCalc.lines.slice(1).map((l) => ' + ' + tx(l)).join('')}`,
  });
  const addPr = () => push({
    label: { en: it.en, ar: it.ar }, dept: 'printing', price: prCalc.total,
    detail: `${size} · ${pr.paper}g · ${LAM[pr.lam] || pr.lam} · ${pr.sides}-side · qty ${pr.qty}`,
  });
  const addMk = (k) => push({ label: { en: rates.marketing[k].en, ar: rates.marketing[k].ar }, dept: 'marketing', price: rates.marketing[k].price, detail: '' });

  return (
    <Section id="calculator" kicker="⚡" title={T('Smart Cost Estimator & Quotation Builder', 'الحاسبة الذكية وطلب عرض السعر')} sub={T('Prices update live from our admin rate manager. Add items to your quote cart and request an official quotation.', 'الأسعار تتحدث مباشرة من لوحة التحكم. أضف البنود لسلة العرض واطلب عرض سعر رسمي.')}>
      <div className="flex gap-2 mb-6 flex-wrap">
        {[['signage', Signpost, T('Signage / Booths', 'آرمات ومعارض')], ['printing', Printer, T('Printing', 'مطبوعات')], ['bundles', Share2, T('Marketing & Social', 'تسويق وسوشيال')]].map(([id, Icon, l]) => (
          <button key={id} onClick={() => setCat(id)} className={`btn ${cat === id ? 'bg-gold text-ink' : 'btn-ghost'}`}><Icon size={16} />{l}</button>))}
      </div>
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="glass p-6 lg:col-span-3">
          {cat === 'signage' && (!mat ? <p className="text-sm opacity-60">{T('No materials available right now.', 'لا توجد مواد متاحة حالياً.')}</p> : <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><Sel l={T('Material / Type', 'الصنف')} v={matKey} on={(v) => setSg({ ...sg, mat: v })} opts={Object.entries(rates.area).map(([k, m]) => [k, `${tx(m)} — ${money(m.price)}/m²`])} />
              {desc(mat) && <p className="text-xs opacity-60 mt-1">{desc(mat)}</p>}</div>
            <Num l={T('Width (m)', 'العرض (م)')} v={sg.w} on={(v) => setSg({ ...sg, w: v })} /><Num l={T('Height (m)', 'الارتفاع (م)')} v={sg.h} on={(v) => setSg({ ...sg, h: v })} />
            <div className="sm:col-span-2 rounded-xl bg-gold/15 px-4 py-3 text-sm font-semibold">{T('Area', 'المساحة')}: {sg.w} × {sg.h} = <span className="text-gold">{sgCalc.area.toFixed(2)} m²</span></div>
            {Object.keys(rates.addons).length > 0 && <div className="sm:col-span-2"><label className="label">{T('Add-ons', 'الإضافات')}</label>
              <div className="grid sm:grid-cols-2 gap-2">{Object.entries(rates.addons).map(([k, a]) => <div key={k}>
                <Chk l={`${tx(a)} (${a.unit === 'flat' ? money(a.price) : money(a.price) + '/m²'})`} v={isOn(k)} on={(v) => setSel({ ...sel, [k]: v })} />
                {desc(a) && <p className="text-[11px] opacity-50 ps-6">{desc(a)}</p>}</div>)}</div></div>}
            <div className="sm:col-span-2 border-t border-black/10 dark:border-white/10 pt-3 text-sm space-y-1">
              {sgCalc.lines.map((l) => <div key={l.k} className="flex justify-between"><span className="opacity-70">{tx(l)}</span><b>{money(l.v)}</b></div>)}
            </div>
            <button className="btn-gold sm:col-span-2" onClick={addSg}>{T('Add to Quote', 'أضف لسلة العرض')} · {money(sgCalc.total)}</button>
          </div>)}
          {cat === 'printing' && (!it ? <p className="text-sm opacity-60">{T('No printing items available right now.', 'لا توجد مطبوعات متاحة حالياً.')}</p> : <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><Sel l={T('Item', 'المنتج')} v={itKey} on={(v) => setPr({ ...pr, item: v, size: '' })} opts={Object.entries(rates.print).map(([k, p]) => [k, tx(p)])} />
              {desc(it) && <p className="text-xs opacity-60 mt-1">{desc(it)}</p>}</div>
            <Sel l={T('Size', 'المقاس')} v={size} on={(v) => setPr({ ...pr, size: v })} opts={sizes.map((s) => [s, s])} />
            <Sel l={T('Paper weight', 'وزن الورق')} v={pr.paper} on={(v) => setPr({ ...pr, paper: +v })} opts={Object.keys(rates.mult.paper).map((g) => [g, `${g}g`])} />
            <Sel l={T('Lamination / Finish', 'السلوفان / التشطيب')} v={pr.lam} on={(v) => setPr({ ...pr, lam: v })} opts={Object.keys(rates.mult.lam).map((k) => [k, LAM[k] || k])} />
            <Sel l={T('Printing sides', 'جهات الطباعة')} v={pr.sides} on={(v) => setPr({ ...pr, sides: +v })} opts={[[1, T('Single side', 'وجه واحد')], [2, T('Double side', 'وجهين')]]} />
            <div className="sm:col-span-2"><label className="label">{T('Quantity', 'الكمية')}</label><div className="flex gap-2 flex-wrap">{Object.keys(rates.mult.qty).map(Number).map((q, i, arr) => <button key={q} onClick={() => setPr({ ...pr, qty: q })} className={`btn-ghost ${pr.qty === q ? '!bg-gold !text-ink' : ''}`}>{q}{i === arr.length - 1 ? '+' : ''}<span className="text-[10px] opacity-70">{rates.mult.qty[q] < 1 ? `-${Math.round((1 - rates.mult.qty[q]) * 100)}%` : ''}</span></button>)}</div></div>
            <div className="sm:col-span-2 text-sm flex justify-between border-t border-black/10 dark:border-white/10 pt-3"><span className="opacity-70">{T('Unit price', 'سعر الوحدة')}</span><b>{money(prCalc.unit)}</b></div>
            <button className="btn-gold sm:col-span-2" onClick={addPr}>{T('Add to Quote', 'أضف لسلة العرض')} · {money(prCalc.total)}</button>
          </div>)}
          {cat === 'bundles' && <div className="space-y-3">
            <h4 className="font-bold">{T('Social Media Packages (monthly)', 'باقات السوشيال ميديا (شهرياً)')}</h4>
            {Object.entries(rates.packages).map(([k, p]) => <div key={k} className="flex justify-between items-center glass p-3"><div><span>{tx(p)}</span>{desc(p) && <div className="text-[11px] opacity-60">{desc(p)}</div>}</div><div className="flex items-center gap-3"><b>{money(p.price)}</b><button className="btn-gold !py-1.5" onClick={() => push({ label: { en: `Social Media — ${p.en}`, ar: `سوشيال ميديا — ${p.ar}` }, dept: 'social', price: p.price, detail: T('Monthly', 'شهري') })}>+</button></div></div>)}
            <h4 className="font-bold pt-3">{T('Strategy & Consultancy', 'الاستراتيجية والاستشارات')}</h4>
            {Object.entries(rates.marketing).map(([k, p]) => <div key={k} className="flex justify-between items-center glass p-3"><div><span>{tx(p)}</span>{desc(p) && <div className="text-[11px] opacity-60">{desc(p)}</div>}</div><div className="flex items-center gap-3"><b>{money(p.price)}</b><button className="btn-gold !py-1.5" onClick={() => addMk(k)}>+</button></div></div>)}
          </div>}
        </div>
        <div className="lg:col-span-2"><CartPanel /></div>
      </div>
    </Section>
  );
}

/* ================= Cart + submission ================= */
function CartPanel() {
  const { T, tx, money, cart, upd, rates } = useApp();
  const [open, setOpen] = useState(false);
  const sub = cart.reduce((s, i) => s + i.price, 0);
  const vat = (sub * rates.vat) / 100;
  return (
    <div className="glass p-6 sticky top-20">
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><ShoppingCart size={18} className="text-gold" />{T('Live Quote Cart', 'سلة عرض السعر')}</h3>
      {cart.length === 0 ? <p className="text-sm opacity-60 py-6 text-center">{T('Your cart is empty. Configure an item and add it.', 'السلة فارغة. اضبط منتجاً وأضفه.')}</p> :
        <div className="space-y-3 max-h-72 overflow-auto">
          {cart.map((i) => <div key={i.id} className="flex gap-2 justify-between text-sm border-b border-black/5 dark:border-white/10 pb-2">
            <div><div className="font-semibold">{tx(i.label)}</div><div className="text-[11px] opacity-60">{i.detail}</div></div>
            <div className="text-end shrink-0"><b>{money(i.price)}</b><button className="block text-terra ms-auto" onClick={() => upd({ cart: cart.filter((x) => x.id !== i.id) })}><Trash2 size={14} /></button></div>
          </div>)}
        </div>}
      <div className="mt-4 space-y-1 text-sm">
        <div className="flex justify-between opacity-70"><span>{T('Subtotal', 'المجموع')}</span><span>{money(sub)}</span></div>
        <div className="flex justify-between opacity-70"><span>{T('VAT', 'ضريبة')} {rates.vat}%</span><span>{money(vat)}</span></div>
        <div className="flex justify-between text-lg font-extrabold pt-2 border-t border-black/10 dark:border-white/10"><span>{T('Estimated Total', 'الإجمالي التقديري')}</span><span className="text-gold">{money(sub + vat)}</span></div>
      </div>
      <button disabled={!cart.length} className="btn-terra w-full mt-4 disabled:opacity-40" onClick={() => setOpen(true)}>{T('Request Official Quotation', 'طلب عرض سعر رسمي')}</button>
      {open && <QuoteForm onClose={() => setOpen(false)} />}
    </div>
  );
}

function QuoteForm({ onClose }) {
  const { T, cart, submitQuote } = useApp();
  const [f, setF] = useState({ name: '', company: '', phone: '', email: '', tax: '', notes: '', file: '', website: '' });
  const [fileObj, setFileObj] = useState(null);
  const [busy, setBusy] = useState(false);
  const [no, setNo] = useState(null);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const send = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    const filePath = await uploadFile(fileObj);
    const r = await submitQuote({ ...f, filePath }, cart);
    setBusy(false);
    if (r.error) setErr(r.error); else setNo(r.no);
  };
  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur grid place-items-center p-4 text-ink dark:text-cream" onClick={onClose}>
      <div className="glass !bg-white dark:!bg-ink-2 p-6 w-full max-w-lg max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between mb-4"><h3 className="font-bold text-lg">{T('Official Quotation Request', 'طلب عرض سعر رسمي')}</h3><button onClick={onClose}><X /></button></div>
        {no ? <div className="text-center py-8"><Check className="mx-auto text-gold" size={44} /><p className="font-bold mt-2">{T('Request submitted!', 'تم إرسال الطلب!')}</p><p className="text-sm opacity-70 mt-1">{T('Reference', 'المرجع')}: <b>{no}</b></p>
          <p className="text-xs opacity-60 mt-3">{T('Our team will review it and send you an official quotation.', 'سيراجعه فريقنا ويرسل لك عرض السعر الرسمي.')}</p><button className="btn-gold mt-5" onClick={onClose}>{T('Close', 'إغلاق')}</button></div> :
          <form className="grid sm:grid-cols-2 gap-3" onSubmit={send}>
            <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" name="website" value={f.website} onChange={set('website')} />
            {[['name', T('Client name', 'اسم العميل'), 1], ['company', T('Company', 'الشركة')], ['phone', T('Phone / WhatsApp', 'هاتف / واتساب'), 1], ['email', T('Email', 'البريد'), 0, 'email'], ['tax', T('Tax number (optional)', 'الرقم الضريبي (إن وجد)')]].map(([k, l, req, type]) => (
              <div key={k}><label className="label">{l}</label><input type={type || 'text'} required={!!req} className="input" value={f[k]} onChange={set(k)} /></div>))}
            <div className="sm:col-span-2"><label className="label">{T('Project notes', 'ملاحظات المشروع')}</label><textarea rows="3" className="input" value={f.notes} onChange={set('notes')} /></div>
            <label className="btn-ghost sm:col-span-2 cursor-pointer text-xs"><Upload size={14} />{f.file || T('Upload design / brief file', 'ارفع ملف التصميم / الموجز')}<input type="file" className="hidden" onChange={(e) => { setFileObj(e.target.files[0] || null); setF({ ...f, file: e.target.files[0]?.name || '' }); }} /></label>
            {err && <p className="sm:col-span-2 text-xs text-red-500">{err}</p>}
            <button disabled={busy} className="btn-terra sm:col-span-2 disabled:opacity-60"><Send size={14} />{busy ? T('Sending…', 'جارٍ الإرسال…') : T('Submit Request', 'إرسال الطلب')}</button>
          </form>}
      </div>
    </div>, document.body
  );
}

/* ================= Key clients ================= */
function ClientsStrip() {
  const { T, tx, content } = useApp();
  const list = content.clients || [];
  if (!list.length) return null;
  return (
    <section id="clients" className="py-14 px-4 bg-ink text-cream scroll-mt-16">
      <div className="max-w-7xl mx-auto">
        <p className="text-center text-gold text-xs font-bold tracking-[0.25em] uppercase mb-8">{T('Trusted by leading brands in Jordan', 'يثق بنا أبرز العلامات التجارية في الأردن')}</p>
        <div className="flex flex-wrap justify-center gap-5">
          {list.map((c) => (
            <div key={c.id} title={tx(c.name)} className="w-44 h-24 rounded-2xl bg-white/5 border border-white/10 grid place-items-center px-4 hover:border-gold/60 hover:bg-white/10 transition">
              {c.logo
                ? <img src={c.logo} alt={tx(c.name)} className="max-h-16 max-w-full object-contain" />
                : <span className="font-serif text-lg font-semibold text-center leading-tight text-cream/90">{tx(c.name)}</span>}
            </div>))}
        </div>
      </div>
    </section>
  );
}

/* ================= Portfolio ================= */
const GRADS = ['from-gold to-amber-700', 'from-terra to-rose-900', 'from-cream to-gold', 'from-sky-300 to-slate-700', 'from-fuchsia-500 to-terra', 'from-zinc-300 to-zinc-700', 'from-emerald-400 to-teal-900', 'from-gold-light to-terra'];

function Portfolio() {
  const { T, tx, lang, content } = useApp();
  const [f, setF] = useState('all');
  const items = content.projects || [];
  const used = CATS.filter(([k]) => items.some((p) => p.cat === k));
  const active = f === 'all' || used.some(([k]) => k === f) ? f : 'all';
  if (!items.length) return null;
  return (
    <Section id="portfolio" kicker="★" title={T('Selected Work', 'أبرز أعمالنا')} sub={T('A glimpse of recent projects delivered for our clients.', 'لمحة عن مشاريعنا الأخيرة التي نفذناها لعملائنا.')}>
      <div className="flex gap-2 flex-wrap mb-6">{[['all', 'All', 'الكل'], ...used].map(([k, en, ar]) => <button key={k} onClick={() => setF(k)} className={`btn ${active === k ? 'bg-gold text-ink' : 'btn-ghost'}`}>{lang === 'ar' ? ar : en}</button>)}</div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.filter((p) => active === 'all' || p.cat === active).map((p, i) => (
          <div key={p.id} className={`relative aspect-[4/5] rounded-2xl overflow-hidden group card-hover ${p.image ? 'bg-ink-2' : `bg-gradient-to-br ${GRADS[i % GRADS.length]}`}`}>
            {p.image
              ? <img loading="lazy" src={p.image} alt={tx(p.title)} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-500" />
              : <Mark className="absolute -bottom-4 -end-4 h-40 opacity-20 group-hover:opacity-40 group-hover:scale-110 transition duration-500" />}
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
              <div className="text-[10px] uppercase tracking-widest opacity-70">{CATS.find(([k]) => k === p.cat)?.[lang === 'ar' ? 2 : 1]}</div>
              <div className="font-bold text-sm">{tx(p.title)}</div>
              {tx(p.desc) && <div className="text-[11px] opacity-0 group-hover:opacity-80 max-h-0 group-hover:max-h-16 overflow-hidden transition-all duration-300">{tx(p.desc)}</div>}
            </div>
          </div>))}
      </div>
    </Section>
  );
}

/* ================= Testimonials ================= */
function Testimonials() {
  const { T, tx, content } = useApp();
  const list = content.testimonials || [];
  if (!list.length) return null;
  return (
    <div className="bg-cream/40 dark:bg-white/[0.03]">
      <Section id="testimonials" kicker="“”" title={T('What Our Clients Say', 'ماذا يقول عملاؤنا')}>
        <div className="grid md:grid-cols-3 gap-5">
          {list.map((t) => (
            <figure key={t.id} className="glass p-6 card-hover flex flex-col">
              <div className="text-gold mb-3">{'★'.repeat(t.rating || 5)}<span className="opacity-20">{'★'.repeat(5 - (t.rating || 5))}</span></div>
              <blockquote className="text-sm leading-relaxed opacity-90 flex-1">“{tx(t.quote)}”</blockquote>
              <figcaption className="mt-4 pt-4 border-t border-black/10 dark:border-white/10"><div className="font-bold text-sm">{tx(t.name)}</div><div className="text-xs opacity-60">{tx(t.role)}</div></figcaption>
            </figure>))}
        </div>
      </Section>
    </div>
  );
}

/* ================= Footer ================= */
function Footer({ onSurvey, onVisit }) {
  const { T, tx, company } = useApp();
  return (
    <footer className="bg-ink text-cream py-12 px-4">
      <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
        <div><Logo className="h-10" /><p className="text-sm opacity-60 mt-4">{tx(company.tagline)}</p>
          <div className="flex flex-wrap gap-2 mt-4"><button type="button" onClick={onSurvey} className="btn-terra !py-1.5 text-xs"><Ruler size={14} />{T('Site Survey', 'معاينة الموقع')}</button><button type="button" onClick={onVisit} className="btn-ghost !border-white/25 !py-1.5 text-xs"><CalendarCheck size={14} />{T('Request a Visit', 'اطلب زيارة')}</button></div></div>
        <address className="not-italic text-sm space-y-2 opacity-80"><div className="flex gap-2"><MapPin size={16} className="text-gold" />{tx(company.address)}</div><div className="flex gap-2"><Phone size={16} className="text-gold" /><a href={`tel:${(company.phone || '').replace(/\s/g, '')}`} dir="ltr">{company.phone}</a></div><div className="flex gap-2"><Mail size={16} className="text-gold" /><a href={`mailto:${company.email}`}>{company.email}</a></div></address>
        <div className="text-sm opacity-60 md:text-end">© {new Date().getFullYear()} {tx(company.name)}</div>
      </div>
    </footer>
  );
}

export default function Site() {
  const [cartOpen, setCartOpen] = useState(false);
  const [modal, setModal] = useState(null); // 'survey' | 'visit'
  const { cart, T, company, lang, tx } = useApp();
  useEffect(() => {
    document.title = lang === 'ar' ? `${tx(company.name)} | Art Space — آرمات، مطبوعات، سوشيال ميديا وتسويق في الأردن` : `${tx(company.name)} | Art Space — Signage, Printing, Social Media & Marketing in Jordan`;
    const d = document.querySelector('meta[name="description"]');
    if (d) d.content = lang === 'ar' ? 'وكالة دعاية وإعلان متكاملة في عمّان: آرمات وواجهات، معارض وبوثات، مطبوعات، سوشيال ميديا واستشارات تسويقية مع تسعير فوري أونلاين.' : 'Full-service advertising agency in Amman: signage & facades, exhibition booths, printing, social media and marketing strategy with instant online pricing.';
  }, [lang, company.name]);
  const wa = (company.phone || '').replace(/\D/g, '');
  return (
    <div>
      <Header onCart={() => document.getElementById('calculator').scrollIntoView({ behavior: 'smooth' })} />
      <main>
        <Hero onSurvey={() => setModal('survey')} onVisit={() => setModal('visit')} />
        <Services onBook={() => document.getElementById('marketing').scrollIntoView({ behavior: 'smooth' })} />
        <CalculatorSection />
        <Portfolio />
        <Testimonials />
        <ClientsStrip />
      </main>
      <Footer onSurvey={() => setModal('survey')} onVisit={() => setModal('visit')} />
      {modal === 'survey' && <FormModal kind="survey" onClose={() => setModal(null)} title={T('Book a Site Survey', 'احجز معاينة موقع')} intro={T('Our engineer visits your site, takes exact measurements and prepares an accurate quotation.', 'يزور مهندسنا موقعك ويأخذ القياسات الدقيقة ويعد عرض سعر دقيق.')} />}
      {modal === 'visit' && <FormModal kind="visit" onClose={() => setModal(null)} title={T('Request a Visit', 'اطلب زيارة')} intro={T('Tell us when suits you and we will arrange a visit or meeting.', 'أخبرنا بالوقت المناسب وسنرتب زيارة أو اجتماعاً.')} />}
      {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer noopener" aria-label="WhatsApp" className="fixed bottom-5 start-5 z-30 w-12 h-12 rounded-full bg-[#25D366] text-white grid place-items-center shadow-2xl hover:scale-110 transition"><MessageCircle size={24} /></a>}
      {cart.length > 0 && <a href="#calculator" className="fixed bottom-5 end-5 btn-terra shadow-2xl z-30"><ShoppingCart size={16} />{cart.length} {T('items', 'بنود')}</a>}
    </div>
  );
}
