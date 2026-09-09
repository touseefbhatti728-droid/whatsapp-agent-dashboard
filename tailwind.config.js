/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f1e1a",
        canvas: "#f6f7f5",
        line: "#e4e7e4",
        muted: "#5b6b64",
        brand: {
          DEFAULT: "#12805c",
          dark: "#0e6a4d",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
