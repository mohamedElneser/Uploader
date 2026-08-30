import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Cool graphite-indigo neutrals — a git-graph on paper, not GitHub's own blue.
        ink: {
          900: "#0d0f1a",
          800: "#181b2c",
          700: "#262a41",
          600: "#3a3f5c",
          500: "#5a5f7d",
          400: "#7d82a0",
          300: "#a7abc4",
          200: "#d3d5e6",
          100: "#e7e8f3",
          50: "#f4f4fb",
        },
        accent: {
          DEFAULT: "#5b56e8",
          hover: "#4944c9",
          subtle: "#edecfd",
        },
        signal: {
          DEFAULT: "#e8563f",
          subtle: "#fdece8",
        },
        success: {
          DEFAULT: "#0f8a5f",
          subtle: "#e5f7ef",
        },
        danger: {
          DEFAULT: "#c22b3a",
          subtle: "#fbe9ea",
        },
        warn: {
          DEFAULT: "#a8620a",
          subtle: "#fdf1de",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(13, 15, 26, 0.05), 0 1px 1px rgba(13, 15, 26, 0.03)",
        raised: "0 8px 24px -8px rgba(24, 27, 44, 0.18), 0 2px 6px rgba(24, 27, 44, 0.06)",
        focus: "0 0 0 2px rgba(91, 86, 232, 0.35)",
      },
      borderRadius: {
        DEFAULT: "8px",
        md: "10px",
        lg: "14px",
        xl: "18px",
      },
      transitionTimingFunction: {
        soft: "cubic-bezier(0.2, 0.7, 0.2, 1)",
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(180deg, rgba(91,86,232,0.06), rgba(91,86,232,0) 60%)",
      },
    },
  },
  plugins: [],
};

export default config;
