"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme, type Theme } from "@/components/theme-provider";
import { Palette, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const THEME_OPTIONS: Array<{ id: Theme; name: string; color: string }> = [
  { id: "careeros-dark", name: "CareerOS Dark", color: "#22D3EE" },
  { id: "theme-executive", name: "Executive Luxury", color: "#a67564" },
  { id: "theme-wealth", name: "Private Wealth", color: "#c0b283" },
  { id: "theme-innovation", name: "Innovation Studio", color: "#a71f13" },
  { id: "theme-tech-luxury", name: "Tech Luxury", color: "#a65e46" },
  { id: "theme-finance", name: "Executive Finance", color: "#d9b061" },
  { id: "theme-scandinavian", name: "Scandinavian", color: "#557373" },
  { id: "theme-ai-lab", name: "AI Research", color: "#a6445d" },
  { id: "theme-eco", name: "Sustainable Eco", color: "#617246" },
  { id: "theme-enterprise", name: "Enterprise OS", color: "#819fa7" },
  { id: "theme-minimal", name: "Minimal Workspace", color: "#bfafaf" }
];

export function ThemeOrb() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed bottom-[calc(4.5rem+16px+env(safe-area-inset-bottom,0px))] right-4 xl:bottom-8 xl:right-8 z-40 flex flex-col items-end select-none"
    >
      {/* Theme Picker Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="mb-3 w-56 rounded-2xl p-2.5 border border-white/[0.08] shadow-2xl relative overflow-hidden"
            style={{
              background: "rgba(8, 12, 24, 0.85)",
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 20px 50px rgba(0, 0, 0, 0.5)",
              borderColor: "var(--careeros-card-border)"
            }}
          >
            {/* Ambient background glow inside the picker */}
            <div
              className="absolute -top-12 -right-12 w-24 h-24 rounded-full filter blur-xl opacity-20 pointer-events-none transition-all duration-[250ms]"
              style={{ background: "var(--careeros-primary)" }}
            />

            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1 mb-1 border-b border-white/5">
              Select Theme
            </div>

            <div className="space-y-0.5">
              {THEME_OPTIONS.map((opt) => {
                const isSelected = theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setTheme(opt.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-all ${
                      isSelected
                        ? "bg-white/[0.07] text-white font-medium"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-white/10 shrink-0"
                        style={{
                          backgroundColor: opt.color,
                          boxShadow: `0 0 8px ${opt.color}40`
                        }}
                      />
                      {opt.name}
                    </span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-cyan-400 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Theme Button (Orb) */}
      <motion.button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open Theme Picker"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="lis-float flex h-12 w-12 items-center justify-center rounded-full border shadow-lg cursor-pointer transition-all duration-300 relative group overflow-hidden"
        style={{
          background: "rgba(8, 12, 24, 0.65)",
          borderColor: "var(--careeros-card-border)",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 0 20px var(--careeros-card-glow)"
        }}
      >
        {/* Subtle moving light effect inside the orb */}
        <div
          className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.05] to-white/[0.12] opacity-50"
          style={{
            background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0%, transparent 60%)"
          }}
        />

        {/* Dynamic theme glow */}
        <div
          className="absolute inset-0 filter blur-[8px] opacity-10 group-hover:opacity-20 transition-all duration-[250ms] rounded-full scale-90"
          style={{ background: "var(--careeros-primary)" }}
        />

        <Palette className="h-5 w-5 text-white transition-transform duration-[250ms] group-hover:rotate-12 group-active:-rotate-12" />
      </motion.button>
    </div>
  );
}
