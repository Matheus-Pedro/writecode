/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0A0A0C",
          900: "#0F0F13",
          800: "#16161B",
          700: "#1E1E25",
          600: "#26262E",
        },
        accent: {
          DEFAULT: "#8B7CF6",
          hover: "#9C8FFB",
          soft: "rgba(139, 124, 246, 0.12)",
          ring: "rgba(139, 124, 246, 0.5)",
        },
      },
      fontFamily: {
        sans: ["Inter Variable", "Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono Variable", "JetBrains Mono", "ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "12px",
      },
      boxShadow: {
        elevated: "0 12px 32px -8px rgba(0, 0, 0, 0.5)",
        pop: "0 4px 12px rgba(0, 0, 0, 0.35)",
      },
      maxWidth: {
        shell: "1080px",
      },
      keyframes: {
        blink: {
          "0%, 45%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        blink: "blink 1.1s step-end infinite",
      },
    },
  },
  plugins: [],
};
