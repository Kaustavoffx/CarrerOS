"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Brain, ArrowRight, ChevronDown, ChevronUp, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { CardSurface } from "@/components/ui/card-surface";
import { CAREEROS, buttonStyle } from "@/styles/careeros-design-system";
import type { UserIntelligenceProfile } from "@/lib/user-intelligence";

interface ActionCenterProps {
  intelligenceProfile: UserIntelligenceProfile;
  className?: string;
}

const URGENCY_STYLES: Record<string, { badge: React.CSSProperties; glow: string }> = {
  critical: {
    badge: { background: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.35)", color: "#FCA5A5" },
    glow: "border-l-4 border-l-rose-500",
  },
  high: {
    badge: { background: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.35)", color: "#FCD34D" },
    glow: "border-l-4 border-l-amber-500",
  },
  medium: {
    badge: { background: "rgba(34,211,238,0.12)", borderColor: "rgba(34,211,238,0.35)", color: "#67E8F9" },
    glow: "border-l-4 border-l-cyan-500",
  },
  low: {
    badge: { background: "rgba(100,116,139,0.15)", borderColor: "rgba(100,116,139,0.35)", color: "#94A3B8" },
    glow: "border-l-4 border-l-slate-500",
  },
};

export function ActionCenter({ intelligenceProfile, className = "" }: ActionCenterProps) {
  const router = useRouter();
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const priorities = intelligenceProfile.priorities || [];

  // Categorize priorities
  const urgentAlerts = priorities.filter((p) => p.urgency === "critical" || (p.category === "Community Support" && p.urgency === "high"));
  const recommendedActions = priorities.filter((p) => p.urgency !== "critical" && !(p.category === "Community Support" && p.urgency === "high"));

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ── Urgent Alert Banner ── */}
      {urgentAlerts.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-rose-500/25 bg-rose-950/10 backdrop-blur-md p-4 flex items-start gap-3.5 shadow-[0_0_24px_rgba(239,68,68,0.08)]">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
          <div className="flex-1 space-y-1">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-rose-400">Critical Priority Alert</span>
            <h4 className="text-xs font-bold text-white leading-snug">
              {urgentAlerts[0].title}: {urgentAlerts[0].action}
            </h4>
            <p className="text-[10px] text-slate-300 leading-normal">
              {urgentAlerts[0].whyExplain}
            </p>
          </div>
          <button
            onClick={() => router.push(urgentAlerts[0].link)}
            style={buttonStyle("danger")}
            className="text-[10px] font-extrabold px-3 py-1.5 h-8 rounded-lg shrink-0 flex items-center justify-center gap-1 self-center"
          >
            Resolve Need
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* ── Priorities Board ── */}
      <CardSurface variant="surface" dust="tr" className="p-6">
        <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-cyan-950/40 border border-cyan-500/15 flex items-center justify-center shadow-[0_0_12px_rgba(34,211,238,0.1)]">
              <Sparkles className="h-4 w-4 text-cyan-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide font-geom">AI Priority & Action Center</h3>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">Real-time Decision Engine recommendations</p>
            </div>
          </div>
          <span className="text-[10px] text-cyan-400 bg-cyan-950/35 border border-cyan-500/15 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            {priorities.length} Tasks Scheduled
          </span>
        </div>

        {recommendedActions.length === 0 && urgentAlerts.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-80" />
            <h5 className="text-xs font-bold text-white">All Clear & Calibrated</h5>
            <p className="text-[10px] text-slate-500 max-w-xs mx-auto mt-1">
              Your Career Intelligence Profile is operational and there are no pending critical action recommendations.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {recommendedActions.map((prio) => {
              const uStyle = URGENCY_STYLES[prio.urgency] || URGENCY_STYLES.medium;
              const isExpanded = !!expandedIds[prio.id];
              return (
                <div
                  key={prio.id}
                  onClick={() => router.push(prio.link)}
                  className={`group relative overflow-hidden rounded-xl border border-white/5 bg-[#090b11] hover:bg-[#0c0f18] hover:border-cyan-500/20 transition-all duration-300 p-4 flex flex-col justify-between cursor-pointer ${uStyle.glow}`}
                >
                  <div>
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-2.5 mb-2.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                        {prio.category}
                      </span>
                      <span
                        style={{
                          ...CAREEROS.BADGES.base,
                          ...prio.whyExplain ? { cursor: "help" } : {},
                          ...uStyle.badge,
                        }}
                      >
                        {prio.urgency}
                      </span>
                    </div>

                    {/* Content */}
                    <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition duration-200 leading-snug">
                      {prio.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-medium leading-normal mt-1">
                      {prio.action}
                    </p>
                  </div>

                  {/* Footer Action Row */}
                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                    <button
                      onClick={(e) => toggleExpand(prio.id, e)}
                      className="text-[9px] font-extrabold text-slate-500 hover:text-cyan-300 flex items-center gap-1 transition"
                      aria-label="Explain priority reasoning"
                    >
                      <Brain className="h-3.5 w-3.5" />
                      {isExpanded ? "Hide Reasoning" : "Why am I seeing this?"}
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>

                    <span className="text-[9px] font-extrabold text-cyan-400 group-hover:underline flex items-center gap-0.5">
                      Execute
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>

                  {/* Expandable Reasoning Accordion */}
                  {isExpanded && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mt-3 p-3 rounded-lg bg-cyan-950/10 border border-cyan-500/10 text-[10px] text-cyan-300/95 leading-normal flex items-start gap-2 animate-fadeIn"
                    >
                      <Info className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{prio.whyExplain}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardSurface>
    </div>
  );
}
