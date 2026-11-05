/**
 * Art Space — design tokens.
 *
 * Two colour systems live side by side on purpose:
 *  1. Semantic tokens (canvas / surface / line / fg / muted / subtle) are driven by the CSS
 *     variables in `src/index.css`, so every component flips with light/dark automatically.
 *  2. Brand constants (ink / gold / cream / terra) are fixed values used on always-dark bands
 *     (public hero, login screen, footer) where the theme must not change the colour.
 *
 * Rebranded with Brand Book: Mont (EN) + DIN Next LT Arabic (AR),
 * Terracotta (#C46038), Gold (#C4A05C), Sand/Cream (#FAF6F0), Ink (#161412).
 */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /* --- semantic, theme-aware --- */
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          2: 'rgb(var(--surface-2) / <alpha-value>)',
          3: 'rgb(var(--surface-3) / <alpha-value>)',
        },
        line: 'rgb(var(--line) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--fg-muted) / <alpha-value>)',
        subtle: 'rgb(var(--fg-subtle) / <alpha-value>)',
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          strong: 'rgb(var(--accent-strong) / <alpha-value>)',
          text: 'rgb(var(--accent-text) / <alpha-value>)',
        },

        /* --- brand constants --- */
        ink: { DEFAULT: '#161412', 2: '#1F1C19', 3: '#2D2824' },
        gold: { DEFAULT: '#C4A05C', light: '#DED5A1', dark: '#9E7E36' },
        cream: { DEFAULT: '#FAF6F0', 50: '#FDFBF7' },
        terra: { DEFAULT: '#C46038', dark: '#A8522E', light: '#DE835E' },
      },

      fontFamily: {
        sans: ['"Mont"', '"Inter Tight"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        ar: ['"DIN Next LT Arabic"', '"IBM Plex Sans Arabic"', 'Tajawal', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
      },

      boxShadow: {
        soft: '0 1px 2px rgb(22 20 18 / .04), 0 12px 28px -22px rgb(22 20 18 / .34)',
        lift: '0 2px 4px rgb(22 20 18 / .05), 0 28px 60px -30px rgb(22 20 18 / .46)',
      },

      transitionTimingFunction: {
        spring: 'cubic-bezier(.22, 1, .36, 1)',
      },

      keyframes: {
        fade: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'none' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        fade: 'fade .32s cubic-bezier(.22, 1, .36, 1) both',
        marquee: 'marquee 42s linear infinite',
      },
    },
  },
  plugins: [],
};
