/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0e211a",
        "ink-soft": "#183a2e",
        text: "#14231d",
        canvas: "#f5f7f5",
        surface: "#ffffff",
        line: "#e6eae7",
        muted: "#647169",
        brand: {
          DEFAULT: "#0f9d6a",
          dark: "#0b7d54",
          tint: "#e7f5ee",
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
