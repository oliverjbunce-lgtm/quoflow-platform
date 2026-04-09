/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#0A84FF',
        success: '#34c759',
        warning: '#ff9f0a',
        danger: '#ff3b30',
        'text-primary': '#1c1c1e',
        'text-secondary': '#8e8e93',
      },
      fontFamily: {
        sans: ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      backdropBlur: {
        xl: '24px',
        '2xl': '40px',
      },
    },
  },
  plugins: [],
}
