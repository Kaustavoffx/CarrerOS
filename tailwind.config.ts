import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./pages/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    fontFamily: {
      sans: ["var(--font-geom)"],
      geom: ["var(--font-geom)"],
    },
    extend: {
      // ── CareerOS Liquid Intelligence System — Color Palette ──────────────
      colors: {
        cos: {
          bg:        "#030712",
          surface:   "rgba(9,15,30,0.72)",
          accent:    "#22D3EE",
          "accent-2":"#60A5FA",
          success:   "#10B981",
          warning:   "#F59E0B",
          danger:    "#EF4444",
          text:      "#F8FAFC",
          secondary: "#94A3B8",
          muted:     "#64748B",
        },
      },
      // ── LIS Border Radius ─────────────────────────────────────────────────
      borderRadius: {
        lis:    "24px",
        "lis-sm": "16px",
        "lis-xs": "12px",
      },
      // ── LIS Box Shadows ───────────────────────────────────────────────────
      boxShadow: {
        glow:       "0 0 45px rgba(34,211,238,0.25)",
        panel:      "0 25px 90px rgba(0,0,0,0.45)",
        "lis-card": "inset 0 1px 0 rgba(255,255,255,0.12), 0 20px 60px rgba(0,0,0,0.45)",
        "lis-hover":"inset 0 1px 0 rgba(255,255,255,0.12), 0 30px 80px rgba(34,211,238,0.12)",
        "lis-sidebar": "4px 0 60px rgba(0,0,0,0.4), inset -1px 0 0 rgba(255,255,255,0.04)",
      },
      // ── LIS Backdrop Blur ─────────────────────────────────────────────────
      backdropBlur: {
        lis:    "30px",
        "lis-2":"40px",
      },
      backdropSaturate: {
        lis: "180%",
      },
      // ── Typography Scale ──────────────────────────────────────────────────
      fontSize: {
        "hero-display": ["72px", { lineHeight: "1.0",  letterSpacing: "-0.05em" }],
        "hero":         ["56px", { lineHeight: "1.05", letterSpacing: "-0.04em" }],
        "section":      ["40px", { lineHeight: "1.1",  letterSpacing: "-0.03em" }],
        "dashboard":    ["32px", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        "card-title":   ["20px", { lineHeight: "1.25", letterSpacing: "-0.015em"}],
        "body-size":    ["16px", { lineHeight: "1.45", letterSpacing: "-0.005em"}],
        "small-size":   ["14px", { lineHeight: "1.4",  letterSpacing: "0"       }],
        "caption-size": ["12px", { lineHeight: "1.3",  letterSpacing: "0.28em"  }],
      },
      // ── LIS Background Images ─────────────────────────────────────────────
      backgroundImage: {
        "futuristic-radial":
          "radial-gradient(circle at top left, rgba(34,211,238,0.10), transparent 30%), radial-gradient(circle at bottom right, rgba(96,165,250,0.08), transparent 30%), linear-gradient(180deg, rgba(3,7,18,1) 0%, rgba(2,5,12,1) 100%)",
        "lis-dust-tr":
          "radial-gradient(ellipse 220px 160px at top right, rgba(34,211,238,0.07), transparent 70%)",
        "lis-dust-bl":
          "radial-gradient(ellipse 200px 160px at bottom left, rgba(96,165,250,0.06), transparent 70%)",
      },
      // ── LIS Animation Durations ───────────────────────────────────────────
      transitionDuration: {
        "lis": "220ms",
      },
      transitionTimingFunction: {
        "lis": "cubic-bezier(0.16,1,0.3,1)",
      },
    },
  },
  plugins: [],
};

export default config;