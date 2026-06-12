"use client";

import { memo, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "@/components/theme-provider";

const themeImageMap: Record<string, string> = {
  "careeros-dark": "/background.webp",
  "theme-executive": "/back1.webp",
  "theme-wealth": "/back2.webp",
  "theme-innovation": "/back3.webp",
  "theme-tech-luxury": "/back4.webp",
  "theme-finance": "/back5.webp",
  "theme-scandinavian": "/back6.webp",
  "theme-ai-lab": "/back7.webp",
  "theme-eco": "/back8.webp",
  "theme-enterprise": "/back9.webp",
  "theme-minimal": "/back10.webp",
};

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
  const { theme } = useTheme();
  const bgImage = themeImageMap[theme] || "/background.webp";

  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    
    // Initial check
    handleResize();

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 w-[100vw] h-[100vh] pointer-events-none z-[-10] overflow-hidden bg-[#030712]">

      {/* ── Layer 1: Base WebP canvas (Crossfade Stack) ──────────────────── */}
      <div
        className="absolute top-1/2 left-1/2"
        style={{
          width: isPortrait ? "100vh" : "100vw",
          height: isPortrait ? "100vw" : "100vh",
          transform: `translate(-50%, -50%) rotate(${isPortrait ? "-90deg" : "0deg"})`,
          transition: "transform 600ms cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: "transform",
        }}
      >
        <AnimatePresence initial={false}>
          <motion.div
            key={bgImage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 w-full h-full"
            style={{
              backgroundImage:    `url('${bgImage}')`,
              backgroundSize:     "contain",
              backgroundPosition: "center center",
              backgroundRepeat:   "no-repeat",
              filter:             "brightness(0.85) contrast(1.05) saturate(0.95)",
              willChange:         "opacity",
            }}
          />
        </AnimatePresence>
      </div>



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
