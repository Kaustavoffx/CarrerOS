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

/* ─────────────────────────────────────────────────────────────
   Types & Context
   ───────────────────────────────────────────────────────────── */
interface RouteTransitionContextValue {
  /** Call before router.push() to trigger the overlay */
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

/* ─────────────────────────────────────────────────────────────
   Destination label helpers
   ───────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────
   Provider Component
   ───────────────────────────────────────────────────────────── */
export function RouteTransitionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [destination, setDestination] = useState<string | null>(null);
  const [barWidth, setBarWidth] = useState(0);

  const prevPathname = useRef(pathname);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  /* Clear all running timers */
  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  /* Trigger transition start */
  const startTransition = useCallback((dest: string) => {
    clearTimers();
    setDestination(dest);
    setIsTransitioning(true);
    setBarWidth(10);

    // Animate bar to 80% over ~700ms
    const t1 = setTimeout(() => setBarWidth(40), 150);
    const t2 = setTimeout(() => setBarWidth(65), 400);
    const t3 = setTimeout(() => setBarWidth(80), 700);

    timersRef.current = [t1, t2, t3];
  }, [clearTimers]);

  /* Complete transition when pathname changes */
  useEffect(() => {
    if (prevPathname.current === pathname) return;
    prevPathname.current = pathname;

    if (!isTransitioning) return;

    clearTimers();
    // Animate bar to 100% then dismiss
    setBarWidth(100);
    const t = setTimeout(() => {
      setIsTransitioning(false);
      setDestination(null);
      setBarWidth(0);
    }, 320);
    timersRef.current = [t];
  }, [pathname, isTransitioning, clearTimers]);

  /* Safety valve — clear after 5s regardless */
  useEffect(() => {
    if (!isTransitioning) return;
    const bail = setTimeout(() => {
      setIsTransitioning(false);
      setDestination(null);
      setBarWidth(0);
    }, 5000);
    return () => clearTimeout(bail);
  }, [isTransitioning]);

  const label = destination ? getDestinationLabel(destination) : "Workspace";

  return (
    <RouteTransitionContext.Provider value={{ startTransition, isTransitioning, destination }}>
      {children}

      {/* ── FULL-SCREEN ROUTE TRANSITION OVERLAY ── */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            key="route-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center pointer-events-none"
            style={{ willChange: "opacity" }}
          >
            {/* Extremely subtle backdrop to keep transitions feeling instant */}
            <div className="absolute inset-0" style={{ background: 'rgba(3,7,18,0.35)', backdropFilter: 'blur(2px)' }} />

            {/* Premium, floating glassmorphic tag with GPU-accelerated motion */}
            <motion.div
              initial={{ scale: 0.95, y: 8, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 8, opacity: 0 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex flex-col items-center gap-3 px-6 py-4 rounded-xl"
              style={{
                willChange: "transform, opacity",
                minWidth: "220px",
                background: 'rgba(15,23,42,0.85)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
              }}
            >
              <div className="text-center">
                <p className="text-xs font-bold text-white tracking-wide select-none">
                  Loading {label}...
                </p>
              </div>

              {/* Progress bar track */}
              <div className="w-full h-[2px] rounded-full bg-slate-800/80 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full"
                  style={{
                    width: `${barWidth}%`,
                    transition: "width 200ms cubic-bezier(0.16,1,0.3,1)",
                    willChange: "width",
                    boxShadow: "0 0 6px rgba(6,182,212,0.4)",
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top hairline progress bar — always visible during transition */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            key="top-bar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 right-0 h-[2px] bg-slate-800 z-[9998] pointer-events-none"
          >
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-cyan-400"
              style={{
                width: `${barWidth}%`,
                transition: "width 280ms cubic-bezier(0.16,1,0.3,1)",
                willChange: "width",
                boxShadow: "0 0 6px rgba(6,182,212,0.6)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </RouteTransitionContext.Provider>
  );
}
