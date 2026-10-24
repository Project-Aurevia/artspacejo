/** Brand palette extracted from the Art Space logo files */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#161616', 2: '#1F1F1F', 3: '#2A2A2A' },
        gold: { DEFAULT: '#C9A45C', light: '#E0C48A', dark: '#A88438' },
        cream: { DEFAULT: '#F0E4D6', 50: '#FAF6F1' },
        terra: { DEFAULT: '#CB6B47', dark: '#B0522F' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Cairo', 'sans-serif'],
        ar: ['Cairo', 'Tajawal', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'serif'],
      },
    },
  },
  plugins: [],
};
