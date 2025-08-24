// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Important: This tells Tailwind CSS where to look for your utility classes
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};