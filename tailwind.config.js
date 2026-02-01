/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        solana: {
          purple: '#9945FF',
          green: '#14F195',
        },
        winter: {
          bg: '#E8F4F8',
          bgLight: '#F5FAFB',
          card: 'rgba(255, 255, 255, 0.85)',
          text: '#1A3A52',
          textSecondary: '#4A6B7C',
          border: '#B8DCE8',
          snowflake: '#4A90A4',
          cyan: '#00BCD4',
          glacial: '#4FC3F7',
        },
        frozen: {
          light: '#B3E5FC',
          medium: '#4FC3F7',
          dark: '#0277BD',
          darker: '#01579B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'frost': '0 0 20px rgba(79, 195, 247, 0.3), 0 0 40px rgba(79, 195, 247, 0.15)',
        'frost-lg': '0 0 30px rgba(79, 195, 247, 0.4), 0 0 60px rgba(79, 195, 247, 0.2)',
        'ice': '0 8px 32px rgba(15, 70, 100, 0.37)',
        'glow-cyan': '0 0 15px rgba(0, 188, 212, 0.5)',
        'glow-purple': '0 0 20px rgba(153, 69, 255, 0.4)',
      },
      animation: {
        'snowfall': 'snowfall 10s linear infinite',
        'frost-shimmer': 'frost-shimmer 3s ease-in-out infinite',
        'ice-melt': 'ice-melt 2s ease-in-out',
        'crystallize': 'crystallize 0.4s ease-out forwards',
      },
      keyframes: {
        snowfall: {
          '0%': { transform: 'translate3d(0, -10px, 0)', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { transform: 'translate3d(var(--drift, 0), 100vh, 0)', opacity: '0' },
        },
        'frost-shimmer': {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'ice-melt': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.05) translateY(2px)' },
          '100%': { transform: 'scale(1)', opacity: '0.8' },
        },
        crystallize: {
          '0%': { opacity: '0', transform: 'scale(0.8)', filter: 'blur(10px)' },
          '100%': { opacity: '1', transform: 'scale(1)', filter: 'blur(0)' },
        },
      },
    },
  },
  plugins: [],
}
