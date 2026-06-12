"use client";

import React, { useState } from "react";
import { 
  ArrowRight, ShieldAlert, 
  Map, HeartHandshake, Zap, BookOpen, DollarSign, Users, Activity
} from "lucide-react";
import { CardSurface, PageHero } from "@/components/ui";
import { inputStyle, buttonStyle } from "@/styles/careeros-design-system";

type Phase = "IDLE" | "ASSESSING" | "PLANNING" | "RESOURCING" | "DONE";

interface Resources {
  financial?: { title: string; description: string; action: string; match: string };
  community?: { title: string; description: string; action: string; match: string };
  educational?: { title: string; description: string; action: string; match: string };
  mentorship?: { title: string; description: string; action: string; match: string };
}

export function EmergencyGuidanceWorkspace() {
  const [situation, setSituation] = useState("");
  const [phase, setPhase] = useState<Phase>("IDLE");
  
  const [assessment, setAssessment] = useState("");
  const [urgency, setUrgency] = useState("");
  const [actions, setActions] = useState<string[]>([]);
  const [resources, setResources] = useState<Resources | null>(null);

  const handleStartSOS = async () => {
    if (!situation.trim() || phase !== "IDLE") return;

    setPhase("ASSESSING");
    setAssessment("");
    setUrgency("");
    setActions([]);
    setResources(null);

    try {
      const res = await fetch("/api/emergency/guidance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation }),
      });

      if (!res.body) throw new Error("No body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          if (part.startsWith("data: ")) {
            const dataStr = part.replace("data: ", "");
            try {
              const data = JSON.parse(dataStr);
              
              if (data.type === "ASSESSMENT_START") setPhase("ASSESSING");
              if (data.type === "ASSESSMENT_DONE") {
                setAssessment(data.assessment);
                setUrgency(data.urgency);
              }
              if (data.type === "ROADMAP_START") setPhase("PLANNING");
              if (data.type === "ROADMAP_DONE") setActions(data.actions);
              if (data.type === "RESOURCES_START") setPhase("RESOURCING");
              if (data.type === "RESOURCES_DONE") {
                setResources(data.resources);
                setPhase("DONE");
              }
            } catch (err) {
              console.error("SSE parse error", err);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setPhase("IDLE");
    }
  };

  const getUrgencyColor = (u: string) => {
    if (u === "Critical") return "text-rose-400 bg-rose-500/10 border-rose-500/20";
    if (u === "High") return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <PageHero
        badge="SOS Protocol"
        badgeVariant="rose"
        title="Emergency Guidance Mode"
        subtitle="Immediate AI-orchestrated support for career and financial crises."
      />

      {/* Input Phase */}
      <CardSurface variant="surface" className={`p-6 transition-all duration-700 ${phase !== 'IDLE' ? 'border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.1)]' : ''}`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-1 space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Describe your situation briefly</label>
            <input
              type="text"
              placeholder="e.g. 'I lost my job' or 'I cannot afford college'"
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              disabled={phase !== "IDLE"}
              style={inputStyle("base")}
              className="w-full"
            />
          </div>
          <div className="pt-6">
            <button
              onClick={handleStartSOS}
              disabled={phase !== "IDLE" || !situation.trim()}
              style={buttonStyle(phase !== "IDLE" || !situation.trim() ? "ghost" : "danger")}
              className="w-full md:w-auto h-11 px-8 py-0 shrink-0 font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {phase === "IDLE" ? (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  Request AI Support
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 animate-pulse" />
                  {phase === "DONE" ? "Guidance Ready" : "Processing..."}
                </>
              )}
            </button>
          </div>
        </div>
      </CardSurface>

      {/* Dynamic Results Dashboard */}
      {phase !== "IDLE" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          
          {/* Phase 1: Assessment */}
          <div className="grid md:grid-cols-[1fr_250px] gap-6">
            <CardSurface variant="glass" className="p-6 relative overflow-hidden group">
              <div className="flex items-center gap-3 mb-4">
                <div className={`h-8 w-8 rounded-full border flex items-center justify-center ${phase === 'ASSESSING' ? 'bg-rose-500/10 border-rose-500/30 animate-pulse' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                  {phase === 'ASSESSING' ? <Activity className="w-4 h-4 text-rose-400" /> : <ShieldAlert className="w-4 h-4 text-emerald-400" />}
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Situation Assessment</h3>
              </div>
              
              <div className="min-h-[60px]">
                {!assessment ? (
                  <p className="text-sm text-slate-400 italic animate-pulse">AI is analyzing context and categorizing risk vectors...</p>
                ) : (
                  <p className="text-sm text-cyan-50 leading-relaxed font-medium animate-in fade-in duration-500">{assessment}</p>
                )}
              </div>
            </CardSurface>

            <CardSurface variant="glass" className="p-6 flex flex-col items-center justify-center text-center">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Calculated Urgency</h4>
              {!urgency ? (
                <div className="h-8 w-24 bg-slate-800/50 rounded-full animate-pulse" />
              ) : (
                <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${getUrgencyColor(urgency)} animate-in zoom-in duration-300`}>
                  {urgency} Priority
                </span>
              )}
            </CardSurface>
          </div>

          {/* Phase 2: Action Plan */}
          {(phase === "PLANNING" || phase === "RESOURCING" || phase === "DONE") && (
            <div className="space-y-4 animate-in fade-in duration-700">
              <div className="flex items-center gap-2 pl-2">
                <Map className={`w-4 h-4 ${phase === 'PLANNING' ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`} />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Immediate Recovery Roadmap</h3>
              </div>
              
              <div className="grid gap-3">
                {actions.length === 0 ? (
                  <CardSurface variant="glass" className="p-4 border-dashed border-white/10">
                    <p className="text-xs text-slate-500 italic animate-pulse">Synthesizing prioritized immediate actions...</p>
                  </CardSurface>
                ) : (
                  actions.map((action, idx) => (
                    <CardSurface key={idx} variant="glass" className="p-4 flex items-center gap-4 hover:border-cyan-500/30 transition-colors">
                      <div className="h-6 w-6 shrink-0 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-cyan-400">{idx + 1}</span>
                      </div>
                      <p className="text-sm text-slate-200 font-medium">{action}</p>
                      <button className="ml-auto h-8 w-8 shrink-0 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors">
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </button>
                    </CardSurface>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Phase 3: Resources Grid */}
          {(phase === "RESOURCING" || phase === "DONE") && (
            <div className="space-y-4 animate-in fade-in duration-700">
              <div className="flex items-center gap-2 pl-2">
                <Zap className={`w-4 h-4 ${phase === 'RESOURCING' ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Targeted Emergency Resources</h3>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                {!resources ? (
                  <>
                    <CardSurface variant="glass" className="p-5 h-32 border-dashed border-white/10 animate-pulse"><div /></CardSurface>
                    <CardSurface variant="glass" className="p-5 h-32 border-dashed border-white/10 animate-pulse"><div /></CardSurface>
                    <CardSurface variant="glass" className="p-5 h-32 border-dashed border-white/10 animate-pulse"><div /></CardSurface>
                    <CardSurface variant="glass" className="p-5 h-32 border-dashed border-white/10 animate-pulse"><div /></CardSurface>
                  </>
                ) : (
                  <>
                    {resources.financial && (
                      <CardSurface variant="glass" hover className="p-5 border-emerald-500/20 group">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center">
                              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                            </div>
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Financial Assistance</span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-500">{resources.financial.match} Match</span>
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1 group-hover:text-emerald-300 transition-colors">{resources.financial.title}</h4>
                        <p className="text-xs text-slate-400 mb-4 line-clamp-2">{resources.financial.description}</p>
                        <button style={buttonStyle("ghost")} className="w-full text-xs h-8 text-emerald-400 hover:bg-emerald-500/10">{resources.financial.action}</button>
                      </CardSurface>
                    )}

                    {resources.community && (
                      <CardSurface variant="glass" hover className="p-5 border-indigo-500/20 group">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded border border-indigo-500/30 bg-indigo-500/10 flex items-center justify-center">
                              <HeartHandshake className="w-3.5 h-3.5 text-indigo-400" />
                            </div>
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Community Support</span>
                          </div>
                          <span className="text-[10px] font-bold text-indigo-500">{resources.community.match} Match</span>
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors">{resources.community.title}</h4>
                        <p className="text-xs text-slate-400 mb-4 line-clamp-2">{resources.community.description}</p>
                        <button style={buttonStyle("ghost")} className="w-full text-xs h-8 text-indigo-400 hover:bg-indigo-500/10">{resources.community.action}</button>
                      </CardSurface>
                    )}

                    {resources.educational && (
                      <CardSurface variant="glass" hover className="p-5 border-blue-500/20 group">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded border border-blue-500/30 bg-blue-500/10 flex items-center justify-center">
                              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                            </div>
                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Educational Opportunity</span>
                          </div>
                          <span className="text-[10px] font-bold text-blue-500">{resources.educational.match} Match</span>
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1 group-hover:text-blue-300 transition-colors">{resources.educational.title}</h4>
                        <p className="text-xs text-slate-400 mb-4 line-clamp-2">{resources.educational.description}</p>
                        <button style={buttonStyle("ghost")} className="w-full text-xs h-8 text-blue-400 hover:bg-blue-500/10">{resources.educational.action}</button>
                      </CardSurface>
                    )}

                    {resources.mentorship && (
                      <CardSurface variant="glass" hover className="p-5 border-amber-500/20 group">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded border border-amber-500/30 bg-amber-500/10 flex items-center justify-center">
                              <Users className="w-3.5 h-3.5 text-amber-400" />
                            </div>
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Mentorship</span>
                          </div>
                          <span className="text-[10px] font-bold text-amber-500">{resources.mentorship.match} Match</span>
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1 group-hover:text-amber-300 transition-colors">{resources.mentorship.title}</h4>
                        <p className="text-xs text-slate-400 mb-4 line-clamp-2">{resources.mentorship.description}</p>
                        <button style={buttonStyle("ghost")} className="w-full text-xs h-8 text-amber-400 hover:bg-amber-500/10">{resources.mentorship.action}</button>
                      </CardSurface>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
