import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FFFFFF",
        surface: "#FAFAFA",
        card: "#FFFFFF",
        border: {
          DEFAULT: "#E5E7EB",
          strong: "#D1D5DB",
        },
        ink: {
          primary: "#0A0A0A",
          secondary: "#404040",
          tertiary: "#737373",
          quaternary: "#A3A3A3",
        },
        accent: {
          DEFAULT: "#635BFF",
          hover: "#5851E0",
          subtle: "#F3F2FF",
        },
        success: {
          DEFAULT: "#0E9F6E",
          subtle: "#ECFDF5",
        },
        warning: {
          DEFAULT: "#D97706",
          subtle: "#FFFBEB",
        },
        danger: {
          DEFAULT: "#DC2626",
          subtle: "#FEF2F2",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        micro: ["11px", { lineHeight: "16px", letterSpacing: "0.02em" }],
        mini: ["12px", { lineHeight: "16px" }],
        small: ["13px", { lineHeight: "20px" }],
        base: ["14px", { lineHeight: "20px" }],
        body: ["15px", { lineHeight: "24px" }],
        lg: ["17px", { lineHeight: "24px" }],
        xl: ["20px", { lineHeight: "28px", letterSpacing: "-0.01em" }],
        "2xl": ["24px", { lineHeight: "32px", letterSpacing: "-0.015em" }],
        "3xl": ["32px", { lineHeight: "40px", letterSpacing: "-0.02em" }],
        "4xl": ["44px", { lineHeight: "48px", letterSpacing: "-0.025em" }],
        display: [
          "56px",
          {
            lineHeight: "60px",
            letterSpacing: "-0.03em",
            fontWeight: "500",
          },
        ],
      },
      borderRadius: {
        md: "6px",
        lg: "8px",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
