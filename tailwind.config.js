/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      // Clean, light SaaS palette: neutral greys + the brand colour as the only accent.
      colors: {
        ink: "#16151d",          // dark surfaces (avatars, dark banners)
        "ink-soft": "#24222f",
        text: "#16151d",         // main text
        body: "#3d3b4a",         // long-form text
        canvas: "#f6f6f9",       // page background
        surface: "#ffffff",      // cards, sidebar, top bar
        line: "#e8e7ee",         // borders and dividers
        muted: "#6e6c7c",        // secondary text
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
