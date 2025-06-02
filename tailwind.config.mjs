/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    // Dynamic color classes for Blend Dashboard
    'bg-green-600',
    'bg-green-100',
    'bg-green-200',
    'text-green-700',
    'bg-blue-600',
    'bg-blue-100',
    'bg-blue-200',
    'text-blue-700',
    'bg-yellow-600',
    'bg-yellow-100',
    'bg-yellow-200',
    'text-yellow-700',
    'bg-purple-600',
    'bg-purple-100',
    'bg-purple-200',
    'text-purple-700',
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Riskon Custom Color Palette
        riskon: {
          'bg': '#220041',           // Dark purple background
          'primary': '#6A1B9A',      // Primary color
          'accent': '#8E24AA',       // Accent color
          'text': '#FFFFFF',         // White text
          'text-secondary': '#B39DDB', // Light purple text
          'heading': '#F3E5F5',      // Heading color
          'button': '#AB47BC',       // Button color
          'hover': '#9C27B0',        // Hover effect
          'card': 'rgba(139, 69, 19, 0.1)', // Card background (light transparent)
          'border': '#8E24AA',       // Border color
        }
      },
      fontFamily: {
        'montserrat': ['Montserrat', 'sans-serif'],
        'roboto': ['Roboto', 'sans-serif'],
        'open-sans': ['Open Sans', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'riskon': '0 10px 25px -3px rgba(139, 69, 19, 0.4), 0 4px 6px -2px rgba(139, 69, 19, 0.2)',
        'riskon-lg': '0 20px 25px -5px rgba(139, 69, 19, 0.5), 0 10px 10px -5px rgba(139, 69, 19, 0.3)',
      },
      animation: {
        'gradient': 'gradient 15s ease infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        }
      }
    },
  },
  plugins: [],
};
