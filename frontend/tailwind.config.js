/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cp: {
          bg: "var(--cp-bg)",
          elevated: "var(--cp-bg-elevated)",
          surface: "var(--cp-surface)",
          soft: "var(--cp-surface-soft)",
          border: "var(--cp-border)",
          strong: "var(--cp-border-strong)",
          text: "var(--cp-text)",
          muted: "var(--cp-text-muted)",
          accent: "var(--cp-accent)",
          success: "var(--cp-success)",
          danger: "var(--cp-danger)",
          warning: "var(--cp-warning)",
          link: "var(--cp-link)"
        }
      },
      fontFamily: {
        sans: ['"Segoe UI"', "Aptos", "Calibri", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["Consolas", '"Courier New"', "Courier", "monospace"]
      }
    }
  },
  plugins: []
};
