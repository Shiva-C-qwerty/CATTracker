/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Section colour coding — used consistently everywhere.
        // Accessible hues chosen to be distinguishable in light & dark.
        varc: {
          DEFAULT: '#6366f1', // indigo
          soft: '#e0e7ff',
          dark: '#4f46e5',
        },
        dilr: {
          DEFAULT: '#0d9488', // teal
          soft: '#ccfbf1',
          dark: '#0f766e',
        },
        qa: {
          DEFAULT: '#f59e0b', // amber
          soft: '#fef3c7',
          dark: '#d97706',
        },
      },
    },
  },
  plugins: [],
};
