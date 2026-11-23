/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#080a09',
          900: '#0b0e0c',
          850: '#0f1311',
          800: '#131816',
          750: '#171d1a',
          700: '#1c2420',
        },
        line: {
          DEFAULT: '#222b27',
          soft: '#1a211e',
          strong: '#2e3a34',
        },
        live: {
          DEFAULT: '#34d399',
          dim: '#0f2a22',
          text: '#6ee7b7',
        },
        warn: '#fbbf24',
        muted: '#8b968f',
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 0 rgba(255,255,255,0.02) inset, 0 8px 24px -12px rgba(0,0,0,0.8)',
        pop: '0 24px 64px -12px rgba(0,0,0,0.9)',
      },
      keyframes: {
        'live-pulse': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 rgba(52,211,153,0.45)' },
          '50%': { opacity: '.75', boxShadow: '0 0 0 4px rgba(52,211,153,0)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'live-pulse': 'live-pulse 1.8s ease-in-out infinite',
        'fade-up': 'fade-up .18s ease-out both',
      },
    },
  },
  plugins: [],
}