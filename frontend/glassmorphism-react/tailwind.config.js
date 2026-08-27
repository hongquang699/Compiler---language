/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        glass: {
          light: 'rgba(255, 255, 255, 0.12)',
          border: 'rgba(255, 255, 255, 0.2)',
          dark: 'rgba(15, 23, 42, 0.45)',
          'dark-border': 'rgba(255, 255, 255, 0.08)',
          highlight: 'rgba(255, 255, 255, 0.25)',
        }
      },
      boxShadow: {
        // Soft ambient shadows
        'glass-sm': '0 4px 16px 0 rgba(31, 38, 135, 0.07)',
        'glass-md': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'glass-lg': '0 20px 50px 0 rgba(0, 0, 0, 0.2)',
        'glass-hover': '0 15px 35px 0 rgba(31, 38, 135, 0.25)',
        
        // Colored Soft Ambient Glows
        'glow-cyan': '0 0 25px -5px rgba(6, 182, 212, 0.35)',
        'glow-indigo': '0 0 25px -5px rgba(99, 102, 241, 0.35)',
        'glow-purple': '0 0 25px -5px rgba(168, 85, 247, 0.35)',
        'glow-rose': '0 0 25px -5px rgba(244, 63, 94, 0.35)',
        
        // Inner Glass Highlights
        'glass-inset': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.3)',
      },
      backdropBlur: {
        'xs': '2px',
        '2xl': '40px',
        '3xl': '60px',
      },
      animation: {
        'float-slow': 'float 8s ease-in-out infinite',
        'float-reverse': 'float-reverse 10s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 4s ease-in-out infinite',
        'shine': 'shine 2.5s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) scale(1)' },
          '50%': { transform: 'translateY(-20px) scale(1.05)' },
        },
        'float-reverse': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(25px) rotate(10deg)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: 0.4, transform: 'scale(1)' },
          '50%': { opacity: 0.8, transform: 'scale(1.1)' },
        },
        shine: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        }
      }
    },
  },
  plugins: [],
}
