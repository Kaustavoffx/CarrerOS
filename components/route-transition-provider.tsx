"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface RouteTransitionContextValue {
  startTransition: (destination: string) => void;
  isTransitioning: boolean;
  destination: string | null;
}

const RouteTransitionContext = createContext<RouteTransitionContextValue>({
  startTransition: () => {},
  isTransitioning: false,
  destination: null,
});

export function useRouteTransition() {
  return useContext(RouteTransitionContext);
}

function getDestinationLabel(dest: string): string {
  const map: Record<string, string> = {
    "/dashboard":             "Dashboard",
    "/roadmaps":              "Roadmaps",
    "/career-twin":           "Career Twin",
    "/mentor":                "AI Mentor",
    "/community-intelligence":"Community Intelligence",
    "/support-navigator":     "Support Navigator",
    "/resource-discovery":    "Resource Discovery",
    "/community-gaps":        "Gap Intelligence",
    "/community-heatmap":     "Community Heatmap",
    "/report-need":           "Review Queue",
    "/settings":              "Settings",
    "/profile":               "Profile",
  };
  return map[dest] ?? "Workspace";
}

export function RouteTransitionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [destination, setDestination] = useState<string | null>(null);

  const prevPathname = useRef(pathname);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const startTransition = useCallback((dest: string) => {
    clearTimers();
    setDestination(dest);
    setIsTransitioning(true);

    // Safety timeout in case navigation fails
    const bail = setTimeout(() => {
      setIsTransitioning(false);
      setDestination(null);
    }, 2000);
    timersRef.current.push(bail);
  }, [clearTimers]);

  useEffect(() => {
    if (prevPathname.current === pathname) return;
    prevPathname.current = pathname;

    if (!isTransitioning) return;

    clearTimers();
    // Path has changed, finish transition rapidly
    const t = setTimeout(() => {
      setIsTransitioning(false);
      setDestination(null);
    }, 50); // almost immediate removal after routing completes
    timersRef.current.push(t);
  }, [pathname, isTransitioning, clearTimers]);

  return (
    <RouteTransitionContext.Provider value={{ startTransition, isTransitioning, destination }}>
      {/* 
        Wrap children in a motion.div that handles the "Destination page reveal" and "Liquid glass dissolve"
        We change the scale slightly and lower opacity when transitioning
      */}
      <motion.div
        animate={{
          opacity: isTransitioning ? 0.95 : 1,
          scale: isTransitioning ? 0.995 : 1,
        }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        style={{ willChange: "transform, opacity" }}
        className="w-full h-full min-h-screen"
      >
        {children}
      </motion.div>

      {/* ── CAREEROS MICRO TRANSITION OVERLAY ── */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            key="micro-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center pointer-events-none"
            style={{ willChange: "opacity" }}
          >
            {/* Extremely subtle darkness layer (no expensive blurs) */}
            <div className="absolute inset-0 bg-[#030712]/40" />

            {/* Premium, floating liquid glass transition tag */}
            <motion.div
              initial={{ scale: 0.95, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: -10, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex flex-col items-center gap-3 px-6 py-5 rounded-[20px] overflow-hidden bg-[#0a0f1c]/90 border border-white/[0.08]"
              style={{
                willChange: "transform, opacity",
                minWidth: "240px",
                boxShadow: "0 20px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)",
              }}
            >
              {/* Soft calibration wave background */}
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                style={{ willChange: "transform" }}
              />

              {/* CareerOS logo pulse */}
              <motion.div 
                animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10 flex items-center justify-center"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </motion.div>

              <div className="text-center relative z-10">
                <p className="text-[10px] font-bold text-white tracking-[0.2em] uppercase select-none">
                  {destination ? getDestinationLabel(destination) : "Routing"}
                </p>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top hairline calibration wave — ultra fast */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            key="top-bar"
            initial={{ opacity: 0, x: "-100%" }}
            animate={{ opacity: 1, x: "0%" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-0 left-0 right-0 h-[2px] z-[9998] pointer-events-none origin-left"
            style={{ willChange: "transform, opacity" }}
          >
            <div
              className="w-full h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </RouteTransitionContext.Provider>
  );
}
