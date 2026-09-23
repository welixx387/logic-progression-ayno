/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Unbounded', 'Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        ink: token('ink'),
        muted: token('muted'),
        faint: token('faint'),
        line: token('line'),
        accent: { DEFAULT: token('accent'), soft: token('accent-soft'), ink: token('accent-ink') },
        good: { DEFAULT: token('good'), soft: token('good-soft') },
        bad: { DEFAULT: token('bad'), soft: token('bad-soft') },
        warn: { DEFAULT: token('warn'), soft: token('warn-soft') },
        lvl1: token('lvl1'),
        lvl2: token('lvl2'),
        lvl3: token('lvl3'),
        lvl4: token('lvl4'),
        lvl5: token('lvl5'),
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px',
        '3xl': '28px',
      },
      boxShadow: {
        card: '0 1px 2px rgb(var(--shadow) / 0.06), 0 8px 24px -12px rgb(var(--shadow) / 0.18)',
        lift: '0 2px 4px rgb(var(--shadow) / 0.06), 0 18px 40px -18px rgb(var(--shadow) / 0.35)',
      },
      keyframes: {
        rise: { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
        pop: { '0%': { transform: 'scale(0.96)' }, '60%': { transform: 'scale(1.02)' }, '100%': { transform: 'scale(1)' } },
        shake: { '0%,100%': { transform: 'translateX(0)' }, '25%': { transform: 'translateX(-5px)' }, '75%': { transform: 'translateX(5px)' } },
      },
      animation: {
        rise: 'rise 260ms cubic-bezier(0.22, 1, 0.36, 1)',
        pop: 'pop 320ms cubic-bezier(0.22, 1, 0.36, 1)',
        shake: 'shake 260ms ease-in-out',
      },
    },
  },
  plugins: [],
}
