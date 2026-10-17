/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          50: "#f2f7f3",
          100: "#e0ece3",
          200: "#c2d9c9",
          300: "#98bfa4",
          400: "#6d9f7c",
          500: "#4c7a58",
          600: "#3f6b4f",
          700: "#2f5d3a",
          800: "#264c31",
          900: "#1d3b27",
        },
        cream: {
          50: "#fffdf7",
          100: "#faf6ee",
          200: "#f3ecdc",
          300: "#e7dfcf",
        },
        blush: {
          400: "#e39aad",
          500: "#d98a9e",
          600: "#c96f87",
        },
        marigold: {
          400: "#f0b25a",
          500: "#e9a13b",
          600: "#d98726",
        },
      },
      fontFamily: {
        display: ["Georgia", "Cambria", "Times New Roman", "serif"],
        body: [
          "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto",
          "Helvetica Neue", "Arial", "Noto Sans", "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 3px rgba(29, 59, 39, 0.08), 0 4px 14px rgba(29, 59, 39, 0.06)",
        lift: "0 6px 24px rgba(29, 59, 39, 0.14)",
      },
    },
  },
  plugins: [],
};
