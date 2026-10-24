import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { sb, submitForm } from './api.js';

const KEY = 'artspace_jo_v1';
export const uid = (p = 'id') => p + Math.random().toString(36).slice(2, 8);

/* ---------- Default editable rates (JOD) ---------- */
export const DEFAULT_RATES = {
  vat: 16,
  mult: {
    size: { A6: 0.6, '9x5cm': 0.5, A5: 1, A4: 1.8, A3: 3.2 },
    paper: { 150: 1, 300: 1.3, 350: 1.5 },
    lam: { none: 1, matt: 1.15, gloss: 1.15, uv: 1.5 },
    sides: { 1: 1, 2: 1.6 },
    qty: { 100: 1, 500: 0.7, 1000: 0.55, 5000: 0.4 },
  },
  area: {
    banner: { en: 'Outdoor Banner / Flex', ar: 'بانر فليكس خارجي', price: 6, dept: 'signage' },
    flex: { en: 'Illuminated Flex Signboard', ar: 'لوحة فليكس مضيئة', price: 14, dept: 'signage' },
    alu: { en: 'Alucobond Facade + 3D Acrylic Illuminated Letters', ar: 'ألكوبوند + حروف بارزة أكريليك مضيئة', price: 65, dept: 'signage' },
    securit: { en: 'Securit Glass + Frosted/Vinyl Branding', ar: 'زجاج سيكوريت + فروستد/فينيل', price: 55, dept: 'signage' },
    boothStd: { en: 'Standard Exhibition Booth (Shell Scheme)', ar: 'بوث معارض ستاندرد', price: 90, dept: 'signage' },
    boothCustom: { en: 'Custom Luxury Exhibition Booth', ar: 'بوث معارض كستمايزد فاخر', price: 220, dept: 'signage' },
  },
  addons: {
    frame: { en: 'Metal Structure / Frame', ar: 'شاسيه حديد', price: 12, unit: 'm2', on: true },
    led: { en: 'LED Lighting', ar: 'إضاءة LED', price: 20, unit: 'm2', on: true },
    spot: { en: 'Spotlights', ar: 'سبوت لايت', price: 9, unit: 'm2' },
    install: { en: 'Installation & Delivery', ar: 'تركيب وتوصيل', price: 6, unit: 'm2', on: true },
    design: { en: 'New Design Fee (flat)', ar: 'أجور تصميم جديد (مقطوعة)', price: 50, unit: 'flat', on: true },
  },
  print: {
    card: { en: 'Business Cards', ar: 'كروت أعمال', price: 0.24, sizes: ['9x5cm'] },
    flyer: { en: 'Flyers', ar: 'فلايرات', price: 0.12, sizes: ['A6', 'A5', 'A4'] },
    brochure: { en: 'Brochures / Catalogs', ar: 'بروشورات / كتالوجات', price: 0.65, sizes: ['A5', 'A4', 'A3'] },
    letterhead: { en: 'Letterheads', ar: 'ورق رسمي (ليتر هيد)', price: 0.18, sizes: ['A4', 'A5'] },
    ncr: { en: 'NCR Receipt / Invoice Books', ar: 'دفاتر سندات وفواتير مكربنة', price: 2.4, sizes: ['A5', 'A4'] },
    rollup: { en: 'Roll-up Banner (85x200)', ar: 'رول أب (85×200)', price: 22, sizes: ['A4'] },
    bag: { en: 'Paper / Carton Bags', ar: 'أكياس ورقية / كرتونية', price: 0.55, sizes: ['A4', 'A3'] },
    mug: { en: 'Printed Mugs (Giveaway)', ar: 'مجات مطبوعة (هدايا دعائية)', price: 2.2, sizes: ['A6'] },
  },
  packages: {
    starter: { en: 'Starter', ar: 'الأساسية', price: 250, dept: 'social',
      features: { en: ['12 designs / month', '2 platforms', 'Content calendar', 'Monthly report'], ar: ['12 تصميم شهرياً', 'منصتان', 'جدول محتوى', 'تقرير شهري'] } },
    growth: { en: 'Growth', ar: 'النمو', price: 600, dept: 'social', popular: true,
      features: { en: ['24 designs + 4 Reels/Motion', '3 platforms + Replies', 'Paid campaigns mgmt', 'Bi-weekly reports'], ar: ['24 تصميم + 4 ريلز/موشن', '3 منصات + الردود', 'إدارة حملات ممولة', 'تقارير نصف شهرية'] } },
    enterprise: { en: 'Enterprise', ar: 'المؤسسات', price: 1400, dept: 'social',
      features: { en: ['40 designs + 10 Reels', 'All platforms + community mgmt', 'Media buying & optimization', 'Dedicated account manager'], ar: ['40 تصميم + 10 ريلز', 'كل المنصات + إدارة المجتمع', 'شراء إعلانات وتحسين', 'مدير حساب مخصص'] } },
  },
  marketing: {
    research: { en: 'Market Research & Feasibility Study', ar: 'دراسة سوق وتحليل جدوى', price: 450, dept: 'marketing' },
    swot: { en: 'Competitor & SWOT Analysis', ar: 'تحليل المنافسين و SWOT', price: 300, dept: 'marketing' },
    gtm: { en: 'Persona + Go-To-Market Strategy', ar: 'بناء الشخصيات واستراتيجية الدخول للسوق', price: 550, dept: 'marketing' },
    master: { en: '360° Campaign Masterplan', ar: 'خطة حملة 360° متكاملة', price: 900, dept: 'marketing' },
  },
};
export const SIZE_MULT = { A6: 0.6, '9x5cm': 0.5, A5: 1, A4: 1.8, A3: 3.2 };
export const PAPER_MULT = { 150: 1, 300: 1.3, 350: 1.5 };
export const LAM_MULT = { none: 1, matt: 1.15, gloss: 1.15, uv: 1.5 };
export const SIDES_MULT = { 1: 1, 2: 1.6 };
export const QTY_MULT = { 100: 1, 500: 0.7, 1000: 0.55, 5000: 0.4 };

export const LEAD_STAGES = [
  ['new', 'New Lead', 'عميل جديد'],
  ['contacted', 'Contacted', 'تم التواصل'],
  ['measure', 'Site Measurement', 'رفع قياسات'],
  ['sent', 'Quotation Sent', 'تم إرسال العرض'],
  ['negotiation', 'Negotiation', 'تفاوض'],
  ['won', 'Won', 'تم الإغلاق (ربح)'],
  ['lost', 'Lost', 'خسارة'],
];
export const ORDER_STAGES = [
  ['draft', 'Draft', 'مسودة'],
  ['brief', 'Brief & Measurement', 'الموجز والقياسات'],
  ['design', 'Graphic Design', 'التصميم الجرافيكي'],
  ['approval', 'Client Approval', 'موافقة العميل'],
  ['production', 'Printing / Fabrication', 'في الورشة / المطبعة'],
  ['install', 'On-site Installation', 'قيد التركيب'],
  ['done', 'Completed', 'مكتمل'],
];
export const QUOTE_STATUS = [
  ['draft', 'Draft', 'مسودة'],
  ['sent', 'Sent', 'مرسل'],
  ['approved', 'Approved', 'معتمد'],
  ['rejected', 'Rejected', 'مرفوض'],
];

/** Lead categories — every website form lands in the CRM with one of these. */
export const LEAD_CATS = [
  ['signage', 'Signage & Booths', 'آرمات ومعارض', '#C9A45C'],
  ['printing', 'Printing', 'مطبوعات', '#CB6B47'],
  ['social', 'Social Media', 'سوشيال ميديا', '#8E7CC3'],
  ['marketing', 'Strategy & Consulting', 'استشارات', '#7DA7A1'],
  ['survey', 'Site Survey', 'معاينة موقع', '#4FA3D1'],
  ['visit', 'Visit Request', 'طلب زيارة', '#D98BA8'],
  ['general', 'General', 'عام', '#9CA3AF'],
];
export const SURVEY_STATUS = [
  ['new', 'New', 'جديد'],
  ['scheduled', 'Scheduled', 'مجدول'],
  ['done', 'Completed', 'منجز'],
  ['cancelled', 'Cancelled', 'ملغي'],
];
const COLLECTIONS = ['leads', 'quotes', 'orders', 'invoices', 'surveys'];

/** Pick the department that carries most of the value in a cart / item list. */
export const categorize = (items = []) => {
  const by = {};
  items.forEach((i) => { if (i.dept) by[i.dept] = (by[i.dept] || 0) + Number(i.price || 0); });
  const top = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : 'general';
};

/* ---------- Demo data (not loaded by default; kept for reference/testing) ---------- */
const mk = (en, ar, dept, price, detail) => ({ id: uid('i'), label: { en, ar }, detail, dept, price });
export const DEMO_DATA = {
  leads: [
    { id: 'c1', name: 'Omar Haddad', company: 'Levant Coffee Roasters', phone: '+962 79 555 1201', email: 'omar@levantcoffee.jo', tax: '10234567', stage: 'sent', source: 'Website Calculator', notes: 'New branch in Abdoun — full facade.', date: '2026-10-02' },
    { id: 'c2', name: 'ليلى المصري', company: 'عيادات نبض للأسنان', phone: '+962 78 444 9087', email: 'layla@nabd-dental.jo', tax: '', stage: 'won', source: 'Referral', notes: 'تغليف زجاج سيكوريت + مطبوعات الافتتاح.', date: '2026-09-21' },
    { id: 'c3', name: 'Khaled Nasser', company: 'Amman Expo Tech', phone: '+962 77 321 7788', email: 'khaled@ammanexpotech.com', tax: '20987654', stage: 'measure', source: 'Consultation Funnel', notes: 'Custom double-deck booth for Jordan Build Expo.', date: '2026-10-12' },
    { id: 'c4', name: 'رنا الخطيب', company: 'بوتيك لمسة', phone: '+962 79 100 2233', email: 'rana@lamsa.jo', tax: '', stage: 'new', source: 'Website Calculator', notes: 'باقة سوشيال ميديا + كروت.', date: '2026-10-20' },
  ],
  quotes: [
    { id: 'q1', no: 'Q-2026-001', clientId: 'c1', status: 'sent', discount: 100, vat: true, date: '2026-10-03', notes: 'Facade 6x1.2m', converted: false,
      items: [mk('Alucobond + 3D Acrylic Illuminated Letters', 'ألكوبوند + حروف أكريليك مضيئة', 'signage', 468, '6 × 1.2 = 7.2 m²'), mk('Installation & Delivery', 'تركيب وتوصيل', 'signage', 43.2, '')] },
    { id: 'q2', no: 'Q-2026-002', clientId: 'c2', status: 'approved', discount: 0, vat: true, date: '2026-09-23', notes: '', converted: true,
      items: [mk('Securit Glass + Frosted Branding', 'زجاج سيكوريت + فروستد', 'signage', 330, '3 × 2 = 6 m²'), mk('Business Cards', 'كروت أعمال', 'printing', 48, 'qty 1000')] },
    { id: 'q3', no: 'Q-2026-003', clientId: 'c3', status: 'draft', discount: 0, vat: true, date: '2026-10-13', notes: 'Custom booth 6x4', converted: false,
      items: [mk('Custom Luxury Exhibition Booth', 'بوث معارض كستمايزد', 'signage', 5280, '6 × 4 = 24 m²')] },
  ],
  orders: [
    { id: 'o1', quoteId: 'q2', clientId: 'c2', title: 'Nabd Dental — Glass + Print', stage: 'production', date: '2026-09-25', total: 438.48 },
    { id: 'o2', quoteId: 'q3', clientId: 'c3', title: 'Amman Expo Tech — Custom Booth (Draft)', stage: 'draft', date: '2026-10-13', total: 6124.8 },
  ],
  invoices: [
    { id: 'inv1', no: 'INV-2026-001', orderId: 'o1', clientId: 'c2', date: '2026-09-25', vat: true, vatRate: 16, discount: 0,
      items: [mk('Securit Glass + Frosted Branding', 'زجاج سيكوريت + فروستد', 'signage', 330, '3 × 2 = 6 m²'), mk('Business Cards', 'كروت أعمال', 'printing', 48, 'qty 1000')],
      payments: [{ id: 'p1', label: 'Down Payment / عربون', amount: 200, date: '2026-09-25' }] },
  ],
};

/* ---------- Company profile + quotation / invoice look (Admin → Company & Quote Style) ---------- */
export const DEFAULT_COMPANY = {
  name: { en: 'Art Space', ar: 'مساحة الفن' },
  tagline: { en: 'Advertising · Signage · Printing · Marketing', ar: 'دعاية · آرمات · مطبوعات · تسويق' },
  logo: '',
  phone: '+962 6 555 0100',
  email: 'hello@artspace.jo',
  website: 'www.artspace.jo',
  address: { en: 'Amman, Jordan', ar: 'عمّان، الأردن' },
  taxNo: '10999888',
  footerNote: { en: 'Thank you for choosing Art Space.', ar: 'شكراً لاختياركم مساحة الفن.' },
  terms: {
    en: 'Quotation valid for 14 days.\n50% down payment to start; balance on delivery.\nFinal designs require written client approval before production.\nPrices exclude permits and municipality fees unless stated.',
    ar: 'العرض صالح لمدة 14 يوماً.\n50% دفعة أولى للبدء والباقي عند التسليم.\nتتطلب التصاميم موافقة خطية قبل التنفيذ.\nالأسعار لا تشمل التراخيص ورسوم البلدية ما لم يُذكر.',
  },
  showSignature: true,
  style: 'waves', // compact | bubbles | waves
  color: 'gold', // gold | terra | ink | cream | black | none
};

/* ---------- Website content (editable from Admin → Website Content) ---------- */
export const CATS = [['signage', 'Signage', 'آرمات'], ['booths', 'Booths', 'بوثات'], ['printing', 'Printing', 'مطبوعات'], ['social', 'Social', 'سوشيال'], ['marketing', 'Strategy', 'استشارات']];
export const DEFAULT_CONTENT = {
  projects: [
    { id: 'p1', cat: 'signage', title: { en: 'Café Facade — Alucobond + 3D Letters', ar: 'واجهة مقهى — ألكوبوند + حروف بارزة' }, desc: { en: 'Full facade cladding with illuminated 3D acrylic letters.', ar: 'تكسية واجهة كاملة مع حروف أكريليك مضيئة.' }, image: '' },
    { id: 'p2', cat: 'booths', title: { en: 'Double-Deck Expo Booth', ar: 'بوث معرض بطابقين' }, desc: { en: 'Custom two-level booth with LED video wall and VIP lounge.', ar: 'بوث مخصص بطابقين مع شاشة LED وصالة VIP.' }, image: '' },
    { id: 'p3', cat: 'printing', title: { en: 'Luxury Business Cards — Foil', ar: 'كروت أعمال فاخرة — فويل' }, desc: { en: 'Textured stock with gold foil and spot UV.', ar: 'ورق مخمل مع فويل ذهبي وسبوت UV.' }, image: '' },
    { id: 'p4', cat: 'signage', title: { en: 'Dental Clinic — Securit Glass', ar: 'عيادة أسنان — زجاج سيكوريت' }, desc: { en: 'Tempered glass partitions with frosted branding.', ar: 'قواطع سيكوريت مع طباعة فروستد.' }, image: '' },
    { id: 'p5', cat: 'social', title: { en: 'Social Campaign — Reels & Carousels', ar: 'حملة سوشيال — ريلز وكاروسيل' }, desc: { en: 'Monthly content, motion graphics and paid media.', ar: 'محتوى شهري وموشن جرافيك وإعلانات ممولة.' }, image: '' },
    { id: 'p6', cat: 'printing', title: { en: 'Corporate Stationery Set', ar: 'طقم قرطاسية مؤسسية' }, desc: { en: 'Letterheads, envelopes, folders and NCR books.', ar: 'ورق رسمي وظروف وفولدرات ودفاتر مكربنة.' }, image: '' },
  ],
  testimonials: [
    { id: 't1', name: { en: 'Sample Client A', ar: 'عميل تجريبي أ' }, role: { en: 'Owner, Café (sample)', ar: 'مالك مقهى (نموذج)' }, quote: { en: 'They delivered our facade on time and the lit letters look stunning at night.', ar: 'نفذوا الواجهة في الوقت المحدد والحروف المضيئة تبدو رائعة ليلاً.' }, rating: 5 },
    { id: 't2', name: { en: 'Sample Client B', ar: 'عميل تجريبي ب' }, role: { en: 'Marketing Manager (sample)', ar: 'مدير تسويق (نموذج)' }, quote: { en: 'The instant calculator saved us days of back-and-forth. Clear pricing, great quality.', ar: 'الحاسبة الفورية وفرت علينا أياماً من المراسلات. أسعار واضحة وجودة ممتازة.' }, rating: 5 },
    { id: 't3', name: { en: 'Sample Client C', ar: 'عميل تجريبي ج' }, role: { en: 'Exhibitor (sample)', ar: 'عارض في معرض (نموذج)' }, quote: { en: 'Our custom booth was the busiest at the expo. Professional team from design to install.', ar: 'بوثنا المخصص كان الأكثر ازدحاماً في المعرض. فريق محترف من التصميم حتى التركيب.' }, rating: 5 },
  ],
  clients: [
    { id: 'k1', name: { en: 'Uncle Osaka', ar: 'أنكل أوساكا' }, logo: '' },
    { id: 'k2', name: { en: 'Tirasimino Cafe', ar: 'تيراسيمينو كافيه' }, logo: '' },
    { id: 'k3', name: { en: 'Al Ameed Coffee', ar: 'قهوة العميد' }, logo: '' },
  ],
};

/** Fill in fields missing from older saved data without clobbering admin edits. */
export const migrateRates = (r = {}) => {
  const out = { ...DEFAULT_RATES, ...r, mult: { ...DEFAULT_RATES.mult, ...(r.mult || {}) } };
  out.packages = { ...(r.packages || DEFAULT_RATES.packages) };
  out.addons = { ...(r.addons || DEFAULT_RATES.addons) };
  Object.keys(out.packages).forEach((k) => {
    const d = DEFAULT_RATES.packages[k] || {};
    const p = out.packages[k];
    out.packages[k] = { ...p, features: p.features || d.features || { en: [], ar: [] }, popular: p.popular ?? d.popular ?? false };
  });
  Object.keys(out.addons).forEach((k) => {
    const d = DEFAULT_RATES.addons[k] || {};
    const a = out.addons[k];
    out.addons[k] = { ...a, unit: a.unit || d.unit || 'm2', on: a.on ?? d.on ?? false };
  });
  return out;
};

export const totals = (doc, vatRate) => {
  const sub = doc.items.reduce((s, i) => s + Number(i.price || 0), 0);
  const after = Math.max(0, sub - Number(doc.discount || 0));
  const vat = doc.vat ? (after * (doc.vatRate ?? vatRate)) / 100 : 0;
  return { sub, after, vat, total: after + vat };
};

const load = () => {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s) {
      const { adminPass, ...rest } = s; // never keep a password in client state
      return { ...rest, auth: false, leads: [], quotes: [], orders: [], invoices: [], surveys: [], rates: migrateRates(s.rates), content: { ...DEFAULT_CONTENT, ...(s.content || {}) }, company: { ...DEFAULT_COMPANY, ...(s.company || {}) } };
    }
  } catch {}
  return { lang: 'ar', dark: true, mode: 'site', auth: false, rates: DEFAULT_RATES, content: DEFAULT_CONTENT, company: DEFAULT_COMPANY, cart: [], leads: [], quotes: [], orders: [], invoices: [], surveys: [] };
};

const Ctx = createContext();
export const useApp = () => useContext(Ctx);

export function Provider({ children }) {
  const [s, setS] = useState(load);
  const synced = useRef(false);
  useEffect(() => {
    // Private business data lives on the server only — never persist it in the visitor's browser.
    const { leads, quotes, orders, invoices, surveys, auth, ...pub } = s;
    localStorage.setItem(KEY, JSON.stringify(pub));
    document.documentElement.dir = s.lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = s.lang;
    document.documentElement.classList.toggle('dark', s.dark);
  }, [s]);

  const upd = useCallback((p) => setS((o) => ({ ...o, ...(typeof p === 'function' ? p(o) : p) })), []);

  /* ---------- Server sync: public settings on load; private data after admin login ---------- */
  const pullRef = useRef(null);
  useEffect(() => {
    const pull = async (authed) => {
      const { data: st } = await sb.from('settings').select('id,data').in('id', ['rates', 'content', 'company']);
      (st || []).forEach((row) => {
        if (row.id === 'rates') upd({ rates: migrateRates(row.data) });
        if (row.id === 'content') upd({ content: { ...DEFAULT_CONTENT, ...row.data } });
        if (row.id === 'company') upd({ company: { ...DEFAULT_COMPANY, ...row.data } });
      });
      if (!authed) { synced.current = false; return; }
      const out = {};
      for (const t of ['leads', 'quotes', 'orders', 'invoices', 'surveys']) {
        const { data, error } = await sb.from(t).select('data');
        if (error) { if (error.status === 401) { await sb.auth.signOut(); } return; }
        out[t] = (data || []).map((r) => r.data).sort((a, b) => String(b.date).localeCompare(String(a.date)));
      }
      upd(out);
      synced.current = true;
    };
    pullRef.current = pull;
    sb.auth.getSession().then(({ data }) => { upd({ auth: !!data.session }); pull(!!data.session); });
    const { data: sub } = sb.auth.onAuthStateChange((_e, sess) => {
      upd(sess ? { auth: true } : { auth: false, leads: [], quotes: [], orders: [], invoices: [], surveys: [] });
      pull(!!sess);
    });
    return () => sub.subscription.unsubscribe();
  }, [upd]);

  /* Admin: pick up new website submissions automatically (merge — never overwrite local edits in flight). */
  useEffect(() => {
    if (!s.auth) return undefined;
    const id = setInterval(async () => {
      for (const t of ['leads', 'quotes', 'orders', 'surveys']) {
        const { data } = await sb.from(t).select('data');
        if (!data) continue;
        setS((o) => {
          const have = new Set(o[t].map((r) => r.id));
          const fresh = data.map((r) => r.data).filter((r) => !have.has(r.id));
          return fresh.length ? { ...o, [t]: [...fresh, ...o[t]] } : o;
        });
      }
    }, 30000);
    return () => clearInterval(id);
  }, [s.auth]);

  /* Admin: debounced push after the first pull */
  useEffect(() => {
    if (!s.auth || !synced.current) return undefined;
    const t = setTimeout(async () => {
      await sb.from('settings').upsert({ id: 'rates', data: s.rates });
      await sb.from('settings').upsert({ id: 'content', data: s.content });
      await sb.from('settings').upsert({ id: 'company', data: s.company });
      for (const k of ['leads', 'quotes', 'orders', 'invoices', 'surveys']) {
        await sb.from(k).upsert(s[k].map((r) => ({ id: r.id, data: r })));
      }
    }, 800);
    return () => clearTimeout(t);
  }, [s.rates, s.content, s.company, s.leads, s.quotes, s.orders, s.invoices, s.surveys, s.auth]);

  const lang = s.lang;
  const T = (en, ar) => (lang === 'ar' ? ar : en);
  const tx = (x) => (x && typeof x === 'object' ? x[lang] : x);
  const money = (n) => `${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${lang === 'ar' ? 'د.أ' : 'JOD'}`;
  const resetAll = () => { localStorage.removeItem(KEY); location.reload(); };

  /** Website calculator cart → server creates Lead + Quote (draft) + Order (draft). Returns { no } or { error }. */
  const submitQuote = async (form, items) => {
    const r = await submitForm({
      kind: 'quote', name: form.name, company: form.company, phone: form.phone, email: form.email, tax: form.tax, notes: form.notes,
      file: form.file, filePath: form.filePath, website: form.website,
      items: items.map((i) => ({ label: i.label, detail: i.detail, dept: i.dept, price: i.price })),
    });
    if (r.error) return { error: r.error.message };
    upd({ cart: [] });
    return { no: r.data.no };
  };

  /** Any other website form → Lead (categorised). kind: booth | consult | survey | visit | contact */
  const sendForm = async (kind, form) => {
    const r = await submitForm({ kind, ...form });
    return r.error ? { error: r.error.message } : r.data;
  };
  const addLead = (lead) => sendForm('contact', lead); // backwards-compatible alias (admin "Add Lead" uses addLeadLocal)
  const addLeadLocal = (lead) => {
    const full = { id: uid('c'), stage: 'new', date: new Date().toISOString().slice(0, 10), tax: '', category: 'general', ...lead };
    upd((o) => ({ leads: [full, ...o.leads] }));
  };

  /** Approved quote → Order + Invoice */
  const convertQuote = (qid) => upd((o) => {
    const q = o.quotes.find((x) => x.id === qid);
    if (!q || q.converted) return {};
    const t = totals(q, o.rates.vat);
    const existing = o.orders.find((x) => x.quoteId === qid);
    const oid = existing?.id || uid('o');
    const orders = existing
      ? o.orders.map((x) => (x.id === oid ? { ...x, stage: 'brief', total: t.total } : x))
      : [{ id: oid, quoteId: qid, clientId: q.clientId, title: q.no, stage: 'brief', date: q.date, total: t.total }, ...o.orders];
    const inv = { id: uid('inv'), no: `INV-2026-${String(o.invoices.length + 1).padStart(3, '0')}`, orderId: oid, clientId: q.clientId, date: new Date().toISOString().slice(0, 10), vat: q.vat, vatRate: o.rates.vat, discount: q.discount, items: q.items, payments: [] };
    return {
      orders, invoices: [inv, ...o.invoices],
      quotes: o.quotes.map((x) => (x.id === qid ? { ...x, converted: true } : x)),
      leads: o.leads.map((l) => (l.id === q.clientId ? { ...l, stage: 'won' } : l)),
    };
  });

  return <Ctx.Provider value={{ ...s, upd, T, tx, money, submitQuote, sendForm, addLead, addLeadLocal, convertQuote, resetAll }}>{children}</Ctx.Provider>;
}
