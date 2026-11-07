/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      // Palette from CSS variables (globals.css): light for customers, dark for the admin command center.
      colors: {
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        "ink-soft": "rgb(var(--c-ink-soft) / <alpha-value>)",
        text: "rgb(var(--c-text) / <alpha-value>)",
        body: "rgb(var(--c-body) / <alpha-value>)",
        canvas: "rgb(var(--c-canvas) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        line: "rgb(var(--c-line) / <alpha-value>)",
        muted: "rgb(var(--c-muted) / <alpha-value>)",
        brand: {
          DEFAULT: "rgb(var(--brand-rgb) / <alpha-value>)",
          dark: "rgb(var(--brand-dark-rgb) / <alpha-value>)",
          tint: "rgb(var(--brand-tint-rgb) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ['Inter', '"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(22,21,29,0.04), 0 1px 3px rgba(22,21,29,0.04)",
        pop: "0 12px 32px -12px rgba(22,21,29,0.18), 0 2px 6px rgba(22,21,29,0.06)",
      },
    },
  },
  plugins: [],
};
