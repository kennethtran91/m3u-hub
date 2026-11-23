/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Graphite + amber. `live` is the one accent colour: status dot, LIVE
        // pill, primary buttons, progress bar, live card edge.
        ink: {
          950: '#0a0a0a',
          900: '#111111',
          850: '#161616',
          800: '#1c1c1c',
          750: '#232323',
          700: '#2b2b2b',
        },
        line: {
          DEFAULT: '#2a2a2a',
          soft: '#1f1f1f',
          strong: '#3a3a3a',
        },
        live: {
          DEFAULT: '#f59e0b',
          dim: '#2a1c05',
          text: '#fcd34d',
        },
        warn: '#fb923c',
        muted: '#9a9a95',
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
          '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 rgba(245,158,11,0.5)' },
          '50%': { opacity: '.7', boxShadow: '0 0 0 0 rgba(245,158,11,0)' },
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
