"use client";

import { motion, useAnimation, Variants } from "framer-motion";
import { useEffect } from "react";

interface CareerosLogoMotionProps {
  variant?: "boot" | "transition" | "loader";
  size?: number;
  className?: string;
  onComplete?: () => void;
}

export function CareerosLogoMotion({
  variant = "boot",
  size = 120,
  className = "",
  onComplete,
}: CareerosLogoMotionProps) {
  const controls = useAnimation();

  useEffect(() => {
    let mounted = true;

    const runBootSequence = async () => {
      // 1. Outer ring assembly
      await controls.start("outerAssembly");
      // 2. Outer ring calibration (rotation/scale)
      await controls.start("outerCalibration");
      // 3. Inner ring insertion
      await controls.start("innerInsertion");
      // 4. Inner ring lock
      await controls.start("innerLock");
      // 5. Core generation
      await controls.start("coreGeneration");
      // 6. Full structure alignment
      await controls.start("alignment");
      // 7. Energy pulse (Cyan)
      await controls.start("pulse");

      if (mounted && onComplete) {
        onComplete();
      }
    };

    const runTransitionPulse = async () => {
      await controls.start("transitionPulse");
      if (mounted && onComplete) onComplete();
    };

    const runLoader = async () => {
      await controls.start("loadingLoop");
    };

    if (variant === "boot") {
      runBootSequence();
    } else if (variant === "transition") {
      runTransitionPulse();
    } else {
      runLoader();
    }

    return () => {
      mounted = false;
    };
  }, [variant, controls, onComplete]);

  // Framer Motion Variants for each piece
  const outerRingVariants: Variants = {
    initial: { pathLength: 0, opacity: 0, rotate: -90, scale: 0.95 },
    outerAssembly: {
      pathLength: 1,
      opacity: 1,
      transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
    },
    outerCalibration: {
      rotate: 0,
      scale: 1,
      transition: { duration: 0.3, ease: "easeOut" },
    },
    transitionPulse: {
      pathLength: [0, 1, 1],
      opacity: [0, 1, 0.8],
      scale: [0.8, 1.05, 1],
      transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
    },
    loadingLoop: {
      pathLength: [0.2, 0.8, 0.2],
      rotate: [0, 360],
      transition: { duration: 1.5, repeat: Infinity, ease: "linear" },
    },
    pulse: {
      scale: [1, 1.05, 1],
      transition: { duration: 0.3, ease: "circOut" },
    },
  };

  const innerRingVariants: Variants = {
    initial: { pathLength: 0, opacity: 0, scale: 0.8, rotate: 90 },
    outerAssembly: { opacity: 0 },
    outerCalibration: { opacity: 0 },
    innerInsertion: {
      pathLength: 1,
      opacity: 1,
      transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
    },
    innerLock: {
      scale: 1,
      rotate: 0,
      transition: { duration: 0.2, ease: "easeOut" },
    },
    transitionPulse: {
      pathLength: [0, 1, 1],
      opacity: [0, 1, 0.8],
      scale: [0.8, 1, 1],
      transition: { duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] },
    },
    loadingLoop: {
      pathLength: [0.8, 0.2, 0.8],
      rotate: [360, 0],
      transition: { duration: 1.5, repeat: Infinity, ease: "linear" },
    },
    pulse: {
      scale: [1, 1.05, 1],
      transition: { duration: 0.3, delay: 0.05, ease: "circOut" },
    },
  };

  const coreVariants: Variants = {
    initial: { scale: 0, opacity: 0 },
    outerAssembly: { opacity: 0 },
    outerCalibration: { opacity: 0 },
    innerInsertion: { opacity: 0 },
    innerLock: { opacity: 0 },
    coreGeneration: {
      scale: 1,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 20 },
    },
    alignment: {
      scale: [1, 0.9, 1],
      transition: { duration: 0.3, ease: "easeInOut" },
    },
    transitionPulse: {
      scale: [0, 1.2, 1],
      opacity: [0, 1, 1],
      transition: { duration: 0.3, delay: 0.1, ease: [0.16, 1, 0.3, 1] },
    },
    loadingLoop: {
      scale: [0.8, 1, 0.8],
      opacity: [0.5, 1, 0.5],
      transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
    },
    pulse: {
      scale: [1, 1.2, 1],
      filter: ["drop-shadow(0 0 0px #22d3ee)", "drop-shadow(0 0 15px #22d3ee)", "drop-shadow(0 0 5px #22d3ee)"],
      transition: { duration: 0.4, ease: "circOut" },
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
        {/* Outer Ring */}
        <motion.circle
          cx="50"
          cy="50"
          r="42"
          stroke="url(#outerGradient)"
          strokeWidth="4"
          strokeLinecap="round"
          variants={outerRingVariants}
          initial="initial"
          animate={controls}
          style={{ originX: "50px", originY: "50px" }}
        />

        {/* Inner Ring */}
        <motion.circle
          cx="50"
          cy="50"
          r="28"
          stroke="url(#innerGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="40 10 20 10" // Industrial / structural feel
          variants={innerRingVariants}
          initial="initial"
          animate={controls}
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
          animate={controls}
          style={{ originX: "50px", originY: "50px" }}
        />

        {/* Gradients */}
        <defs>
          <linearGradient id="outerGradient" x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="innerGradient" x1="100" y1="0" x2="0" y2="100">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.5" />
          </linearGradient>
          <radialGradient id="coreGradient" cx="50" cy="50" r="12" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="50%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0891b2" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}
