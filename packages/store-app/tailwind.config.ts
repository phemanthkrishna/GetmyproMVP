import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Nunito', 'sans-serif'],
        body: ['Manrope', 'sans-serif'],
      },
      colors: {
        blue: {
          50: '#EEF5FF', 100: '#DDEAFF', 200: '#B8D3FF', 300: '#84AEFF',
          400: '#4D84F0', 500: '#1D6FD9', 600: '#1558B0', 700: '#0F4289',
          800: '#0B3068', 900: '#071E46', 950: '#040F25',
        },
        orange: {
          50: '#FFF4EE', 100: '#FFE5D0', 200: '#FFC9A0', 300: '#FFA368',
          400: '#F37540', 500: '#E85520', 600: '#C44012', 700: '#9E2F0A',
          800: '#7A2106', 900: '#521303', 950: '#2A0801',
        },
        primary: '#1D6FD9',
        accent: '#E85520',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #1D6FD9 0%, #E85520 100%)',
      },
    },
  },
  plugins: [],
}

export default config
