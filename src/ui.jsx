import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Inbox } from 'lucide-react';
import { useApp } from './store.jsx';
import { signedUrl } from './api.js';

export const stageName = (list, id, lang) => { const s = list.find((x) => x[0] === id); return s ? s[lang === 'ar' ? 2 : 1] : id; };

export const COLORS = { new: 'bg-sky-500/20 text-sky-400', contacted: 'bg-violet-500/20 text-violet-400', measure: 'bg-amber-500/20 text-amber-500', sent: 'bg-gold/25 text-gold', negotiation: 'bg-orange-500/20 text-orange-400', won: 'bg-emerald-500/20 text-emerald-500', lost: 'bg-red-500/20 text-red-400', draft: 'bg-zinc-500/20 text-zinc-400', approved: 'bg-emerald-500/20 text-emerald-500', rejected: 'bg-red-500/20 text-red-400' };

const FOCUSABLE = 'a[href],area[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal shell: portal, scroll lock, Escape to close, focus trap and
 * focus restoration. Used by every dialog in the app (public forms + admin).
 */
export function Dialog({ onClose, children, label, className = '', wide, xwide, size }) {
  const ref = useRef(null);
  useEffect(() => {
    const opener = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const node = ref.current;
    const first = node?.querySelector(FOCUSABLE);
    (first || node)?.focus?.();

    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose?.(); return; }
      if (e.key !== 'Tab' || !node) return;
      const items = [...node.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const at = items.indexOf(document.activeElement);
      if (e.shiftKey && (at <= 0)) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && at === items.length - 1) { e.preventDefault(); items[0].focus(); }
    };

    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [onClose]);

  const width = xwide ? 'max-w-[960px]' : wide ? 'max-w-4xl' : size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-2xl' : 'max-w-xl';
  return createPortal(
    <div
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-black/65 p-4 backdrop-blur-sm animate-fade sm:p-6"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div ref={ref} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} className={`dialog-panel w-full ${width} animate-pop ${className}`}>
        {children}
      </div>
    </div>, document.body,
  );
}

export function Modal({ title, onClose, children, wide, xwide }) {
  return (
    <Dialog onClose={onClose} label={typeof title === 'string' ? title : undefined} wide={wide} xwide={xwide} className="p-5 sm:p-6">
      <div className="no-print mb-4 flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold tracking-tight">{title}</h3>
        <button type="button" onClick={onClose} aria-label="Close" className="icon-btn shrink-0"><X size={18} /></button>
      </div>
      {children}
    </Dialog>
  );
}

export const Stat = ({ l, v, c = 'text-gold' }) => (
  <div className="rounded-2xl border border-line/10 bg-surface-2/60 px-4 py-3">
    <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle">{l}</div>
    <div className={`mt-1 text-xl font-extrabold tabular-nums tracking-tight ${c}`}>{v}</div>
  </div>
);

export const Badge = ({ id, children }) => <span className={`badge ${COLORS[id] || 'bg-zinc-500/20'}`}>{children}</span>;

export function FileLink({ name, path }) {
  const { T } = useApp();
  const open = async () => { const u = await signedUrl(path); if (u) window.open(u, '_blank'); else alert(T('File not available.', 'الملف غير متوفر.')); };
  return path
    ? <button type="button" onClick={open} className="mb-2 text-xs font-medium text-gold underline decoration-gold/40 underline-offset-2 hover:decoration-gold">📎 {name} — {T('Download', 'تحميل')}</button>
    : <div className="mb-2 text-xs opacity-70">📎 {name}</div>;
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

export const Kbd = ({ children }) => <kbd className="kbd">{children}</kbd>;

export const Skeleton = ({ className = 'h-4 w-24' }) => <div className={`skeleton ${className}`} aria-hidden="true" />;

export function EmptyState({ icon: Icon = Inbox, title, sub, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-2xl border border-line/10 bg-surface-2/70 text-subtle"><Icon size={18} /></span>
      {title && <p className="text-sm font-semibold">{title}</p>}
      {sub && <p className="max-w-xs text-xs leading-relaxed text-subtle">{sub}</p>}
      {action}
    </div>
  );
}

/** Fade/slide an element into view once. Respects prefers-reduced-motion via CSS. */
export function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setSeen(true); return undefined; }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setSeen(true); io.disconnect(); }
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`reveal ${seen ? 'in' : ''} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
