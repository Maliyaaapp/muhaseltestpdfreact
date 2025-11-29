/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        maroon: {
          DEFAULT: '#800000',
          light: '#A00000',
          dark: '#600000',
        },
        primary: {
          DEFAULT: '#800000',
          light: '#A00000',
          dark: '#600000'
        }
      },
      fontFamily: {
        sans: ['Tajawal', 'Cairo', 'sans-serif'],
        heading: ['Cairo', 'Tajawal', 'sans-serif']
      },
      fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700
      }
    },
  },
  plugins: [],
};
 