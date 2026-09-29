/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#525871',
        secondary: '#857c91',
        accent: '#cd9fa0',
        soft: '#f2c1a3',
        'soft-light': '#f8ccaa',
        cream: '#fbf7f4',
        success: '#2f6b4f',
        danger: '#a85a5a',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 8px 24px rgba(82, 88, 113, 0.12)',
        soft: '0 4px 14px rgba(82, 88, 113, 0.08)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};
