"use client";

import { motion, useAnimation } from "framer-motion";
import { forwardRef, useImperativeHandle } from "react";
import {
  LayoutDashboard, Map, Users, MessageSquare, 
  Settings, UserCircle, Shield, Activity, 
  Globe, Zap, Brain
} from "lucide-react";

export interface IntroRadialModulesRef {
  emerge: () => Promise<void>;
  syncWave: () => Promise<void>;
  collapse: () => Promise<void>;
}

interface ModuleCustomData {
  x: number;
  y: number;
  index: number;
  total: number;
}

// Order from workspace-shell.tsx
const modulesConfig = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Roadmaps", icon: Map },
  { label: "Career Twin", icon: Users },
  { label: "AI Mentor", icon: MessageSquare },
  { label: "Community Intel", icon: Brain },
  { label: "Support Navigator", icon: Shield },
  { label: "Resource Directory", icon: Globe },
  { label: "Gap Intelligence", icon: Activity },
  { label: "Command Center", icon: Zap },
  { label: "Settings", icon: Settings },
  { label: "Profile", icon: UserCircle },
];

// GPU-friendly springs
const surfaceTensionSpring = { type: "spring" as const, stiffness: 200, damping: 15, mass: 0.8 };
const mechanicalEase = [0.16, 1, 0.3, 1] as const;

export const IntroRadialModules = forwardRef<IntroRadialModulesRef>((props, ref) => {
  const containerControls = useAnimation();
  const radius = 180; // px radius for desktop, can be scaled via css transforms on container

  useImperativeHandle(ref, () => ({
    async emerge() {
      // Container slow rotation
      containerControls.start({
        rotate: [0, 15],
        transition: { duration: 15, ease: "linear" } // Super slow, stately orbit
      });

      // Child emergence
      await containerControls.start("emerge");
    },
    async syncWave() {
      // Cyan wave travels through every module in sequence
      await containerControls.start("sync");
    },
    async collapse() {
      // Arcs back to center
      await containerControls.start("collapse");
    }
  }));

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      initial={{ rotate: 0 }}
      animate={containerControls}
      style={{ originX: "50%", originY: "50%", willChange: "transform" }}
    >
      {modulesConfig.map((mod, index) => {
        const Icon = mod.icon;
        // Evenly distribute 11 modules
        const angle = (index * (360 / modulesConfig.length)) * (Math.PI / 180);
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        return (
          <motion.div
            key={mod.label}
            className="absolute flex flex-col items-center justify-center gap-3"
            initial="initial"
            custom={{ x, y, index, total: modulesConfig.length }}
            variants={{
              initial: { x: 0, y: 0, opacity: 0, scale: 0.5, filter: "drop-shadow(0 0 0px #22d3ee)" },
              emerge: (custom: ModuleCustomData) => ({
                x: custom.x,
                y: custom.y,
                opacity: 1,
                scale: 1,
                transition: {
                  ...surfaceTensionSpring,
                  delay: 0.1 * custom.index, // Radiates sequentially
                }
              }),
              sync: (custom: ModuleCustomData) => ({
                filter: [
                  "drop-shadow(0 0 0px #22d3ee)",
                  "drop-shadow(0 0 20px #22d3ee)",
                  "drop-shadow(0 0 4px #0ea5e9)"
                ],
                scale: [1, 1.1, 1],
                transition: {
                  duration: 0.6,
                  ease: mechanicalEase,
                  delay: custom.index * 0.1 // Stagger wave
                }
              }),
              collapse: (custom: ModuleCustomData) => ({
                x: 0,
                y: 0,
                opacity: 0,
                scale: 0.5,
                transition: {
                  duration: 0.6,
                  ease: mechanicalEase,
                  delay: (custom.total - custom.index) * 0.05 // Collapse in reverse
                }
              })
            }}
          >
            {/* Liquid Glass Sphere */}
            <motion.div 
              className="relative flex items-center justify-center w-12 h-12 rounded-full border border-cyan-500/30 bg-[#05060a]/80 backdrop-blur-md"
              style={{ boxShadow: "inset 0 0 10px rgba(34,211,238,0.2)" }}
            >
              <Icon className="w-5 h-5 text-cyan-300" />
            </motion.div>

            {/* Typography Label */}
            <motion.div
              className="text-[10px] uppercase font-bold tracking-widest text-cyan-50 whitespace-nowrap drop-shadow-md"
              variants={{
                initial: { opacity: 0, y: -10 },
                emerge: (custom: ModuleCustomData) => ({
                  opacity: [0, 1],
                  y: [-10, 0],
                  transition: { duration: 0.4, ease: mechanicalEase, delay: 0.1 * custom.index + 0.2 }
                }),
                sync: { opacity: 1, y: 0 },
                collapse: { opacity: 0, transition: { duration: 0.2 } }
              }}
            >
              {mod.label}
            </motion.div>
          </motion.div>
        );
      })}
    </motion.div>
  );
});

IntroRadialModules.displayName = "IntroRadialModules";
