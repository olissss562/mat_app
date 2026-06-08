/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Re-point the "violet" shade to CSS variables so the user-selectable accent color
      // (see useSettingsStore / index.css `.theme-*` classes) re-themes the whole app
      // without touching any component class names.
      colors: {
        violet: {
          50: 'var(--accent-50)',
          100: 'var(--accent-100)',
          300: 'var(--accent-300)',
          400: 'var(--accent-400)',
          500: 'var(--accent-500)',
          600: 'var(--accent-600)',
          700: 'var(--accent-700)',
          900: 'var(--accent-900)',
        },
      },
    },
  },
  plugins: [],
}
