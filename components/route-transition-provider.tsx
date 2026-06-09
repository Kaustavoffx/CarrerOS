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
import Image from "next/image";
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

function getProgressMessages(dest: string): string[] {
  if (dest.includes("dashboard"))
    return ["Preparing Dashboard...", "Loading metrics...", "Finalizing layout..."];
  if (dest.includes("roadmap"))
    return ["Building Recommendations...", "Synthesizing learning path...", "Applying curriculum filters..."];
  if (dest.includes("community") || dest.includes("discovery") || dest.includes("navigator") || dest.includes("gap") || dest.includes("heatmap"))
    return ["Loading Community Intelligence...", "Querying regional matrices...", "Compiling impact data..."];
  if (dest.includes("mentor"))
    return ["Opening AI Mentor...", "Restoring conversation context...", "Ready to assist..."];
  if (dest.includes("career-twin"))
    return ["Initializing Career Twin...", "Computing similarity vectors...", "Calibrating readiness model..."];
  return ["Loading Workspace...", "Assembling components...", "Finalizing hydration..."];
}

/* ─────────────────────────────────────────────────────────────
   Provider Component
───────────────────────────────────────────────────────────── */
export function RouteTransitionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [destination, setDestination] = useState<string | null>(null);
  const [progressIndex, setProgressIndex] = useState(0);
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
    setProgressIndex(0);
    setBarWidth(10);

    // Animate bar to 80% over ~600ms
    const t1 = setTimeout(() => setBarWidth(40), 150);
    const t2 = setTimeout(() => setBarWidth(65), 400);
    const t3 = setTimeout(() => setBarWidth(80), 700);

    // Progress message cycle at 800ms
    const t4 = setTimeout(() => setProgressIndex(1), 800);
    const t5 = setTimeout(() => setProgressIndex(2), 1800);

    timersRef.current = [t1, t2, t3, t4, t5];
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
      setProgressIndex(0);
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

  const messages = destination ? getProgressMessages(destination) : [];
  const currentMessage = messages[progressIndex] ?? messages[0] ?? "Loading...";
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
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center pointer-events-none"
            style={{ willChange: "opacity" }}
          >
            {/* Subtle backdrop blur — only on desktop, avoid expensive on mobile */}
            <div className="absolute inset-0 bg-[#020305]/80 backdrop-blur-[2px]" />

            {/* Content card */}
            <motion.div
              initial={{ scale: 0.97, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.97, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex flex-col items-center gap-5 px-8 py-8 rounded-2xl border border-white/[0.07] bg-slate-950/90 shadow-2xl"
              style={{ willChange: "transform, opacity", minWidth: "260px" }}
            >
              {/* Logo */}
              <div className="relative">
                <Image
                  src="/logo.png"
                  alt="CareerOS"
                  width={48}
                  height={48}
                  className="object-contain"
                  style={{ filter: "drop-shadow(0 0 12px rgba(34,211,238,0.35))" }}
                />
                {/* Rotating ring */}
                <span
                  className="absolute -inset-2 rounded-full border border-cyan-500/30 border-t-cyan-400"
                  style={{
                    animation: "spin 1.1s linear infinite",
                    willChange: "transform",
                  }}
                />
              </div>

              {/* Destination label */}
              <div className="text-center space-y-1.5">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 select-none">
                  Navigating to
                </p>
                <p className="text-sm font-bold text-white tracking-wide select-none">
                  {label}
                </p>
              </div>

              {/* Progress bar track */}
              <div className="w-full h-[3px] rounded-full bg-slate-800/80 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full"
                  style={{
                    width: `${barWidth}%`,
                    transition: "width 280ms cubic-bezier(0.16,1,0.3,1)",
                    willChange: "width",
                    boxShadow: "0 0 8px rgba(6,182,212,0.5)",
                  }}
                />
              </div>

              {/* Animated progress message */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentMessage}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="text-[11px] text-cyan-400/80 font-mono tracking-wide select-none"
                >
                  {currentMessage}
                </motion.p>
              </AnimatePresence>
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

      {/* Spin keyframe injected once */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </RouteTransitionContext.Provider>
  );
}
