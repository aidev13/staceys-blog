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
    "bg-yellow-500",
    "hover:bg-yellow-600",
    "text-black",
    "px-3",
    "py-1",
    "rounded",
    "text-sm",
    "font-medium",
    "transition-colors",
    "duration-200"
  ],
};