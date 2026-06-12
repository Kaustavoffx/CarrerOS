"use client";

import React, { useState } from "react";
import { Brain, Briefcase, GraduationCap, DollarSign, Users, Target, Zap, ArrowRight, CheckCircle2, Play } from "lucide-react";
import { CardSurface, PageHero } from "@/components/ui";
import { buttonStyle, inputStyle } from "@/styles/careeros-design-system";

interface AgentState {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "idle" | "running" | "done";
  output: string | null;
  color: string;
}

const AGENTS_INIT: AgentState[] = [
  { id: "career", name: "Career Agent", icon: Briefcase, status: "idle", output: null, color: "text-blue-400" },
  { id: "learning", name: "Learning Agent", icon: GraduationCap, status: "idle", output: null, color: "text-emerald-400" },
  { id: "scholarship", name: "Scholarship Agent", icon: DollarSign, status: "idle", output: null, color: "text-amber-400" },
  { id: "mentor", name: "Mentor Agent", icon: Users, status: "idle", output: null, color: "text-fuchsia-400" },
  { id: "support", name: "Support Agent", icon: Target, status: "idle", output: null, color: "text-cyan-400" },
];

export function AgenticSwarmWorkspace() {
  const [targetGoal, setTargetGoal] = useState("");
  const [isSwarming, setIsSwarming] = useState(false);
  const [agents, setAgents] = useState<AgentState[]>(AGENTS_INIT);
  const [synthesisState, setSynthesisState] = useState<"idle" | "running" | "done">("idle");
  const [actionPlan, setActionPlan] = useState<string[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleStartSwarm = async () => {
    if (!targetGoal.trim() || isSwarming) return;

    setIsSwarming(true);
    setAgents(AGENTS_INIT.map(a => ({ ...a, status: "idle", output: null })));
    setSynthesisState("idle");
    setActionPlan([]);

    try {
      const response = await fetch("/api/agents/collaborate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetGoal })
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n").filter(Boolean);

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.replace("data: ", ""));
            
            if (data.type === "AGENT_START") {
              setAgents(prev => prev.map(a => a.id === data.agentId ? { ...a, status: "running" } : a));
            } else if (data.type === "AGENT_DONE") {
              setAgents(prev => prev.map(a => a.id === data.agentId ? { ...a, status: "done", output: data.output } : a));
            } else if (data.type === "SYNTHESIS_START") {
              setSynthesisState("running");
            } else if (data.type === "FINAL_PLAN") {
              setSynthesisState("done");
              setActionPlan(data.actionPlan);
              setIsSwarming(false);
            }
          }
        }
      }
    } catch (error) {
      console.error("Swarm failed:", error);
      setIsSwarming(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHero
        title="Agentic Swarm Engine"
        subtitle="Orchestrate 5 specialized AI agents to generate a unified action plan."
      />

      <CardSurface variant="surface" className="p-6">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 relative w-full">
            <input
              type="text"
              placeholder="Enter your career goal (e.g. Software Engineering)..."
              value={targetGoal}
              onChange={(e) => setTargetGoal(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              style={inputStyle(isFocused ? "focus" : isHovered ? "hover" : "base")}
              className="w-full pl-4 pr-4 py-3"
              disabled={isSwarming}
              onKeyDown={(e) => e.key === "Enter" && handleStartSwarm()}
            />
          </div>
          <button
            onClick={handleStartSwarm}
            disabled={isSwarming || !targetGoal.trim()}
            style={buttonStyle(isSwarming || !targetGoal.trim() ? "ghost" : "primary")}
            className="w-full md:w-auto h-11 px-8 py-0 shrink-0 font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSwarming ? (
              <>
                <Zap className="h-4 w-4 animate-pulse" />
                Agents Active
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Initialize Swarm
              </>
            )}
          </button>
        </div>
      </CardSurface>

      {(isSwarming || actionPlan.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Agents Grid */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">Live Agent Reasoning</h3>
            <div className="grid grid-cols-1 gap-3">
              {agents.map((agent) => {
                const Icon = agent.icon;
                const isRunning = agent.status === "running";
                const isDone = agent.status === "done";
                
                return (
                  <CardSurface key={agent.id} variant={isRunning ? "glass" : "surface"} className={`p-4 transition-all duration-500 ${isRunning ? 'border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.1)]' : ''}`}>
                    <div className="flex items-start gap-4">
                      <div className={`h-10 w-10 shrink-0 rounded-xl border flex items-center justify-center ${isRunning ? 'bg-slate-900/50 border-cyan-500/30' : isDone ? 'bg-slate-900/30 border-white/10' : 'bg-slate-900/10 border-white/5 opacity-50'}`}>
                        <Icon className={`h-5 w-5 ${isRunning ? 'animate-pulse text-cyan-400' : isDone ? agent.color : 'text-slate-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`text-sm font-bold ${isDone ? 'text-white' : 'text-slate-400'}`}>{agent.name}</h4>
                          {isRunning && <span className="text-[9px] uppercase tracking-wider text-cyan-400 font-bold animate-pulse flex items-center gap-1"><Zap className="h-3 w-3" /> Analyzing</span>}
                          {isDone && <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Complete</span>}
                        </div>
                        {isDone && agent.output && (
                          <div className="mt-2 text-xs text-slate-300 leading-relaxed bg-slate-950/30 p-2.5 rounded-lg border border-white/5 animate-in fade-in slide-in-from-top-2">
                            {agent.output}
                          </div>
                        )}
                        {isRunning && (
                          <div className="h-4 mt-2 w-3/4 rounded bg-slate-800/50 animate-pulse" />
                        )}
                      </div>
                    </div>
                  </CardSurface>
                );
              })}
            </div>
          </div>

          {/* Action Plan Output */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2 flex items-center gap-2">
              Combined Action Plan
              {synthesisState === "running" && <Zap className="h-3 w-3 text-cyan-400 animate-pulse" />}
            </h3>
            <CardSurface variant="glass" className={`p-6 min-h-[400px] flex flex-col ${synthesisState === "running" ? 'border-cyan-500/30' : ''}`}>
              {synthesisState === "idle" && actionPlan.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                  <Brain className="h-12 w-12 text-slate-600" />
                  <p className="text-sm text-slate-400">Waiting for agents to complete their specialized analysis...</p>
                </div>
              )}
              
              {synthesisState === "running" && (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full" />
                    <Brain className="h-12 w-12 text-cyan-400 animate-pulse relative z-10" />
                  </div>
                  <p className="text-sm text-cyan-300 font-bold tracking-wide animate-pulse">Synthesizing multidimensional intelligence into a unified plan...</p>
                </div>
              )}

              {actionPlan.length > 0 && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                  <div className="pb-4 border-b border-white/10">
                    <h2 className="text-lg font-black text-white">Your Optimized Roadmap</h2>
                    <p className="text-xs text-slate-400 mt-1">Generated by 5-Agent Collaborative Swarm Intelligence.</p>
                  </div>
                  <div className="space-y-3">
                    {actionPlan.map((step, index) => (
                      <div key={index} className="flex gap-3 items-start bg-slate-900/30 p-3 rounded-xl border border-white/5 group hover:bg-slate-900/50 transition-colors">
                        <div className="h-6 w-6 shrink-0 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center text-[10px] font-black">
                          {index + 1}
                        </div>
                        <p className="text-sm text-slate-200 leading-relaxed pt-0.5">{step}</p>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-white/10 flex justify-end">
                    <button style={buttonStyle("secondary")} className="px-4 py-2 text-[10px] uppercase font-bold tracking-wider flex items-center gap-2">
                      Export Plan <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
            </CardSurface>
          </div>
        </div>
      )}
    </div>
  );
}
