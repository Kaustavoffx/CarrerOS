"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, LayoutDashboard, Map, Users, MessageSquare, 
  Shield, Zap, ArrowRight, X, Play
} from "lucide-react";
import { CardSurface } from "@/components/ui/card-surface";
import { buttonStyle } from "@/styles/careeros-design-system";

interface TourStep {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  targetPath: string;
  highlightText: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "1. The Workspace Dashboard",
    description: "Welcome to your command central. Here we aggregate your active readiness scores, current goal targets, and checkable sprint checklists into a single execution dashboard.",
    icon: LayoutDashboard,
    targetPath: "/dashboard",
    highlightText: "Consolidates weekly tasks & logs"
  },
  {
    title: "2. Learning Roadmaps",
    description: "Custom milestone-based developer curriculums engineered around active SDE specifications. Tracks deliverables, resources, and weekly commitment hours.",
    icon: Map,
    targetPath: "/roadmaps",
    highlightText: "Adapts to goals dynamically"
  },
  {
    title: "3. Digital Twin simulator",
    description: "Evaluates market readiness using vector similarity indexing. Compares your skills, credentials, and portfolios against active developer requirements.",
    icon: Users,
    targetPath: "/career-twin",
    highlightText: "Identifies skill and credential gaps"
  },
  {
    title: "4. AI Mentor strategist",
    description: "An active expert counselor synced directly with your profile contexts. Resolves database design blocks, runs mocks, and reviews code snippets.",
    icon: MessageSquare,
    targetPath: "/mentor",
    highlightText: "24/7 Context-synced assistant"
  },
  {
    title: "5. Community Intelligence",
    description: "Consolidated district gap mapping registries. Review local scholarships, counseling services, and internship programs mapped near your coordinates.",
    icon: Shield,
    targetPath: "/community-intelligence",
    highlightText: "District accessibility auditing"
  },
  {
    title: "6. NASA Operations Command Center",
    description: "Real-time operations grid monitoring live community need feeds, forecast regression indices, critical resource shortage counts, and automated AI actions.",
    icon: Zap,
    targetPath: "/community-command-center",
    highlightText: "Real-time system state mission control"
  }
];

export function ProductTour() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const handleComplete = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("careeros-onboarding-tour-completed", "true");
    }
    setIsOpen(false);
  }, []);

  const handleSkip = useCallback(() => {
    handleComplete();
  }, [handleComplete]);

  const handleNext = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, handleComplete]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleGoToPage = useCallback((path: string) => {
    handleComplete();
    router.push(path);
  }, [handleComplete, router]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleSkip();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleSkip, handleNext, handlePrev]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const completed = localStorage.getItem("careeros-onboarding-tour-completed");
      if (completed !== "true") {
        // Delay slightly for visual pop in
        const timer = setTimeout(() => setIsOpen(true), 1200);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  if (!isOpen) return null;

  const stepData = TOUR_STEPS[currentStep];
  const Icon = stepData.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
        {/* Click outside exits/skips */}
        <div className="absolute inset-0" onClick={handleSkip} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg z-10"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-dialog-title"
        >
          <CardSurface variant="surface" dust="both" className="p-6 space-y-5 shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-cyan-400 animate-pulse" />
                <h3 id="tour-dialog-title" className="text-xs font-bold text-white uppercase tracking-wider">CareerOS Platform Tour</h3>
              </div>
              <button 
                onClick={handleSkip}
                className="p-1 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition"
                aria-label="Skip tour"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Stepper Dots */}
            <div className="flex gap-1.5 justify-center">
              {TOUR_STEPS.map((_, idx) => (
                <span 
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStep ? "w-6 bg-cyan-400" : "w-1.5 bg-slate-700"
                  }`}
                />
              ))}
            </div>

            {/* Step Content */}
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-300">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{stepData.title}</h4>
                  <span className="text-[9px] uppercase tracking-wider font-bold text-cyan-400 font-mono">
                    {stepData.highlightText}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                {stepData.description}
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-white/5 flex-wrap gap-2">
              <button
                onClick={() => handleGoToPage(stepData.targetPath)}
                style={buttonStyle("secondary")}
                className="px-4 py-2 text-[10px] font-bold rounded-lg flex items-center gap-1"
              >
                <Play className="h-3 w-3" />
                Launch Live Module
              </button>

              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <button
                    onClick={handlePrev}
                    style={buttonStyle("ghost")}
                    className="px-3 py-1.5 text-[10px] font-bold rounded-lg text-slate-300"
                  >
                    Back
                  </button>
                )}

                <button
                  onClick={handleNext}
                  style={buttonStyle("primary")}
                  className="px-4 py-1.5 text-[10px] font-bold rounded-lg flex items-center gap-1 text-black font-bold"
                >
                  {currentStep === TOUR_STEPS.length - 1 ? "Finish Tour" : "Next Step"}
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </CardSurface>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
