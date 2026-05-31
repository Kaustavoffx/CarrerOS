"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { MouseEvent, ReactNode, useRef } from "react";

interface LiquidCardProps {
  children: ReactNode;
  className?: string;
}

export function LiquidCard({ children, className = "" }: LiquidCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Motion values for x/y mouse position relative to card center (-0.5 to 0.5)
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Spring settings for ultra-smooth movement
  const springSettings = { stiffness: 150, damping: 20, mass: 0.6 };
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), springSettings);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), springSettings);

  // Glare overlay tracking
  const glareX = useSpring(useTransform(x, [-0.5, 0.5], [0, 100]), springSettings);
  const glareY = useSpring(useTransform(y, [-0.5, 0.5], [0, 100]), springSettings);

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Calculate normalized position relative to center of card
    const mouseX = (event.clientX - rect.left) / width - 0.5;
    const mouseY = (event.clientY - rect.top) / height - 0.5;
    
    x.set(mouseX);
    y.set(mouseY);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className={`liquid-card p-6 ${className}`}
    >
      {/* Glare spotlight layer */}
      <motion.div
        style={{
          background: useTransform(
            [glareX, glareY],
            ([gx, gy]) =>
              `radial-gradient(circle 200px at ${gx}% ${gy}%, rgba(255, 255, 255, 0.05) 0%, transparent 60%)`
          ),
          pointerEvents: "none",
        }}
        className="absolute inset-0 z-10"
      />
      
      {/* Inner wrapper to preserve depth styling */}
      <div style={{ transform: "translateZ(20px)", transformStyle: "preserve-3d" }} className="relative z-20">
        {children}
      </div>
    </motion.div>
  );
}
