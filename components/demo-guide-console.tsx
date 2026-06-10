"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, Map, Users, Brain, Shield, Compass, 
  Globe, Activity, Zap, Settings, UserCircle, ChevronDown, Sparkles, ArrowRight
} from "lucide-react";
import { PageHero, CardSurface } from "@/components/ui";
import { buttonStyle } from "@/styles/careeros-design-system";

type GuideItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  purpose: string;
  actions: string[];
  aiTech?: string[];
  link: string;
  status?: string;
  details?: string[];
};

const GUIDE_ITEMS: GuideItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    color: "#22D3EE",
    purpose: "Central mission control aggregating active development milestones, goal readiness metrics, and community program tracking in one dashboard.",
    actions: [
      "View active goal metrics and readiness dials.",
      "Track milestones completed and upcoming steps.",
      "Access localized community support vectors."
    ],
    aiTech: ["Goal alignment scoring model"],
    link: "/dashboard"
  },
  {
    id: "roadmaps",
    label: "Roadmaps",
    icon: Map,
    color: "#60A5FA",
    purpose: "AI-curated curriculum roadmaps structured into progressive phases to guide students systematically toward technical SDE-I readiness.",
    actions: [
      "Simulate learning sprint adjustments.",
      "Track milestones checking specific developer skills.",
      "Access curated certification references and guides."
    ],
    aiTech: ["Roadmap synthesis algorithm", "Cross-domain topic audit filter"],
    link: "/roadmaps"
  },
  {
    id: "career-twin",
    label: "Career Twin",
    icon: Users,
    color: "#818CF8",
    purpose: "An AI-powered digital profile twin comparing user skills directly against industry criteria using vector semantic scores.",
    actions: [
      "Calibrate career vector inputs.",
      "Perform market similarity alignment test.",
      "Obtain targeted keyword insertion recommendations."
    ],
    aiTech: ["Vector similarity index", "Cosine calibration checks"],
    link: "/career-twin"
  },
  {
    id: "ai-mentor",
    label: "AI Mentor",
    icon: Brain,
    color: "#C084FC",
    purpose: "Interactive 전략 strategist counseling platform for simulated drills, resume reviews, and code troubleshooting.",
    actions: [
      "Consult chatbot strategist (Under development).",
      "Run STAR method behavioral mock scenarios.",
      "Calibrate ATS keyword structures."
    ],
    status: "Private Beta",
    link: "/mentor"
  },
  {
    id: "community-intelligence",
    label: "Community Intelligence",
    icon: Shield,
    color: "#34D399",
    purpose: "Aggregated city-level demographics and accessibility registers mapping program density against support indexes.",
    actions: [
      "Review community health accessibility index.",
      "Audit active support gaps by target districts.",
      "Examine recommended deployment tasks."
    ],
    aiTech: ["Pattern Detection", "Predictive Surge Modeling"],
    link: "/community-intelligence"
  },
  {
    id: "support-navigator",
    label: "Support Navigator",
    icon: Compass,
    color: "#22D3EE",
    purpose: "An explainable matching database sorting and ranking community programs based on budget, location, and obstacles.",
    actions: [
      "Filter support plans with specific constraints.",
      "Review semantic compatibility reasonings.",
      "Add custom tasks directly to roadmap trackers."
    ],
    aiTech: ["NLP eligibility parser", "Explainable rating logic"],
    link: "/support-navigator"
  },
  {
    id: "resource-discovery",
    label: "Resource Discovery",
    icon: Globe,
    color: "#93C5FD",
    purpose: "Proximity mapping grid rendering localized support facilities (food, housing, scholarships, internships) within a geocoded radius.",
    actions: [
      "Search opportunities by keywords and sectors.",
      "Filter resources by city locations.",
      "Access external application portals directly."
    ],
    details: ["Scholarships", "Wellness services", "Housing programs", "Food banks", "Internships"],
    link: "/resource-discovery"
  },
  {
    id: "gap-intelligence",
    label: "Gap Intelligence",
    icon: Activity,
    color: "#FBBF24",
    purpose: "An operations desk auditing unmet community needs and calculating regional resource deficiencies.",
    actions: [
      "View critical gap scores per district.",
      "Identify districts with absolute resource shortages.",
      "Export structured CSI gap markdown reports."
    ],
    details: ["Demand tracking", "Availability logs", "Deficiency metrics"],
    link: "/community-gaps"
  },
  {
    id: "command-center",
    label: "Command Center",
    icon: Zap,
    color: "#EF4444",
    purpose: "A NASA-style mission-control panel visualizing live need feeds, regression forecasts, density grids, and auto-triggered agent actions.",
    actions: [
      "Monitor active crowdsourced needs telemetry.",
      "Examine linear regression demand forecasts.",
      "View live density matrix grids."
    ],
    details: ["Live need streams", "AI agent registers", "Matrix heatmaps"],
    link: "/community-command-center"
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    color: "#94A3B8",
    purpose: "Interface control dashboard managing visual layouts, system notifications, credentials, and theme variables.",
    actions: [
      "Select custom interface themes.",
      "Enable compact layout grids or micro-animations.",
      "Manage OpenAI & Gemini API integration keys."
    ],
    link: "/settings"
  },
  {
    id: "profile",
    label: "Profile",
    icon: UserCircle,
    color: "#22D3EE",
    purpose: "Identity database holding core programmer variables, linked resume attachments, and portfolio links.",
    actions: [
      "Update skills arrays and target positions.",
      "Link active resume file endpoints.",
      "Manage professional web portfolio links."
    ],
    link: "/profile"
  }
];

export function DemoGuideConsole() {
  const [activeIndex, setActiveIndex] = useState<string>("dashboard");

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Hero Header */}
      <PageHero
        badge="Interactive Showcase Map"
        title="Demo Walkthrough Guide"
        subtitle="A comprehensive 2-minute overview detailing every workspace, algorithm, and capability in CareerOS."
      />

      {/* Guide Intro Card */}
      <CardSurface variant="surface" className="p-6">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Judges System Audit Rail</h3>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              CareerOS transforms fragmented public assistance systems into accessible, responsive intelligence. 
              Click on any system console card below to inspect its core purpose, live actions, and matching AI technologies, or jump directly into the operational code.
            </p>
          </div>
        </div>
      </CardSurface>

      {/* Accordion Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left List of Accordion Buttons */}
        <div className="lg:col-span-1 space-y-2">
          {GUIDE_ITEMS.map((item) => {
            const Icon = item.icon;
            const isOpen = activeIndex === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveIndex(item.id)}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all duration-200 ${
                  isOpen
                    ? "bg-white/[0.06] text-white border-cyan-500/35 shadow-lg shadow-cyan-500/[0.04] scale-[1.01]"
                    : "bg-white/[0.01] text-slate-400 border-white/[0.04] hover:bg-white/[0.03] hover:text-slate-200"
                }`}
                style={{
                  boxShadow: isOpen ? "inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 20px rgba(0,0,0,0.25)" : "none"
                }}
              >
                <span className="flex items-center gap-3 font-semibold text-xs">
                  <span 
                    className="p-1.5 rounded-lg border flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${item.color}10`,
                      borderColor: `${item.color}25`,
                      color: item.color
                    }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  {item.label}
                </span>

                <div className="flex items-center gap-2">
                  {item.status && (
                    <span className="text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded border border-rose-500/25 bg-rose-500/5 text-rose-300">
                      {item.status}
                    </span>
                  )}
                  <ChevronDown 
                    className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-cyan-400" : ""
                    }`} 
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Active Details Panel (Framer Motion container) */}
        <div className="lg:col-span-2 min-h-[400px]">
          <AnimatePresence mode="wait">
            {GUIDE_ITEMS.map((item) => {
              if (activeIndex !== item.id) return null;
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="h-full"
                >
                  <CardSurface variant="surface" className="p-6 h-full flex flex-col justify-between border-cyan-500/20 bg-gradient-to-b from-[#0c0f1d] to-[#050710]">
                    <div className="space-y-6">
                      
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <div className="flex items-center gap-3">
                          <span 
                            className="p-2.5 rounded-xl border flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: `${item.color}10`,
                              borderColor: `${item.color}30`,
                              color: item.color
                            }}
                          >
                            <Icon className="h-6 w-6" />
                          </span>
                          <div>
                            <h2 className="text-base font-extrabold text-white uppercase tracking-wider">{item.label}</h2>
                            <p className="text-[9px] font-bold text-slate-500 tracking-widest uppercase mt-0.5">Workspace Node Summary</p>
                          </div>
                        </div>

                        {item.status && (
                          <span className="text-[9px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-300">
                            {item.status}
                          </span>
                        )}
                      </div>

                      {/* Purpose */}
                      <div className="space-y-2">
                        <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest block">Purpose</span>
                        <p className="text-xs text-slate-300 leading-relaxed font-medium">
                          {item.purpose}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="space-y-2">
                        <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest block">User Actions & Capabilities</span>
                        <ul className="grid gap-2 sm:grid-cols-1 text-xs">
                          {item.actions.map((act, i) => (
                            <li key={i} className="flex gap-2.5 items-start text-slate-300 leading-normal">
                              <span className="h-5 w-5 shrink-0 flex items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300 text-[10px] font-bold mt-0.5">
                                {i + 1}
                              </span>
                              <span className="font-semibold text-[11px]">{act}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Details (e.g. support includes) */}
                      {item.details && (
                        <div className="space-y-2 border-t border-white/5 pt-4">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Includes support for:</span>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {item.details.map((det, i) => (
                              <span key={i} className="text-[10px] px-2.5 py-1 rounded-lg border border-white/5 bg-white/[0.02] text-slate-300 font-semibold">
                                {det}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* AI Technology */}
                      {item.aiTech && (
                        <div className="space-y-2 border-t border-white/5 pt-4">
                          <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest block">AI Capabilities</span>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {item.aiTech.map((tech, i) => (
                              <span key={i} className="text-[10px] px-2.5 py-1 rounded-lg border border-indigo-500/20 bg-indigo-500/5 text-indigo-300 font-extrabold flex items-center gap-1.5">
                                <Sparkles className="h-3 w-3 text-indigo-400 animate-pulse" />
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Operational Page Transition Link */}
                    <div className="pt-6 border-t border-white/5 mt-6 flex justify-end">
                      <Link 
                        href={item.link} 
                        style={buttonStyle("primary")} 
                        className="px-6 py-2.5 text-xs text-black font-extrabold flex items-center gap-2 rounded-xl animate-pulse-glow"
                      >
                        Enter Operational {item.label}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>

                  </CardSurface>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
