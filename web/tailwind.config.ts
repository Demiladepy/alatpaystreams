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
        forest: {
          DEFAULT: "#0F3D2E",
          light: "#1A5C45",
          muted: "#2D6A4F",
        },
        cream: {
          DEFAULT: "#FAF6F0",
          dark: "#F0EBE3",
        },
        gold: {
          DEFAULT: "#D4A24C",
          light: "#E8C47A",
        },
        warning: {
          DEFAULT: "#B5443A",
          light: "#D4655C",
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        border: "var(--border)",
        ring: "var(--ring)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "0 2px 16px -4px rgba(15, 61, 46, 0.08), 0 4px 24px -8px rgba(15, 61, 46, 0.06)",
        "card-hover": "0 4px 24px -4px rgba(15, 61, 46, 0.12), 0 8px 32px -8px rgba(15, 61, 46, 0.08)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
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
