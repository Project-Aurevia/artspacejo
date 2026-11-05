import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { sb, submitForm } from './api.js';
import { DEFAULT_HR, migrateHR } from './payroll.js';
import { can, canAny, COL_MODULES, SETTING_MODULES } from '../server/perms.js';

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

export const PROJECT_STATUSES = [
  ['planning', 'Planning & Design', 'التخطيط والتصميم', '#C4A05C'],
  ['in_progress', 'Fabrication', 'قيد التصنيع بالورشة', '#C46038'],
  ['installation', 'Installation', 'قيد التركيب بالموقع', '#4FA3D1'],
  ['completed', 'Completed & Handed Over', 'مكتمل ومسلّم', '#10B981'],
  ['on_hold', 'On Hold', 'معلق', '#9CA3AF'],
];

export const INVENTORY_CATS = [
  ['sheets', 'Sheets & Panels', 'ألواح وتكسيات'],
  ['lighting', 'Lighting & Power', 'إنارة ومحولات'],
  ['media', 'Rolls & Print Media', 'رولات ومواد طباعة'],
  ['hardware', 'Hardware & Accessories', 'إكسسوارات ومثبتات'],
  ['profiles', 'Iron & Aluminum Profiles', 'تيوبات وبروفايلات'],
  ['ink', 'Inks & Chemicals', 'أحبار وسوائل'],
];

// No demo stock is shipped: the warehouse starts empty and is filled by the team.
// No demo stock is shipped: the warehouse starts empty and is filled by the team.
export const DEFAULT_INVENTORY = [];

const COLLECTIONS = ['leads', 'quotes', 'orders', 'invoices', 'surveys', 'purchases', 'cash', 'customers', 'suppliers', 'employees', 'attendance', 'advances', 'payrolls', 'projects', 'inventory', 'stock_movements'];
const SETTINGS_KEYS = ['rates', 'content', 'company', 'hr'];
/** State slices that live on the server. Used for change tracking so a save only sends what changed. */
const SYNCABLE = [...SETTINGS_KEYS, ...COLLECTIONS];
/** An empty copy of every private slice — the starting point on load and after logout. */
const blankCollections = () => {
  const base = Object.fromEntries(COLLECTIONS.map((k) => [k, []]));
  return base;
};

/** Pick the department that carries most of the value in a cart / item list. */
export const categorize = (items = []) => {
  const by = {};
  items.forEach((i) => { if (i.dept) by[i.dept] = (by[i.dept] || 0) + Number(i.price || 0); });
  const top = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : 'general';
};

/* ---------- Company profile + quotation / invoice look (Admin → Company & Quote Style) ---------- */
export const DEFAULT_COMPANY = {
  name: { en: 'Art Space', ar: 'مساحة الفن' },
  tagline: { en: 'Advertising · Signage · Printing · Marketing', ar: 'دعاية · آرمات · مطبوعات · تسويق' },
  logo: '',
  phone: '+962 7 8616 5737',
  email: '',
  website: 'www.artspacejo.com',
  address: { en: 'Amman, Jordan', ar: 'عمّان، الأردن' },
  taxNo: '',
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
/**
 * A showcase item holds the whole story of one job: `image` is the single cover photo
 * that appears on the card, `images` are the remaining photos of the same place, shown
 * when the card is opened. Never mix photos of two different places in one item.
 */
const project = (id, cat, title, desc) => ({ id, cat, title, desc, image: '', images: [] });

export const DEFAULT_CONTENT = {
  projects: [
    project('p1', 'signage', { en: 'Café Facade — Alucobond + 3D Letters', ar: 'واجهة مقهى — ألكوبوند + حروف بارزة' }, { en: 'Full facade cladding with illuminated 3D acrylic letters.', ar: 'تكسية واجهة كاملة مع حروف أكريليك مضيئة.' }),
    project('p2', 'booths', { en: 'Double-Deck Expo Booth', ar: 'بوث معرض بطابقين' }, { en: 'Custom two-level booth with LED video wall and VIP lounge.', ar: 'بوث مخصص بطابقين مع شاشة LED وصالة VIP.' }),
    project('p3', 'printing', { en: 'Luxury Business Cards — Foil', ar: 'كروت أعمال فاخرة — فويل' }, { en: 'Textured stock with gold foil and spot UV.', ar: 'ورق مخمل مع فويل ذهبي وسبوت UV.' }),
    project('p4', 'signage', { en: 'Dental Clinic — Securit Glass', ar: 'عيادة أسنان — زجاج سيكوريت' }, { en: 'Tempered glass partitions with frosted branding.', ar: 'قواطع سيكوريت مع طباعة فروستد.' }),
    project('p5', 'social', { en: 'Social Campaign — Reels & Carousels', ar: 'حملة سوشيال — ريلز وكاروسيل' }, { en: 'Monthly content, motion graphics and paid media.', ar: 'محتوى شهري وموشن جرافيك وإعلانات ممولة.' }),
    project('p6', 'printing', { en: 'Corporate Stationery Set', ar: 'طقم قرطاسية مؤسسية' }, { en: 'Letterheads, envelopes, folders and NCR books.', ar: 'ورق رسمي وظروف وفولدرات ودفاتر مكربنة.' }),
  ],
  testimonials: [], // real client reviews only; the section stays hidden until one is added
  clients: [
    { id: 'k1', name: { en: 'Uncle Osaka', ar: 'أنكل أوساكا' }, logo: '' },
    { id: 'k2', name: { en: 'Tirasimino Cafe', ar: 'تيراسيمينو كافيه' }, logo: '' },
    { id: 'k3', name: { en: 'Al Ameed Coffee', ar: 'قهوة العميد' }, logo: '' },
  ],
};

/** Every photo of a project, cover first, without duplicates. Older saved data has no `images`. */
export const galleryOf = (p = {}) => [...new Set([p.image, ...(Array.isArray(p.images) ? p.images : [])].filter(Boolean))];

/** Bring saved website content up to the current shape without touching the owner's words. */
export const migrateContent = (c = {}) => {
  const out = { ...DEFAULT_CONTENT, ...c };
  out.projects = (out.projects || []).map((p) => ({ ...p, images: Array.isArray(p.images) ? p.images : [] }));
  return out;
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

/**
 * Bumped when the default palette changes so a returning visitor is migrated exactly once.
 * After the migration their own light/dark choice is written back and respected forever.
 * Keep in sync with the pre-paint script in index.html.
 */
const THEME_VERSION = 2;

const load = () => {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s) {
      const { adminPass, ...rest } = s; // never keep a password in client state
      const stale = (s.themeV || 1) < THEME_VERSION; // pre-v2 state was dark by default
      return {
        ...rest,
        themeV: THEME_VERSION,
        dark: stale ? false : s.dark !== false,
        auth: false,
        me: null,
        ...blankCollections(),
        rates: migrateRates(s.rates),
        content: migrateContent(s.content),
        company: { ...DEFAULT_COMPANY, ...(s.company || {}) },
        hr: migrateHR(s.hr),
      };
    }
  } catch {}
  return { lang: 'ar', dark: false, themeV: THEME_VERSION, mode: 'site', auth: false, rates: DEFAULT_RATES, content: DEFAULT_CONTENT, company: DEFAULT_COMPANY, hr: DEFAULT_HR, cart: [], ...blankCollections() };
};

const Ctx = createContext();
export const useApp = () => useContext(Ctx);

export function Provider({ children }) {
  const [s, setS] = useState(load);
  const synced = useRef(false);
  // Which server-backed slices the admin actually edited — only these get written back.
  const dirty = useRef(new Set());
  useEffect(() => {
    // Private business data lives on the server only — never persist it in the visitor's browser.
    const { auth, me, ...pub } = s;
    COLLECTIONS.forEach((k) => { delete pub[k]; });
    localStorage.setItem(KEY, JSON.stringify(pub));
    document.documentElement.dir = s.lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = s.lang;
    document.documentElement.classList.toggle('dark', s.dark);
  }, [s]);

  // Server responses land here: they must not be marked dirty or every pull would echo back.
  const applyServer = useCallback((p) => setS((o) => ({ ...o, ...p })), []);
  const lastDenied = useRef(0);
  const upd = useCallback((p) => setS((o) => {
    const next = { ...o, ...(typeof p === 'function' ? p(o) : p) };
    const denied = [];
    SYNCABLE.forEach((k) => {
      if (next[k] === o[k]) return;
      // Signed-in staff: refuse edits their role does not allow (the server enforces the same rules).
      if (o.auth && o.me && !o.me.full) {
        const mods = SETTINGS_KEYS.includes(k) ? SETTING_MODULES[k] : COL_MODULES[k];
        const oldRows = Array.isArray(o[k]) ? o[k] : null;
        const newRows = Array.isArray(next[k]) ? next[k] : null;
        let need = ['edit'];
        if (oldRows && newRows) {
          const oldIds = new Map(oldRows.map((r) => [r.id, r]));
          const newIds = new Map(newRows.map((r) => [r.id, r]));
          need = [];
          if (newRows.some((r) => !oldIds.has(r.id))) need.push('add');
          if (oldRows.some((r) => !newIds.has(r.id))) need.push('delete');
          if (newRows.some((r) => oldIds.has(r.id) && oldIds.get(r.id) !== r)) need.push('edit');
        }
        if (mods && need.some((a) => !canAny(o.me, mods, a))) { next[k] = o[k]; denied.push(k); return; }
      }
      dirty.current.add(k);
    });
    if (denied.length && Date.now() - lastDenied.current > 1500) {
      lastDenied.current = Date.now();
      setTimeout(() => window.alert(o.lang === 'ar' ? 'ليس لديك صلاحية لهذا الإجراء. تواصل مع مدير النظام.' : 'You do not have permission to do that. Please ask a full-access administrator.'), 0);
    }
    return next;
  }), []);

  /* ---------- Server sync: public settings on load; private data after admin login ---------- */
  useEffect(() => {
    const pull = async (authed) => {
      const { data: st } = await sb.from('settings').select('id,data').in('id', SETTINGS_KEYS);
      const next = {};
      (st || []).forEach((row) => {
        if (row.id === 'rates') next.rates = migrateRates(row.data);
        if (row.id === 'content') next.content = { ...DEFAULT_CONTENT, ...row.data };
        if (row.id === 'company') next.company = { ...DEFAULT_COMPANY, ...row.data };
        if (row.id === 'hr') next.hr = migrateHR(row.data);
      });
      if (Object.keys(next).length) applyServer(next);
      if (!authed) { synced.current = false; dirty.current.clear(); return; }
      const out = {};
      for (const t of COLLECTIONS) {
        const { data, error } = await sb.from(t).select('data');
        if (error) {
          if (error.status === 401) { await sb.auth.signOut(); return; }
          if (error.status === 403) { out[t] = []; continue; } // this role has no access to the section
          return;
        }
        const when = (r) => String(r.date || r.month || r.startDate || '');
        const rows = (data || []).map((r) => r.data).sort((a, b) => when(b).localeCompare(when(a)));
        out[t] = rows;
      }
      applyServer(out);
      dirty.current.clear();
      synced.current = true;
    };
    sb.auth.getSession().then(({ data }) => { applyServer({ auth: !!data.session, me: data.session?.user || null }); pull(!!data.session); });
    const { data: sub } = sb.auth.onAuthStateChange((_e, sess) => {
      applyServer(sess ? { auth: true, me: sess.user || null } : { auth: false, me: null, ...blankCollections() });
      pull(!!sess);
    });
    return () => sub.subscription.unsubscribe();
  }, [applyServer]);

  /* Admin: pick up new website submissions automatically (merge — never overwrite local edits in flight). */
  useEffect(() => {
    if (!s.auth) return undefined;
    const id = setInterval(async () => {
      for (const t of ['leads', 'quotes', 'orders', 'surveys', 'purchases', 'cash', 'customers', 'suppliers', 'projects', 'inventory', 'stock_movements']) {
        const { data } = await sb.from(t).select('data');
        if (!data) continue;
        setS((o) => {
          const have = new Set((o[t] || []).map((r) => r.id));
          const fresh = data.map((r) => r.data).filter((r) => !have.has(r.id));
          return fresh.length ? { ...o, [t]: [...fresh, ...(o[t] || [])] } : o;
        });
      }
    }, 30000);
    return () => clearInterval(id);
  }, [s.auth]);

  /* Admin: debounced push of edited slices only, after the first pull has completed */
  useEffect(() => {
    if (!s.auth || !synced.current || !dirty.current.size) return undefined;
    const keys = [...dirty.current];
    const t = setTimeout(async () => {
      const saved = [];
      let reload = '';
      try {
        for (const k of keys) {
          const res = SETTINGS_KEYS.includes(k)
            ? await sb.from('settings').upsert({ id: k, data: s[k] })
            : await sb.from(k).upsert((s[k] || []).map((r) => ({ id: r.id, data: r })));
          if (res?.error) throw res.error;
          if (res?.data?.pending) reload = s.lang === 'ar' ? 'أُرسل طلب الحذف إلى مدير بصلاحية كاملة للموافقة عليه. سيبقى السجل إلى حين الموافقة.' : 'Your delete request was sent to a full-access administrator for approval. The record stays until it is approved.';
          saved.push(k);
        }
      } catch (e) {
        console.error('save failed:', e);
        if (e?.status === 403) reload = e.message || 'Not allowed.';
      } finally {
        // Keep anything that failed queued for the next edit instead of silently dropping it.
        saved.forEach((k) => dirty.current.delete(k));
        // Rejected or held-for-approval changes: tell the user, then reload so the screen matches the server.
        if (reload) { dirty.current.clear(); window.alert(reload); window.location.reload(); }
      }
    }, 800);
    return () => clearTimeout(t);
  }, [s]);

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

  /** Approved quote → Project + Order + Invoice */
  const convertQuote = (qid) => upd((o) => {
    const q = o.quotes.find((x) => x.id === qid);
    if (!q || q.converted) return {};
    const t = totals(q, o.rates.vat);
    const existingOrder = o.orders.find((x) => x.quoteId === qid);
    const oid = existingOrder?.id || uid('o');
    const orders = existingOrder
      ? o.orders.map((x) => (x.id === oid ? { ...x, stage: 'brief', total: t.total } : x))
      : [{ id: oid, quoteId: qid, clientId: q.clientId, customerId: q.customerId || '', title: q.no, stage: 'brief', date: q.date, total: t.total }, ...o.orders];
    
    // Create or link Project
    const existingProject = (o.projects || []).find((p) => p.quoteId === qid || p.orderId === oid);
    const pid = existingProject?.id || uid('prj');
    const clientLead = o.leads.find((l) => l.id === q.clientId);
    const clientCust = o.customers.find((c) => c.id === q.customerId);
    const clientName = clientCust?.name?.en || clientLead?.company || clientLead?.name || q.no;
    
    const prjNumber = existingProject?.no || `PRJ-2026-${String((o.projects || []).length + 1).padStart(3, '0')}`;
    const project = existingProject || {
      id: pid,
      no: prjNumber,
      title: `${clientName} — ${q.items[0]?.label?.en || 'Signage & Advertising Job'}`,
      clientId: q.clientId,
      customerId: q.customerId || '',
      quoteId: qid,
      orderId: oid,
      status: 'planning',
      startDate: q.date || new Date().toISOString().slice(0, 10),
      targetDate: '',
      manager: 'Alaa Al-Yaman',
      location: 'Amman, Jordan',
      budgetRevenue: Math.round(t.sub * 100) / 100,
      budgetCost: Math.round(t.sub * 0.55 * 100) / 100,
      targetMargin: 45,
      milestones: [
        { id: uid('m'), title: 'Design Approval & Site Measurements', done: true, dueDate: '' },
        { id: uid('m'), title: 'Material Requisition & Cutting', done: false, dueDate: '' },
        { id: uid('m'), title: 'Fabrication & Assembly', done: false, dueDate: '' },
        { id: uid('m'), title: 'On-site Installation & Electrical', done: false, dueDate: '' },
        { id: uid('m'), title: 'Client Inspection & Handover', done: false, dueDate: '' },
      ],
      notes: q.notes || '',
      files: q.filePath ? [{ name: q.file, path: q.filePath }] : [],
    };
    const projects = existingProject ? o.projects : [project, ...(o.projects || [])];

    const inv = { id: uid('inv'), no: `INV-2026-${String(o.invoices.length + 1).padStart(3, '0')}`, orderId: oid, projectId: pid, clientId: q.clientId, customerId: q.customerId || '', date: new Date().toISOString().slice(0, 10), vat: q.vat, vatRate: o.rates.vat, discount: q.discount, items: q.items, payments: [] };
    return {
      orders,
      projects,
      invoices: [inv, ...o.invoices],
      quotes: o.quotes.map((x) => (x.id === qid ? { ...x, converted: true } : x)),
      leads: o.leads.map((l) => (l.id === q.clientId ? { ...l, stage: 'won' } : l)),
    };
  });

  const addProject = (projectData) => {
    const pid = uid('prj');
    const no = `PRJ-2026-${String((s.projects || []).length + 1).padStart(3, '0')}`;
    const newPrj = {
      id: pid,
      no,
      title: projectData.title || 'Untitled Project',
      clientId: projectData.clientId || '',
      customerId: projectData.customerId || '',
      quoteId: projectData.quoteId || '',
      orderId: projectData.orderId || '',
      status: projectData.status || 'planning',
      startDate: projectData.startDate || new Date().toISOString().slice(0, 10),
      targetDate: projectData.targetDate || '',
      manager: projectData.manager || 'Alaa Al-Yaman',
      location: projectData.location || 'Amman, Jordan',
      budgetRevenue: Number(projectData.budgetRevenue || 0),
      budgetCost: Number(projectData.budgetCost || 0),
      targetMargin: Number(projectData.targetMargin || 45),
      milestones: projectData.milestones || [
        { id: uid('m'), title: 'Brief & Measurement', done: false, dueDate: '' },
        { id: uid('m'), title: 'Design Approval', done: false, dueDate: '' },
        { id: uid('m'), title: 'Production / Workshop', done: false, dueDate: '' },
        { id: uid('m'), title: 'Installation & Handover', done: false, dueDate: '' },
      ],
      notes: projectData.notes || '',
      files: projectData.files || [],
    };
    upd((o) => ({ projects: [newPrj, ...(o.projects || [])] }));
    return newPrj;
  };

  const updateProject = (pid, patch) => {
    upd((o) => ({
      projects: (o.projects || []).map((p) => (p.id === pid ? { ...p, ...patch } : p)),
    }));
  };

  const deleteProject = (pid) => {
    upd((o) => ({
      projects: (o.projects || []).filter((p) => p.id !== pid),
    }));
  };

  const addInventoryItem = (item) => {
    const id = uid('inv_item');
    const newItem = {
      id,
      sku: item.sku || `SKU-${Date.now().toString().slice(-6)}`,
      name: item.name || { en: 'New Item', ar: 'مادة جديدة' },
      category: item.category || 'sheets',
      unit: item.unit || 'sheet',
      minStock: Number(item.minStock || 0),
      currentQty: Number(item.currentQty || 0),
      unitCost: Number(item.unitCost || 0),
      sellingPrice: Number(item.sellingPrice || 0),
      location: item.location || '',
      supplierId: item.supplierId || '',
    };
    upd((o) => ({ inventory: [newItem, ...(o.inventory || [])] }));
    return newItem;
  };

  const updateInventoryItem = (id, patch) => {
    upd((o) => ({
      inventory: (o.inventory || []).map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));
  };

  const deleteInventoryItem = (id) => {
    upd((o) => ({
      inventory: (o.inventory || []).filter((i) => i.id !== id),
    }));
  };

  const recordStockMovement = (mov) => {
    const mid = uid('stk');
    const movement = {
      id: mid,
      itemId: mov.itemId,
      type: mov.type || 'consumption', // 'inbound' | 'consumption' | 'adjustment' | 'return'
      qty: Number(mov.qty || 0),
      unitCost: Number(mov.unitCost || 0),
      totalCost: Number(mov.qty || 0) * Number(mov.unitCost || 0),
      date: mov.date || new Date().toISOString().slice(0, 10),
      projectId: mov.projectId || '',
      purchaseId: mov.purchaseId || '',
      note: mov.note || '',
      createdBy: mov.createdBy || 'Staff',
    };

    upd((o) => {
      const targetItem = (o.inventory || []).find((i) => i.id === mov.itemId);
      if (!targetItem) return { stock_movements: [movement, ...(o.stock_movements || [])] };

      let newQty = targetItem.currentQty;
      if (movement.type === 'inbound' || movement.type === 'return') {
        newQty += movement.qty;
      } else if (movement.type === 'consumption') {
        newQty = Math.max(0, newQty - movement.qty);
      } else if (movement.type === 'adjustment') {
        newQty = movement.qty;
      }

      const updatedInventory = (o.inventory || []).map((i) =>
        i.id === mov.itemId ? { ...i, currentQty: newQty } : i
      );

      return {
        inventory: updatedInventory,
        stock_movements: [movement, ...(o.stock_movements || [])],
      };
    });
    return movement;
  };

  return (
    <Ctx.Provider
      value={{
        ...s,
        canDo: (mod, act) => (mod === 'dash' ? act === 'view' : can(s.me, mod, act)),
        upd,
        T,
        tx,
        money,
        submitQuote,
        sendForm,
        addLead,
        addLeadLocal,
        convertQuote,
        addProject,
        updateProject,
        deleteProject,
        addInventoryItem,
        updateInventoryItem,
        deleteInventoryItem,
        recordStockMovement,
        resetAll,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
