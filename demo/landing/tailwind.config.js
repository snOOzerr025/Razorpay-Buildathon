/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: '#08080B',
        surface: '#111116',
        ink: '#F3F2EE',
        'ink-dim': '#8B8B93',
        signal: '#2E21DE',
        hairline: '#232329',
        'ledger-green': '#1FAE7A',
        'exception-amber': '#E3A23C',
        'exception-red': '#C24C4C',
      },
      fontFamily: {
        display: ['"General Sans"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
