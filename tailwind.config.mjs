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
      },
    },
  },
  plugins: [],
};
