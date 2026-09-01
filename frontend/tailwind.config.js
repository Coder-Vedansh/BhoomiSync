/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0b1118',
          secondary: '#111a24',
          card: '#152230',
          hover: '#1b2c3e',
          glass: 'rgba(21, 34, 48, 0.75)',
        },
        border: {
          subtle: '#1e3144',
          focus: '#10b981',
          active: '#059669',
        },
        brand: {
          emerald: '#10b981',
          'emerald-dark': '#059669',
          amber: '#f59e0b',
          cyan: '#06b6d4',
          sky: '#0ea5e9',
          rose: '#f43f5e',
          purple: '#a855f7',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '18px',
        '2xl': '24px',
      },
      boxShadow: {
        glow: '0 0 20px rgba(16, 185, 129, 0.2)',
        'cyan-glow': '0 0 20px rgba(6, 182, 212, 0.2)',
        card: '0 4px 12px -1px rgba(0, 0, 0, 0.5), 0 2px 6px -1px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
};
