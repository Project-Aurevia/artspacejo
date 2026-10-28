import React, { useState, useRef, useEffect } from 'react';
import { Building2, Upload, Palette, Phone, PenLine, RotateCcw, FileText } from 'lucide-react';
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

/** Setting group: icon, title, one-line explanation, hairline above the fields. */
function Panel({ icon: Icon, title, sub, action, children }) {
  return (
    <section className="glass p-5">
      <div className="panel-head mb-4 flex items-start gap-3 pb-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-line/10 bg-surface-2/70 text-gold"><Icon size={15} /></span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-bold leading-tight tracking-tight">{title}</h3>
          {sub && <p className="mt-1 text-[11px] leading-relaxed text-subtle">{sub}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold tracking-tight">{T('Company & document identity', 'هوية الشركة والمستندات')}</h2>
          <p className="mt-1 text-[11px] leading-relaxed text-subtle">{T('Everything here is printed on every quotation and invoice. Changes save instantly.', 'كل ما هنا يُطبع على كل عرض سعر وفاتورة. التعديلات تُحفظ فوراً.')}</p>
        </div>
        <button
          type="button" className="btn-ghost btn-sm ms-auto"
          onClick={() => confirm(T('Reset company settings to defaults?', 'إعادة إعدادات الشركة للافتراضي؟')) && upd({ company: DEFAULT_COMPANY })}
        ><RotateCcw size={13} />{T('Reset to defaults', 'إعادة للافتراضي')}</button>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-4">
          <Panel
            icon={Palette} title={T('Document style', 'نمط المستند')}
            sub={T('Style and colour apply to every quotation and invoice. The preview updates live.', 'النمط واللون يُطبقان على كل عروض الأسعار والفواتير. المعاينة تتحدث مباشرة.')}
          >
            <StylePicker />
          </Panel>

          <Panel
            icon={Building2} title={T('Header — logo & company name', 'الترويسة — الشعار واسم الشركة')}
            sub={T('Printed at the top of the page, above the client block.', 'تُطبع أعلى الصفحة فوق بيانات العميل.')}
          >
            <div className="flex flex-wrap items-center gap-4">
              <ImgPick fit="contain" value={company.logo} on={(logo) => set({ logo })} label={T('Upload logo', 'رفع الشعار')} />
              <p className="max-w-xs text-[11px] leading-relaxed text-subtle">{T('Leave empty to use the default Art Space mark. PNG/SVG with transparent background works best.', 'اتركه فارغاً لاستخدام شعار مساحة الفن الافتراضي. يفضل PNG/SVG بخلفية شفافة.')}</p>
            </div>
            <Pair label={T('Company name', 'اسم الشركة')} v={company.name} on={(name) => set({ name })} />
            <Pair label={T('Tagline (under the name)', 'الشعار النصي (تحت الاسم)')} v={company.tagline} on={(tagline) => set({ tagline })} />
            <Field label={T('Tax / VAT registration number', 'الرقم الضريبي')} v={company.taxNo} on={(taxNo) => set({ taxNo })} dir="ltr" />
          </Panel>

          <Panel icon={Phone} title={T('Footer — contact details', 'التذييل — بيانات التواصل')} sub={T('Shown at the bottom of every document.', 'تظهر أسفل كل مستند.')}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={T('Mobile / phone', 'الموبايل / الهاتف')} v={company.phone} on={(phone) => set({ phone })} dir="ltr" />
              <Field label={T('Email', 'البريد الإلكتروني')} v={company.email} on={(email) => set({ email })} dir="ltr" />
              <Field label={T('Website', 'الموقع')} v={company.website} on={(website) => set({ website })} dir="ltr" />
            </div>
            <Pair label={T('Address', 'العنوان')} v={company.address} on={(address) => set({ address })} />
            <Pair label={T('Footer message', 'رسالة التذييل')} v={company.footerNote} on={(footerNote) => set({ footerNote })} />
          </Panel>

          <Panel icon={PenLine} title={T('Terms & signature', 'الشروط والتوقيع')} sub={T('Default terms appear on quotations unless a quote sets its own.', 'تظهر الشروط الافتراضية في العروض ما لم يُحدد العرض شروطاً خاصة.')}>
            <Pair area label={T('Default terms & conditions (one per line)', 'الشروط والأحكام الافتراضية (سطر لكل بند)')} v={company.terms} on={(terms) => set({ terms })} />
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" className="accent-[#C9A45C]" checked={company.showSignature !== false} onChange={(e) => set({ showSignature: e.target.checked })} />
              {T('Show signature block', 'إظهار خانة التوقيع')}
            </label>
          </Panel>
        </div>

        <aside className="space-y-3 xl:sticky xl:top-24">
          <div className="glass overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-line/10 px-3 py-2.5">
              <div className="seg">
                {[['quote', T('Quotation', 'عرض سعر')], ['invoice', T('Invoice', 'فاتورة')]].map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setKind(k)} data-active={kind === k} className="seg-tab"><FileText size={12} />{l}</button>
                ))}
              </div>
              <div className="seg ms-auto">
                {[['en', 'EN'], ['ar', 'عربي']].map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setDl(k)} data-active={dl === k} className="seg-tab">{l}</button>
                ))}
              </div>
            </div>
            <div ref={boxRef} dir="ltr" className="flex justify-center overflow-hidden bg-zinc-200 p-3 dark:bg-zinc-800">
              <div style={{ width: 794 * scale, height: 1122 * scale, position: 'relative', flex: 'none' }}>
                <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 794, position: 'absolute', top: 0, left: 0 }}>
                  <Doc id="settings-preview" kind={kind} dl={dl} client={SAMPLE_CLIENT} doc={kind === 'invoice' ? { ...SAMPLE_DOC, no: 'INV-2026-001', payments: [{ id: 'p', label: 'Down payment', amount: 200, date: '2026-10-23' }] } : SAMPLE_DOC} />
                </div>
              </div>
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-[11px] leading-relaxed text-subtle"><Upload size={11} className="shrink-0" />{T('Sample data shown. Real documents use your quotes and invoices.', 'بيانات تجريبية للمعاينة. المستندات الفعلية تستخدم عروضك وفواتيرك.')}</p>
        </aside>
      </div>
    </div>
  );
}

export { PALETTE };
