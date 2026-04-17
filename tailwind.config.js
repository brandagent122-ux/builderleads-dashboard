/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0a0b10',
          900: '#0f1017',
          800: '#14151f',
          700: '#1a1b28',
          600: '#1e2030',
          500: '#252738',
          400: '#2e3045',
          300: '#3a3d52',
        },
        accent: {
          DEFAULT: '#ff6b35',
          light: '#ff8f65',
          dark: '#cc5529',
          glow: 'rgba(255,107,53,0.15)',
        },
        slate: {
          650: '#4a4d63',
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
