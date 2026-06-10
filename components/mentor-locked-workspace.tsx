"use client";

import React from "react";
import { Lock, Send, Check, Brain, User } from "lucide-react";
import { PageHero } from "@/components/ui";
import { buttonStyle } from "@/styles/careeros-design-system";
import { LiquidDust } from "@/components/ui/liquid-dust";
import type { UserProfileRecord } from "@/lib/supabase/types";

type MentorLockedWorkspaceProps = {
  profile: UserProfileRecord | null;
};

export function MentorLockedWorkspace({ profile }: MentorLockedWorkspaceProps) {
  const readiness = profile?.readiness_score ?? 0;
  const role = profile?.goal ?? "Software Engineer";
  const experience = profile?.experience_level ?? "Junior";

  // Mock messages to show in the background
  const mockMessages = [
    {
      role: "mentor",
      content: "Hello Operator. I am your AI Career Mentor. I have synced with your active goals and skill maps. How would you like to calibrate your strategy today?",
      time: "10:00 AM"
    },
    {
      role: "user",
      content: "Can you help me prepare for a mock interview on system design?",
      time: "10:01 AM"
    }
  ];

  return (
    <div className="min-h-screen text-slate-200 max-w-[1440px] mx-auto relative px-4 sm:px-6 select-none">
      <div className="absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(circle_at_50%_0%,rgba(var(--careeros-primary-rgb),0.03),transparent_50%)]" />

      {/* Hero Header */}
      <PageHero
        badge="AI Mentor Advisor Console"
        title="AI Career Mentor"
        subtitle="Advanced simulator boards, coaching engines & resume reviewer tools"
        status="beta"
      />

      {/* Main Workspace Grid (Mirrors console, blurred background) */}
      <div className="relative min-h-[70vh] grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6 overflow-hidden rounded-[28px] border border-white/[0.04] p-1.5">
        <LiquidDust origin="tr" color="cyan" intensity={0.03} />
        <LiquidDust origin="bl" color="indigo" intensity={0.03} />

        {/* ── LEFT SIDEBAR: Context Memory (Mocked & Disabled) ── */}
        <aside className="hidden lg:block space-y-6 bg-white/[0.01] border-r border-white/[0.05] p-5.5 blur-[2px] opacity-40 pointer-events-none">
          <section className="space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Mentor Context
              </h4>
            </div>
            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Goal Target</span>
                <span className="text-white font-bold block mt-0.5">{role}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Readiness</span>
                  <span className="text-cyan-400 font-extrabold block mt-0.5">{readiness}%</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Level</span>
                  <span className="text-slate-200 font-bold block mt-0.5">{experience}</span>
                </div>
              </div>
              <div className="border-t border-white/5 pt-3">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Capacity</span>
                <span className="text-slate-200 font-bold block mt-0.5">{profile?.time_availability || "10 hrs/week"}</span>
              </div>
            </div>
          </section>

          <section className="space-y-4 pt-4 border-t border-white/5">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">
              Identity Assets
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-slate-400 block text-[8px] font-bold uppercase">Resume</span>
                <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded mt-1 inline-block border bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
                  Linked
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[8px] font-bold uppercase">Portfolio</span>
                <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded mt-1 inline-block border bg-white/5 text-slate-400 border-white/5">
                  Missing
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[8px] font-bold uppercase">GitHub</span>
                <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded mt-1 inline-block border bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
                  Linked
                </span>
              </div>
            </div>
          </section>
        </aside>

        {/* ── CENTER WORKSPACE: Chat Console Area (Mocked & Blurred) ── */}
        <main className="lg:col-span-2 flex flex-col min-h-[60vh] relative blur-[3px] opacity-30 pointer-events-none">
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {mockMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 max-w-[85%] rounded-2xl p-4 border ${
                  msg.role === "mentor"
                    ? "chat-message-assistant mr-auto border-cyan-500/15"
                    : "chat-message-user ml-auto border-white/5"
                }`}
              >
                <div className="shrink-0">
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center border ${
                    msg.role === "mentor" ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-white/5 border-white/10 text-slate-300"
                  }`}>
                    {msg.role === "mentor" ? <Brain className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                </div>
                <div className="space-y-1.5 min-w-0">
                  <p className="text-xs text-slate-300 leading-relaxed">{msg.content}</p>
                  <span className="text-[9px] text-slate-500 block">{msg.time}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Locked Chat Input Dock */}
          <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-3 relative p-1.5 mentor-input-dock rounded-[20px] w-full">
              <input
                disabled
                placeholder="Ask advisor about roadmap, resume review, mock interviews, or project specification..."
                className="w-full bg-transparent px-4 py-2.5 text-xs text-slate-500 outline-none cursor-not-allowed"
              />
              <button
                disabled
                style={{ ...buttonStyle("primary"), width: "40px", height: "40px", opacity: 0.5 }}
                className="rounded-xl flex items-center justify-center shrink-0 cursor-not-allowed"
              >
                <Send className="h-4 w-4 text-black" />
              </button>
            </div>
          </div>
        </main>

        {/* ── RIGHT COLUMN: Action Recommendations (Mocked & Blurred) ── */}
        <aside className="hidden lg:block space-y-6 bg-white/[0.01] border-l border-white/[0.05] p-5.5 blur-[2px] opacity-40 pointer-events-none">
          <section className="space-y-4">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">
              Priority Sprint Queue
            </h4>
            <div className="space-y-2">
              <div className="flex gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5 text-xs">
                <span className="h-5 w-5 shrink-0 flex items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300 text-[10.5px] font-bold">1</span>
                <span className="text-slate-400">Implement system design caching</span>
              </div>
              <div className="flex gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5 text-xs">
                <span className="h-5 w-5 shrink-0 flex items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300 text-[10.5px] font-bold">2</span>
                <span className="text-slate-400">Clean up credential details</span>
              </div>
            </div>
          </section>
        </aside>

        {/* ── GLASS LOCK OVERLAY & CENTER LOCK CARD ── */}
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/10 backdrop-blur-[5px] p-4 transition-all duration-300">
          <div
            className="w-full max-w-md rounded-[28px] p-6 text-center border relative overflow-hidden flex flex-col items-center gap-5"
            style={{
              background: "rgba(8, 12, 24, 0.75)",
              backdropFilter: "blur(30px) saturate(180%)",
              WebkitBackdropFilter: "blur(30px) saturate(180%)",
              borderColor: "rgba(34, 211, 238, 0.15)",
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 24px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(34, 211, 238, 0.05)"
            }}
          >
            {/* Top Cyan Highlight line */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

            {/* Badges Container */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-300 text-[9px] font-extrabold tracking-widest uppercase shadow-[0_0_10px_rgba(34,211,238,0.1)]">
                <span className="h-1 w-1 rounded-full bg-cyan-400 animate-pulse" />
                Private Beta
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-rose-500/20 bg-rose-500/5 text-rose-300 text-[9px] font-extrabold tracking-widest uppercase shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                <Lock className="h-2.5 w-2.5" />
                Locked
              </span>
            </div>

            {/* Lock Hex Icon */}
            <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.06] shadow-lg text-cyan-400 group">
              <div className="absolute inset-0 bg-cyan-500/10 filter blur-md opacity-30 rounded-2xl" />
              <Brain className="h-8 w-8 relative z-10 animate-pulse text-cyan-300" />
            </div>

            {/* Center Lock Message */}
            <div className="space-y-2.5">
              <h3 className="text-lg font-bold text-white uppercase tracking-wider font-geom">
                AI Mentor Workspace
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed max-w-sm px-2 font-medium">
                &ldquo;Advanced coaching systems are currently under calibration.&rdquo;
              </p>
            </div>

            {/* Features Preview List */}
            <div className="w-full border-t border-white/5 pt-4 text-left space-y-2.5 px-3">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Features Preview:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                {[
                  "Resume Intelligence Engine",
                  "Mock Interview Simulator",
                  "ATS Optimization",
                  "Career Strategy Sessions",
                  "System Design Coaching",
                  "Behavioral Interview Training"
                ].map((feat, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] text-slate-300 font-medium">
                    <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0 stroke-[2.5]" />
                    <span className="truncate">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Disabled Operator Access Button */}
            <button
              disabled
              style={{
                width: "100%",
                height: "40px",
                borderRadius: "12px",
                fontWeight: 650,
                fontSize: "11px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "rgba(255, 255, 255, 0.3)",
                cursor: "not-allowed"
              }}
              className="mt-2 flex items-center justify-center gap-2 border shadow-inner transition-colors duration-200"
            >
              <Lock className="h-3.5 w-3.5 text-slate-600" />
              Operator Access Required
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
