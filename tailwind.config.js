/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17162b",
        "ink-soft": "#252142",
        text: "#14231d",
        canvas: "#f5f7f5",
        surface: "#ffffff",
        line: "#e6eae7",
        muted: "#647169",
        brand: {
          DEFAULT: "rgb(var(--brand-rgb) / <alpha-value>)",
          dark: "rgb(var(--brand-dark-rgb) / <alpha-value>)",
          tint: "rgb(var(--brand-tint-rgb) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(14,33,26,0.04), 0 8px 24px -12px rgba(14,33,26,0.10)",
      },
    },
  },
  plugins: [],
};
