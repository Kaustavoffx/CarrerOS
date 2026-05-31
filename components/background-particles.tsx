"use client";

import { motion, useReducedMotion } from "framer-motion";

const particles = Array.from({ length: 26 }, (_, index) => {
  const size = 2 + (index % 4);

  return {
    index,
    left: `${(index * 13) % 100}%`,
    top: `${(index * 27) % 100}%`,
    size,
    delay: -(index % 7) * 0.7,
    driftX: index % 2 === 0 ? 120 : -100,
    driftY: index % 3 === 0 ? -80 : 90
  };
});

export function BackgroundParticles() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <motion.div
        className="absolute left-1/2 top-10 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(95,183,255,0.18),transparent_65%)] blur-3xl"
        initial={{ opacity: 0.25, scale: 0.98 }}
        animate={reduceMotion ? { opacity: 0.25, scale: 0.98 } : { opacity: 0.42, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
      <motion.div
        className="absolute right-[-8rem] top-1/3 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(159,124,255,0.18),transparent_68%)] blur-3xl"
        initial={{ opacity: 0.2, y: 0 }}
        animate={reduceMotion ? { opacity: 0.2, y: 0 } : { opacity: 0.34, y: -10 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
      {particles.map((particle) => (
        <motion.span
          key={particle.index}
          className="absolute rounded-full bg-white/70 shadow-[0_0_12px_rgba(95,183,255,0.55)]"
          style={{ left: particle.left, top: particle.top, width: particle.size, height: particle.size }}
          initial={{ opacity: 0.18, scale: 0.9 }}
          animate={reduceMotion ? { opacity: 0.18, scale: 0.9 } : { opacity: 0.34, scale: 1 }}
          transition={{ duration: 0.8, delay: particle.delay * 0.05, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}