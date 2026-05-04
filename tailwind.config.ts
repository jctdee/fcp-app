import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          400: '#94a3b8',
          200: '#e2e8f0',
        },
        brand: {
          500: '#38bdf8',
          600: '#0ea5e9',
        },
      },
    },
  },
  plugins: [],
};

export default config;
