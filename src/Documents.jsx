import React from 'react';
import { Phone, Mail, Globe, MapPin } from 'lucide-react';
import { Mark } from './Logo.jsx';
import { useApp, totals } from './store.jsx';

/** Brand-derived document colour themes. `none` = monochrome outline, no fills. */
export const PALETTE = {
  gold: { fill: '#C9A45C', on: '#161616', text: '#A88438', soft: '#F6EDD9', label: ['Gold', 'ذهبي'] },
  terra: { fill: '#CB6B47', on: '#FFFFFF', text: '#B0522F', soft: '#F9E4DB', label: ['Terracotta', 'تيراكوتا'] },
  ink: { fill: '#161616', on: '#F0E4D6', text: '#161616', soft: '#EFEDEA', label: ['Ink', 'فحمي'] },
  cream: { fill: '#F0E4D6', on: '#161616', text: '#A88438', soft: '#FAF6F1', label: ['Cream', 'كريمي'] },
  black: { fill: '#000000', on: '#FFFFFF', text: '#000000', soft: '#F1F1F1', label: ['Black', 'أسود'] },
  none: { fill: 'transparent', on: '#161616', text: '#161616', soft: '#FFFFFF', label: ['None', 'بدون لون'] },
};
export const STYLES = [['compact', 'Compact', 'مضغوط'], ['bubbles', 'Bubbles', 'فقاعات'], ['waves', 'Waves', 'أمواج']];

const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);
const addDays = (d, n) => {
  const x = new Date(d);
  if (isNaN(x)) return '';
  x.setDate(x.getDate() + Number(n || 0));
  return x.toISOString().slice(0, 10);
};

/** Printable A4 document (quotation or tax invoice) driven by the Company settings. */
export function Doc({ kind, doc, client, dl: dlProp, id = 'print-area', company: companyProp }) {
  const app = useApp();
  const c = companyProp || app.company;
  const dl = dlProp || app.lang;
  const ar = dl === 'ar';
  const L = (en, a) => (ar ? a : en);
  const x = (v) => (v && typeof v === 'object' ? v[dl] || v.en || '' : v || '');
  const money = (n) => `${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${ar ? 'د.أ' : 'JOD'}`;

  const P = PALETTE[c.color] || PALETTE.gold;
  const none = c.color === 'none';
  const ac = none ? '#161616' : P.fill; // accent line colour
  const st = ['compact', 'bubbles', 'waves'].includes(c.style) ? c.style : 'compact';
  const end = ar ? 'left' : 'right';
  const ta = { textAlign: end };
  const isInv = kind === 'invoice';
  const t = totals(doc, app.rates.vat);
  const paid = (doc.payments || []).reduce((s, p) => s + Number(p.amount), 0);
  const GRID = '28px 1fr 46px 88px 98px';

  /* ----- logo + brand ----- */
  const variant = st !== 'waves' || none ? 'print' : ['ink', 'black'].includes(c.color) ? 'color' : c.color === 'terra' ? 'mono-light' : 'mono-dark';
  const logo = c.logo
    ? <img src={c.logo} alt="" crossOrigin="anonymous" style={{ height: 52, maxWidth: 170, objectFit: 'contain' }} />
    : <Mark className="h-14" variant={variant} />;
  const brand = (color) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {logo}
      <div style={{ color }}>
        <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 22, fontWeight: 600, lineHeight: 1.1 }}>
          {c.name?.en}{c.name?.en && c.name?.ar && <span style={{ opacity: 0.5 }}> | </span>}
          {c.name?.ar && <span style={{ fontFamily: 'Cairo, sans-serif', fontSize: 17 }}>{c.name.ar}</span>}
        </div>
        {x(c.tagline) && <div style={{ fontSize: 9.5, opacity: 0.7, marginTop: 3 }}>{x(c.tagline)}</div>}
      </div>
    </div>
  );
  const title = isInv ? L('TAX INVOICE', 'فاتورة ضريبية') : L('QUOTATION', 'عرض سعر');

  /* ----- footer contact row ----- */
  const contacts = [[Phone, c.phone, true], [Mail, c.email, true], [Globe, c.website, true], [MapPin, x(c.address), false]].filter(([, v]) => v);
  const contactRow = (color) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px 18px', fontSize: 10, color }}>
      {contacts.map(([I, v, ltr], i) => <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><I size={11} /><span dir={ltr ? 'ltr' : undefined}>{v}</span></span>)}
    </div>
  );
  const note = (color) => x(c.footerNote) && <div style={{ fontSize: 10.5, fontWeight: 600, marginBottom: 4, color, textAlign: 'center' }}>{x(c.footerNote)}</div>;

  /* ----- per-style pieces ----- */
  const K = {
    compact: {
      card: { border: `1px solid ${none ? '#161616' : '#dddddd'}`, borderRadius: 4, padding: '10px 12px' },
      head: { background: P.fill, color: P.on, padding: '7px 10px', borderBottom: none ? '1.5px solid #161616' : 'none' },
      row: { padding: '7px 10px', borderBottom: '1px solid #e8e8e8' },
      total: { borderTop: `2px solid ${ac}`, padding: '8px 10px' },
    },
    bubbles: {
      card: { background: none ? '#fff' : P.soft, border: none ? '1.5px solid #bbbbbb' : 'none', borderRadius: 18, padding: '14px 18px' },
      head: { background: P.fill, color: P.on, borderRadius: 999, padding: '8px 18px', border: none ? '1.5px solid #161616' : 'none' },
      row: { background: none ? '#fff' : P.soft, border: none ? '1px solid #dddddd' : 'none', borderRadius: 14, padding: '9px 18px', marginTop: 6 },
      total: { background: P.fill, color: P.on, borderRadius: 999, padding: '10px 20px', border: none ? '1.5px solid #161616' : 'none' },
    },
    waves: {
      card: { border: `1.5px solid ${ac}`, borderRadius: 10, padding: '12px 16px' },
      head: { background: P.fill, color: P.on, borderRadius: 8, padding: '8px 12px', border: none ? '1.5px solid #161616' : 'none' },
      row: { padding: '8px 12px', borderBottom: `1px dashed ${none ? '#999999' : ac}` },
      total: { background: P.fill, color: P.on, borderRadius: 10, padding: '10px 16px', border: none ? '1.5px solid #161616' : 'none' },
    },
  }[st];

  const circle = (extra, solid = true) => (
    <div style={{ position: 'absolute', borderRadius: '50%', ...(none ? { border: '1.5px solid #aaaaaa' } : { background: solid ? P.fill : P.soft }), ...extra }} />
  );

  let header;
  if (st === 'compact') {
    header = (
      <div style={{ padding: '30px 40px 14px', borderBottom: `2px solid ${ac}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {brand('#161616')}
        <div style={{ ...ta, color: P.text }}><div style={{ fontSize: 20, fontWeight: 800 }}>{title}</div><div style={{ fontSize: 12, fontWeight: 600 }}>{doc.no}</div></div>
      </div>
    );
  } else if (st === 'bubbles') {
    header = (
      <div style={{ position: 'relative', padding: '34px 40px 14px', overflow: 'hidden' }}>
        {circle({ top: -80, [end]: -60, width: 200, height: 200 })}
        {circle({ top: 58, [end]: 118, width: 56, height: 56 }, false)}
        {circle({ top: 18, [end]: 160, width: 20, height: 20, opacity: 0.6 })}
        <div style={{ position: 'relative' }}>{brand('#161616')}</div>
        <div style={{ position: 'relative', display: 'flex', gap: 8, alignItems: 'center', marginTop: 18 }}>
          <span style={{ background: P.fill, color: P.on, borderRadius: 999, padding: '6px 18px', fontSize: 16, fontWeight: 800, border: none ? '1.5px solid #161616' : 'none' }}>{title}</span>
          <span style={{ background: none ? '#fff' : P.soft, border: none ? '1.5px solid #161616' : 'none', borderRadius: 999, padding: '6px 14px', fontSize: 12, fontWeight: 700 }}>{doc.no}</span>
        </div>
      </div>
    );
  } else {
    header = (
      <div style={{ position: 'relative', background: P.fill, color: P.on, padding: '32px 40px 74px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {brand(P.on)}
          <div style={{ ...ta, color: P.on }}><div style={{ fontSize: 24, fontWeight: 800 }}>{title}</div><div style={{ fontSize: 12, fontWeight: 600 }}>{doc.no}</div></div>
        </div>
        <svg viewBox="0 0 794 60" preserveAspectRatio="none" style={{ position: 'absolute', bottom: -1, left: 0, width: '100%', height: 58, display: 'block' }}>
          {none
            ? <path d="M0,30 C130,66 260,0 400,32 C540,62 660,8 794,34" fill="none" stroke="#161616" strokeWidth="1.5" />
            : <><path d="M0,18 C150,56 280,-6 420,20 C560,46 680,0 794,22 L794,60 L0,60 Z" fill="#ffffff" opacity="0.38" /><path d="M0,30 C130,66 260,0 400,32 C540,62 660,8 794,34 L794,60 L0,60 Z" fill="#ffffff" /></>}
        </svg>
      </div>
    );
  }

  let footer;
  if (st === 'compact') {
    footer = <div style={{ marginTop: 'auto', padding: '10px 40px 18px', borderTop: '1px solid #dddddd' }}>{note('#161616')}{contactRow('#555555')}</div>;
  } else if (st === 'bubbles') {
    footer = (
      <div style={{ marginTop: 'auto', position: 'relative', padding: '0 40px 26px' }}>
        <div style={{ background: P.fill, color: P.on, border: none ? '1.5px solid #161616' : 'none', borderRadius: 999, padding: '12px 26px', position: 'relative' }}>{note(P.on)}{contactRow(P.on)}</div>
      </div>
    );
  } else {
    footer = (
      <div style={{ marginTop: 'auto', position: 'relative' }}>
        <svg viewBox="0 0 794 50" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 46 }}>
          {none
            ? <path d="M0,26 C140,-4 270,52 410,24 C550,-2 670,46 794,20" fill="none" stroke="#161616" strokeWidth="1.5" />
            : <><path d="M0,16 C140,-14 270,42 410,14 C550,-12 670,36 794,10 L794,50 L0,50 Z" fill={P.fill} opacity="0.38" /><path d="M0,26 C140,-4 270,52 410,24 C550,-2 670,46 794,20 L794,50 L0,50 Z" fill={P.fill} /></>}
        </svg>
        <div style={{ background: none ? '#fff' : P.fill, color: P.on, padding: '2px 40px 20px' }}>{note(P.on)}{contactRow(P.on)}</div>
      </div>
    );
  }

  /* ----- body ----- */
  const label = { fontSize: 9.5, fontWeight: 800, letterSpacing: ar ? 0 : 1, color: P.text, marginBottom: 4 };
  const terms = lines((doc.terms && String(doc.terms[dl] || '').trim()) ? doc.terms[dl] : c.terms?.[dl]);
  const validUntil = !isInv ? addDays(doc.date, doc.validDays ?? 14) : '';

  const body = (
    <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div style={K.card}>
          <div style={label}>{L('BILL TO', 'فاتورة إلى')}</div>
          <b>{client?.name}</b>{client?.company && <div>{client.company}</div>}
          {client?.phone && <div dir="ltr" style={{ textAlign: ar ? 'right' : 'left' }}>{client.phone}</div>}
          {client?.email && <div dir="ltr" style={{ textAlign: ar ? 'right' : 'left' }}>{client.email}</div>}
          {client?.tax && <div>{L('Tax No.', 'الرقم الضريبي')}: {client.tax}</div>}
        </div>
        <div style={K.card}>
          <div style={label}>{L('DETAILS', 'التفاصيل')}</div>
          <div>{L('Date', 'التاريخ')}: <b>{doc.date}</b></div>
          {validUntil && <div>{L('Valid until', 'صالح حتى')}: <b>{validUntil}</b></div>}
          {c.taxNo && <div>{L('Our Tax No.', 'رقمنا الضريبي')}: <b>{c.taxNo}</b></div>}
        </div>
      </div>

      {x(doc.intro) && <p style={{ margin: '0 0 12px', whiteSpace: 'pre-line' }}>{x(doc.intro)}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 8, fontSize: 10.5, fontWeight: 700, ...K.head }}>
        <span>#</span><span>{L('Description', 'الوصف')}</span><span style={{ textAlign: 'center' }}>{L('Qty', 'الكمية')}</span><span style={ta}>{L('Unit', 'السعر')}</span><span style={ta}>{L('Amount', 'المبلغ')}</span>
      </div>
      {doc.items.map((i, n) => {
        const qty = i.qty ?? 1;
        const unit = i.unit ?? (qty ? i.price / qty : i.price);
        return (
          <div key={i.id} className="avoid" style={{ display: 'grid', gridTemplateColumns: GRID, gap: 8, alignItems: 'center', ...K.row }}>
            <span>{n + 1}</span>
            <div><b>{x(i.label)}</b>{i.detail && <div style={{ fontSize: 10, opacity: 0.65 }}>{i.detail}</div>}</div>
            <span style={{ textAlign: 'center' }}>{Number(qty.toFixed ? qty.toFixed(2) : qty)}</span>
            <span style={ta}>{money(unit)}</span>
            <b style={ta}>{money(i.price)}</b>
          </div>
        );
      })}

      <div className="avoid" style={{ width: 300, marginTop: 14, [ar ? 'marginRight' : 'marginLeft']: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 10px' }}><span>{L('Subtotal', 'المجموع')}</span><span>{money(t.sub)}</span></div>
        {doc.discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 10px', color: '#B0522F' }}><span>{L('Discount', 'الخصم')}</span><span>-{money(doc.discount)}</span></div>}
        {doc.vat && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 10px' }}><span>{L('VAT', 'ضريبة')} {doc.vatRate ?? app.rates.vat}%</span><span>{money(t.vat)}</span></div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 14, marginTop: 6, ...K.total }}><span>{L('Total', 'الإجمالي')}</span><span>{money(t.total)}</span></div>
        {isInv && <>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 10px 0', color: '#1a7f4b' }}><span>{L('Paid', 'المدفوع')}</span><span>{money(paid)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 10px', fontWeight: 800, color: '#B0522F' }}><span>{L('Balance Due', 'المتبقي')}</span><span>{money(t.total - paid)}</span></div>
        </>}
      </div>

      {isInv && (doc.payments || []).length > 0 && (
        <div style={{ marginTop: 12, fontSize: 10.5 }}><b>{L('Payments', 'الدفعات')}</b>{doc.payments.map((p) => <div key={p.id}>{p.date} — {p.label}: {money(p.amount)}</div>)}</div>
      )}

      {terms.length > 0 && (
        <div className="avoid" style={{ marginTop: 18, fontSize: 10, opacity: 0.8 }}>
          <b style={{ color: P.text, fontSize: 10.5 }}>{L('Terms & Conditions', 'الشروط والأحكام')}</b>
          {terms.map((tl, i) => <div key={i} style={{ marginTop: 2 }}>• {tl}</div>)}
        </div>
      )}

      {c.showSignature !== false && (
        <div className="avoid" style={{ display: 'flex', gap: 60, marginTop: 38, fontSize: 10 }}>
          <div style={{ flex: 1, borderTop: '1px solid #161616', paddingTop: 4 }}>{L('Authorized Signature', 'توقيع مفوض')} — {c.name?.[dl] || c.name?.en}</div>
          <div style={{ flex: 1, borderTop: '1px solid #161616', paddingTop: 4 }}>{L('Client Signature & Stamp', 'توقيع العميل والختم')}</div>
        </div>
      )}
    </div>
  );

  return (
    <div id={id} dir={ar ? 'rtl' : 'ltr'} style={{ width: 794, minHeight: 1122, background: '#ffffff', color: '#161616', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', fontFamily: ar ? 'Cairo, sans-serif' : '"Plus Jakarta Sans", sans-serif' }}>
      {header}
      <div style={{ padding: '18px 40px 24px', flex: 1 }}>{body}</div>
      {footer}
    </div>
  );
}

/** Render an element to an A4 PDF. Returns base64 when `asBase64`, otherwise triggers a download. */
export async function renderPdf(el, filename, asBase64 = false) {
  const mod = await import('html2pdf.js');
  const html2pdf = mod.default || mod;
  const job = html2pdf().set({
    margin: 0,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'], avoid: ['.avoid'] },
  }).from(el);
  if (asBase64) {
    const uri = await job.outputPdf('datauristring');
    return String(uri).split(',')[1];
  }
  await job.save();
  return '';
}

/** Style (Compact / Bubbles / Waves) + colour chooser — edits the shared company settings. */
export function StylePicker() {
  const { lang, company, upd } = useApp();
  const set = (p) => upd({ company: { ...company, ...p } });
  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {STYLES.map(([k, en, ar]) => <button type="button" key={k} onClick={() => set({ style: k })} className={`btn !py-1.5 ${company.style === k ? 'bg-gold text-ink' : 'btn-ghost'}`}>{lang === 'ar' ? ar : en}</button>)}
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        {Object.entries(PALETTE).map(([k, p]) => (
          <button type="button" key={k} title={lang === 'ar' ? p.label[1] : p.label[0]} onClick={() => set({ color: k })}
            className={`w-8 h-8 rounded-full border-2 transition ${company.color === k ? 'ring-2 ring-gold scale-110' : ''}`}
            style={{ background: k === 'none' ? 'repeating-linear-gradient(45deg,#fff,#fff 4px,#ddd 4px,#ddd 8px)' : p.fill, borderColor: ['cream', 'none'].includes(k) ? '#bbbbbb' : 'transparent' }} />
        ))}
        <span className="text-xs opacity-60">{(PALETTE[company.color] || PALETTE.gold).label[lang === 'ar' ? 1 : 0]}</span>
      </div>
    </div>
  );
}
