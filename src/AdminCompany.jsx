import React, { useState, useRef, useEffect } from 'react';
import { Building2, Upload } from 'lucide-react';
import { useApp, DEFAULT_COMPANY } from './store.jsx';
import { Doc, StylePicker, PALETTE } from './Documents.jsx';
import { Pair, ImgPick } from './AdminContent.jsx';
import { Field } from './ui.jsx';

const SAMPLE_CLIENT = { name: 'Omar Haddad', company: 'Levant Coffee Roasters', phone: '+962 79 555 1201', email: 'omar@levantcoffee.jo', tax: '10234567' };
const SAMPLE_DOC = {
  no: 'Q-2026-001', date: '2026-10-23', discount: 100, vat: true, validDays: 14,
  intro: '',
  items: [
    { id: 's1', label: { en: 'Alucobond Facade + 3D Acrylic Illuminated Letters', ar: 'ألكوبوند + حروف أكريليك مضيئة' }, detail: '7.2 m²', qty: 7.2, unit: 65, price: 468 },
    { id: 's2', label: { en: 'Installation & Delivery', ar: 'تركيب وتوصيل' }, detail: '', qty: 1, unit: 43.2, price: 43.2 },
    { id: 's3', label: { en: 'Business Cards — Spot UV', ar: 'كروت أعمال — سبوت UV' }, detail: '1000 pcs', qty: 1000, unit: 0.05, price: 50 },
  ],
};

export default function CompanySettings() {
  const { T, lang, company, upd } = useApp();
  const [dl, setDl] = useState(lang);
  const [kind, setKind] = useState('quote');
  const set = (p) => upd({ company: { ...company, ...p } });
  const boxRef = useRef(null);
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const fit = () => setScale(Math.max(0.3, Math.min(1, (el.clientWidth - 24) / 794)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="grid 2xl:grid-cols-[minmax(0,1fr)_460px] gap-6 items-start">
      <div className="space-y-5 min-w-0">
        <div className="glass p-5 space-y-4">
          <h3 className="font-bold text-gold flex items-center gap-2"><Building2 size={18} />{T('Quotation & Invoice Look', 'شكل عرض السعر والفاتورة')}</h3>
          <StylePicker />
          <p className="text-xs opacity-60">{T('Style and colour apply to every quotation and invoice. The preview updates live.', 'النمط واللون يُطبقان على كل عروض الأسعار والفواتير. المعاينة تتحدث مباشرة.')}</p>
        </div>

        <div className="glass p-5 space-y-4">
          <h3 className="font-bold text-gold">{T('Header — logo & company name', 'الترويسة — الشعار واسم الشركة')}</h3>
          <div className="flex items-center gap-4 flex-wrap">
            <ImgPick fit="contain" value={company.logo} on={(logo) => set({ logo })} label={T('Upload logo', 'رفع الشعار')} />
            <p className="text-xs opacity-60 max-w-xs">{T('Leave empty to use the default Art Space mark. PNG/SVG with transparent background works best.', 'اتركه فارغاً لاستخدام شعار مساحة الفن الافتراضي. يفضل PNG/SVG بخلفية شفافة.')}</p>
          </div>
          <Pair label={T('Company name', 'اسم الشركة')} v={company.name} on={(name) => set({ name })} />
          <Pair label={T('Tagline (under the name)', 'الشعار النصي (تحت الاسم)')} v={company.tagline} on={(tagline) => set({ tagline })} />
          <Field label={T('Tax / VAT registration number', 'الرقم الضريبي')} v={company.taxNo} on={(taxNo) => set({ taxNo })} dir="ltr" />
        </div>

        <div className="glass p-5 space-y-4">
          <h3 className="font-bold text-gold">{T('Footer — contact details', 'التذييل — بيانات التواصل')}</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label={T('Mobile / phone', 'الموبايل / الهاتف')} v={company.phone} on={(phone) => set({ phone })} dir="ltr" />
            <Field label={T('Email', 'البريد الإلكتروني')} v={company.email} on={(email) => set({ email })} dir="ltr" />
            <Field label={T('Website', 'الموقع')} v={company.website} on={(website) => set({ website })} dir="ltr" />
          </div>
          <Pair label={T('Address', 'العنوان')} v={company.address} on={(address) => set({ address })} />
          <Pair label={T('Footer message', 'رسالة التذييل')} v={company.footerNote} on={(footerNote) => set({ footerNote })} />
        </div>

        <div className="glass p-5 space-y-4">
          <h3 className="font-bold text-gold">{T('Terms & signature', 'الشروط والتوقيع')}</h3>
          <Pair area label={T('Default terms & conditions (one per line)', 'الشروط والأحكام الافتراضية (سطر لكل بند)')} v={company.terms} on={(terms) => set({ terms })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#C9A45C]" checked={company.showSignature !== false} onChange={(e) => set({ showSignature: e.target.checked })} />{T('Show signature block', 'إظهار خانة التوقيع')}</label>
          <button type="button" className="btn-ghost text-xs" onClick={() => confirm(T('Reset company settings to defaults?', 'إعادة إعدادات الشركة للافتراضي؟')) && upd({ company: DEFAULT_COMPANY })}>{T('Reset to defaults', 'إعادة للافتراضي')}</button>
        </div>
      </div>

      <div className="2xl:sticky 2xl:top-6">
        <div className="flex gap-2 mb-3 flex-wrap items-center">
          {[['quote', T('Quotation', 'عرض سعر')], ['invoice', T('Invoice', 'فاتورة')]].map(([k, l]) => <button key={k} type="button" onClick={() => setKind(k)} className={`btn !py-1.5 ${kind === k ? 'bg-gold text-ink' : 'btn-ghost'}`}>{l}</button>)}
          <span className="mx-1 opacity-30">|</span>
          {[['en', 'EN'], ['ar', 'عربي']].map(([k, l]) => <button key={k} type="button" onClick={() => setDl(k)} className={`btn !py-1.5 ${dl === k ? 'bg-gold text-ink' : 'btn-ghost'}`}>{l}</button>)}
        </div>
        <div ref={boxRef} dir="ltr" className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden bg-zinc-200 dark:bg-zinc-800 p-3 flex justify-center">
          <div style={{ width: 794 * scale, height: 1122 * scale, position: 'relative', flex: 'none' }}>
            <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 794, position: 'absolute', top: 0, left: 0 }}>
              <Doc id="settings-preview" kind={kind} dl={dl} client={SAMPLE_CLIENT} doc={kind === 'invoice' ? { ...SAMPLE_DOC, no: 'INV-2026-001', payments: [{ id: 'p', label: 'Down payment', amount: 200, date: '2026-10-23' }] } : SAMPLE_DOC} />
            </div>
          </div>
        </div>
        <p className="text-[11px] opacity-50 mt-2 flex items-center gap-1"><Upload size={11} />{T('Sample data shown. Real documents use your quotes and invoices.', 'بيانات تجريبية للمعاينة. المستندات الفعلية تستخدم عروضك وفواتيرك.')}</p>
      </div>
    </div>
  );
}

export { PALETTE };
