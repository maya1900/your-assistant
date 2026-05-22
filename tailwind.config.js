/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#15171C',
          700: '#3B3F4A',
          500: '#6B6F7B',
          300: '#B9BCC3',
          200: '#D9DBE0',
        },
        paper: {
          50: '#FDFAF3',
          100: '#F8F2E6',
          200: '#F0E8D4',
          300: '#E6DCC2',
          card: '#FFFEFB',
        },
        accent: {
          100: '#FFE7DB',
          300: '#FFB69A',
          500: '#FF6B35',
          600: '#E04E1C',
          700: '#B83C12',
        },
        sage: {
          100: '#E8EBD8',
          300: '#C2C99E',
          500: '#7C8B5C',
          700: '#525C3A',
        },
        sky: {
          100: '#DDEBF5',
          300: '#9CC0DC',
          500: '#5089B5',
        },
        rose: {
          100: '#FBDEDE',
          500: '#D14343',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(21,23,28,0.04), 0 4px 14px rgba(21,23,28,0.04)',
        lift: '0 2px 4px rgba(21,23,28,0.05), 0 12px 32px rgba(21,23,28,0.08)',
        warm: '0 6px 22px rgba(255,107,53,0.22)',
      },
      borderRadius: {
        bubble: '20px',
      },
      letterSpacing: {
        'tight-display': '-0.02em',
        'wider-meta': '0.08em',
      },
      keyframes: {
        caret: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
        typingDot: {
          '0%, 80%, 100%': { transform: 'translateY(0)', opacity: '0.35' },
          '40%': { transform: 'translateY(-3px)', opacity: '1' },
        },
        stopPulse: {
          '0%': { transform: 'scale(0.95)', opacity: '0.7' },
          '80%, 100%': { transform: 'scale(1.25)', opacity: '0' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        caret: 'caret 1s steps(2, end) infinite',
        'typing-dot': 'typingDot 1.4s infinite ease-in-out',
        'stop-pulse': 'stopPulse 1.6s ease-out infinite',
        'fade-in': 'fadeIn 0.35s ease both',
      },
    },
  },
  plugins: [],
};
