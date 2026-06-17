/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          DEFAULT: '#0B1C3D',
          light: '#122347',
          card: 'rgba(255,255,255,0.05)',
        },
        blue: {
          brand: '#1E3A8A',
          light: '#2B4DB0',
        },
        gold: {
          DEFAULT: '#D4AF37',
          light: '#F0C84A',
          dark: '#B8960C',
          muted: 'rgba(212,175,55,0.15)',
        },
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #1E3A8A 0%, #0B1C3D 100%)',
        'gradient-gold': 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)',
        'gradient-card': 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
      },
      boxShadow: {
        gold: '0 0 30px rgba(212,175,55,0.2)',
        card: '0 8px 32px rgba(0,0,0,0.3)',
      },
      backdropBlur: {
        card: '12px',
      },
    },
  },
  plugins: [],
};
