/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        page: '#141416',
        stage: '#1B1B1F',
        card: '#212126',
        'card-sunk': '#19191D',
        'card-hover': '#26262B',
        ember: { DEFAULT: '#CC2936', hi: '#E04450', lo: '#A01E2B' },
        ink: { 0: '#FFFFFF', 1: '#B8B8BF', 2: '#6E6E78', 3: '#44444D' },
        moss: '#4ADE80',
        ruby: '#F87171',
        amber: '#FBBF24',
        sky: '#60A5FA',
        violet: '#C084FC',
        // Backward compat
        navy: {
          950: '#141416', 900: '#19191D', 800: '#1B1B1F', 700: '#212126',
          600: '#2A2A30', 500: '#333339', 400: '#3D3D44', 300: '#48484F',
        },
        accent: { DEFAULT: '#CC2936', light: '#E04450', dark: '#A01E2B' },
        slate: { 400: '#B8B8BF', 500: '#8E8E98', 650: '#6E6E78' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        stage: '40px',
        card: '22px',
        'card-lg': '26px',
        pill: '28px',
      },
    },
  },
  plugins: [],
}
