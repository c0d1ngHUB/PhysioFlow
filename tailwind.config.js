/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',      // SPEC.md: Vertrauenswürdiges Blau
        secondary: '#059669',    // SPEC.md: Beruhigendes Grün (Erfolg/Aktion)
        accent: '#F59E0B',       // SPEC.md: Warmes Amber (Highlights/Warnungen)
        background: '#F8FAFC',   // SPEC.md: Sehr helles Grau
        surface: '#FFFFFF',      // SPEC.md: Reines Weiß
        'text-primary': '#1E293B',  // SPEC.md: Dunkles Slate
        'text-secondary': '#64748B', // SPEC.md: Mittleres Grau
        error: '#DC2626',        // SPEC.md: Klareres Rot
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
