/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        steel: {
          950: '#0B1013',
          900: '#0F1417',
          800: '#151C20',
          700: '#1A2226',
          600: '#232C31',
          500: '#2A343A',
          400: '#4A575E',
          300: '#6B7A82',
          200: '#8A9AA3',
          100: '#C4CDD2',
          50: '#E8EDEF'
        },
        amber: {
          DEFAULT: '#F2A93B',
          light: '#F7C374',
          dark: '#C4831F'
        },
        ok: '#4FAE7C',
        danger: '#E0524A',
        info: '#4C8DFF',
        warn: '#E0A93B'
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace']
      },
      backgroundImage: {
        'grid-lines': 'linear-gradient(rgba(242,169,59,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(242,169,59,0.04) 1px, transparent 1px)'
      },
      backgroundSize: {
        grid: '32px 32px'
      }
    },
  },
  plugins: [],
}
