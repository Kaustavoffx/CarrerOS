"use client";

import { memo } from "react";

/**
 * CareerOS Liquid Intelligence System — Global Atmospheric Background
 *
 * Layer stack (bottom to top):
 * 1. WebP background image — textured depth canvas
 * 2. Dark depth gradient — deepens the canvas to #030712
 * 3. Top-right cyan ambient vignette — 2% opacity, 500px radius
 * 4. Bottom-left indigo ambient vignette — 1.5% opacity, 400px radius
 * 5. Subtle noise texture overlay — adds microscopic grain for premium feel
 * 6. Dot matrix grid — ultra-low opacity structural rhythm
 */
function CareerOSBackgroundComponent() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[-10] overflow-hidden">

      {/* ── Layer 1: Base WebP canvas ───────────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:    "var(--theme-bg-image, url('/background.webp'))",
          backgroundSize:     "cover",
          backgroundPosition: "center",
          backgroundRepeat:   "no-repeat",
          filter:             "brightness(0.85) contrast(1.05) saturate(0.95)",
        }}
      />

      {/* ── Layer 2: Deep atmospheric gradient — anchors to #030712 ─────── */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(
              180deg,
              rgba(3, 7, 18, 0.40)  0%,
              rgba(3, 7, 18, 0.25) 40%,
              rgba(3, 7, 18, 0.35) 70%,
              rgba(3, 7, 18, 0.60) 100%
            )
          `,
        }}
      />

      {/* ── Layer 3: Top-right cyan ambient vignette ────────────────────── */}
      {/* CareerOS atmospheric dust — top-right origin, ultra-subtle */}
      <div
        className="absolute"
        style={{
          top:      "-120px",
          right:    "-120px",
          width:    "600px",
          height:   "500px",
          background: "radial-gradient(ellipse at center, rgba(var(--careeros-dust-primary),0.055) 0%, transparent 65%)",
          filter:   "blur(60px)",
          pointerEvents: "none",
        }}
      />
 
      {/* ── Layer 4: Bottom-left indigo ambient vignette ─────────────────── */}
      {/* Secondary dust — bottom-left origin, blue tint for depth */}
      <div
        className="absolute"
        style={{
          bottom:   "-100px",
          left:     "-80px",
          width:    "520px",
          height:   "420px",
          background: "radial-gradient(ellipse at center, rgba(var(--careeros-dust-secondary),0.040) 0%, transparent 65%)",
          filter:   "blur(55px)",
          pointerEvents: "none",
        }}
      />

      {/* ── Layer 5: Center depth darkener — prevents washed-out midfield ── */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 100% 60% at 50% 50%, transparent 0%, rgba(3,7,18,0.15) 100%)",
        }}
      />

      {/* ── Layer 6: Dot matrix grid — structural rhythm at 2.5% opacity ── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.055) 1px, transparent 1px)",
          backgroundSize:  "28px 28px",
          opacity:         0.025,
        }}
      />

    </div>
  );
}

export const CareerOSBackground = memo(CareerOSBackgroundComponent);
