import type { Config } from 'tailwindcss';

// Couleurs et typo NOBTY. Le mode sombre est piloté par la classe `dark`.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        emerald: { DEFAULT: '#2D6A4F', 600: '#235A41', 700: '#1A4732', 800: '#143727' },
        gold: { DEFAULT: '#C9A84C', 600: '#B6953D', 700: '#9A7E33' },
        tlemcen: { DEFAULT: '#1B4F8A', 600: '#164173', 700: '#10325B' },
        ivory: { DEFAULT: '#FAF7F0', 100: '#F5F0E4', 200: '#ECE3D0' },
        leather: { DEFAULT: '#2C1810', 600: '#3D2218' },
        night: { DEFAULT: '#0D1B2A', card: '#1A2B3C', border: '#243B53' },
      },
      fontFamily: {
        amiri: ['"Amiri"', 'serif'],
        playfair: ['"Playfair Display"', 'serif'],
        cairo: ['"Cairo"', 'sans-serif'],
        bebas: ['"Bebas Neue"', 'system-ui', 'sans-serif'],
        sans: ['"Cairo"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        zellij: '0 2px 0 0 rgba(201, 168, 76, 0.35), 0 8px 24px -8px rgba(13, 27, 42, 0.18)',
        'zellij-dark': '0 2px 0 0 rgba(201, 168, 76, 0.45), 0 8px 24px -8px rgba(0,0,0,0.6)',
        ticket: '0 24px 60px -20px rgba(45, 106, 79, 0.45)',
      },
      borderRadius: {
        zellij: '1.25rem',
      },
      backgroundImage: {
        'zellij-light': "url('/patterns/zellij-light.svg')",
        'zellij-dark': "url('/patterns/zellij-dark.svg')",
        'arch-emerald': 'radial-gradient(120% 80% at 50% 0%, #2D6A4F 0%, #143727 100%)',
        'gold-grain': 'linear-gradient(135deg, #C9A84C 0%, #E5C977 50%, #B6953D 100%)',
      },
      keyframes: {
        'star-spin': { '0%': { transform: 'rotate(0)' }, '100%': { transform: 'rotate(360deg)' } },
        'star-pulse': { '0%,100%': { transform: 'scale(1)', opacity: '1' }, '50%': { transform: 'scale(1.05)', opacity: '0.9' } },
        'tile-in': { '0%': { transform: 'scale(0.6) rotate(-20deg)', opacity: '0' }, '100%': { transform: 'scale(1) rotate(0)', opacity: '1' } },
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'star-spin': 'star-spin 30s linear infinite',
        'star-pulse': 'star-pulse 2.4s ease-in-out infinite',
        'tile-in': 'tile-in 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'fade-up': 'fade-up 0.4s ease-out both',
      },
    },
  },
  plugins: [],
} satisfies Config;
