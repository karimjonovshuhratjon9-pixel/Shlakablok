/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: 'var(--bg-surface)',
          950: 'var(--bg-app)',
        },
        border: {
          light: 'var(--border-color)',
        },
        accent: {
          500: '#10B981',
          600: '#059669',
        },
        text: {
          primary: 'var(--text-main)',
          secondary: 'var(--text-sub)',
          muted: 'var(--text-dim)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
