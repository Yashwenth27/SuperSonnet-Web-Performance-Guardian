/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0F172A',      // Slate 900
          card: '#1E293B',    // Slate 800
          border: '#334155',  // Slate 700
          text: '#F8FAFC',    // Slate 50
          muted: '#94A3B8',   // Slate 400
        },
        brand: {
          primary: '#6366F1', // Indigo 500
          secondary: '#3B82F6',// Blue 500
          accent: '#A855F7',  // Purple 500
        },
        risk: {
          green: '#10B981',   // Emerald 500
          amber: '#F59E0B',   // Amber 500
          red: '#EF4444',     // Red 500
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-green': '0 0 15px rgba(16, 185, 129, 0.4)',
        'glow-amber': '0 0 15px rgba(245, 158, 11, 0.4)',
        'glow-red': '0 0 15px rgba(239, 68, 68, 0.4)',
        'glow-brand': '0 0 15px rgba(99, 102, 241, 0.4)',
      }
    },
  },
  plugins: [],
}
