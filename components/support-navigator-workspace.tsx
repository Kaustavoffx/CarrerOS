"use client";

import React from "react";
import { useCommunitySupport } from "./community-support-context";
import { CardSurface, AiExplainabilityCard } from "@/components/ui";
import { inputStyle } from "@/styles/careeros-design-system";

export function SupportNavigatorWorkspace() {
  const {
    selectedMatchResourceId,
    setSelectedMatchResourceId,
    matchScores,
    sortedMatchingResources,
    activeMatchResource,
    matchActionPlanChecked,
    setMatchActionPlanChecked
  } = useCommunitySupport();

  return (
    <CardSurface variant="surface" className="p-5 space-y-6" noPadding>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-5">
        <div className="md:col-span-5 space-y-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Ranked Compatibility Listings</p>
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {sortedMatchingResources.map((res) => {
              const matched = matchScores[res.id];
              const isSelected = selectedMatchResourceId === res.id;
              return (
                <button
                  key={res.id}
                  onClick={() => setSelectedMatchResourceId(res.id)}
                  style={{
                    backgroundColor: isSelected ? "rgba(34,211,238,0.08)" : "rgba(4,8,16,0.30)",
                    borderColor: isSelected ? "rgba(34,211,238,0.30)" : "rgba(255,255,255,0.05)",
                    boxShadow: isSelected ? "0px 0px 12px rgba(34,211,238,0.1)" : "none",
                  }}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    isSelected ? "" : "hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{res.type}</span>
                    <span
                      className={`text-[10px] font-mono font-bold ${
                        matched && matched.score >= 80 ? "text-cyan-400" : matched && matched.score >= 60 ? "text-amber-400" : "text-slate-400"
                      }`}
                    >
                      {matched ? `${matched.score}% MATCH` : "0% MATCH"}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-white mt-1 truncate">{res.name}</p>
                </button>
              );
            })}
          </div>
        </div>

        <CardSurface variant="glass" className="md:col-span-7 space-y-4 p-4" noPadding>
          {activeMatchResource ? (
            <div className="space-y-4 p-4">
              <div>
                <span className="text-[9px] bg-cyan-950 text-cyan-300 font-bold px-2 py-0.5 rounded-full border border-cyan-500/20 uppercase tracking-wider">
                  {activeMatchResource.type}
                </span>
                <h3 className="text-sm font-bold text-white mt-2">{activeMatchResource.name}</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">{activeMatchResource.city || "Online"} • Verified Platform</p>
              </div>

              {matchScores[activeMatchResource.id]?.explainabilityData && (
                <div className="border-t border-white/5 pt-3">
                  <AiExplainabilityCard data={matchScores[activeMatchResource.id]?.explainabilityData} />
                </div>
              )}

              <div className="space-y-1.5">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Missing Eligibility Risk Factors</p>
                <div className="p-2.5 bg-slate-900/30 border border-white/5 rounded-xl text-xs space-y-1">
                  {matchScores[activeMatchResource.id]?.missing.map((item, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[10px] text-slate-300">
                      <span className="text-amber-500 font-bold font-mono">!</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 border-t border-white/5 pt-3">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Automated Application Action Plan</p>
                <div className="space-y-2">
                  {matchScores[activeMatchResource.id]?.checklist.map((step, index) => {
                    const stepKey = `${activeMatchResource.id}-step-${index}`;
                    const isChecked = matchActionPlanChecked[stepKey] || false;
                    return (
                      <label key={index} className="flex items-center gap-2.5 p-2 bg-slate-900/20 hover:bg-slate-900/40 rounded-lg border border-white/5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() =>
                            setMatchActionPlanChecked((prev) => ({
                              ...prev,
                              [stepKey]: !isChecked
                            }))
                          }
                          style={{
                            ...inputStyle("base"),
                            height: "14px",
                            width: "14px",
                            padding: 0,
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                          className="text-cyan-500 focus:ring-cyan-500 checked:bg-cyan-400"
                        />
                        <span className={`text-[10px] text-slate-300 select-none ${isChecked ? "line-through opacity-50" : ""}`}>
                          {step}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center p-4">
              <p className="text-xs text-slate-500">Select a ranked resource to review compatibility audit analytics.</p>
            </div>
          )}
        </CardSurface>
      </div>
    </CardSurface>
  );
}
