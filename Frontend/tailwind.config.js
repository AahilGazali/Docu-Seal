/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        accent: {
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
        },
      },
      backgroundImage: {
        'gradient-auth': 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        'gradient-sidebar': 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        'gradient-banner': 'linear-gradient(135deg, #0d9488 0%, #0f766e 50%, #115e59 100%)',
      },
      boxShadow: {
        'glow': '0 0 40px -10px rgba(13, 148, 136, 0.35)',
        'card': '0 1px 3px rgba(15, 23, 42, 0.06)',
        'card-hover': '0 10px 25px -5px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
