"use client";

import { memo } from "react";
import { dustStyle } from "@/styles/careeros-design-system";

/* ─────────────────────────────────────────────────────────────────────────────
   LiquidDust — Atmospheric corner particle layer
   Renders a single pointer-events-none absolute div that creates the
   CareerOS signature "dust lighting" effect.

   Usage:
     <LiquidDust origin="tr" />
     <LiquidDust origin="bl" color="indigo" intensity={0.05} size={200} />
   ───────────────────────────────────────────────────────────────────────────── */

type DustOrigin = "tr" | "bl" | "tl" | "br";
type DustColor  = "cyan" | "indigo" | "amber" | "rose" | "slate";

interface LiquidDustProps {
  /** Corner origin */
  origin: DustOrigin;
  /** Tint color (default: "cyan" for tr, "indigo" for bl) */
  color?: DustColor;
  /** Opacity multiplier 0–1 (default: 0.06) */
  intensity?: number;
  /** Gradient ellipse radius in px (default: 220) */
  size?: number;
}

const COLOR_MAP: Record<DustColor, string> = {
  cyan:   "34,211,238",
  indigo: "96,165,250",
  amber:  "245,158,11",
  rose:   "239,68,68",
  slate:  "148,163,184",
};

const ORIGIN_KEY_MAP: Record<DustOrigin, "topRight" | "bottomLeft" | "topLeft" | "bottomRight"> = {
  tr: "topRight",
  bl: "bottomLeft",
  tl: "topLeft",
  br: "bottomRight",
};

const DEFAULT_COLORS: Record<DustOrigin, DustColor> = {
  tr: "cyan",
  bl: "indigo",
  tl: "cyan",
  br: "indigo",
};

function LiquidDustComponent({
  origin,
  color,
  intensity = 0.06,
  size = 220,
}: LiquidDustProps) {
  const resolvedColor = color ?? DEFAULT_COLORS[origin];
  const rgb = COLOR_MAP[resolvedColor];
  const originKey = ORIGIN_KEY_MAP[origin];

  // Override the gradient with the resolved color and size
  const style = {
    ...dustStyle(originKey, intensity),
    backgroundImage: `radial-gradient(ellipse ${size}px ${Math.round(size * 0.8)}px at ${
      originKey === "topRight" || originKey === "bottomRight" ? "right" : "left"
    } ${
      originKey === "topRight" || originKey === "topLeft" ? "top" : "bottom"
    }, rgba(${rgb},0.09), transparent 70%)`,
    width:  `${size + 20}px`,
    height: `${Math.round(size * 0.85)}px`,
  };

  return <div aria-hidden style={style} />;
}

export const LiquidDust = memo(LiquidDustComponent);
