/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/**/*.html", "./*.html"],
  theme: {
    extend: {},
  },
  plugins: [],
  safelist: [
    "text-xs",
    "border-2",
    "border-blue-400",
    "text-red-400",
    "hover:text-red-600",
    "gap-4",
    "bg-red-500", 
    "hover:bg-red-600",
    "ml-2",
    "mt-7",
  ],
};
