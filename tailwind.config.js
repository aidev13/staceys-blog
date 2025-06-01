/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.html",
    "./*.html"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
    safelist: [
    "border-2",
    "border-blue-400",
  ],
}