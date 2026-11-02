/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: { 50: '#FFFCF5', 100: '#FBF4E4', 200: '#F4E6C8', 300: '#EAD5A8' },
        maroon: { 50: '#FBEFEF', 100: '#F4D6D8', 300: '#C9737D', 500: '#9A2C3A', 600: '#86232F', 700: '#731D28', 800: '#5C1720', 900: '#421017' },
        terracotta: { 100: '#F8E0D4', 300: '#E79A78', 400: '#D9774F', 500: '#C2562E', 600: '#A4431F' },
        mustard: { 100: '#FCF1CC', 200: '#F8E39A', 300: '#F2CF5B', 400: '#E8B73A', 500: '#D9A21B', 600: '#B4840F' },
        leaf: { 50: '#EEF6EC', 100: '#D6EBD3', 300: '#7DB874', 400: '#4F9A4A', 500: '#2F7D3A', 600: '#23652E', 700: '#1B4D24', 800: '#133A1B' },
        ink: { 400: '#8A7262', 500: '#6B5446', 700: '#45302A', 900: '#2B1A12' },
      },
      fontFamily: {
        display: ['"Yeseva One"', 'Georgia', 'serif'],
        sans: ['Manrope', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(74, 32, 18, 0.06), 0 4px 14px rgba(74, 32, 18, 0.07)',
        lift: '0 8px 28px rgba(74, 32, 18, 0.16)',
      },
    },
  },
  plugins: [],
};
