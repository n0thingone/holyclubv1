import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0b0716",
        card: "#1c1030",
        "card-hover": "#261540",
        "accent-purple": "#be71ff",
        "accent-pink": "#dc8cff",
        "accent-glow": "#9b3dff",
        border: "#2d1f4a",
        "text-primary": "#f0e6ff",
        "text-muted": "#8b6aaa",
        success: "#22c55e",
        warning: "#eab308",
        danger: "#ef4444",
        gold: "#f59e0b",
      },
      fontFamily: {
        sans: ["var(--font-space)", "system-ui"],
        display: ["var(--font-orbitron)", "monospace"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        purple: "0 0 30px rgba(190,113,255,0.3)",
        "purple-sm": "0 0 15px rgba(190,113,255,0.2)",
        "purple-lg": "0 0 60px rgba(190,113,255,0.4)",
        card: "0 4px 24px rgba(0,0,0,0.5)",
      },
      backgroundImage: {
        "gradient-purple": "linear-gradient(135deg, #be71ff 0%, #dc8cff 100%)",
        "gradient-dark": "linear-gradient(180deg, #1c1030 0%, #0b0716 100%)",
        "gradient-card": "linear-gradient(135deg, #1c1030 0%, #261540 100%)",
        "mesh-bg":
          "radial-gradient(at 40% 20%, #3b1f6e 0px, transparent 50%), radial-gradient(at 80% 0%, #1e0a3c 0px, transparent 50%), radial-gradient(at 0% 50%, #2d0a5c 0px, transparent 50%)",
      },
      animation: {
        "pulse-purple": "pulse-purple 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-up": "slide-up 0.3s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        glow: "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        "pulse-purple": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "slide-up": {
          from: { transform: "translateY(10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { transform: "scale(0.95)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        glow: {
          from: { boxShadow: "0 0 20px rgba(190,113,255,0.2)" },
          to: { boxShadow: "0 0 40px rgba(190,113,255,0.5)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
