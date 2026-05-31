"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { memo } from "react";

type GlassCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  accent: string;
};

export function GlassCard({ icon: Icon, title, description, accent }: GlassCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      className="relative overflow-hidden rounded-3xl border border-[#16161c] bg-gradient-to-b from-[#0a0a0c] to-[#050506] p-6 shadow-[0_15px_40px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_1px_rgba(0,0,0,0.8)] transition-all duration-300 hover:shadow-[0_25px_60px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.12)]"
      whileHover={reduceMotion ? undefined : { y: -2, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 180, damping: 18 }}
    >
      {/* Molded pseudo-reflection shine */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.02),transparent_40%)] pointer-events-none" />
      
      <div className="relative flex h-full flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#202028] bg-gradient-to-b from-[#141418] to-[#0a0a0c] text-cyan-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_8px_20px_rgba(0,0,0,0.8)]">
            <Icon className="h-5 w-5" />
          </div>
          <span className="rounded-full border border-[#16161c] bg-[#0c0c0e] px-3 py-1 text-xs uppercase tracking-[0.25em] text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-1px_1px_rgba(0,0,0,0.8)]">
            {accent}
          </span>
        </div>
        <div className="space-y-2">
          <h3 className="heading-card text-white">{title}</h3>
          <p className="small text-slate-400">{description}</p>
        </div>
      </div>
    </motion.article>
  );
}

export const MemoGlassCard = memo(GlassCard);