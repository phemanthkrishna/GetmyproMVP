import type { Config } from 'tailwindcss'

// Logo-extracted brand colors
// Blue  : #1D6FD9 (upper-left of logo gradient)
// Orange: #E85520 (lower-right of logo gradient)

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Nunito', 'sans-serif'],
        body: ['Manrope', 'sans-serif'],
      },
      // Override blue & orange with logo-derived palettes so all existing
      // Tailwind classes (blue-500, orange-400, etc.) automatically reflect
      // the brand colours without touching individual component files.
      colors: {
        blue: {
          50:  '#EEF5FF',
          100: '#DDEAFF',
          200: '#B8D3FF',
          300: '#84AEFF',
          400: '#4D84F0',
          500: '#1D6FD9', // ← logo blue
          600: '#1558B0',
          700: '#0F4289',
          800: '#0B3068',
          900: '#071E46',
          950: '#040F25',
        },
        orange: {
          50:  '#FFF4EE',
          100: '#FFE5D0',
          200: '#FFC9A0',
          300: '#FFA368',
          400: '#F37540',
          500: '#E85520', // ← logo orange
          600: '#C44012',
          700: '#9E2F0A',
          800: '#7A2106',
          900: '#521303',
          950: '#2A0801',
        },
        // Semantic aliases used by Button/Input components
        primary: '#1D6FD9',
        accent:  '#E85520',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #1D6FD9 0%, #E85520 100%)',
        'brand-gradient-subtle': 'linear-gradient(135deg, #1D6FD910 0%, #E8552010 100%)',
      },
      boxShadow: {
        'brand': '0 4px 24px 0 rgba(29,111,217,0.25)',
        'accent': '0 4px 24px 0 rgba(232,85,32,0.25)',
      },
    },
  },
  plugins: [],
}

export default config
