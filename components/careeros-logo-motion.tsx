"use client";

import { motion, useAnimation, Variants } from "framer-motion";
import { useEffect, forwardRef, useImperativeHandle } from "react";

export interface CareerosLogoMotionRef {
  assemble: () => Promise<void>;
  pulseWave: () => Promise<void>;
  collapse: () => Promise<void>;
  transitionPulse: () => Promise<void>;
}

interface CareerosLogoMotionProps {
  size?: number;
  className?: string;
  variant?: "intro" | "transition" | "loader";
}

// 120fps optimized bezier curves (Apple/Linear feel)
const mechanicalEase = [0.16, 1, 0.3, 1] as const;
const slowPulseEase = [0.25, 0.1, 0.25, 1] as const;

export const CareerosLogoMotion = forwardRef<CareerosLogoMotionRef, CareerosLogoMotionProps>(
  ({ size = 120, className = "", variant = "intro" }, ref) => {
    const outerControls = useAnimation();
    const innerControls = useAnimation();
    const coreControls = useAnimation();

    // Expose methods to orchestrator
    useImperativeHandle(ref, () => ({
      async assemble() {
        // Phase 2: Precision Assembly
        await outerControls.start("assemble");
        await innerControls.start("assemble");
        await coreControls.start("assemble");
      },
      async pulseWave() {
        // Phase 3/5: Logo Wakes / Sync wave
        outerControls.start("pulse");
        innerControls.start("pulse");
        await coreControls.start("pulse");
      },
      async collapse() {
        // Final pulse for Phase 6
        await coreControls.start("finalPulse");
      },
      async transitionPulse() {
        // Miniature transition pulse used in navigation
        outerControls.start("transitionPulse");
        innerControls.start("transitionPulse");
        await coreControls.start("transitionPulse");
      }
    }));

    useEffect(() => {
      if (variant === "loader") {
        outerControls.start("loadingLoop");
        innerControls.start("loadingLoop");
        coreControls.start("loadingLoop");
      }
    }, [variant, outerControls, innerControls, coreControls]);

    const outerRingVariants: Variants = {
      initial: { pathLength: 0, opacity: 0, rotate: -135, scale: 0.98 },
      assemble: {
        pathLength: [0, 0.8], // "C" shape gap
        opacity: [0, 1],
        rotate: [-135, 45], // Precise magnetic lock
        scale: [0.98, 1],
        transition: { duration: 0.8, ease: mechanicalEase },
      },
      pulse: {
        scale: [1, 1.02, 1],
        filter: [
          "drop-shadow(0px 0px 0px rgba(34,211,238,0))",
          "drop-shadow(0px 0px 8px rgba(34,211,238,0.4))",
          "drop-shadow(0px 0px 0px rgba(34,211,238,0))",
        ],
        transition: { duration: 1.2, ease: slowPulseEase },
      },
      transitionPulse: {
        pathLength: [0, 0.8, 0.8],
        opacity: [0, 1, 0.8],
        scale: [0.9, 1.05, 1],
        rotate: [-135, 45, 45],
        transition: { duration: 0.4, ease: mechanicalEase },
      },
      loadingLoop: {
        pathLength: [0.1, 0.8, 0.1],
        rotate: [0, 360],
        transition: { duration: 2, repeat: Infinity, ease: "linear" },
      },
    };

    const innerRingVariants: Variants = {
      initial: { pathLength: 0, opacity: 0, scale: 0.9, rotate: 90 },
      assemble: {
        pathLength: [0, 1],
        opacity: [0, 1],
        scale: [0.9, 1],
        rotate: [90, 0],
        transition: { duration: 0.6, ease: mechanicalEase },
      },
      pulse: {
        scale: [1, 1.03, 1],
        filter: [
          "drop-shadow(0px 0px 0px rgba(34,211,238,0))",
          "drop-shadow(0px 0px 12px rgba(34,211,238,0.6))",
          "drop-shadow(0px 0px 0px rgba(34,211,238,0))",
        ],
        transition: { duration: 1.2, delay: 0.1, ease: slowPulseEase },
      },
      transitionPulse: {
        pathLength: [0, 1, 1],
        opacity: [0, 1, 0.8],
        scale: [0.8, 1, 1],
        rotate: [90, 0, 0],
        transition: { duration: 0.4, delay: 0.05, ease: mechanicalEase },
      },
      loadingLoop: {
        pathLength: [0.8, 0.2, 0.8],
        rotate: [360, 0],
        transition: { duration: 1.8, repeat: Infinity, ease: "linear" },
      },
    };

    const coreVariants: Variants = {
      initial: { scale: 0, opacity: 0, filter: "drop-shadow(0 0 0px #22d3ee)" },
      assemble: {
        scale: [0, 1],
        opacity: [0, 1],
        filter: [
          "drop-shadow(0 0 0px #22d3ee)",
          "drop-shadow(0 0 20px #22d3ee)",
          "drop-shadow(0 0 8px #22d3ee)"
        ],
        transition: { type: "spring", stiffness: 400, damping: 25 },
      },
      pulse: {
        scale: [1, 1.15, 1],
        filter: [
          "drop-shadow(0 0 8px #22d3ee)",
          "drop-shadow(0 0 24px #22d3ee)",
          "drop-shadow(0 0 8px #22d3ee)"
        ],
        transition: { duration: 1.2, delay: 0.2, ease: slowPulseEase },
      },
      finalPulse: {
        scale: [1, 1.4, 1],
        filter: [
          "drop-shadow(0 0 8px #22d3ee)",
          "drop-shadow(0 0 40px #22d3ee)",
          "drop-shadow(0 0 12px #22d3ee)"
        ],
        transition: { duration: 1.5, ease: slowPulseEase },
      },
      transitionPulse: {
        scale: [0, 1.2, 1],
        opacity: [0, 1, 1],
        transition: { duration: 0.4, delay: 0.1, ease: mechanicalEase },
      },
      loadingLoop: {
        scale: [0.8, 1, 0.8],
        opacity: [0.5, 1, 0.5],
        transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
      },
    };

    return (
      <div
        className={`relative flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          {/* Outer Ring "C" */}
          <motion.circle
            cx="50"
            cy="50"
            r="42"
            stroke="url(#liquidGlassGradient)"
            strokeWidth="4"
            strokeLinecap="round"
            variants={outerRingVariants}
            initial="initial"
            animate={outerControls}
            style={{ originX: "50px", originY: "50px" }}
          />

          {/* Inner Ring */}
          <motion.circle
            cx="50"
            cy="50"
            r="28"
            stroke="url(#liquidGlassInnerGradient)"
            strokeWidth="6"
            strokeLinecap="round"
            variants={innerRingVariants}
            initial="initial"
            animate={innerControls}
            style={{ originX: "50px", originY: "50px" }}
          />

          {/* Core */}
          <motion.circle
            cx="50"
            cy="50"
            r="12"
            fill="url(#coreGradient)"
            variants={coreVariants}
            initial="initial"
            animate={coreControls}
            style={{ originX: "50px", originY: "50px" }}
          />

          {/* Gradients */}
          <defs>
            {/* Liquid glass effect using complex multi-stop gradients */}
            <linearGradient id="liquidGlassGradient" x1="0" y1="0" x2="100" y2="100">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#818cf8" stopOpacity="0.6" />
              <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="liquidGlassInnerGradient" x1="100" y1="0" x2="0" y2="100">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="1" />
              <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.9" />
            </linearGradient>
            <radialGradient id="coreGradient" cx="50" cy="50" r="12" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fff" />
              <stop offset="40%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#0369a1" />
            </radialGradient>
          </defs>
        </svg>
      </div>
    );
  }
);

CareerosLogoMotion.displayName = "CareerosLogoMotion";
