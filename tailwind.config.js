/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1E3A5F',
        secondary: '#4A5568',
        accent: '#718096',
        background: '#F7F7F7',
        surface: '#FFFFFF',
        'text-primary': '#111111',
        'text-secondary': '#4A5568',
      },
      fontFamily: {
        sans: ['Segoe UI', 'Calibri', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Consolas', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
