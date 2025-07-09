// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        pixelify: ["'Pixelify Sans'", "sans-serif", "Silkscreen", "cursive"],
      },
    },
  },
  plugins: [],
};
