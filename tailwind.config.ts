import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./pages/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        geom: ["var(--font-geom)", "system-ui", "-apple-system", "sans-serif"],
        sinistre: ["var(--font-sinistre)", "serif"],
      },
      fontSize: {
        "hero-display": ["72px", { lineHeight: "1.0", letterSpacing: "-0.05em" }],
        "hero": ["56px", { lineHeight: "1.05", letterSpacing: "-0.04em" }],
        "section": ["40px", { lineHeight: "1.1", letterSpacing: "-0.03em" }],
        "dashboard": ["32px", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        "card-title": ["20px", { lineHeight: "1.25", letterSpacing: "-0.015em" }],
        "body-size": ["16px", { lineHeight: "1.45", letterSpacing: "-0.005em" }],
        "small-size": ["14px", { lineHeight: "1.4", letterSpacing: "0" }],
        "caption-size": ["12px", { lineHeight: "1.3", letterSpacing: "0.28em" }],
      },
      boxShadow: {
        glow: "0 0 45px rgba(95, 183, 255, 0.25)",
        panel: "0 25px 90px rgba(0, 0, 0, 0.45)"
      },
      backgroundImage: {
        "futuristic-radial":
          "radial-gradient(circle at top left, rgba(95, 183, 255, 0.18), transparent 30%), radial-gradient(circle at top right, rgba(159, 124, 255, 0.16), transparent 24%), linear-gradient(180deg, rgba(7, 8, 15, 1) 0%, rgba(4, 5, 10, 1) 100%)"
      }
    }
  },
  plugins: []
};

export default config;