import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useApp } from './store.jsx';
import { signedUrl } from './supabase.js';

export const stageName = (list, id, lang) => { const s = list.find((x) => x[0] === id); return s ? s[lang === 'ar' ? 2 : 1] : id; };
export const COLORS = { new: 'bg-sky-500/20 text-sky-400', contacted: 'bg-violet-500/20 text-violet-400', measure: 'bg-amber-500/20 text-amber-500', sent: 'bg-gold/25 text-gold', negotiation: 'bg-orange-500/20 text-orange-400', won: 'bg-emerald-500/20 text-emerald-500', lost: 'bg-red-500/20 text-red-400', draft: 'bg-zinc-500/20 text-zinc-400', approved: 'bg-emerald-500/20 text-emerald-500', rejected: 'bg-red-500/20 text-red-400' };

export function Modal({ title, onClose, children, wide, xwide }) {
  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur grid place-items-center p-4 text-ink dark:text-cream" onClick={onClose}>
      <div className={`glass !bg-white dark:!bg-ink-2 p-6 w-full ${xwide ? 'max-w-[920px]' : wide ? 'max-w-4xl' : 'max-w-xl'} max-h-[92vh] overflow-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 no-print"><h3 className="font-bold text-lg">{title}</h3><button onClick={onClose}><X /></button></div>
        {children}
      </div>
    </div>, document.body);
}

export const Stat = ({ l, v, c = 'text-gold' }) => <div className="glass p-5"><div className="text-xs opacity-60 mb-1">{l}</div><div className={`text-2xl font-extrabold ${c}`}>{v}</div></div>;
export const Badge = ({ id, children }) => <span className={`badge ${COLORS[id] || 'bg-zinc-500/20'}`}>{children}</span>;

export function FileLink({ name, path }) {
  const { T } = useApp();
  const open = async () => { const u = await signedUrl(path); if (u) window.open(u, '_blank'); else alert(T('File not available.', 'الملف غير متوفر.')); };
  return path
    ? <button onClick={open} className="text-xs mb-2 text-gold underline">📎 {name} — {T('Download', 'تحميل')}</button>
    : <div className="text-xs mb-2 opacity-70">📎 {name}</div>;
}

/** Small labelled text input used by the editors. */
export function Field({ label, v, on, type = 'text', dir, className = '', ...rest }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      <input type={type} dir={dir} className="input" value={v ?? ''} onChange={(e) => on(type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value)} {...rest} />
    </div>
  );
}
