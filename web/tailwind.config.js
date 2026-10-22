/** @type {import('tailwindcss').Config} */

// Every colour the app uses is a CSS variable (src/index.css), so light and dark come from one
// set of class names: the variables change with the system theme, the classes never do.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const shades = (name, list) => Object.fromEntries(list.map((shade) => [shade, token(`${name}-${shade}`)]));

// iOS-like motion: a quick start that settles softly, and a spring with a little overshoot.
const settle = 'cubic-bezier(0.22, 1, 0.36, 1)';
const spring = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: shades('slate', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]),
        teal: shades('teal', [50, 100, 200, 600, 700, 800, 900]),
        red: shades('red', [50, 100, 200, 300, 600, 700, 800, 900]),
        emerald: shades('emerald', [50, 100, 200, 800, 900]),
        amber: shades('amber', [50, 100, 200, 800, 900]),
        sky: shades('sky', [100, 900]),
        canvas: token('canvas'),
        surface: token('surface'),
        // Filled controls keep white text readable in both themes.
        accent: { DEFAULT: token('accent'), strong: token('accent-strong') },
        danger: { DEFAULT: token('danger'), strong: token('danger-strong') },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"Segoe UI Variable Text"',
          '"Segoe UI"',
          'Roboto',
          '"Noto Sans Devanagari"',
          '"Nirmala UI"',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.04), 0 10px 30px -18px rgb(0 0 0 / 0.18)',
        float: '0 12px 40px -12px rgb(0 0 0 / 0.28), 0 2px 6px rgb(0 0 0 / 0.06)',
      },
      transitionTimingFunction: { settle, spring },
      keyframes: {
        'page-in': { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'none' } },
        'pop-in': { from: { opacity: '0', transform: 'translateY(6px) scale(0.98)' }, to: { opacity: '1', transform: 'none' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'sheet-in': { from: { opacity: '0', transform: 'translateY(-14px)' }, to: { opacity: '1', transform: 'none' } },
        'badge-pop': { '0%': { transform: 'scale(0.4)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        shimmer: { from: { backgroundPosition: '200% 0' }, to: { backgroundPosition: '-200% 0' } },
        'route-dash': { to: { strokeDashoffset: '-24' } },
      },
      animation: {
        'page-in': `page-in 0.5s ${settle} both`,
        'pop-in': `pop-in 0.4s ${settle} both`,
        'fade-in': `fade-in 0.3s ease-out both`,
        'sheet-in': `sheet-in 0.45s ${settle} both`,
        'badge-pop': `badge-pop 0.5s ${spring} both`,
        shimmer: 'shimmer 1.6s ease-in-out infinite',
        'route-dash': 'route-dash 1.2s linear infinite',
      },
    },
  },
  plugins: [],
};
