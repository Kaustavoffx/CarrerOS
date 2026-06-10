"use client";

import React from "react";
import { motion } from "framer-motion";
import { CardSurface } from "@/components/ui/card-surface";

interface SkeletonProps {
  variant?: "card" | "table" | "list" | "dashboard-stat" | "chart";
  className?: string;
}

const pulseVariants = {
  animate: {
    opacity: [0.35, 0.65, 0.35],
    transition: {
      duration: 1.8,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
};

export function Skeleton({ variant = "card", className = "" }: SkeletonProps) {
  // Common pulsing bar component
  const PulsingBar = ({ w = "100%", h = "10px", rounded = "rounded-lg" }: { w?: string; h?: string; rounded?: string }) => (
    <motion.div
      variants={pulseVariants}
      animate="animate"
      className={`${rounded} bg-white/[0.05] border border-white/[0.03]`}
      style={{ width: w, height: h }}
    />
  );

  if (variant === "dashboard-stat") {
    return (
      <CardSurface variant="glass" className={`space-y-3.5 p-4 ${className}`}>
        <div className="flex justify-between items-center">
          <PulsingBar w="50%" h="12px" />
          <PulsingBar w="24px" h="16px" rounded="rounded-full" />
        </div>
        <PulsingBar w="70%" h="28px" />
        <div className="pt-2 border-t border-white/5 flex gap-2">
          <PulsingBar w="40%" h="8px" />
          <PulsingBar w="30%" h="8px" />
        </div>
      </CardSurface>
    );
  }

  if (variant === "list") {
    return (
      <div className={`space-y-2.5 ${className}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSurface key={i} variant="glass" className="p-3.5 flex items-center justify-between gap-4" noPadding>
            <div className="flex items-center gap-3 w-full">
              <PulsingBar w="28px" h="28px" rounded="rounded-xl" />
              <div className="space-y-1.5 flex-1">
                <PulsingBar w="40%" h="11px" />
                <PulsingBar w="85%" h="8px" />
              </div>
            </div>
            <PulsingBar w="50px" h="16px" rounded="rounded-full" />
          </CardSurface>
        ))}
      </div>
    );
  }

  if (variant === "table") {
    return (
      <CardSurface variant="glass" className={`overflow-hidden border border-white/5 p-0 ${className}`} noPadding>
        <div className="w-full text-xs font-mono border-collapse">
          {/* Header Row */}
          <div className="bg-slate-950/80 px-4 py-3 border-b border-white/5 flex justify-between gap-4">
            <PulsingBar w="25%" h="10px" />
            <PulsingBar w="15%" h="10px" />
            <PulsingBar w="15%" h="10px" />
            <PulsingBar w="15%" h="10px" />
            <PulsingBar w="15%" h="10px" />
          </div>
          {/* Body Rows */}
          <div className="divide-y divide-white/5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-4 flex justify-between gap-4 items-center">
                <PulsingBar w="20%" h="11px" />
                <PulsingBar w="12%" h="10px" />
                <PulsingBar w="12%" h="10px" />
                <PulsingBar w="12%" h="10px" />
                <PulsingBar w="12%" h="10px" />
              </div>
            ))}
          </div>
        </div>
      </CardSurface>
    );
  }

  if (variant === "chart") {
    return (
      <CardSurface variant="glass" className={`p-5 space-y-4 ${className}`}>
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <PulsingBar w="45%" h="12px" />
          <PulsingBar w="70px" h="20px" rounded="rounded-lg" />
        </div>
        {/* Bars visual representation */}
        <div className="h-48 flex items-end gap-3.5 pt-4 px-2">
          {[35, 60, 45, 90, 70, 50, 85, 40].map((h, i) => (
            <motion.div
              key={i}
              variants={pulseVariants}
              animate="animate"
              className="flex-1 rounded-t bg-gradient-to-t from-cyan-500/10 to-cyan-400/20 border-t border-cyan-400/20"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between gap-2 px-1">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <PulsingBar key={n} w="20px" h="8px" />
          ))}
        </div>
      </CardSurface>
    );
  }

  // Default card variant
  return (
    <CardSurface variant="glass" className={`space-y-4 p-5 ${className}`}>
      <div className="flex items-center gap-3">
        <PulsingBar w="32px" h="32px" rounded="rounded-xl" />
        <div className="space-y-1.5 flex-1">
          <PulsingBar w="55%" h="12px" />
          <PulsingBar w="35%" h="9px" />
        </div>
      </div>
      <div className="space-y-2 pt-2">
        <PulsingBar w="100%" h="10px" />
        <PulsingBar w="92%" h="10px" />
        <PulsingBar w="75%" h="10px" />
      </div>
      <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
        <PulsingBar w="64px" h="24px" rounded="rounded-lg" />
      </div>
    </CardSurface>
  );
}
