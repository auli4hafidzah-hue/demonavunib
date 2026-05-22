/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FAF6F0',
          100: '#F5EBE0',
          200: '#E5D3C3',
          300: '#D5C4B4',
          400: '#BCA38A',
          500: '#9C7A5D',
          600: '#826247',
          700: '#684E37',
          800: '#4A3E3D',
          900: '#2E2524',
        },
        accent: {
          50: '#FAF2EE',
          100: '#F6E4DC',
          200: '#ECC7BA',
          300: '#DF9F8D',
          400: '#D27B66',
          500: '#C2593F', // Terracotta-like accent
          600: '#A4442D',
          700: '#84321F',
          800: '#652314',
          900: '#4A170C',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 8px 30px rgb(74 62 61 / 0.04)',
        'soft-lg': '0 12px 40px rgb(74 62 61 / 0.08)',
        'glass': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.5), 0 8px 32px 0 rgba(74, 62, 61, 0.06)',
      }
    },
  },
  plugins: [],
}
