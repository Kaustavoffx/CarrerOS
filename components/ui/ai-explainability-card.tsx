"use client";

import React, { useState } from "react";
import { ChevronDown, Brain, Target, Compass, Zap, AlertTriangle, HelpCircle, GitPullRequest, XCircle, Activity, ArrowRight, Lightbulb } from "lucide-react";

export interface MatchedCriteria {
  skills?: string[];
  interests?: string[];
  goals?: string[];
  location?: string;
  constraints?: string[];
  supportNeeds?: string[];
}

export interface ExplainabilityData {
  matchedCriteria: MatchedCriteria;
  confidenceScore: number;
  alternativeRecommendations: string[];
  missingInformation: string[];
  potentialRisks: string[];
  rankingReason: string;
  expectedOutcome?: string;
  howItWorks?: string;
  whatNext?: string;
}

export interface AiExplainabilityCardProps {
  data?: ExplainabilityData;
  className?: string;
}

export function AiExplainabilityCard({ data, className = "" }: AiExplainabilityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!data) return null;

  return (
    <div className={`mt-3 ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 hover:text-cyan-300 transition-colors"
        aria-expanded={isExpanded}
      >
        <Brain className="h-3.5 w-3.5" />
        Explain Why
        <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
      </button>

      {isExpanded && (
        <div className="mt-3 relative overflow-hidden rounded-xl border border-cyan-500/30 bg-black/40 backdrop-blur-xl p-5 shadow-[0_0_30px_rgba(34,211,238,0.05)] before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/[0.05] before:to-transparent before:pointer-events-none transition-all animate-in fade-in slide-in-from-top-2 duration-300">
          
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <Zap className="h-4 w-4 text-cyan-400" />
              Intelligence Engine Analysis
            </h4>
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Confidence</span>
              <span className="text-sm font-black text-cyan-300 font-mono">{data.confidenceScore}%</span>
            </div>
          </div>

          <div className="space-y-5">
            {/* MATCHED CRITERIA */}
            <div className="space-y-3">
              <p className="text-[10px] uppercase text-emerald-400 font-bold tracking-widest flex items-center gap-1.5">
                <Target className="h-3 w-3" /> Matched Criteria
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.matchedCriteria.skills && data.matchedCriteria.skills.length > 0 && (
                  <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5">
                    <span className="block text-[9px] uppercase text-slate-500 font-bold mb-1.5">Skills</span>
                    <div className="flex flex-wrap gap-1">
                      {data.matchedCriteria.skills.map(s => (
                        <span key={s} className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[9px] font-medium">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                
                {data.matchedCriteria.interests && data.matchedCriteria.interests.length > 0 && (
                  <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5">
                    <span className="block text-[9px] uppercase text-slate-500 font-bold mb-1.5">Interests</span>
                    <div className="flex flex-wrap gap-1">
                      {data.matchedCriteria.interests.map(i => (
                        <span key={i} className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-1.5 py-0.5 rounded text-[9px] font-medium">{i}</span>
                      ))}
                    </div>
                  </div>
                )}

                {data.matchedCriteria.goals && data.matchedCriteria.goals.length > 0 && (
                  <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5">
                    <span className="block text-[9px] uppercase text-slate-500 font-bold mb-1.5">Goals</span>
                    <div className="flex flex-wrap gap-1">
                      {data.matchedCriteria.goals.map(g => (
                        <span key={g} className="bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-1.5 py-0.5 rounded text-[9px] font-medium">{g}</span>
                      ))}
                    </div>
                  </div>
                )}

                {data.matchedCriteria.constraints && data.matchedCriteria.constraints.length > 0 && (
                  <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5">
                    <span className="block text-[9px] uppercase text-slate-500 font-bold mb-1.5">Constraints Overcome</span>
                    <div className="flex flex-wrap gap-1">
                      {data.matchedCriteria.constraints.map(c => (
                        <span key={c} className="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded text-[9px] font-medium">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
                
                {data.matchedCriteria.location && (
                   <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5">
                    <span className="block text-[9px] uppercase text-slate-500 font-bold mb-1.5">Location Proximity</span>
                    <span className="bg-white/5 text-slate-300 border border-white/10 px-2 py-0.5 rounded text-[10px] font-medium">{data.matchedCriteria.location}</span>
                  </div>
                )}
                
                {data.matchedCriteria.supportNeeds && data.matchedCriteria.supportNeeds.length > 0 && (
                  <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5 sm:col-span-2">
                    <span className="block text-[9px] uppercase text-slate-500 font-bold mb-1.5">Support Needs Addressed</span>
                    <div className="flex flex-wrap gap-1">
                      {data.matchedCriteria.supportNeeds.map(sn => (
                        <span key={sn} className="bg-rose-500/10 text-rose-300 border border-rose-500/20 px-1.5 py-0.5 rounded text-[9px] font-medium">{sn}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* RANKING REASON */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase text-indigo-400 font-bold tracking-widest flex items-center gap-1.5">
                  <Compass className="h-3 w-3" /> Why #1 Ranked
                </p>
                <div className="bg-white/[0.02] border border-indigo-500/10 rounded-lg p-2.5 text-[10px] text-slate-300 leading-relaxed border-l-2 border-l-indigo-500">
                  {data.rankingReason}
                </div>
              </div>

              {/* RISKS & MISSING INFO */}
              <div className="space-y-3">
                {data.potentialRisks && data.potentialRisks.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] uppercase text-rose-400 font-bold tracking-widest flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Potential Risks
                    </p>
                    <ul className="list-disc list-inside text-[10px] text-slate-400 space-y-0.5">
                      {data.potentialRisks.map((risk, i) => <li key={i}>{risk}</li>)}
                    </ul>
                  </div>
                )}
                
                {data.missingInformation && data.missingInformation.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] uppercase text-amber-400 font-bold tracking-widest flex items-center gap-1">
                      <HelpCircle className="h-3 w-3" /> Missing Context
                    </p>
                    <ul className="list-disc list-inside text-[10px] text-slate-400 space-y-0.5">
                      {data.missingInformation.map((info, i) => <li key={i}>{info}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* ALTERNATIVES */}
            {data.alternativeRecommendations && data.alternativeRecommendations.length > 0 && (
              <div className="pt-3 border-t border-white/5 space-y-2">
                <p className="text-[9px] uppercase text-slate-400 font-bold tracking-widest flex items-center gap-1.5">
                  <GitPullRequest className="h-3 w-3" /> Alternative Paths Considered
                </p>
                <div className="flex flex-wrap gap-2">
                  {data.alternativeRecommendations.map((alt, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-[9px] bg-slate-900 border border-white/10 px-2 py-1 rounded text-slate-400">
                      <XCircle className="h-2.5 w-2.5 text-slate-500" />
                      {alt}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* WHY, HOW, WHAT NEXT */}
            {(data.expectedOutcome || data.howItWorks || data.whatNext) && (
              <div className="pt-3 border-t border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {data.howItWorks && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] uppercase text-cyan-400 font-bold tracking-widest flex items-center gap-1.5">
                      <Lightbulb className="h-3 w-3" /> How It Works
                    </p>
                    <p className="text-[10px] text-slate-300 leading-relaxed">{data.howItWorks}</p>
                  </div>
                )}
                {data.expectedOutcome && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] uppercase text-emerald-400 font-bold tracking-widest flex items-center gap-1.5">
                      <Activity className="h-3 w-3" /> Expected Outcome
                    </p>
                    <p className="text-[10px] text-slate-300 leading-relaxed">{data.expectedOutcome}</p>
                  </div>
                )}
                {data.whatNext && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] uppercase text-amber-400 font-bold tracking-widest flex items-center gap-1.5">
                      <ArrowRight className="h-3 w-3" /> What Next
                    </p>
                    <p className="text-[10px] text-slate-300 leading-relaxed">{data.whatNext}</p>
                  </div>
                )}
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}
