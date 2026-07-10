/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#0A0A0B',
        surface: {
          DEFAULT: '#141416',
          raised: '#1C1C1F',
        },
        accent: {
          DEFAULT: '#7C6FF0',
          hover: '#6B5DE6',
          active: '#5A4DDB',
          muted: 'rgba(124, 111, 240, 0.15)',
        },
        ink: {
          DEFAULT: '#FAFAFA',
          muted: '#A1A1AA',
          faint: '#71717A',
        },
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          strong: 'rgba(255, 255, 255, 0.12)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['32px', { lineHeight: '40px' }],
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.45)',
        palette: '0 16px 48px rgba(0, 0, 0, 0.6)',
      },
      transitionDuration: {
        DEFAULT: '150ms',
        slow: '200ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'ease-out',
      },
      keyframes: {
        'message-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'palette-in': {
          '0%': { opacity: '0', transform: 'scale(0.98) translateY(-4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        'message-in': 'message-in 200ms ease-out forwards',
        'palette-in': 'palette-in 150ms ease-out forwards',
      },
    },
  },
  plugins: [],
}
