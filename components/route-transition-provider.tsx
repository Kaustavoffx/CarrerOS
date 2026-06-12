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
import { CareerosLogoMotion } from "./careeros-logo-motion";

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
  }, [clearTimers]);

  /* Complete transition when pathname changes */
  useEffect(() => {
    if (prevPathname.current === pathname) return;
    prevPathname.current = pathname;

    if (!isTransitioning) return;

    clearTimers();
    // Allow the pulse to complete before dismissing (fast 250ms delay)
    const t = setTimeout(() => {
      setIsTransitioning(false);
      setDestination(null);
    }, 250);
    timersRef.current = [t];
  }, [pathname, isTransitioning, clearTimers]);

  /* Safety valve — clear after 5s regardless */
  useEffect(() => {
    if (!isTransitioning) return;
    const bail = setTimeout(() => {
      setIsTransitioning(false);
      setDestination(null);
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
            transition={{ duration: 0.1, ease: "easeOut" }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center pointer-events-none"
            style={{ willChange: "opacity" }}
          >
            {/* Extremely subtle backdrop to keep transitions feeling instant */}
            <div className="absolute inset-0" style={{ background: 'rgba(3,7,18,0.2)' }} />

            {/* Premium miniature logo assembly pulse */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex flex-col items-center gap-3 px-6 py-4 rounded-xl"
              style={{
                willChange: "transform, opacity",
                background: 'rgba(15,23,42,0.65)',
                border: '1px solid rgba(255,255,255,0.05)',
                backdropFilter: "blur(8px)",
                boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
              }}
            >
              <CareerosLogoMotion variant="transition" size={48} />
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-cyan-500/80 tracking-widest select-none">
                  Loading {label}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </RouteTransitionContext.Provider>
  );
}
