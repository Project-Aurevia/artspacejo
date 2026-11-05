import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useApp } from './store.jsx';
import { signedUrl } from './api.js';

/* ============================================================
   Shared UI primitives
   ------------------------------------------------------------
   Everything here is token-driven (see src/index.css): no raw
   hex values, so the whole app flips with light/dark mode.
   ============================================================ */

export const stageName = (list, id, lang) => { const s = list.find((x) => x[0] === id); return s ? s[lang === 'ar' ? 2 : 1] : id; };

export const COLORS = {
  new: 'bg-sky-500/15 text-sky-500 dark:text-sky-400',
  contacted: 'bg-violet-500/15 text-violet-500 dark:text-violet-400',
  measure: 'bg-amber-500/15 text-amber-600 dark:text-amber-500',
  sent: 'bg-gold/20 text-gold',
  negotiation: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  won: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-500',
  lost: 'bg-red-500/15 text-red-600 dark:text-red-400',
  draft: 'bg-zinc-500/15 text-muted',
  approved: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-500',
  rejected: 'bg-red-500/15 text-red-600 dark:text-red-400',
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const SIZES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

/**
 * Accessible modal shell used by every overlay (public forms, gallery, command palette).
 *
 * Handles the details that are easy to forget: portal rendering, Escape to close, a focus
 * trap, focus restoration, background scroll lock, and `aria-modal` semantics. Callers own
 * the padding via `className` so the gallery can go edge-to-edge with `!p-0`.
 */
export function Dialog({ onClose, label, children, size = 'md', xwide, className = '' }) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const titleId = useId();

  useEffect(() => {
    const panel = panelRef.current;
    const previous = document.activeElement;
    const { overflow, paddingRight } = document.body.style;
    // Compensate for the disappearing scrollbar so the page doesn't jump sideways.
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current?.(); return; }
      if (e.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!items.length) { e.preventDefault(); panel.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    const t = window.setTimeout(() => {
      const first = panel?.querySelector(FOCUSABLE);
      (first || panel)?.focus({ preventScroll: true });
    }, 30);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      window.clearTimeout(t);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      if (previous && typeof previous.focus === 'function') previous.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        className="animate-fade absolute inset-0 bg-ink/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={label ? titleId : undefined}
        aria-label={label ? undefined : 'Dialog'}
        tabIndex={-1}
        className={`dialog-panel animate-fade relative w-full outline-none ${xwide ? 'max-w-[920px]' : (SIZES[size] || SIZES.md)} ${className}`}
      >
        {label ? <span id={titleId} className="sr-only">{label}</span> : null}
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Form modal with a title bar — the workhorse for every admin editor. */
export function Modal({ title, onClose, children, wide, xwide }) {
  return (
    <Dialog onClose={onClose} label={title} size={wide ? 'xl' : 'md'} xwide={xwide} className="p-4 sm:p-6">
      <div className="no-print mb-4 flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold leading-tight tracking-tight">{title}</h3>
        <button type="button" onClick={onClose} className="icon-btn -me-1 -mt-1 shrink-0" aria-label="Close">
          <X size={16} />
        </button>
      </div>
      {children}
    </Dialog>
  );
}

/** Empty / no-results state used inside tables and panels. */
export function EmptyState({ icon: Icon, title, sub, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 px-4 py-9 text-center ${className}`}>
      {Icon ? (
        <span className="grid h-11 w-11 place-items-center rounded-2xl border border-line/10 bg-surface-2/70 text-subtle" aria-hidden="true">
          <Icon size={18} />
        </span>
      ) : null}
      <p className="text-sm font-semibold">{title}</p>
      {sub ? <p className="max-w-sm text-xs leading-relaxed text-subtle">{sub}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

/** Keyboard hint. */
export const Kbd = ({ children, className = '' }) => <kbd className={`kbd ${className}`}>{children}</kbd>;

/** Loading placeholder that inherits its shape from the classes you pass. */
export const Skeleton = ({ className = '' }) => <div className={`skeleton ${className}`} aria-hidden="true" />;

/**
 * Fades content in the first time it scrolls into view. Falls back to visible content when
 * IntersectionObserver is unavailable or the visitor asked for reduced motion.
 */
export function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver === 'undefined') {
      el.classList.add('in');
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={`reveal ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined} {...rest}>
      {children}
    </Tag>
  );
}

export const Stat = ({ l, v, c = 'text-gold' }) => (
  <div className="glass stat-card p-5">
    <div className="stat-label mb-1">{l}</div>
    <div className={`stat-value mt-2 text-[22px] ${c}`}>{v}</div>
  </div>
);

export const Badge = ({ id, children }) => <span className={`badge ${COLORS[id] || 'bg-zinc-500/15 text-muted'}`}>{children}</span>;

export function FileLink({ name, path }) {
  const { T } = useApp();
  const open = async () => { const u = await signedUrl(path); if (u) window.open(u, '_blank'); else alert(T('File not available.', 'الملف غير متوفر.')); };
  return path
    ? <button type="button" onClick={open} className="mb-2 text-xs text-gold underline decoration-gold/40 underline-offset-2 hover:decoration-gold">📎 {name} — {T('Download', 'تحميل')}</button>
    : <div className="mb-2 text-xs text-subtle">📎 {name}</div>;
}

/** Small labelled text input used by the editors. */
export function Field({ label, v, on, type = 'text', dir, className = '', id, ...rest }) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <div className={className}>
      <label className="label" htmlFor={fieldId}>{label}</label>
      <input
        id={fieldId}
        type={type}
        dir={dir}
        className="input"
        value={v ?? ''}
        onChange={(e) => on(type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value)}
        {...rest}
      />
    </div>
  );
}

const TONE_MAP = {
  gold: 'text-gold',
  emerald: 'text-emerald-500',
  red: 'text-red-400',
  sky: 'text-sky-400',
  terra: 'text-terra',
  violet: 'text-violet-400',
};

export function Tip({ icon: Icon, label, value, hint, tone = 'gold' }) {
  const toneClass = TONE_MAP[tone] || (tone.startsWith('text-') ? tone : 'text-gold');
  return (
    <div className="glass stat-card p-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={14} className={`shrink-0 ${toneClass}`} />}
        <span className="stat-label truncate">{label}</span>
      </div>
      <div className={`stat-value mt-2 text-[22px] sm:text-[24px] ${toneClass}`}>{value}</div>
      {hint && <div className="mt-1.5 text-[11px] leading-snug text-subtle">{hint}</div>}
    </div>
  );
}
