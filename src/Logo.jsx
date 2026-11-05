import React from 'react';

/**
 * Art Space faceted 3D "A" Monogram (Vector definition extracted directly from Brand Identity Book).
 * Supports variants:
 * - 'color': Full-color faceted monogram (terracotta, gold, ochre, sand) for light backgrounds
 * - 'mono-light' | 'negative': Negative white faceted wireframe for dark mode
 * - 'mono-dark' | 'ink': Ink/charcoal wireframe for light mode/print
 * - 'gold': Gold foil gradient / metallic finish
 */
export function Mark({ className = 'h-10', variant = 'color' }) {
  const isDark = variant === 'mono-light' || variant === 'negative';
  const isMonoDark = variant === 'mono-dark' || variant === 'print' || variant === 'ink';
  const isGold = variant === 'gold';

  if (isDark) {
    // Negative logo for dark mode: crisp white faceted geometry with architectural line-work
    return (
      <svg viewBox="0 0 100 100" className={className} aria-label="Art Space Mark" fill="none">
        {/* Facet fills with subtle translucent opacity for 3D depth */}
        <polygon points="27.37,89.45 5.0,71.42 40.72,57.2" fill="#FFFFFF" fillOpacity="0.12" stroke="#FFFFFF" strokeWidth="1.2" strokeLinejoin="round" />
        <polygon points="5.0,71.42 23.9,24.6 40.72,57.2" fill="#FFFFFF" fillOpacity="0.22" stroke="#FFFFFF" strokeWidth="1.2" strokeLinejoin="round" />
        <polygon points="40.72,57.2 23.9,24.6 62.23,5.0" fill="#FFFFFF" fillOpacity="0.16" stroke="#FFFFFF" strokeWidth="1.2" strokeLinejoin="round" />
        <polygon points="62.23,5.0 49.87,34.98 59.1,57.2 82.34,57.2" fill="#FFFFFF" fillOpacity="0.28" stroke="#FFFFFF" strokeWidth="1.2" strokeLinejoin="round" />
        <polygon points="82.34,57.2 65.17,75.4 63.08,68.5" fill="#FFFFFF" fillOpacity="0.4" stroke="#FFFFFF" strokeWidth="1.2" strokeLinejoin="round" />
        <polygon points="82.34,57.2 95.0,89.45 65.17,75.4" fill="#FFFFFF" fillOpacity="0.2" stroke="#FFFFFF" strokeWidth="1.2" strokeLinejoin="round" />
        <polygon points="61.82,5.99 54.21,45.42 49.87,34.98" fill="#FFFFFF" fillOpacity="0.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinejoin="round" />
        <polygon points="82.34,57.2 40.72,57.2 27.37,89.45" fill="#FFFFFF" fillOpacity="0.85" stroke="#FFFFFF" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    );
  }

  if (isMonoDark) {
    return (
      <svg viewBox="0 0 100 100" className={className} aria-label="Art Space Mark" fill="none">
        <polygon points="27.37,89.45 5.0,71.42 40.72,57.2" fill="#161412" fillOpacity="0.12" stroke="#161412" strokeWidth="1.2" strokeLinejoin="round" />
        <polygon points="5.0,71.42 23.9,24.6 40.72,57.2" fill="#161412" fillOpacity="0.2" stroke="#161412" strokeWidth="1.2" strokeLinejoin="round" />
        <polygon points="40.72,57.2 23.9,24.6 62.23,5.0" fill="#161412" fillOpacity="0.15" stroke="#161412" strokeWidth="1.2" strokeLinejoin="round" />
        <polygon points="62.23,5.0 49.87,34.98 59.1,57.2 82.34,57.2" fill="#161412" fillOpacity="0.3" stroke="#161412" strokeWidth="1.2" strokeLinejoin="round" />
        <polygon points="82.34,57.2 65.17,75.4 63.08,68.5" fill="#161412" fillOpacity="0.45" stroke="#161412" strokeWidth="1.2" strokeLinejoin="round" />
        <polygon points="82.34,57.2 95.0,89.45 65.17,75.4" fill="#161412" fillOpacity="0.22" stroke="#161412" strokeWidth="1.2" strokeLinejoin="round" />
        <polygon points="61.82,5.99 54.21,45.42 49.87,34.98" fill="#161412" fillOpacity="0.55" stroke="#161412" strokeWidth="1.2" strokeLinejoin="round" />
        <polygon points="82.34,57.2 40.72,57.2 27.37,89.45" fill="#161412" fillOpacity="0.9" stroke="#161412" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    );
  }

  if (isGold) {
    return (
      <svg viewBox="0 0 100 100" className={className} aria-label="Art Space Mark">
        <polygon points="27.37,89.45 5.0,71.42 40.72,57.2" fill="#E6D3A3" />
        <polygon points="5.0,71.42 23.9,24.6 40.72,57.2" fill="#F4E8C1" />
        <polygon points="40.72,57.2 23.9,24.6 62.23,5.0" fill="#E0CA92" />
        <polygon points="62.23,5.0 49.87,34.98 59.1,57.2 82.34,57.2" fill="#C9A45C" />
        <polygon points="82.34,57.2 65.17,75.4 63.08,68.5" fill="#A88438" />
        <polygon points="82.34,57.2 95.0,89.45 65.17,75.4" fill="#B89442" />
        <polygon points="61.82,5.99 54.21,45.42 49.87,34.98" fill="#8C6A24" />
        <polygon points="82.34,57.2 40.72,57.2 27.37,89.45" fill="#C9A45C" />
      </svg>
    );
  }

  // Full-color brand logo (Brand Book specification: Terracotta + Warm Sand + Ochre / Gold)
  return (
    <svg viewBox="0 0 100 100" className={className} aria-label="Art Space Mark">
      {/* Left lower facet: light ochre / sand */}
      <polygon points="27.37,89.45 5.0,71.42 40.72,57.2" fill="#DED5A1" />
      {/* Far-left facet: warm sand */}
      <polygon points="5.0,71.42 23.9,24.6 40.72,57.2" fill="#ECE3D5" />
      {/* Top-left apex facet: sand ochre */}
      <polygon points="40.72,57.2 23.9,24.6 62.23,5.0" fill="#DED5A1" />
      {/* Right apex facet: rich warm gold */}
      <polygon points="62.23,5.0 49.87,34.98 59.1,57.2 82.34,57.2" fill="#BDA757" />
      {/* Inner-right shadow: deep amber */}
      <polygon points="82.34,57.2 65.17,75.4 63.08,68.5" fill="#A06C22" />
      {/* Right leg: golden amber */}
      <polygon points="82.34,57.2 95.0,89.45 65.17,75.4" fill="#B08E2D" />
      {/* Apex crease shadow */}
      <polygon points="61.82,5.99 54.21,45.42 49.87,34.98" fill="#A06C22" />
      {/* Center crossbar triangle: signature terracotta / rust (#C55534 / #C46038) */}
      <polygon points="82.34,57.2 40.72,57.2 27.37,89.45" fill="#C46038" />
    </svg>
  );
}

/**
 * Horizontal Lockup: Faceted Mark + "ART SPACE" (Mont font style) + "مساحة الفن" (DIN Next style).
 * `dark` = render on dark background (uses negative white mark and cream text)
 */
export default function Logo({ dark = true, className = 'h-9', mono = false }) {
  const variant = mono ? (dark ? 'mono-light' : 'mono-dark') : (dark ? 'mono-light' : 'color');
  return (
    <div className="flex items-center gap-2.5 sm:gap-3" dir="ltr">
      <Mark className={className} variant={variant} />
      <div className={`flex items-baseline gap-2 whitespace-nowrap tracking-tight ${dark ? 'text-white' : 'text-ink'}`}>
        <span className="font-sans font-extrabold text-[19px] sm:text-[21px] tracking-[0.08em] uppercase">
          ART <span className={dark ? 'text-white/90' : 'text-terra'}>SPACE</span>
        </span>
        <span className={`h-3.5 w-px ${dark ? 'bg-white/20' : 'bg-line/20'}`} />
        <span className={`font-ar text-sm sm:text-base font-bold ${dark ? 'text-white/80' : 'text-muted'}`}>
          مساحة الفن
        </span>
      </div>
    </div>
  );
}
