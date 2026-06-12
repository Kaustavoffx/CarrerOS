"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { CareerosLogoMotion, CareerosLogoMotionRef } from "./careeros-logo-motion";
import { IntroRadialModules, IntroRadialModulesRef } from "./intro-radial-modules";

export function BootSequence({ children }: { children: React.ReactNode }) {
  const [bootState, setBootState] = useState<"init" | "booting" | "complete">("init");
  
  // Refs to sub-components to command their animations
  const logoRef = useRef<CareerosLogoMotionRef>(null);
  const radialRef = useRef<IntroRadialModulesRef>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const voidControls = useAnimation();
  const textControls = useAnimation();
  const mainContainerControls = useAnimation();

  useEffect(() => {
    // Check if we've already booted in this session
    const hasBooted = sessionStorage.getItem("careeros_booted");
    
    if (hasBooted === "true") {
      setBootState("complete");
    } else {
      setBootState("booting");
      // Pre-load audio
      audioRef.current = new Audio("/mecha.mp3");
      audioRef.current.volume = 0.5;
    }
  }, []);

  useEffect(() => {
    if (bootState !== "booting") return;

    let mounted = true;

    const runSequence = async () => {
      // ──────────────────────────────────────────────
      // PHASE 1: THE VOID BREATHES
      // ──────────────────────────────────────────────
      if (audioRef.current) {
        audioRef.current.play().catch((e) => console.log("Audio play prevented by browser:", e));
      }
      await voidControls.start({
        opacity: [0, 1],
        transition: { duration: 2, ease: "easeInOut" }
      });

      // ──────────────────────────────────────────────
      // PHASE 2: PRECISION ASSEMBLY
      // ──────────────────────────────────────────────
      await new Promise(r => setTimeout(r, 500)); // Beat of silence
      if (logoRef.current) await logoRef.current.assemble();

      // ──────────────────────────────────────────────
      // PHASE 3: THE LOGO WAKES
      // ──────────────────────────────────────────────
      await new Promise(r => setTimeout(r, 400));
      if (logoRef.current) await logoRef.current.pulseWave();

      // ──────────────────────────────────────────────
      // PHASE 4: THE ECOSYSTEM UNFOLDS
      // ──────────────────────────────────────────────
      await new Promise(r => setTimeout(r, 600));
      if (radialRef.current) await radialRef.current.emerge();

      // ──────────────────────────────────────────────
      // PHASE 5: SYNCHRONIZATION
      // ──────────────────────────────────────────────
      await new Promise(r => setTimeout(r, 800)); // Let the stately orbit run
      if (logoRef.current) logoRef.current.pulseWave(); // Logo emits sync wave
      if (radialRef.current) await radialRef.current.syncWave(); // Modules catch wave

      // ──────────────────────────────────────────────
      // PHASE 6: COLLAPSE TO ENTRY
      // ──────────────────────────────────────────────
      await new Promise(r => setTimeout(r, 1200)); // Hold the synchronized system
      if (radialRef.current) await radialRef.current.collapse();
      
      // Text appears from zero
      await textControls.start("show");
      
      // Final pulse from logo
      if (logoRef.current) logoRef.current.collapse();
      await new Promise(r => setTimeout(r, 1500));

      // Zoom through entire container using transform scale & opacity
      if (mounted) {
        await mainContainerControls.start({
          scale: 4,
          opacity: 0,
          filter: "blur(10px)",
          transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
        });
        
        sessionStorage.setItem("careeros_booted", "true");
        setBootState("complete");
      }
    };

    runSequence();

    return () => {
      mounted = false;
    };
  }, [bootState, voidControls, textControls, mainContainerControls]);

  if (bootState === "init") {
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
            exit={{ opacity: 0 }}
            animate={mainContainerControls}
            style={{ willChange: "transform, opacity, filter" }}
          >
            {/* The Void */}
            <motion.div 
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={voidControls}
            >
              {/* Cyan Warmth */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-900/15 via-[#05060a]/90 to-[#05060a]" />
              
              {/* Microscopic particles using pure CSS gradients to preserve GPU memory (no canvas) */}
              <div 
                className="absolute inset-0 opacity-40 mix-blend-screen"
                style={{
                  backgroundImage: 'radial-gradient(circle at center, #22d3ee 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                  animation: 'void-drift 60s linear infinite'
                }}
              />
            </motion.div>

            {/* Scaling container for responsivness */}
            <div className="relative z-10 flex flex-col items-center justify-center scale-75 md:scale-100">
              {/* Radial Modules layer underneath logo */}
              <IntroRadialModules ref={radialRef} />
              
              {/* Logo Core */}
              <CareerosLogoMotion ref={logoRef} variant="intro" size={140} />
              
              {/* Typography Sequence */}
              <motion.div
                className="absolute top-[180px] flex flex-col items-center w-[400px]"
                initial="hidden"
                animate={textControls}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  show: {
                    opacity: 1, y: 0,
                    transition: { staggerChildren: 0.4 } // Sequentially show lines
                  }
                }}
              >
                <motion.h1 
                  className="text-2xl font-bold tracking-[0.2em] text-white drop-shadow-md"
                  variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16,1,0.3,1] } } }}
                >
                  CAREEROS
                </motion.h1>
                <motion.h2
                  className="mt-1 text-[10px] uppercase tracking-[0.3em] text-cyan-300/80 font-mono"
                  variants={{ hidden: { opacity: 0, y: 5 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16,1,0.3,1] } } }}
                >
                  PRIVATE CAREER OPERATING SYSTEM
                </motion.h2>

                <motion.div
                  className="mt-10"
                  variants={{ hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.16,1,0.3,1] } } }}
                >
                  {/* Actionable Button - minimal, exact */}
                  <div className="px-6 py-2 border border-cyan-500/30 rounded-full text-[10px] tracking-[0.25em] text-cyan-400 bg-cyan-950/20 backdrop-blur-md shadow-[0_0_15px_rgba(34,211,238,0.15)]">
                    ENTER WORKSPACE
                  </div>
                </motion.div>
              </motion.div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes void-drift {
                0% { transform: translateY(0) rotate(0deg); }
                100% { transform: translateY(-40px) rotate(2deg); }
              }
            `}} />
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </>
  );
}
