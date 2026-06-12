"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CareerosLogoMotion } from "./careeros-logo-motion";

export function BootSequence({ children }: { children: React.ReactNode }) {
  const [bootState, setBootState] = useState<"init" | "booting" | "complete">("init");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Check if we've already booted in this session
    const hasBooted = sessionStorage.getItem("careeros_booted");
    
    // For development/debugging, you could temporarily comment out the check
    if (hasBooted === "true") {
      setBootState("complete");
    } else {
      setBootState("booting");
      // Pre-load audio
      audioRef.current = new Audio("/mecha.mp3");
      audioRef.current.volume = 0.5;
    }
  }, []);

  const handlePhase1Start = () => {
    if (audioRef.current) {
      audioRef.current.play().catch((e) => console.log("Audio play prevented by browser:", e));
    }
  };

  const handleBootComplete = () => {
    // Delay slightly after logo animation finishes to allow "workspace reveal"
    setTimeout(() => {
      setBootState("complete");
      sessionStorage.setItem("careeros_booted", "true");
    }, 600);
  };

  if (bootState === "init") {
    // Prevent layout shift while checking session storage
    return <div className="fixed inset-0 z-[9999] bg-[#05060a]" />;
  }

  return (
    <>
      <AnimatePresence>
        {bootState === "booting" && (
          <motion.div
            key="boot-sequence"
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#05060a] overflow-hidden"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            onAnimationStart={handlePhase1Start}
          >
            {/* Volumetric Atmosphere & Particles */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/10 via-[#05060a]/80 to-[#05060a]" />
              {/* Minimal Particles Placeholder (can be replaced with complex Three.js/Fiber later if needed, but CSS is lighter for boot) */}
              <motion.div 
                className="absolute inset-0 opacity-30"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                transition={{ duration: 1.5 }}
                style={{
                  backgroundImage: 'radial-gradient(circle at center, #22d3ee 1px, transparent 1px)',
                  backgroundSize: '40px 40px'
                }}
              />
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <CareerosLogoMotion 
                variant="boot" 
                size={140} 
                onComplete={handleBootComplete} 
              />
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.8, duration: 0.4 }}
                className="mt-8 text-center"
              >
                <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-500/60 font-mono">
                  System Initialization
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </>
  );
}
