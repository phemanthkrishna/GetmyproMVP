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
        primary: '#3B82F6',
        accent: '#F97316',
      },
    },
  },
  plugins: [],
}

export default config
