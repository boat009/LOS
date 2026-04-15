/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#eff6ff', 500: '#2E75B6', 600: '#1d4ed8', 700: '#1e40af', 900: '#1e3a8a' },
        success: { 500: '#22c55e', 100: '#dcfce7' },
        warning: { 500: '#f59e0b', 100: '#fef3c7' },
        danger: { 500: '#ef4444', 100: '#fee2e2' },
      },
      fontFamily: { sans: ['Arial', 'sans-serif'] },
    },
  },
  plugins: [],
};
