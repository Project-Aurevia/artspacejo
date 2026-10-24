import React from 'react';

/** Art Space mark (arch + figure + sun). variant: 'color' | 'mono-light' | 'mono-dark' */
export function Mark({ className = 'h-10', variant = 'color' }) {
  const c = variant === 'color'
    ? { arch: '#F0E4D6', gold: '#C9A45C', dot: '#CB6B47' }
    : variant === 'print' ? { arch: '#161616', gold: '#C9A45C', dot: '#CB6B47' }
    : variant === 'mono-light' ? { arch: '#fff', gold: '#fff', dot: '#fff' }
    : { arch: '#161616', gold: '#161616', dot: '#161616' };
  return (
    <svg viewBox="0 0 100 130" className={className} aria-label="Art Space">
      <path d="M50 4C80 4 96 22 96 48V126H76V50C76 34 66 22 50 22Z" fill={c.arch} />
      <path d="M8 126V62L30 76V108Q30 126 14 126Z" fill={c.gold} />
      <path d="M10 50C10 30 24 14 44 14C30 24 28 40 44 52C60 62 78 70 70 100C66 114 56 122 44 126C60 108 62 88 44 76C24 64 10 62 10 50Z" fill={c.gold} />
      <circle cx="48" cy="38" r="11" fill={c.dot} />
    </svg>
  );
}

/** Horizontal lockup: Mark + "Art Space | مساحة الفن". `dark` = text on dark background */
export default function Logo({ dark = true, className = 'h-10', mono = false }) {
  const variant = mono ? 'mono-dark' : dark ? 'color' : 'mono-dark';
  return (
    <div className="flex items-center gap-3" dir="ltr">
      <Mark className={className} variant={variant} />
      <div className={`flex items-center gap-2 whitespace-nowrap ${dark ? 'text-cream' : 'text-ink'}`}>
        <span className="font-serif text-2xl font-semibold leading-none">Art Space</span>
        <span className="h-6 w-px bg-gold" />
        <span className="font-ar text-lg leading-none">مساحة الفن</span>
      </div>
    </div>
  );
}
