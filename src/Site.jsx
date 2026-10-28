import React, { useEffect, useMemo, useState } from 'react';
import {
  Sun, Moon, Languages, ShoppingCart, Signpost, Printer, Share2, Compass, Check, X, Trash2, Upload,
  Layers, Lightbulb, PanelTop, Store, Palette, Calculator, ArrowRight, Phone, Mail, MapPin, Send, Menu,
  Ruler, CalendarCheck, MessageCircle, Quote, Star, ShieldCheck,
} from 'lucide-react';
import Logo, { Mark } from './Logo.jsx';
import { useApp, uid, CATS } from './store.jsx';
import { signageQuote, printQuote, addonOn } from './pricing.js';
import { uploadFile } from './api.js';
import { Dialog, Reveal } from './ui.jsx';

/* ================= Header ================= */
function Header({ onCart }) {
  const { T, lang, dark, upd, cart } = useApp();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('top');
  const links = [
    ['signage', T('Signage & Booths', 'آرمات ومعارض')],
    ['printing', T('Printing', 'مطبوعات')],
    ['social', T('Social Media', 'سوشيال ميديا')],
    ['marketing', T('Strategy', 'استشارات')],
    ['calculator', T('Calculator', 'الحاسبة')],
    ['portfolio', T('Portfolio', 'أعمالنا')],
    ['testimonials', T('Reviews', 'آراء العملاء')],
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 14);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const els = ['top', ...links.map(([id]) => id)]
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!els.length || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const iconBtn = `grid h-9 w-9 place-items-center rounded-full border transition ${
    dark
      ? 'border-white/20 text-cream/75 hover:border-gold/60 hover:text-cream'
      : 'border-line/15 text-fg/70 hover:border-gold/60 hover:text-fg'
  }`;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 border-b backdrop-blur-2xl transition-colors duration-300 ${
        dark
          ? `border-white/10 text-cream ${scrolled ? 'bg-ink/85 shadow-[0_20px_44px_-32px_rgba(0,0,0,.95)]' : 'bg-ink/50'}`
          : `border-line/12 text-fg ${scrolled ? 'bg-white/85 shadow-[0_20px_44px_-32px_rgba(24,21,18,.32)]' : 'bg-white/55'}`
      }`}
    >
      <div className="mx-auto flex h-[68px] max-w-[92rem] items-center justify-between gap-3 px-5 md:px-8">
        <a href="#top" aria-label="Art Space — Home" className="shrink-0 transition hover:opacity-85"><Logo dark={dark} className="h-9" /></a>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {links.map(([id, l]) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={active === id ? 'true' : undefined}
              className={`relative px-2.5 py-2 text-[11px] uppercase tracking-[0.14em] transition ${
                active === id ? 'text-gold' : dark ? 'text-cream/55 hover:text-cream' : 'text-muted hover:text-fg'
              }`}
            >
              {l}
              {active === id && <span className="absolute inset-x-2 -bottom-px h-px bg-gold" aria-hidden="true" />}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <button type="button" className={iconBtn} aria-label={T('Switch to English', 'التبديل إلى الإنجليزية')} title={lang === 'ar' ? 'English' : 'عربي'} onClick={() => upd({ lang: lang === 'ar' ? 'en' : 'ar' })}>
            <Languages size={15} />
          </button>
          <button type="button" className={iconBtn} aria-label={T('Toggle dark mode', 'تبديل الوضع الليلي')} onClick={() => upd({ dark: !dark })}>
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button type="button" className={`${iconBtn} relative`} aria-label={T('Open quote cart', 'فتح سلة العرض')} onClick={onCart}>
            <ShoppingCart size={15} />
            {cart.length > 0 && (
              <span className="absolute -top-1.5 -end-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-terra px-1 text-[10px] font-bold text-white">{cart.length}</span>
            )}
          </button>
          <a href="#calculator" className="btn-gold ms-1 hidden !px-5 !py-2.5 text-[11px] uppercase tracking-[0.14em] md:inline-flex">
            <Calculator size={14} />{T('Instant quote', 'احسب سعرك')}
          </a>
          <button
            type="button"
            className={`${iconBtn} lg:hidden`}
            aria-label={T('Menu', 'القائمة')}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {open && (
        <div className={`animate-fade border-t px-5 pb-5 pt-2 md:px-8 lg:hidden ${dark ? 'border-white/12 bg-ink/95' : 'border-line/12 bg-white/95'}`}>
          <nav aria-label="Mobile" className="grid">
            {links.map(([id, l]) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between border-b py-3.5 text-[13px] uppercase tracking-[0.12em] transition hover:text-gold ${
                  dark ? 'border-white/10 text-cream/65' : 'border-line/10 text-muted'
                }`}
              >
                {l}
                <ArrowRight size={14} className="opacity-30 rtl:rotate-180" />
              </a>
            ))}
          </nav>
          <a href="#calculator" onClick={() => setOpen(false)} className="btn-gold mt-3 w-full">
            <Calculator size={15} />{T('Build my quote', 'ابنِ عرض سعرك')}
          </a>
        </div>
      )}
    </header>
  );
}

/* ================= Shared bits ================= */
const Section = ({ id, kicker, title, sub, children, className = '' }) => (
  <section id={id} className={`scroll-mt-24 px-5 py-20 md:px-8 md:py-28 ${className}`}>
    <div className="mx-auto max-w-[92rem]">
      <div className="mb-12 grid gap-6 md:grid-cols-12 md:items-end md:gap-8">
        <div className="md:col-span-7">
          {kicker && <p className="eyebrow mb-5">{kicker}</p>}
          <h2 className="display-2">{title}</h2>
        </div>
        {sub && <p className="text-sm leading-loose text-muted md:col-span-4 md:col-start-9">{sub}</p>}
      </div>
      {children}
    </div>
  </section>
);

/* A discipline is a hairline index row — not a card. Reads like a studio capabilities sheet. */
function ServiceGroup({ icon: Icon, title, items }) {
  return (
    <div className="group grid gap-3 border-t border-line/15 py-6 md:grid-cols-12 md:gap-8 md:py-7">
      <div className="flex items-start gap-3 md:col-span-5">
        <Icon size={16} className="mt-1 shrink-0 text-gold transition group-hover:text-terra" aria-hidden="true" />
        <h3 className="text-[17px] font-bold leading-snug tracking-tight">{title}</h3>
      </div>
      <ul className="grid gap-x-8 gap-y-2 text-sm text-muted sm:grid-cols-2 md:col-span-7">
        {items.map((x) => (
          <li key={x} className="flex items-start gap-2.5"><span className="mt-2.5 h-px w-3 shrink-0 bg-line/50" aria-hidden="true" />{x}</li>
        ))}
      </ul>
    </div>
  );
}

/* ================= Hero ================= */
function Hero({ onSurvey, onVisit }) {
  const { T } = useApp();
  const ticker = [
    T('Signage', 'آرمات'), T('Facades', 'واجهات'), T('Exhibition builds', 'معارض'), T('Offset printing', 'مطبوعات'),
    T('Social media', 'سوشيال ميديا'), T('Brand strategy', 'استراتيجية'),
  ];
  return (
    <section id="top" className="relative isolate overflow-hidden bg-canvas text-fg">
      <div className="grid-lines" aria-hidden="true" />
      <div className="relative mx-auto max-w-[92rem] px-5 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line/15 pb-4 pt-24 text-[10px] uppercase tracking-[0.26em] text-subtle md:pt-28">
          <span>{T('Advertising · Fabrication · Media', 'إعلان · تنفيذ · ميديا')}</span>
          <span className="hidden sm:inline">{T('Amman, Jordan', 'عمّان، الأردن')}</span>
          <span className="tabular-nums text-gold">{T('Est. 2013', 'تأسّست ٢٠١٣')}</span>
        </div>

        <h1 className="display pb-8 pt-10 md:pb-12 md:pt-14">
          {T('We make brands ', 'نصنع علامات تجارية ')}
          <span className="serif-italic text-gold">{T('impossible', 'يستحيل')}</span>{' '}
          {T('to ignore.', 'تجاهلها.')}
        </h1>

        <div className="grid gap-8 border-t border-line/15 pb-12 pt-7 md:grid-cols-12 md:items-start md:gap-8">
          <p className="max-w-xl text-[15px] leading-loose text-muted md:col-span-5">
            {T(
              'Signage, facades, exhibition builds, print and social media — designed, fabricated and installed by one in-house team, with live pricing you can quote yourself.',
              'آرمات وواجهات وتجهيز معارض ومطبوعات وسوشيال ميديا — تصميم وتصنيع وتركيب بفريق داخلي واحد، مع تسعير مباشر تحسبه بنفسك.',
            )}
          </p>

          <div className="flex gap-10 md:col-span-3">
            {[['850+', T('Projects', 'مشروع')], ['12', T('Years', 'سنة')], ['4', T('Studios', 'أقسام')]].map(([n, l]) => (
              <div key={l}>
                <p className="text-2xl font-extrabold tabular-nums text-fg">{n}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-subtle">{l}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 md:col-span-4 md:justify-end">
            <a href="#calculator" className="btn-gold">{T('Price my project', 'احسب سعر مشروعي')}<ArrowRight size={15} className="rtl:rotate-180" /></a>
            <button type="button" onClick={onSurvey} className="btn-ghost"><Ruler size={14} />{T('Site survey', 'معاينة موقع')}</button>
            <button type="button" onClick={onVisit} className="text-[11px] uppercase tracking-[0.14em] text-subtle underline decoration-line/40 underline-offset-4 transition hover:text-fg">{T('or request a visit', 'أو اطلب زيارة')}</button>
          </div>
        </div>
      </div>

      <div className="marquee-mask relative overflow-hidden border-y border-line/12 py-3.5">
        <div className="flex w-max animate-marquee items-center gap-8 whitespace-nowrap text-[11px] uppercase tracking-[0.24em] text-subtle">
          {[...ticker, ...ticker, ...ticker, ...ticker].map((x, i) => (
            <span key={`${x}-${i}`} className="flex items-center gap-8"><span className="h-1 w-1 shrink-0 rounded-full bg-gold/60" aria-hidden="true" />{x}</span>
          ))}
        </div>
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
  return (
    <Dialog onClose={onClose} label={title} size="lg" className="p-5 sm:p-7">
      <div className="mb-1 flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold tracking-tight">{title}</h3>
        <button type="button" onClick={onClose} aria-label={T('Close', 'إغلاق')} className="icon-btn -me-1 -mt-1 shrink-0"><X size={17} /></button>
      </div>
      <p className="mb-5 text-xs leading-relaxed text-subtle">{intro}</p>

      {done ? (
        <div className="py-10 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gold/15 text-gold ring-1 ring-gold/25"><Check size={26} /></span>
          <p className="mt-4 font-bold">{T('Request received!', 'تم استلام طلبك!')}</p>
          <p className="mt-1 text-sm text-muted">{T('Our team will contact you to confirm the appointment.', 'سيتواصل معك فريقنا لتأكيد الموعد.')}</p>
          <button className="btn-gold mt-6" onClick={onClose}>{T('Close', 'إغلاق')}</button>
        </div>
      ) : (
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
          {/* honeypot — hidden from people, bots fill it */}
          <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" name="website" value={f.website} onChange={set('website')} />
          <div><label className="label">{T('Name', 'الاسم')} *</label><input required maxLength={120} className="input" value={f.name} onChange={set('name')} /></div>
          <div><label className="label">{T('Company', 'الشركة')}</label><input maxLength={160} className="input" value={f.company} onChange={set('company')} /></div>
          <div><label className="label">{T('Phone / WhatsApp', 'هاتف / واتساب')} *</label><input required maxLength={40} dir="ltr" className="input" value={f.phone} onChange={set('phone')} /></div>
          <div><label className="label">{T('Email', 'البريد')}</label><input type="email" maxLength={120} dir="ltr" className="input" value={f.email} onChange={set('email')} /></div>

          {kind === 'survey' && <>
            <div className="sm:col-span-2">
              <label className="label">{T('What needs measuring?', 'ما المطلوب معاينته؟')}</label>
              <div className="flex flex-wrap gap-2">
                {types.map(([k, l]) => (
                  <button type="button" key={k} onClick={() => setF({ ...f, type: k })} data-active={f.type === k} className="chip">{l}</button>
                ))}
              </div>
            </div>
            <div><label className="label">{T('City / area', 'المدينة / المنطقة')}</label><input maxLength={80} className="input" value={f.city} onChange={set('city')} /></div>
            <div><label className="label">{T('Google Maps link', 'رابط خرائط جوجل')}</label><input type="url" maxLength={400} dir="ltr" className="input" placeholder="https://maps.google.com/…" value={f.mapUrl} onChange={set('mapUrl')} /></div>
            <div className="sm:col-span-2"><label className="label">{T('Site address', 'عنوان الموقع')} *</label><input required maxLength={300} className="input" value={f.address} onChange={set('address')} /></div>
          </>}

          <div><label className="label">{T('Preferred date', 'التاريخ المفضل')}</label><input type="date" min={today} className="input" value={f.preferredDate} onChange={set('preferredDate')} /></div>
          <div>
            <label className="label">{T('Preferred time', 'الوقت المفضل')}</label>
            <select className="input" value={f.preferredTime} onChange={set('preferredTime')}>
              <option value="">—</option>
              <option value="morning">{T('Morning (9–12)', 'صباحاً (9–12)')}</option>
              <option value="noon">{T('Afternoon (12–4)', 'ظهراً (12–4)')}</option>
              <option value="evening">{T('Evening (4–7)', 'مساءً (4–7)')}</option>
            </select>
          </div>
          <div className="sm:col-span-2"><label className="label">{T('Notes', 'ملاحظات')}</label><textarea rows="3" maxLength={1500} className="input" value={f.notes} onChange={set('notes')} /></div>

          {kind === 'survey' && (
            <label className="btn-ghost sm:col-span-2 cursor-pointer text-xs">
              <Upload size={14} />{fileObj?.name || T('Attach photos / plan (optional)', 'أرفق صوراً / مخططاً (اختياري)')}
              <input type="file" className="hidden" onChange={(e) => setFileObj(e.target.files[0] || null)} />
            </label>
          )}

          {children}
          {err && <p className="sm:col-span-2 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400">{err}</p>}
          <button disabled={busy} className="btn-terra sm:col-span-2 disabled:opacity-60">
            <Send size={14} />{busy ? T('Sending…', 'جارٍ الإرسال…') : T('Send request', 'إرسال الطلب')}
          </button>
        </form>
      )}
    </Dialog>
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
  if (state === 'done') {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        <Check size={15} />{T('Brief received — our team will contact you.', 'تم استلام الموجز — سيتواصل معك فريقنا.')}
      </p>
    );
  }
  return (
    <form onSubmit={send} className="space-y-2">
      <label className="btn-ghost w-full cursor-pointer text-xs">
        <Upload size={14} />{f.file?.name || T('Upload floor plan / 3D brief', 'ارفع المخطط الأرضي / موجز 3D')}
        <input type="file" className="hidden" onChange={(e) => setF({ ...f, file: e.target.files[0] || null })} />
      </label>
      {f.file && <>
        <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" name="website" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} />
        <input required maxLength={120} className="input" placeholder={T('Your name', 'الاسم')} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input required maxLength={40} dir="ltr" className="input" placeholder={T('Phone / WhatsApp', 'هاتف / واتساب')} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        {err && <p className="text-xs text-red-500">{err}</p>}
        <button disabled={state === 'busy'} className="btn-terra w-full text-xs">
          <Send size={14} />{state === 'busy' ? '…' : T('Send brief', 'إرسال الموجز')}
        </button>
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
      <Section
        id="signage"
        kicker={T('01 — Signage', '٠١ — الآرمات')}
        title={T('Signage, Cladding & Exhibition Booths', 'تنفيذ الآرمات والواجهات وتجهيز المعارض')}
        sub={T('From shop signs to double-deck exhibition stands — designed, fabricated and installed in-house.', 'من آرمات المحلات إلى بوثات المعارض ذات الطابقين — تصميم وتصنيع وتركيب بإشراف كامل.')}
      >
        <div className="border-b border-line/15">
          <ServiceGroup delay={0} icon={PanelTop} title={T('Flex & Banner', 'بانر وفليكس')} items={[T('Indoor / Outdoor Banners', 'بانرات داخلية وخارجية'), T('Backlit Flex', 'فليكس مضيء (Backlit)'), T('Vinyl Stickers & One-Way Vision', 'ستيكر فينيل ورؤية باتجاه واحد'), T('Roll-ups & Pop-ups', 'رول أب وبوب أب')]} />
          <ServiceGroup delay={80} icon={Lightbulb} title={T('Alucobond & Cladding', 'ألكوبوند وتكسيات واجهات')} items={[T('ACP Cladding', 'تكسية ألكوبوند ACP'), T('3D Acrylic Letters', 'حروف بارزة أكريليك'), T('Stainless Steel Letters', 'حروف ستانلس ستيل'), T('Neon Flex & LED Front/Back-lit', 'نيون فليكس وإضاءة أمامية/خلفية')]} />
          <ServiceGroup delay={160} icon={Layers} title={T('Securit Glass Works', 'واجهات وقواطع سيكوريت')} items={[T('Tempered glass facades', 'واجهات زجاج سيكوريت'), T('Frosted film stickers', 'ستيكر فروستد'), T('UV glass printing', 'طباعة UV على الزجاج'), T('Office partitions', 'قواطع مكاتب')]} />
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 md:gap-6">
          <Reveal className="glass card-hover p-6 md:p-7">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl border border-line/12 bg-gold/12 text-gold"><Store size={17} aria-hidden="true" /></span>
              <h3 className="text-lg font-bold tracking-tight">{T('Standard Shell Scheme Booths', 'بوثات ستاندرد')}</h3>
            </div>
            <p className="text-sm leading-loose text-muted">{T('Modular setups, fascia board branding, spotlights, basic counter & reception.', 'تجهيز مودولار، لوحة فاشيا بالهوية، سبوت لايت، كاونتر واستقبال أساسي.')}</p>
          </Reveal>

          <Reveal delay={90} className="glass card-hover border-gold/35 p-6 md:p-7">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl border border-gold/30 bg-gold/15 text-terra"><Store size={17} aria-hidden="true" /></span>
              <h3 className="text-lg font-bold tracking-tight">{T('Customized Luxury Booths', 'بوثات كستمايزد مخصصة')}</h3>
            </div>
            <p className="mb-5 text-sm leading-loose text-muted">{T('3D carpentry, double-deck, LED video walls, interactive kiosks, VIP lounge.', 'نجارة ثلاثية الأبعاد، طابقين، شاشات LED، أكشاك تفاعلية، صالة VIP.')}</p>
            <BoothBrief />
          </Reveal>
        </div>
      </Section>

      <div className="border-y border-line/10 bg-surface-2/50">
        <Section id="printing" kicker={T('02 — Printing', '٠٢ — المطبوعات')} title={T('Commercial & Offset / Digital Printing', 'المطبوعات التجارية والدعائية')}>
          <div className="grid gap-x-16 border-b border-line/15 md:grid-cols-2">
            <ServiceGroup delay={0} icon={Printer} title={T('Business Cards', 'كروت أعمال')} items={[T('Matt / Glossy', 'مات / لامع'), 'Spot UV', T('Textured paper', 'ورق مخمل'), T('Foil stamping', 'طباعة فويل')]} />
            <ServiceGroup delay={70} icon={Printer} title={T('Flyers & Catalogs', 'فلايرات وكتالوجات')} items={[T('Flyers', 'فلايرات'), T('Brochures', 'بروشورات'), T('Catalogs', 'كتالوجات')]} />
            <ServiceGroup delay={140} icon={Printer} title={T('Corporate Stationery', 'القرطاسية المؤسسية')} items={[T('Letterheads & Envelopes', 'ورق رسمي وظروف'), T('Folders', 'فولدرات'), T('NCR receipt/invoice books', 'سندات قبض وصرف وفواتير مكربنة')]} />
            <ServiceGroup delay={210} icon={Printer} title={T('Packaging & Giveaways', 'التغليف والهدايا')} items={[T('Paper & carton bags, boxes', 'أكياس ورقية وكرتونية وبوكسات'), T('Shields & awards', 'دروع'), T('Pens, mugs, notebooks, T-shirts', 'أقلام، مجات، دفاتر، تيشيرتات')]} />
          </div>
        </Section>
      </div>

      <Section
        id="social"
        kicker={T('03 — Social', '٠٣ — سوشيال ميديا')}
        title={T('Social Media Design & Management', 'تصميم وإدارة السوشيال ميديا')}
        sub={T('Full visual identity, creative content, motion/Reels and monthly account management.', 'هوية بصرية كاملة، تصاميم، موشن/ريلز، وإدارة شهرية متكاملة للحسابات.')}
      >
        <div className="mb-14 border-b border-line/15">
          <ServiceGroup delay={0} icon={Palette} title={T('Visual Identity', 'الهوية البصرية')} items={[T('Logo & brand guidelines', 'الشعار ودليل الهوية'), T('Full branding package', 'باقة هوية كاملة')]} />
          <ServiceGroup delay={80} icon={Share2} title={T('Creative Designs', 'التصاميم الإبداعية')} items={[T('Posts, Stories, Carousels', 'بوستات، ستوريز، كاروسيل'), T('Motion graphics & Reels', 'موشن جرافيك وريلز')]} />
          <ServiceGroup delay={160} icon={Share2} title={T('Account Management', 'إدارة الحسابات')} items={[T('Copywriting & scheduling', 'كتابة المحتوى والجدولة'), T('Replies & community', 'الردود وإدارة المجتمع'), T('Paid campaigns / Media Buying', 'حملات ممولة وشراء إعلانات')]} />
        </div>

        <div className="grid gap-5 md:grid-cols-3 md:gap-6">
          {Object.entries(rates.packages).map(([k, p], i) => (
            <Reveal
              key={k}
              delay={i * 80}
              className={`glass card-hover relative flex flex-col p-6 md:p-7 ${p.popular ? 'border-gold/45' : ''}`}
            >
              {p.popular && (
                <span className="absolute -top-3 start-6 rounded-full bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-ink">
                  {T('Most Popular', 'الأكثر طلباً')}
                </span>
              )}
              <h3 className="text-[15px] font-bold uppercase tracking-[0.14em]">{tx(p)}</h3>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-[2.4rem] font-extrabold leading-none tabular-nums text-gold">{money(p.price)}</span>
                <span className="text-xs text-subtle">/ {T('month', 'شهر')}</span>
              </div>
              {p.dar || p.den ? <p className="mt-2 text-xs leading-relaxed text-subtle">{lang === 'ar' ? p.dar : p.den}</p> : null}
              <ul className="mb-7 mt-6 flex-1 divide-y divide-line/10 border-y border-line/10 text-sm">
                {(p.features?.[lang] || []).map((f) => (
                  <li key={f} className="flex items-start gap-2.5 py-2.5"><Check size={14} className="mt-0.5 shrink-0 text-terra" aria-hidden="true" />{f}</li>
                ))}
              </ul>
              <button className="btn-gold w-full" onClick={() => addPkg(k)}>{T('Subscribe', 'اشترك الآن')}</button>
              <button className="btn-ghost mt-2 w-full text-xs" onClick={onBook}>{T('Request Custom Package', 'اطلب باقة مخصصة')}</button>
            </Reveal>
          ))}
        </div>
      </Section>

      <Consult />
    </>
  );
}

/* ================= Consultation funnel (D) ================= */
function Consult() {
  const { T, sendForm } = useApp();
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

  const chip = (on) => `border px-3 py-2 text-xs font-semibold transition ${
    on ? 'border-gold bg-gold text-ink' : 'border-white/15 bg-transparent text-cream/65 hover:border-white/35 hover:text-cream'
  }`;

  return (
    <div className="relative isolate overflow-hidden bg-ink text-cream">
      <section id="marketing" className="relative scroll-mt-24 px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-[92rem]">
          <Reveal className="mb-12 grid gap-6 md:grid-cols-12 md:items-end md:gap-8">
            <div className="md:col-span-7">
              <p className="eyebrow mb-5 text-gold">{T('04 — Strategy', '٠٤ — الاستراتيجية')}</p>
              <h2 className="display-2 text-cream">{T('Strategic Marketing, Research & Consultancy', 'التسويق والدراسات والاستشارات')}</h2>
            </div>
            <p className="text-sm leading-loose text-cream/55 md:col-span-4 md:col-start-9">{T('Know the market before you spend a single dinar on ads.', 'اعرف السوق قبل أن تصرف ديناراً واحداً على الإعلان.')}</p>
          </Reveal>

          <div className="grid gap-8 lg:grid-cols-2">
            <div className="grid content-start gap-3 sm:grid-cols-2">
              {[
                [T('Market Research & Feasibility', 'دراسات السوق وتحليل الجدوى'), T('Pre-campaign validation', 'قبل إطلاق الحملات')],
                [T('Competitor & SWOT Analysis', 'تحليل المنافسين و SWOT'), T('Find marketing gaps', 'اكتشاف الفجوات التسويقية')],
                [T('Persona & GTM Strategy', 'الشخصيات واستراتيجية GTM'), T('Target audience mapping', 'تحديد الجمهور المستهدف')],
                [T('360° Campaign Masterplan', 'خطة حملة 360°'), T('Online + Offline execution plan', 'خطة أونلاين وأوفلاين متكاملة')],
              ].map(([a, b], i) => (
                <Reveal key={a} delay={i * 70} className="glass-ink flex items-start gap-4 p-4 sm:p-5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-gold/30 bg-gold/10 text-gold"><Compass size={16} aria-hidden="true" /></span>
                  <div>
                    <div className="text-[15px] font-bold leading-snug">{a}</div>
                    <div className="mt-1 text-xs leading-relaxed text-cream/45">{b}</div>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={120} className="glass-ink border-gold/35 p-6 sm:p-7">
              <h3 className="text-lg font-bold tracking-tight">{T('Book a Strategy Session', 'احجز جلسة استراتيجية')}</h3>
              <p className="mt-1 text-xs text-cream/50">{T('3 quick questions — 60 seconds.', '٣ أسئلة سريعة — ٦٠ ثانية.')}</p>

              <div className="my-5 flex gap-1.5" aria-hidden="true">
                {[1, 2, 3].map((n) => (
                  <div key={n} className={`h-1 flex-1 rounded-full transition ${step >= n || done ? 'bg-gold' : 'bg-white/12'}`} />
                ))}
              </div>

              {done ? (
                <div className="py-10 text-center">
                  <span className="mx-auto grid h-14 w-14 place-items-center border border-gold/35 text-gold"><Check size={26} /></span>
                  <p className="mt-4 font-bold">{T('Request received! We will contact you within 24h.', 'تم استلام طلبك! سنتواصل معك خلال 24 ساعة.')}</p>
                </div>
              ) : <>
                {step === 1 && (
                  <div>
                    <label className="label">{T('Your industry', 'مجال عملك')}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {industries.map((i) => (
                        <button key={i} type="button" onClick={() => setF({ ...f, industry: i })} className={chip(f.industry === i)}>{i}</button>
                      ))}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div>
                      <label className="label">{T('Target market', 'السوق المستهدف')}</label>
                      <input className="input !border-white/15 !bg-white/[0.06] !text-cream placeholder:text-cream/35" placeholder={T('e.g. Amman, Gulf, B2B...', 'مثال: عمّان، الخليج، B2B...')} value={f.market} onChange={set('market')} />
                    </div>
                    <div>
                      <label className="label">{T('Budget (JOD)', 'الميزانية (دينار)')}</label>
                      <div className="grid grid-cols-2 gap-2">
                        {budgets.map((b) => (
                          <button key={b} type="button" onClick={() => setF({ ...f, budget: b })} className={chip(f.budget === b)}>{b}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-3">
                    {[['name', T('Full name', 'الاسم')], ['phone', T('Phone / WhatsApp', 'هاتف / واتساب')], ['email', T('Email', 'البريد')]].map(([k, l]) => (
                      <div key={k}>
                        <label className="label">{l}</label>
                        <input className="input !border-white/15 !bg-white/[0.06] !text-cream placeholder:text-cream/35" value={f[k]} onChange={set(k)} />
                      </div>
                    ))}
                  </div>
                )}

                {err && <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300">{err}</p>}

                <div className="mt-6 flex items-center justify-between gap-3">
                  <button disabled={step === 1} className="btn-ghost !border-white/20 !bg-transparent text-cream/80 disabled:opacity-30" onClick={() => setStep(step - 1)}>{T('Back', 'رجوع')}</button>
                  {step < 3
                    ? <button className="btn-gold" disabled={(step === 1 && !f.industry) || (step === 2 && !f.budget)} onClick={() => setStep(step + 1)}>{T('Next', 'التالي')}<ArrowRight size={15} className="rtl:rotate-180" /></button>
                    : <button className="btn-terra" disabled={!f.name || !f.phone} onClick={submit}><Send size={14} />{T('Book Session', 'احجز الجلسة')}</button>}
                </div>
              </>}
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ================= Smart Calculator ================= */
const Num = ({ l, v, on }) => (
  <div>
    <label className="label">{l}</label>
    <input type="number" min="0" step="0.1" className="input" value={v} onChange={(e) => on(parseFloat(e.target.value) || 0)} />
  </div>
);
const Sel = ({ l, v, on, opts }) => (
  <div>
    <label className="label">{l}</label>
    <select className="input" value={v} onChange={(e) => on(e.target.value)}>{opts.map(([val, lab]) => <option key={val} value={val}>{lab}</option>)}</select>
  </div>
);
const Chk = ({ l, v, on }) => (
  <label className="flex cursor-pointer items-start gap-2.5 text-sm text-muted">
    <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[#C9A45C]" checked={v} onChange={(e) => on(e.target.checked)} />
    <span>{l}</span>
  </label>
);

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

  const resultRow = (l, v, strong) => (
    <div key={l} className={`flex items-baseline justify-between gap-3 ${strong ? 'pt-2 text-base font-extrabold' : 'text-sm text-muted'}`}>
      <span>{tx(l)}</span>
      <b className={strong ? 'tabular-nums text-gold' : 'tabular-nums text-fg'}>{money(v)}</b>
    </div>
  );

  return (
    <Section
      id="calculator"
      kicker={T('05 — Live pricing', '٠٥ — تسعير فوري')}
      title={T('Smart Cost Estimator & Quotation Builder', 'الحاسبة الذكية وطلب عرض السعر')}
      sub={T('Prices update live from our admin rate manager. Add items to your quote cart and request an official quotation.', 'الأسعار تتحدث مباشرة من لوحة التحكم. أضف البنود لسلة العرض واطلب عرض سعر رسمي.')}
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {[['signage', Signpost, T('Signage / Booths', 'آرمات ومعارض')], ['printing', Printer, T('Printing', 'مطبوعات')], ['bundles', Share2, T('Marketing & Social', 'تسويق وسوشيال')]].map(([id, Icon, l]) => (
          <button key={id} type="button" onClick={() => setCat(id)} data-active={cat === id} className="chip px-4 py-2 text-[13px]">
            <Icon size={15} />{l}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="glass p-6 lg:col-span-3">
          {cat === 'signage' && (!mat
            ? <p className="py-10 text-center text-sm text-subtle">{T('No materials available right now.', 'لا توجد مواد متاحة حالياً.')}</p>
            : <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Sel l={T('Material / Type', 'الصنف')} v={matKey} on={(v) => setSg({ ...sg, mat: v })} opts={Object.entries(rates.area).map(([k, m]) => [k, `${tx(m)} — ${money(m.price)}/m²`])} />
                {desc(mat) && <p className="mt-1.5 text-xs text-subtle">{desc(mat)}</p>}
              </div>
              <Num l={T('Width (m)', 'العرض (م)')} v={sg.w} on={(v) => setSg({ ...sg, w: v })} />
              <Num l={T('Height (m)', 'الارتفاع (م)')} v={sg.h} on={(v) => setSg({ ...sg, h: v })} />

              <div className="sm:col-span-2 flex items-center justify-between rounded-xl border border-gold/20 bg-gold/10 px-4 py-3 text-sm font-semibold">
                <span className="text-muted">{T('Area', 'المساحة')}</span>
                <span className="tabular-nums">{sg.w} × {sg.h} = <span className="text-gold">{sgCalc.area.toFixed(2)} m²</span></span>
              </div>

              {Object.keys(rates.addons).length > 0 && (
                <div className="sm:col-span-2">
                  <label className="label">{T('Add-ons', 'الإضافات')}</label>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {Object.entries(rates.addons).map(([k, a]) => (
                      <div key={k}>
                        <Chk l={`${tx(a)} (${a.unit === 'flat' ? money(a.price) : money(a.price) + '/m²'})`} v={isOn(k)} on={(v) => setSel({ ...sel, [k]: v })} />
                        {desc(a) && <p className="ps-7 text-[11px] text-subtle">{desc(a)}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="sm:col-span-2 space-y-1.5 border-t border-line/10 pt-4">
                {sgCalc.lines.map((l) => resultRow(l, l.v))}
              </div>

              <button className="btn-gold sm:col-span-2" onClick={addSg}>
                {T('Add to Quote', 'أضف لسلة العرض')} · {money(sgCalc.total)}
              </button>
            </div>)}

          {cat === 'printing' && (!it
            ? <p className="py-10 text-center text-sm text-subtle">{T('No printing items available right now.', 'لا توجد مطبوعات متاحة حالياً.')}</p>
            : <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Sel l={T('Item', 'المنتج')} v={itKey} on={(v) => setPr({ ...pr, item: v, size: '' })} opts={Object.entries(rates.print).map(([k, p]) => [k, tx(p)])} />
                {desc(it) && <p className="mt-1.5 text-xs text-subtle">{desc(it)}</p>}
              </div>
              <Sel l={T('Size', 'المقاس')} v={size} on={(v) => setPr({ ...pr, size: v })} opts={sizes.map((s) => [s, s])} />
              <Sel l={T('Paper weight', 'وزن الورق')} v={pr.paper} on={(v) => setPr({ ...pr, paper: +v })} opts={Object.keys(rates.mult.paper).map((g) => [g, `${g}g`])} />
              <Sel l={T('Lamination / Finish', 'السلوفان / التشطيب')} v={pr.lam} on={(v) => setPr({ ...pr, lam: v })} opts={Object.keys(rates.mult.lam).map((k) => [k, LAM[k] || k])} />
              <Sel l={T('Printing sides', 'جهات الطباعة')} v={pr.sides} on={(v) => setPr({ ...pr, sides: +v })} opts={[[1, T('Single side', 'وجه واحد')], [2, T('Double side', 'وجهين')]]} />

              <div className="sm:col-span-2">
                <label className="label">{T('Quantity', 'الكمية')}</label>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(rates.mult.qty).map(Number).map((q, i, arr) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setPr({ ...pr, qty: q })}
                      data-active={pr.qty === q}
                      className="chip px-3.5 py-2 tabular-nums"
                    >
                      {q}{i === arr.length - 1 ? '+' : ''}
                      {rates.mult.qty[q] < 1 && <span className="text-[10px] opacity-70">-{Math.round((1 - rates.mult.qty[q]) * 100)}%</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2 flex items-baseline justify-between border-t border-line/10 pt-4 text-sm">
                <span className="text-muted">{T('Unit price', 'سعر الوحدة')}</span>
                <b className="tabular-nums">{money(prCalc.unit)}</b>
              </div>
              <button className="btn-gold sm:col-span-2" onClick={addPr}>
                {T('Add to Quote', 'أضف لسلة العرض')} · {money(prCalc.total)}
              </button>
            </div>)}

          {cat === 'bundles' && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold uppercase tracking-[0.1em] text-subtle">{T('Social Media Packages (monthly)', 'باقات السوشيال ميديا (شهرياً)')}</h4>
              {Object.entries(rates.packages).map(([k, p]) => (
                <div key={k} className="flex items-center justify-between gap-3 border-b border-line/12 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{tx(p)}</div>
                    {desc(p) && <div className="truncate text-[11px] text-subtle">{desc(p)}</div>}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <b className="tabular-nums text-sm">{money(p.price)}</b>
                    <button
                      className="btn-gold !h-8 !w-8 !px-0 text-sm"
                      aria-label={T('Add', 'إضافة')}
                      onClick={() => push({ label: { en: `Social Media — ${p.en}`, ar: `سوشيال ميديا — ${p.ar}` }, dept: 'social', price: p.price, detail: T('Monthly', 'شهري') })}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}

              <h4 className="pt-4 text-sm font-bold uppercase tracking-[0.1em] text-subtle">{T('Strategy & Consultancy', 'الاستراتيجية والاستشارات')}</h4>
              {Object.entries(rates.marketing).map(([k, p]) => (
                <div key={k} className="flex items-center justify-between gap-3 border-b border-line/12 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{tx(p)}</div>
                    {desc(p) && <div className="truncate text-[11px] text-subtle">{desc(p)}</div>}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <b className="tabular-nums text-sm">{money(p.price)}</b>
                    <button className="btn-gold !h-8 !w-8 !px-0 text-sm" aria-label={T('Add', 'إضافة')} onClick={() => addMk(k)}>+</button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
    <div className="glass p-5 sm:p-6 lg:sticky lg:top-24">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-bold tracking-tight">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-gold/15 text-gold"><ShoppingCart size={16} /></span>
        {T('Live Quote Cart', 'سلة عرض السعر')}
        <span className="badge ms-auto bg-surface-3 text-muted tabular-nums">{cart.length}</span>
      </h3>

      {cart.length === 0 ? (
        <div className="py-10 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-line/10 bg-surface-2 text-subtle"><ShoppingCart size={20} /></span>
          <p className="mt-3 text-sm text-subtle">{T('Your cart is empty. Configure an item and add it.', 'السلة فارغة. اضبط منتجاً وأضفه.')}</p>
        </div>
      ) : (
        <ul className="no-scrollbar max-h-72 space-y-3 overflow-auto">
          {cart.map((i) => (
            <li key={i.id} className="flex items-start justify-between gap-3 border-b border-line/10 pb-3 last:border-0">
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-snug">{tx(i.label)}</div>
                {i.detail && <div className="mt-0.5 text-[11px] leading-relaxed text-subtle">{i.detail}</div>}
              </div>
              <div className="shrink-0 text-end">
                <b className="text-sm tabular-nums">{money(i.price)}</b>
                <button
                  className="mt-1 ms-auto block text-terra/80 transition hover:text-terra"
                  aria-label={T('Remove item', 'حذف البند')}
                  onClick={() => upd({ cart: cart.filter((x) => x.id !== i.id) })}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <dl className="mt-4 space-y-1.5 border-t border-line/10 pt-4 text-sm">
        <div className="flex justify-between text-muted"><dt>{T('Subtotal', 'المجموع')}</dt><dd className="tabular-nums">{money(sub)}</dd></div>
        <div className="flex justify-between text-muted"><dt>{T('VAT', 'ضريبة')} {rates.vat}%</dt><dd className="tabular-nums">{money(vat)}</dd></div>
        <div className="mt-2 flex items-baseline justify-between border-t border-line/10 pt-3 text-base font-extrabold">
          <dt>{T('Estimated Total', 'الإجمالي التقديري')}</dt>
          <dd className="tabular-nums text-gold">{money(sub + vat)}</dd>
        </div>
      </dl>

      <button disabled={!cart.length} className="btn-terra mt-4 w-full disabled:opacity-40" onClick={() => setOpen(true)}>
        {T('Request Official Quotation', 'طلب عرض سعر رسمي')}
      </button>
      <p className="mt-2.5 text-center text-[11px] text-subtle">{T('No commitment — our team reviews and confirms final pricing.', 'دون أي التزام — يراجع فريقنا الأسعار ويؤكدها.')}</p>

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
  return (
    <Dialog onClose={onClose} label={T('Official Quotation Request', 'طلب عرض سعر رسمي')} size="lg" className="p-5 sm:p-7">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold tracking-tight">{T('Official Quotation Request', 'طلب عرض سعر رسمي')}</h3>
          <p className="mt-1 text-xs text-subtle">{cart.length} {T('items in your cart', 'بنود في السلة')}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={T('Close', 'إغلاق')} className="icon-btn -me-1 -mt-1 shrink-0"><X size={17} /></button>
      </div>

      {no ? (
        <div className="py-10 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gold/15 text-gold ring-1 ring-gold/25"><Check size={26} /></span>
          <p className="mt-4 font-bold">{T('Request submitted!', 'تم إرسال الطلب!')}</p>
          <p className="mt-2 text-sm text-muted">{T('Reference', 'المرجع')}: <b className="select-all text-gold">{no}</b></p>
          <p className="mx-auto mt-3 max-w-sm text-xs leading-relaxed text-subtle">{T('Our team will review it and send you an official quotation.', 'سيراجعه فريقنا ويرسل لك عرض السعر الرسمي.')}</p>
          <button className="btn-gold mt-6" onClick={onClose}>{T('Close', 'إغلاق')}</button>
        </div>
      ) : (
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={send}>
          <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" name="website" value={f.website} onChange={set('website')} />
          {[['name', T('Client name', 'اسم العميل'), 1], ['company', T('Company', 'الشركة')], ['phone', T('Phone / WhatsApp', 'هاتف / واتساب'), 1], ['email', T('Email', 'البريد'), 0, 'email'], ['tax', T('Tax number (optional)', 'الرقم الضريبي (إن وجد)')]].map(([k, l, req, type]) => (
            <div key={k}>
              <label className="label">{l}</label>
              <input type={type || 'text'} required={!!req} className="input" value={f[k]} onChange={set(k)} />
            </div>
          ))}
          <div className="sm:col-span-2"><label className="label">{T('Project notes', 'ملاحظات المشروع')}</label><textarea rows="3" className="input" value={f.notes} onChange={set('notes')} /></div>
          <label className="btn-ghost sm:col-span-2 cursor-pointer text-xs">
            <Upload size={14} />{f.file || T('Upload design / brief file', 'ارفع ملف التصميم / الموجز')}
            <input type="file" className="hidden" onChange={(e) => { setFileObj(e.target.files[0] || null); setF({ ...f, file: e.target.files[0]?.name || '' }); }} />
          </label>
          {err && <p className="sm:col-span-2 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400">{err}</p>}
          <button disabled={busy} className="btn-terra sm:col-span-2 disabled:opacity-60">
            <Send size={14} />{busy ? T('Sending…', 'جارٍ الإرسال…') : T('Submit Request', 'إرسال الطلب')}
          </button>
        </form>
      )}
    </Dialog>
  );
}

/* ================= Key clients ================= */
function ClientsStrip() {
  const { T, tx, content } = useApp();
  const list = content.clients || [];
  if (!list.length) return null;
  return (
    <section id="clients" className="relative scroll-mt-20 overflow-hidden border-y border-white/10 bg-ink px-5 py-16 text-cream md:px-8">
      <div className="mx-auto max-w-[92rem]">
        <p className="mb-8 flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.24em] text-gold">
          <span className="h-px w-8 shrink-0 bg-gold/50" aria-hidden="true" />
          {T('Trusted by leading brands in Jordan', 'يثق بنا أبرز العلامات التجارية في الأردن')}
        </p>
        <div className="grid grid-cols-2 border-s border-t border-white/10 sm:grid-cols-3 lg:grid-cols-5">
          {list.map((c, i) => (
            <Reveal
              key={c.id}
              delay={i * 50}
              className="grid h-24 place-items-center border-b border-e border-white/10 px-4 transition duration-300 hover:bg-white/[0.05]"
              title={tx(c.name)}
            >
              {c.logo
                ? <img src={c.logo} alt={tx(c.name)} loading="lazy" className="max-h-14 max-w-full object-contain" />
                : <span className="text-center font-serif text-lg font-semibold leading-tight text-cream/85">{tx(c.name)}</span>}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================= Portfolio ================= */
const GRADS = ['from-ink-3 to-ink', 'from-ink-2 to-ink-4', 'from-terra/85 to-ink', 'from-gold/75 to-ink-3', 'from-ink-4 to-terra/70', 'from-gold-dark/85 to-ink-2', 'from-ink to-ink-3', 'from-terra/70 to-ink-4'];

function Portfolio() {
  const { T, tx, lang, content } = useApp();
  const [f, setF] = useState('all');
  const items = content.projects || [];
  const used = CATS.filter(([k]) => items.some((p) => p.cat === k));
  const active = f === 'all' || used.some(([k]) => k === f) ? f : 'all';
  if (!items.length) return null;
  return (
    <Section
      id="portfolio"
      kicker={T('06 — Portfolio', '٠٦ — أعمالنا')}
      title={T('Selected Work', 'أبرز أعمالنا')}
      sub={T('A glimpse of recent projects delivered for our clients.', 'لمحة عن مشاريعنا الأخيرة التي نفذناها لعملائنا.')}
    >
      <div className="mb-7 flex flex-wrap gap-2">
        {[['all', 'All', 'الكل'], ...used].map(([k, en, ar]) => (
          <button key={k} type="button" onClick={() => setF(k)} data-active={active === k} className="chip px-4 py-2">
            {lang === 'ar' ? ar : en}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.filter((p) => active === 'all' || p.cat === active).map((p, i) => (
          <Reveal
            key={p.id}
            delay={(i % 4) * 60}
            className={`group relative aspect-[4/5] overflow-hidden rounded-2xl border border-line/15 transition duration-500 hover:border-gold/40 hover:shadow-[0_30px_60px_-34px_rgba(24,21,18,.55)] ${p.image ? 'bg-ink-2' : `bg-gradient-to-br ${GRADS[i % GRADS.length]}`}`}
          >
            {p.image
              ? <img loading="lazy" src={p.image} alt={tx(p.title)} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.06]" />
              : <Mark className="absolute -bottom-6 -end-6 h-40 opacity-15 transition duration-700 group-hover:scale-110 group-hover:opacity-30" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent opacity-90" aria-hidden="true" />
            <span className="absolute start-4 top-4 text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">{String(i + 1).padStart(2, '0')}</span>
            <div className="absolute inset-x-0 bottom-0 p-4 text-white">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">{CATS.find(([k]) => k === p.cat)?.[lang === 'ar' ? 2 : 1]}</div>
              <div className="mt-1 text-sm font-bold leading-snug">{tx(p.title)}</div>
              {tx(p.desc) && (
                <div className="mt-1 max-h-0 overflow-hidden text-[11px] leading-relaxed text-white/75 opacity-0 transition-all duration-300 group-hover:max-h-20 group-hover:opacity-100">{tx(p.desc)}</div>
              )}
            </div>
          </Reveal>
        ))}
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
    <div className="border-y border-line/10 bg-surface-2/50">
      <Section id="testimonials" kicker={T('07 — Reviews', '٠٧ — الآراء')} title={T('What Our Clients Say', 'ماذا يقول عملاؤنا')}>
        <div className="grid gap-5 md:grid-cols-3 md:gap-6">
          {list.map((t, i) => (
            <Reveal key={t.id} delay={i * 80} as="figure" className="glass card-hover flex flex-col p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex gap-0.5 text-gold" aria-label={`${t.rating || 5}/5`}>
                  {Array.from({ length: 5 }).map((_, n) => (
                    <Star key={n} size={13} className={n < (t.rating || 5) ? 'fill-current' : 'opacity-20'} />
                  ))}
                </div>
                <Quote size={18} className="text-gold/30" />
              </div>
              <blockquote className="flex-1 text-sm leading-relaxed text-muted">“{tx(t.quote)}”</blockquote>
              <figcaption className="mt-5 flex items-center gap-3 border-t border-line/10 pt-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center border border-gold/30 text-xs font-bold text-gold">
                  {(tx(t.name) || '?').trim().charAt(0)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{tx(t.name)}</span>
                  <span className="block truncate text-xs text-subtle">{tx(t.role)}</span>
                </span>
              </figcaption>
            </Reveal>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ================= Footer ================= */
function Footer({ onSurvey, onVisit }) {
  const { T, tx, company, lang, upd } = useApp();
  return (
    <footer className="bg-ink text-cream">
      <div className="mx-auto max-w-[92rem] px-5 pb-8 pt-16 md:px-8">
        <Reveal className="mb-14 flex flex-col items-start justify-between gap-6 border border-white/10 bg-white/[0.03] p-8 md:flex-row md:items-center md:p-10">
          <div className="max-w-xl">
            <p className="eyebrow mb-3 text-gold">{T('Start a project', 'ابدأ مشروعك')}</p>
            <h2 className="headline text-cream text-2xl md:text-[2rem]">{T('Tell us what you need — get a quote today.', 'أخبرنا بما تحتاجه — واحصل على عرض سعر اليوم.')}</h2>
            <p className="mt-2 text-sm text-cream/55">{T('Site survey, custom booth briefs and strategy sessions, all in one place.', 'معاينة موقع، موجزات بوثات مخصصة وجلسات استراتيجية في مكان واحد.')}</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <a href="#calculator" className="btn-gold"><Calculator size={15} />{T('Instant Quote', 'احسب سعرك')}</a>
            <button type="button" onClick={onSurvey} className="btn-terra btn-sm"><Ruler size={14} />{T('Site Survey', 'معاينة الموقع')}</button>
            <button type="button" onClick={onVisit} className="btn-ghost btn-sm !border-white/20 !bg-transparent text-cream/80 hover:text-cream"><CalendarCheck size={14} />{T('Request a Visit', 'اطلب زيارة')}</button>
          </div>
        </Reveal>

        <div className="grid gap-8 border-t border-white/10 pt-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo className="h-10" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream/55">{tx(company.tagline)}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href="#" onClick={(e) => { e.preventDefault(); upd({ lang: lang === 'ar' ? 'en' : 'ar' }); }} className="chip !border-white/15 !text-cream/70 hover:!text-cream">
                <Languages size={13} />{lang === 'ar' ? 'English' : 'عربي'}
              </a>
              <a href="/admin" className="chip !border-white/15 !text-cream/70 hover:!text-cream">
                <ShieldCheck size={13} />{T('Admin', 'لوحة التحكم')}
              </a>
            </div>
          </div>

          <address className="not-italic text-sm">
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-cream/40">{T('Contact', 'تواصل معنا')}</h3>
            <ul className="space-y-2.5 text-cream/70">
              <li className="flex gap-2.5"><MapPin size={15} className="mt-0.5 shrink-0 text-gold" />{tx(company.address)}</li>
              <li className="flex gap-2.5"><Phone size={15} className="mt-0.5 shrink-0 text-gold" /><a href={`tel:${(company.phone || '').replace(/\s/g, '')}`} dir="ltr" className="transition hover:text-cream">{company.phone}</a></li>
              <li className="flex gap-2.5"><Mail size={15} className="mt-0.5 shrink-0 text-gold" /><a href={`mailto:${company.email}`} className="transition hover:text-cream">{company.email}</a></li>
            </ul>
          </address>

          <div className="text-sm">
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-cream/40">{T('Departments', 'الأقسام')}</h3>
            <ul className="space-y-2 text-cream/60">
              {[['signage', T('Signage & Booths', 'آرمات ومعارض')], ['printing', T('Printing', 'مطبوعات')], ['social', T('Social Media', 'سوشيال ميديا')], ['marketing', T('Strategy', 'استشارات')], ['calculator', T('Price Calculator', 'حاسبة الأسعار')]].map(([id, l]) => (
                <li key={id}><a href={`#${id}`} className="transition hover:text-gold">{l}</a></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 overflow-hidden" aria-hidden="true">
          <p className="select-none whitespace-nowrap text-center text-[clamp(2.6rem,12vw,10rem)] font-extrabold leading-[0.78] tracking-[-0.045em] text-cream/[0.07]">
            ART SPACE
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-6 text-[11px] uppercase tracking-[0.16em] text-cream/30 md:flex-row">
          <p>© {new Date().getFullYear()} {tx(company.name)} — {T('All rights reserved.', 'جميع الحقوق محفوظة.')}</p>
          <p dir="ltr">Art Space · Amman, Jordan</p>
        </div>
      </div>
    </footer>
  );
}

export default function Site() {
  const [modal, setModal] = useState(null); // 'survey' | 'visit'
  const { cart, T, company, lang, tx } = useApp();
  useEffect(() => {
    document.title = lang === 'ar' ? `${tx(company.name)} | Art Space — آرمات، مطبوعات، سوشيال ميديا وتسويق في الأردن` : `${tx(company.name)} | Art Space — Signage, Printing, Social Media & Marketing in Jordan`;
    const d = document.querySelector('meta[name="description"]');
    if (d) d.content = lang === 'ar' ? 'وكالة دعاية وإعلان متكاملة في عمّان: آرمات وواجهات، معارض وبوثات، مطبوعات، سوشيال ميديا واستشارات تسويقية مع تسعير فوري أونلاين.' : 'Full-service advertising agency in Amman: signage & facades, exhibition booths, printing, social media and marketing strategy with instant online pricing.';
  }, [lang, company.name]);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };
  const wa = (company.phone || '').replace(/\D/g, '');

  return (
    <div className="editorial">
      <a href="#main" className="skip-link">{T('Skip to content', 'تجاوز إلى المحتوى')}</a>
      <Header onCart={() => scrollTo('calculator')} />
      <main id="main">
        <Hero onSurvey={() => setModal('survey')} onVisit={() => setModal('visit')} />
        <Services onBook={() => scrollTo('marketing')} />
        <CalculatorSection />
        <ClientsStrip />
        <Portfolio />
        <Testimonials />
      </main>
      <Footer onSurvey={() => setModal('survey')} onVisit={() => setModal('visit')} />

      {modal === 'survey' && <FormModal kind="survey" onClose={() => setModal(null)} title={T('Book a Site Survey', 'احجز معاينة موقع')} intro={T('Our engineer visits your site, takes exact measurements and prepares an accurate quotation.', 'يزور مهندسنا موقعك ويأخذ القياسات الدقيقة ويعد عرض سعر دقيق.')} />}
      {modal === 'visit' && <FormModal kind="visit" onClose={() => setModal(null)} title={T('Request a Visit', 'اطلب زيارة')} intro={T('Tell us when suits you and we will arrange a visit or meeting.', 'أخبرنا بالوقت المناسب وسنرتب زيارة أو اجتماعاً.')} />}

      {wa && (
        <a
          href={`https://wa.me/${wa}`}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="WhatsApp"
          className="fixed bottom-5 start-5 z-30 grid h-12 w-12 place-items-center rounded-full bg-[#25D366] text-white shadow-2xl transition hover:scale-110 focus-visible:scale-110"
        >
          <MessageCircle size={22} />
        </a>
      )}
      {cart.length > 0 && (
        <button
          type="button"
          onClick={() => scrollTo('calculator')}
          className="btn-terra fixed bottom-5 end-5 z-30 shadow-2xl"
        >
          <ShoppingCart size={16} />{cart.length} {T('items', 'بنود')}
        </button>
      )}
    </div>
  );
}
