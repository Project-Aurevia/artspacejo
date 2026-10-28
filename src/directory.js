/**
 * Customers, suppliers and money sources — pure helpers.
 *
 * Both customers and suppliers are **companies**; each one carries a `contact`
 * block (the person we actually talk to). The same normalisation is used by the
 * forms, the duplicate guard and the CSV export, so "same phone" means the same
 * thing everywhere.
 *
 * No React, no side effects.
 */

/** Same shape as the store's `uid()` but local, so this module stays React-free. */
const token = (p) => `${p}_${Math.random().toString(36).slice(2, 8)}`;

/* Products of the business. Kept here (not in settings) because partners are
   accounting facts, not website content — and /api/settings is public. */
export const PARTNERS = [
  { id: 'murad', name: { en: 'Murad Al Araj', ar: 'مراد العراج' } },
  { id: 'malek', name: { en: 'Malek Al Dabbas', ar: 'مالك الدباس' } },
  { id: 'alaa', name: { en: 'Alaa Alyaman', ar: 'علاء اليمان' } },
];

/** Where the money came from. `cash` is the daily pocket-money box only. */
export const PAY_SOURCES = [
  { id: 'cash', en: 'Pocket money', ar: 'نقد المصروف', short: 'cash' },
  { id: 'company', en: 'Company account', ar: 'حساب الشركة', short: 'bank' },
  ...PARTNERS.map((p) => ({ id: `partner:${p.id}`, en: p.name.en, ar: p.name.ar, short: 'partner' })),
];

/** Supplier bills are never paid from the small cash box — only company or partner money. */
export const payerOptions = (kind = 'expense') => (kind === 'bill' ? PAY_SOURCES.filter((p) => p.id !== 'cash') : PAY_SOURCES);

export const payerOf = (id) => PAY_SOURCES.find((p) => p.id === (id || 'cash')) || PAY_SOURCES[0];
export const isPartner = (id) => String(id || '').startsWith('partner:');
export const isCash = (id) => (id || 'cash') === 'cash';
export const partnerId = (id) => String(id || '').split(':')[1] || '';

export const DIR_KINDS = {
  customer: { en: 'Customer', ar: 'العميل', pluralEn: 'Customers', pluralAr: 'العملاء' },
  supplier: { en: 'Supplier', ar: 'المورد', pluralEn: 'Suppliers', pluralAr: 'الموردون' },
};

export const kindKey = (kind) => (kind === 'supplier' ? 'suppliers' : 'customers');

export const blankEntity = (kind = 'customer', id = '') => ({
  id,
  name: '',
  tax: '',
  address: '',
  notes: '',
  phone: '',
  email: '',
  contact: { name: '', role: '', phone: '', email: '' },
  created: new Date().toISOString().slice(0, 10),
});

export const sortEntities = (list = []) => [...list].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'en'));

/** Free-text match over the company name, tax number, e-mail and every phone on the record. */
export const matchesQuery = (e, q) => {
  const needle = String(q || '').trim().toLowerCase();
  if (!needle) return true;
  const digits = needle.replace(/\D/g, '');
  const hay = [e?.name, e?.tax, e?.phone, e?.email, e?.contact?.name, e?.contact?.role, e?.contact?.phone, e?.contact?.email]
    .map((x) => String(x || '').toLowerCase());
  if (hay.some((x) => x.includes(needle))) return true;
  return digits.length >= 3 && entityPhones(e).some((p) => p.includes(digits));
};

/** A CRM lead is the old customer record — turn it into a directory company without losing the link. */
export const customerFromLead = (lead = {}) => {
  const company = String(lead.company || '').trim();
  const person = String(lead.name || '').trim();
  return {
    id: newEntityId('customer'),
    leadId: lead.id || '',
    name: company || person,
    tax: lead.tax || '',
    address: '',
    notes: lead.notes || '',
    phone: lead.phone || '',
    email: lead.email || '',
    contact: { name: company ? person : '', role: '', phone: lead.phone || '', email: lead.email || '' },
    created: lead.date || new Date().toISOString().slice(0, 10),
  };
};

/* ---------------- duplicate guard ---------------- */

/** Keep only digits and compare the last 9 — `+962 79 000 0000` === `079 000 0000`. */
export const normPhone = (s) => {
  const d = String(s || '').replace(/\D/g, '');
  return d.length > 9 ? d.slice(-9) : d;
};

export const normEmail = (s) => String(s || '').trim().toLowerCase();

/** Every phone on the record (company + contact point), ready to compare. */
export const entityPhones = (e) => [e?.phone, e?.contact?.phone].map(normPhone).filter((x) => x.length >= 7);

export const entityEmails = (e) => [e?.email, e?.contact?.email].map(normEmail).filter((x) => x.includes('@'));

/**
 * Records that share a phone or an e-mail with `draft`.
 * Returns `[{ entity, kind, by: 'phone'|'email', value }]` — newest-first is
 * irrelevant here, the caller renders them as a warning.
 */
export function findDuplicates(draft = {}, lists = {}) {
  const phones = new Set(entityPhones(draft));
  const emails = new Set(entityEmails(draft));
  if (!phones.size && !emails.size) return [];
  const out = [];
  [['customer', lists.customers || []], ['supplier', lists.suppliers || []]].forEach(([kind, list]) => {
    list.forEach((e) => {
      if (!e || e.id === draft.id) return;
      const phone = entityPhones(e).find((x) => phones.has(x));
      const email = entityEmails(e).find((x) => emails.has(x));
      if (!phone && !email) return;
      out.push({ entity: e, kind, by: phone ? 'phone' : 'email', value: phone || email });
    });
  });
  return out;
}

/** Same company name (case/space-insensitive) — a softer hint than a phone match. */
export const sameName = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

/* ---------------- documents → client ---------------- */

/**
 * The block printed under "BILL TO". Prefers the customer directory; falls back
 * to the CRM lead so every document saved before this module still prints.
 */
export function clientOf(doc, customers = [], leads = []) {
  const c = (customers || []).find((x) => x && x.id === doc?.customerId);
  if (c) {
    const person = String(c.contact?.name || '').trim();
    return {
      id: c.id,
      customerId: c.id,
      name: person || c.name || '',
      company: person ? c.name || '' : '',
      phone: c.contact?.phone || c.phone || '',
      email: c.contact?.email || c.email || '',
      tax: c.tax || '',
      address: c.address || '',
      contact: c.contact || {},
    };
  }
  return (leads || []).find((l) => l && l.id === doc?.clientId) || null;
}

/** Stable id for a new directory record (kept here so forms don't import the store). */
export const newEntityId = (kind = 'customer') => token(kind === 'supplier' ? 'sup' : 'cus');
