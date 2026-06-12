/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Dark, energetic palette inspired by Arrow.
        background: '#0B0F14',
        surface: '#151B23',
        'surface-2': '#1E2630',
        border: '#2A3441',
        primary: '#22C55E',
        'primary-dim': '#16803C',
        accent: '#F59E0B',
        danger: '#EF4444',
        muted: '#8B98A9',
      },
    },
  },
  plugins: [],
};
