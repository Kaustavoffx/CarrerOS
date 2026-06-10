"use client";

import { memo, ComponentPropsWithoutRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CAREEROS } from "@/styles/careeros-design-system";
import { LiquidDust } from "@/components/ui/liquid-dust";

/* ─────────────────────────────────────────────────────────────────────────────
   CardSurface — Universal card component for the CareerOS platform.

   Every data card, panel, widget, and module renders through this.
   No inline bg/border Tailwind blobs. No per-page custom cards.

   Usage:
     <CardSurface>
       <p>Content</p>
     </CardSurface>

     <CardSurface dust="tr" variant="glass" hover interactive>
       <CardContent />
     </CardSurface>

     <CardSurface tag="article" dust="both" noPadding className="p-0">
       <img ... />
     </CardSurface>
   ───────────────────────────────────────────────────────────────────────────── */

export type CardVariant = "surface" | "glass";
export type CardDust    = "tr" | "bl" | "both" | "none";
export type CardTag     = "div" | "article" | "section" | "li";

interface CardSurfaceOwnProps {
  /** Visual variant:
   *  "surface" — rich gradient (default) · more opaque · premium depth
   *  "glass"   — translucent · shows background · more airy */
  variant?: CardVariant;
  /** Atmospheric dust corner origin.
   *  "tr" = top-right cyan · "bl" = bottom-left indigo
   *  "both" = both corners · "none" = disabled (default) */
  dust?: CardDust;
  /** Enable hover lift + glow animation (default false) */
  hover?: boolean;
  /** Add cursor-pointer + focus ring for clickable cards */
  interactive?: boolean;
  /** Remove default padding (p-6) for full-bleed content */
  noPadding?: boolean;
  /** HTML element to render (default "div") */
  tag?: CardTag;
  /** Extra className — for layout only (width, grid, margin, padding overrides).
   *  Never put surface styles here — they belong in the variant system. */
  className?: string;
  children: React.ReactNode;
}

type CardSurfaceProps = CardSurfaceOwnProps &
  Omit<ComponentPropsWithoutRef<"div">, keyof CardSurfaceOwnProps>;

const { CARDS, GLASS, SHADOWS, COLORS, MOTION } = CAREEROS;

/* Resting surface styles per variant */
const VARIANT_STYLE: Record<CardVariant, React.CSSProperties> = {
  surface: {
    background:   CARDS.surface.background,
    border:       CARDS.surface.border,
    boxShadow:    CARDS.surface.boxShadow,
    borderRadius: CARDS.surface.borderRadius,
    position:     "relative",
    overflow:     "hidden",
    ...GLASS.surface,
  },
  glass: {
    background:   CARDS.glass.background,
    border:       CARDS.glass.border,
    boxShadow:    CARDS.glass.boxShadow,
    borderRadius: CARDS.glass.borderRadius,
    position:     "relative",
    overflow:     "hidden",
    ...GLASS.surface,
  },
};

function CardSurfaceComponent({
  variant    = "surface",
  dust       = "none",
  hover      = false,
  interactive= false,
  noPadding  = false,
  tag        = "div",
  className  = "",
  children,
  ...rest
}: CardSurfaceProps) {
  const prefersReducedMotion = useReducedMotion();

  const baseStyle = VARIANT_STYLE[variant];

  const extraProps = interactive
    ? { tabIndex: 0, role: "button" as const }
    : {};

  const classes = [
    "relative overflow-hidden",
    noPadding ? "" : "p-6",
    interactive ? "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-transparent" : "",
    className,
  ].filter(Boolean).join(" ");

  // Framer Motion custom component for the tag
  const MotionEl = motion[tag as keyof typeof motion] as typeof motion.div;

  return (
    <MotionEl
      {...(rest as object)}
      {...extraProps}
      style={baseStyle}
      className={classes}
      whileHover={
        hover && !prefersReducedMotion
          ? {
              scale:       CARDS.motion.scale,
              y:           CARDS.motion.y,
              borderColor: COLORS.accentBdr,
              boxShadow:   SHADOWS.hover,
            }
          : undefined
      }
      whileTap={
        interactive && !prefersReducedMotion
          ? { scale: 0.985, y: 0, transition: { duration: 0.08 } }
          : undefined
      }
      transition={
        hover
          ? { duration: CARDS.motion.duration, ease: MOTION.ease }
          : undefined
      }
    >
      {/* ── Atmospheric dust layers (behind content) ──────────────── */}
      {(dust === "tr" || dust === "both") && (
        <LiquidDust origin="tr" color="cyan"   intensity={0.065} />
      )}
      {(dust === "bl" || dust === "both") && (
        <LiquidDust origin="bl" color="indigo" intensity={0.055} />
      )}

      {/* ── Content sits above dust layers ───────────────────────── */}
      <div className="relative z-10">
        {children}
      </div>
    </MotionEl>
  );
}

export const CardSurface = memo(CardSurfaceComponent);
