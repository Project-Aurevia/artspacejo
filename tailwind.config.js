/**
 * Art Space design system
 * -----------------------
 * Brand palette (from the logo files) + a semantic surface scale driven by CSS
 * variables in `src/index.css`, so every surface/line/text colour flips correctly
 * between light and dark without duplicating `dark:` utilities everywhere.
 */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /* brand */
        ink: { DEFAULT: '#141311', 2: '#1B1A18', 3: '#242220', 4: '#2E2B28' },
        gold: { DEFAULT: '#C9A45C', light: '#E0C48A', dark: '#A88438', ink: '#7A5A18' },
        cream: { DEFAULT: '#F0E4D6', 50: '#FBF7F1', 100: '#F4EBE0', 200: '#E8DAC7' },
        terra: { DEFAULT: '#CB6B47', dark: '#B0522F' },

        /* semantic (theme-aware) */
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        'surface-3': 'rgb(var(--surface-3) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--fg-muted) / <alpha-value>)',
        subtle: 'rgb(var(--fg-subtle) / <alpha-value>)',
      },
      fontFamily: {
        /* Premium pairing: Inter Tight for UI/display grotesk, Instrument Serif for editorial accents,
           IBM Plex Sans Arabic for RTL (one Arabic family at every weight keeps the bilingual grid intact). */
        sans: ['"Inter Tight"', '"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'],
        ar: ['"IBM Plex Sans Arabic"', 'Tajawal', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', '"Cormorant Garamond"', 'Georgia', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        card: '1.25rem',
        panel: '1.5rem',
        pill: '999px',
      },
      boxShadow: {
        soft: '0 1px 2px rgb(0 0 0 / .05), 0 10px 30px -18px rgb(0 0 0 / .35)',
        lift: '0 30px 70px -40px rgb(0 0 0 / .55)',
        glow: '0 0 0 1px rgb(201 164 92 / .35), 0 24px 70px -30px rgb(201 164 92 / .5)',
        inset: 'inset 0 1px 0 0 rgb(255 255 255 / .06)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(.22, 1, .36, 1)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'none' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        pop: {
          from: { opacity: '0', transform: 'scale(.97)' },
          to: { opacity: '1', transform: 'none' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        glow: {
          '0%, 100%': { opacity: '.55' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        float: 'float 7s ease-in-out infinite',
        'fade-up': 'fadeUp .7s cubic-bezier(.22, 1, .36, 1) both',
        fade: 'fadeIn .25s ease-out both',
        pop: 'pop .28s cubic-bezier(.22, 1, .36, 1) both',
        marquee: 'marquee 42s linear infinite',
        shimmer: 'shimmer 1.6s infinite',
        glow: 'glow 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
