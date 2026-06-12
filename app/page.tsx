"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, Sparkles, Target, 
  Activity, Check, X, Shield
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";

// ─── SVG Brands Proof ────────────────────────────────────────────────────────

const BrandLogos = () => (
  <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-35 grayscale contrast-200 py-6">
    <span className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
      <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.11.82-.26.82-.577v-2.234c-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22v3.293c0 .319.22.694.825.576C20.565 21.795 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
      </svg>
      GitHub
    </span>
    <span className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
      <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24">
        <path d="M22.281 9.972a5.885 5.885 0 0 0-.469-2.738 5.955 5.955 0 0 0-1.921-2.146 5.86 5.86 0 0 0-2.887-.93 5.91 5.91 0 0 0-4.305 1.583L12 6.47l-.7-.73a5.915 5.915 0 0 0-4.305-1.583 5.865 5.865 0 0 0-2.887.93A5.96 5.96 0 0 0 2.188 7.234a5.885 5.885 0 0 0-.469 2.738 5.88 5.88 0 0 0 .469 2.738 5.955 5.955 0 0 0 1.921 2.146 5.86 5.86 0 0 0 2.887.93 5.91 5.91 0 0 0 4.305-1.583L12 17.53l.7.73a5.915 5.915 0 0 0 4.305 1.583 5.865 5.865 0 0 0 2.887-.93 5.96 5.96 0 0 0 1.921-2.146 5.885 5.885 0 0 0 .469-2.738zM12 14.168l-1.378-1.432a3.84 3.84 0 0 1-2.81 1.042 3.805 3.805 0 0 1-1.876-.606 3.87 3.87 0 0 1-1.25-1.396 3.825 3.825 0 0 1-.305-1.778 3.825 3.825 0 0 1 .305-1.778 3.87 3.87 0 0 1 1.25-1.396c.55-.386 1.192-.596 1.876-.606a3.84 3.84 0 0 1 2.81 1.042L12 9.832l1.378-1.432a3.84 3.84 0 0 1 2.81-1.042c.684.01 1.326.22 1.876.606a3.87 3.87 0 0 1 1.25 1.396 3.825 3.825 0 0 1 .305 1.778 3.825 3.825 0 0 1-.305 1.778 3.87 3.87 0 0 1-1.25 1.396 3.805 3.805 0 0 1-1.876.606 3.84 3.84 0 0 1-2.81-1.042z" />
      </svg>
      OpenAI
    </span>
    <span className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
      <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24">
        <path d="M12 0L2.35 5.57v12.86L12 24l9.65-5.57V5.57L12 0zm7.65 17.1L12 21.5l-7.65-4.4V7.47L12 3.07l7.65 4.4v9.63z" />
      </svg>
      Supabase
    </span>
    <span className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
      <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24">
        <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-6.887 4.114-4.833 0-8.75-3.917-8.75-8.75s3.917-8.75 8.75-8.75c2.25 0 4.288.825 5.85 2.175l3.075-3.075C18.66.96 15.585 0 12.24 0 5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c7.05 0 11.73-4.95 11.73-11.94 0-.81-.075-1.425-.225-2.25H12.24z" />
      </svg>
      Google
    </span>
    <span className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
      <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24">
        <path d="M24 22.525H0L12 .475z" />
      </svg>
      Vercel
    </span>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────

type ActiveTabType = "dashboard" | "roadmaps" | "mentor" | "twin";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<ActiveTabType>("dashboard");

  // Hero interactive mockup states
  const [previewTasks, setPreviewTasks] = useState([
    { label: "Complete CS50 Lecture 4", checked: true },
    { label: "Complete Problem Set", checked: false },
    { label: "Solve 5 LeetCode Easy", checked: false },
    { label: "Push project to GitHub", checked: false },
  ]);
  const [previewLogs, setPreviewLogs] = useState<string[]>([
    "Sprint track initialized",
  ]);

  const checkedCount = previewTasks.filter(t => t.checked).length;
  const progressPercent = Math.round((checkedCount / previewTasks.length) * 100);
  const readinessScore = 70 + checkedCount * 5;

  function togglePreviewTask(idx: number) {
    setPreviewTasks(prev => {
      const next = prev.map((t, i) => i === idx ? { ...t, checked: !t.checked } : t);
      const targetTask = prev[idx];
      const logMsg = !targetTask.checked
        ? `Completed: "${targetTask.label}"`
        : `Re-opened: "${targetTask.label}"`;
      setPreviewLogs(logs => [logMsg, ...logs].slice(0, 3));
      return next;
    });
  }

  // Auto task checker interval for micro-interaction demo (only if user hasn't clicked)
  useEffect(() => {
    const timer = setInterval(() => {
      setPreviewTasks(prev => {
        const uncheckedIdx = prev.findIndex(t => !t.checked);
        if (uncheckedIdx !== -1) {
          const next = prev.map((t, i) => i === uncheckedIdx ? { ...t, checked: true } : t);
          const task = prev[uncheckedIdx];
          setPreviewLogs(logs => [`Completed: "${task.label}"`, ...logs].slice(0, 3));
          return next;
        } else {
          setPreviewLogs(["Workspace track reset"]);
          return prev.map((t, i) => ({ ...t, checked: i === 0 }));
        }
      });
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="relative isolate overflow-hidden bg-transparent text-white">
      {/* Background grids and glowing atmospheric canvas */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.07),transparent_65%)]" />
        <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:64px_64px]" />
        {/* Subtle massive logo watermark behind Hero */}
        <div className="absolute top-[10%] w-[500px] h-[500px] opacity-[0.025]" style={{ filter: "blur(100px)" }}>
          <Image src="/logo.png" alt="" fill className="object-contain" priority />
        </div>
      </div>

      <div className="relative z-10">
        <SiteHeader />

        {/* ═══ SECTION 1: HERO (Revamped with transforming messaging) ═══════════ */}
        <section className="mx-auto max-w-7xl px-6 pb-24 pt-28 sm:px-8 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-10 lg:pt-36">
          
          {/* Left Hero copy */}
          <div className="flex flex-col justify-center lg:col-span-6 space-y-6 sm:space-y-8">
            <div className="inline-flex self-start items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/5 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" />
              Not another chatbot &middot; A Career Operating System
            </div>

            <div className="space-y-4 sm:space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight text-white">
                Turn your career goal into a weekly execution plan.
              </h1>
              <p className="max-w-lg text-sm sm:text-base leading-relaxed text-slate-400 font-medium">
                Roadmaps. AI mentorship. Career intelligence. Progress tracking. All connected in one unified workspace.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-cyan-400/50 bg-cyan-500/20 hover:bg-cyan-500/30 backdrop-blur-md px-6 py-3.5 text-xs font-bold text-white transition-all hover:scale-[1.02] shadow-[0_4px_24px_rgba(6,182,212,0.4)]"
              >
                Start Building
                <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
              </Link>
              <button
                onClick={() => window.dispatchEvent(new Event("careeros:play-demo"))}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#202028] bg-white/[0.03] hover:bg-white/[0.06] px-6 py-3.5 text-xs font-bold text-white transition hover:scale-[1.02]"
              >
                View Demo
              </button>
            </div>
          </div>

          {/* Right Hero: Stateful Interactive Preview Mockup */}
          <div className="mt-12 lg:mt-0 lg:col-span-6 flex items-center justify-center">
            <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#09090b]/90 p-5 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.25)] backdrop-blur-md transition duration-300 hover:border-cyan-500/20 group">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 bg-cyan-400/5 rounded-full blur-2xl" />

              {/* Goal & Readiness indicator */}
              <div className="flex items-center justify-between border-b border-white/[0.05] pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10 border border-cyan-400/20 text-cyan-300">
                    <Activity className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Target Goal</span>
                    <span className="text-xs font-bold text-white">Software Engineer I</span>
                  </div>
                </div>
                
                {/* Pulsing Readiness Score Ring */}
                <div className="flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-950/20 px-2.5 py-1 text-right relative overflow-hidden">
                  <div className="absolute inset-0 bg-cyan-400/5 animate-pulse" />
                  <div>
                    <span className="text-[8px] text-cyan-400 font-bold uppercase tracking-widest block">Readiness</span>
                    <span className="text-xs font-extrabold text-cyan-300">{readinessScore} / 100</span>
                  </div>
                </div>
              </div>

              {/* Progress and checklists */}
              <div className="space-y-4">
                {/* Interactive checklist progress */}
                <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-3.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                    <span>Sprint: Fundamentals</span>
                    <span className="text-cyan-400">{progressPercent}% complete</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-[#141418] overflow-hidden">
                    <motion.div 
                      className="h-full bg-cyan-400 rounded-full" 
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </div>

                {/* Clickable checklist items */}
                <div>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Interactive Tasks (Click to check)</span>
                  <div className="space-y-1.5">
                    {previewTasks.map((t, i) => (
                      <button
                        key={i}
                        onClick={() => togglePreviewTask(i)}
                        className={`w-full flex items-center gap-2.5 rounded-lg border p-2.5 text-left text-xs transition ${
                          t.checked 
                            ? "border-cyan-500/10 bg-cyan-950/5 text-slate-500" 
                            : "border-[#141418] bg-[#070709] text-slate-300 hover:border-[#1e1e24]"
                        }`}
                      >
                        <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition ${
                          t.checked ? "border-cyan-400 bg-cyan-400 text-black" : "border-slate-700"
                        }`}>
                          {t.checked && <Check className="h-2 w-2 stroke-[3]" />}
                        </span>
                        <span className={t.checked ? "line-through opacity-60" : ""}>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Strategist Recommendations */}
                <div className="rounded-xl border border-[#141418] bg-cyan-950/10 p-3.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-cyan-300 font-bold uppercase">
                    <Sparkles className="h-3.5 w-3.5" />
                    AI Mentor Strategy
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">
                    &ldquo;Prioritize database design operations. Completing task checklist updates readiness metric margins.&rdquo;
                  </p>
                </div>

                {/* Micro activity feed updates */}
                {previewLogs.length > 0 && (
                  <div className="pt-2 border-t border-white/[0.04]">
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Live Activity logs</span>
                    <div className="space-y-1">
                      <AnimatePresence>
                        {previewLogs.map((log, idx) => (
                          <motion.div
                            key={`${log}-${idx}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 0.6, x: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-[10px] text-slate-400 flex items-center gap-1.5"
                          >
                            <span className="h-1 w-1 rounded-full bg-cyan-400" />
                            <span>{log}</span>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ SECTION 2: SOCIAL PROOF (Immediately after hero) ════════════════ */}
        <section className="border-t border-white/[0.04] bg-[#070709]/20 py-12">
          <div className="mx-auto max-w-7xl px-6 text-center space-y-6">
            <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-bold">
              Trusted by engineers, students, career switchers, and builders
            </p>
            <BrandLogos />
          </div>
        </section>

        {/* ═══ SECTION 3: HOW IT WORKS (Timeline progression) ══════════════════ */}
        <section className="mx-auto max-w-7xl px-6 py-24 sm:px-8 lg:px-10 border-t border-white/[0.04]">
          <div className="text-center space-y-3 mb-16">
            <span className="text-[10px] uppercase tracking-[0.25em] text-cyan-400 font-bold">The System</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Structured Step Progression</h2>
            <p className="mx-auto max-w-xl text-slate-400 text-xs sm:text-sm">
              We translate career trajectory planning into a linear checklist workflow.
            </p>
          </div>

          <div className="relative grid gap-6 md:grid-cols-3">
            {/* Horizontal Timeline Connecting Line */}
            <div className="absolute top-1/2 left-0 right-0 hidden h-[1px] -translate-y-1/2 bg-gradient-to-r from-cyan-400/5 via-cyan-400/30 to-cyan-400/5 md:block z-0" />

            {[
              { num: "1", title: "Define Goal", desc: "Choose your target career role, experience constraints, and daily hours capacity." },
              { num: "2", title: "Generate System", desc: "CareerOS designs customized roadmaps, milestone sequences, deliverables, and resource paths." },
              { num: "3", title: "Execute Weekly", desc: "Check checklist tasks, consult your AI strategist, resolve gaps, and complete milestones." }
            ].map(step => (
              <div
                key={step.num}
                className="relative z-10 flex flex-col items-center text-center p-6 rounded-2xl border border-[#141417] bg-[#07070a] hover:border-cyan-400/15 transition duration-300 group"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-950/20 text-cyan-300 text-sm font-extrabold group-hover:scale-105 transition">
                  {step.num}
                </div>
                <h3 className="mt-5 text-base font-bold text-white">{step.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400 max-w-xs">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ SECTION 4: PRODUCT TOUR (Interactive tab preview) ═══════════════ */}
        <section id="product-tour-section" className="mx-auto max-w-7xl px-6 py-24 sm:px-8 lg:px-10 border-t border-white/[0.04]">
          <div className="text-center space-y-3 mb-12">
            <span className="text-[10px] uppercase tracking-[0.25em] text-cyan-400 font-bold">Workspace Tour</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">The Core Platform Modules</h2>
            <p className="mx-auto max-w-xl text-slate-400 text-xs sm:text-sm">
              Discover the connected interfaces driving your weekly execution steps.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-12 items-center">
            {/* Left side: Tab navigation */}
            <div className="lg:col-span-5 space-y-3">
              {[
                { 
                  id: "dashboard", label: "Dashboard", 
                  see: "Consolidated Command Center", 
                  matters: "Keeps today's sprint checklist, readiness logs, and blocker diagnostics unified in one linear interface.", 
                  outcome: "Total execution clarity. You open the workspace and instantly focus on high-priority sprint items."
                },
                { 
                  id: "roadmaps", label: "Roadmaps", 
                  see: "Milestone-based Competency Sequence", 
                  matters: "A custom 12-week roadmap structured around real software engineering domain constraints.", 
                  outcome: "Eliminates duplicate tutorials. You only study resources mapped to active milestone checkpoints."
                },
                { 
                  id: "twin", label: "Career Twin", 
                  see: "Market Gap Intelligence", 
                  matters: "Compares your skills and portfolio items against live SDE target demand markers.", 
                  outcome: "Provides absolute positioning proof, listing exactly what skills to acquire next."
                },
                { 
                  id: "mentor", label: "AI Mentor", 
                  see: "Context-Synced Career Coach", 
                  matters: "A strategist assistant with direct context of your roadmap checks, profile gaps, and history logs.", 
                  outcome: "Immediate blocker resolution. Fetches reviews, database design suggestions, and code audits."
                }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ActiveTabType)}
                  className={`w-full text-left p-5 rounded-2xl border text-xs sm:text-sm transition duration-200 flex flex-col ${
                    activeTab === tab.id
                      ? "border-cyan-400/20 bg-cyan-950/5 shadow-[inset_0_0_12px_rgba(34,211,238,0.05)]"
                      : "border-[#141417] bg-[#07070a]/60 hover:bg-[#09090b] hover:border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`font-bold ${activeTab === tab.id ? "text-cyan-300" : "text-slate-300"}`}>
                      {tab.label}
                    </span>
                    {activeTab === tab.id && <ArrowRight className="h-3.5 w-3.5 text-cyan-400" />}
                  </div>
                  
                  {activeTab === tab.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-3.5 text-xs text-slate-400 space-y-2 border-t border-white/[0.04] pt-2.5"
                    >
                      <p><strong>What you see:</strong> {tab.see}</p>
                      <p><strong>Why it matters:</strong> {tab.matters}</p>
                      <p className="text-cyan-300"><strong>Expected Outcome:</strong> {tab.outcome}</p>
                    </motion.div>
                  )}
                </button>
              ))}
            </div>

            {/* Right side: Mockup interactive screen wrapper */}
            <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-[#070709] overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
              {/* Browser bar */}
              <div className="flex items-center justify-between border-b border-white/[0.05] bg-[#0b0b0e] px-4 py-2.5">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
                </div>
                <div className="rounded border border-white/[0.02] bg-[#050506] px-10 py-0.5 text-[10px] text-slate-500">
                  careeros.com/workspace
                </div>
                <div className="w-8" />
              </div>

              {/* Viewport mockup container */}
              <div className="p-6 min-h-[300px] bg-[#08080a] flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {activeTab === "dashboard" && (
                    <motion.div
                      key="dash"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="w-full space-y-4"
                    >
                      <div className="border border-cyan-500/10 bg-cyan-950/5 p-4 rounded-xl">
                        <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider block">Today&apos;s Mission</span>
                        <h4 className="text-xs font-bold text-white mt-1">Sprint milestone: Data Pipelines and Streams</h4>
                        <div className="mt-3.5 space-y-1.5">
                          <div className="flex items-center gap-2 text-[11px] text-slate-300">
                            <span className="h-3 w-3 rounded bg-cyan-400" />
                            <span className="line-through text-slate-500">Configure Redis consumer buffers</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-300">
                            <span className="h-3 w-3 rounded border border-slate-700" />
                            <span>Implement backpressure limits</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "roadmaps" && (
                    <motion.div
                      key="road"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="w-full space-y-2.5"
                    >
                      <div className="border border-[#1e1e24] bg-[#09090b] p-3 rounded-xl flex items-center justify-between text-xs">
                        <span className="font-bold text-white">Milestone 1: Web Servers & API Design</span>
                        <span className="text-[10px] bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 px-2 py-0.5 rounded-full font-bold">Active</span>
                      </div>
                      <div className="border border-[#1c1c22] bg-[#09090b] p-3 rounded-xl opacity-60 flex items-center justify-between text-xs">
                        <span>Milestone 2: Distributed Caching</span>
                        <span className="text-[10px] border border-[#202028] px-2 py-0.5 rounded-full">Upcoming</span>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "twin" && (
                    <motion.div
                      key="twin"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="w-full space-y-3"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div className="border border-emerald-500/10 bg-emerald-500/5 p-3.5 rounded-xl">
                          <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider block">Target alignment</span>
                          <span className="text-base font-extrabold text-white block mt-1">SDE-I requirements</span>
                          <span className="text-[10px] text-slate-400 mt-2 block">Matched skills score: 92%</span>
                        </div>
                        <div className="border border-rose-500/10 bg-rose-500/5 p-3.5 rounded-xl">
                          <span className="text-[9px] text-rose-400 font-bold uppercase tracking-wider block">Gaps identified</span>
                          <span className="text-base font-extrabold text-white block mt-1">Docker & Compose</span>
                          <span className="text-[10px] text-slate-400 mt-2 block">Active roadblock in Sprint 3</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "mentor" && (
                    <motion.div
                      key="ment"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="w-full space-y-3"
                    >
                      <div className="flex gap-2.5 justify-end">
                        <div className="rounded-xl bg-[#141418] px-3.5 py-2 text-xs text-slate-300">
                          How do I shard relational database schemas?
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <div className="h-6 w-6 rounded bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 flex items-center justify-center shrink-0 mt-0.5">
                          <Sparkles className="h-3 w-3" />
                        </div>
                        <div className="rounded-xl border border-white/[0.04] bg-[#09090b] p-3 text-xs leading-relaxed text-slate-400">
                          Shard relational schemas by splitting rows across DB nodes using a shard key hash (e.g. customer_id). This distributes query load but complicates multi-node transaction joins.
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ SECTION 5: WHY CAREEROS (4 Pillars advantages) ══════════════════ */}
        <section className="mx-auto max-w-7xl px-6 py-24 sm:px-8 lg:px-10 border-t border-white/[0.04]">
          <div className="text-center space-y-3 mb-16">
            <span className="text-[10px] uppercase tracking-[0.25em] text-cyan-400 font-bold">The Pillars</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Outcome-Driven Advantages</h2>
            <p className="mx-auto max-w-xl text-slate-400 text-xs sm:text-sm">
              We focus entirely on career outcomes rather than generic statistics.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Roadmap Intelligence",
                benefit: "Custom competency structure",
                outcome: "Saves weeks of duplicate reading",
                example: "Translates broad goal targets into a precise 12-week checkable sequence."
              },
              {
                title: "AI Mentor Strategy",
                benefit: "Instant code audits & mock advice",
                outcome: "Clear blockers without developer delays",
                example: "Refactors sample Redis buffers and outlines sharding systems on the fly."
              },
              {
                title: "Career Twin Mapping",
                benefit: "Market benchmark gap indexing",
                outcome: "Lists exact skill requirements to prioritize",
                example: "Identifies missing qualifications relative to active job matches."
              },
              {
                title: "Execution Tracking",
                benefit: "Linear checkpoint indicators",
                outcome: "Provides absolute progress metrics",
                example: "Updates readiness scores as task checkpoints are ticked completed."
              }
            ].map(p => (
              <div
                key={p.title}
                className="rounded-2xl border border-[#141417] bg-[#07070a] p-5.5 hover:border-cyan-400/15 hover:-translate-y-1 transition duration-200 flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">{p.title}</h3>
                  <div className="mt-3.5 space-y-1">
                    <span className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider block">Benefit</span>
                    <p className="text-xs text-slate-300">{p.benefit}</p>
                  </div>
                  <div className="mt-3.5 space-y-1">
                    <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider block">Outcome</span>
                    <p className="text-xs text-slate-300">{p.outcome}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.04]">
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest block">Example</span>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{p.example}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ SECTION 6: CAREER TRANSFORMATION ════════════════════════════════ */}
        <section className="mx-auto max-w-7xl px-6 py-24 sm:px-8 lg:px-10 border-t border-white/[0.04]">
          <div className="text-center space-y-3 mb-16">
            <span className="text-[10px] uppercase tracking-[0.25em] text-cyan-400 font-bold">Transformation</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Structured Comparison Matrix</h2>
            <p className="mx-auto max-w-xl text-slate-400 text-xs sm:text-sm">
              Contrast legacy path loops against CareerOS execution frameworks.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
            {/* Before CareerOS */}
            <div className="rounded-2xl border border-red-500/10 bg-red-950/[0.02] p-6 hover:border-red-500/20 transition duration-300">
              <div className="flex items-center gap-2 mb-5">
                <div className="h-6 w-6 rounded bg-red-500/15 flex items-center justify-center text-red-400 shrink-0">
                  <X className="h-3.5 w-3.5 stroke-[2.5]" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-red-400 uppercase tracking-wider">Before CareerOS</h3>
              </div>
              
              <ul className="space-y-4">
                {[
                  { title: "Random Tutorials", desc: "Browsing endless online documentation streams with duplicate modules." },
                  { title: "No Structure", desc: "No linear milestone chain to evaluate readiness or prioritize execution." },
                  { title: "No Accountability", desc: "Completing tasks without deadline logs or weekly momentum trackers." },
                  { title: "Static Progress", desc: "Speculating on market matching alignment indices with dummy profile lists." }
                ].map(item => (
                  <li key={item.title} className="flex gap-3">
                    <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-red-500/20 text-red-500 text-[10px] font-bold">
                      &times;
                    </span>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-300">{item.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* After CareerOS */}
            <div className="rounded-2xl border border-cyan-500/10 bg-cyan-950/[0.02] p-6 hover:border-cyan-500/20 transition duration-300">
              <div className="flex items-center gap-2 mb-5">
                <div className="h-6 w-6 rounded bg-cyan-500/15 flex items-center justify-center text-cyan-300 shrink-0">
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-cyan-300 uppercase tracking-wider">After CareerOS</h3>
              </div>

              <ul className="space-y-4">
                {[
                  { title: "Weekly Sprint Plan", desc: "Check checklist items off directly inside your Today's Mission command center." },
                  { title: "Real Active Roadmap", desc: "12-week competency milestones designed specifically around career targets." },
                  { title: "AI Mentor Guidance", desc: "Relational DB dynamic reviews, caching setup help, and structural support." },
                  { title: "Progress Visibility", desc: "Updates overall metrics, readiness indices, and log history." }
                ].map(item => (
                  <li key={item.title} className="flex gap-3">
                    <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-cyan-500/20 text-cyan-400">
                      <Check className="h-2.5 w-2.5 stroke-[2.5]" />
                    </span>
                    <div>
                      <h4 className="text-xs font-semibold text-white">{item.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ═══ SECTION 7: FEATURE GRID (2x2 premium layout) ════════════════════ */}
        <section className="mx-auto max-w-7xl px-6 py-24 sm:px-8 lg:px-10 border-t border-white/[0.04]">
          <div className="text-center space-y-3 mb-16">
            <span className="text-[10px] uppercase tracking-[0.25em] text-cyan-400 font-bold">Capabilities</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">The CareerOS Workspace</h2>
            <p className="mx-auto max-w-xl text-slate-400 text-xs sm:text-sm">
              Explore the core modules driving structured professional growth.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 max-w-4xl mx-auto">
            {[
              {
                icon: Target,
                title: "Roadmaps",
                desc: "Milestone timelines built around core competency boundaries. Features resource materials, projects, tasks, and deliverables.",
                color: "group-hover:text-cyan-400"
              },
              {
                icon: Sparkles,
                title: "AI Mentor",
                desc: "An active strategist assistant with context-sync capabilities. Resolves code blocks, db structures, and mocks behavior guidelines.",
                color: "group-hover:text-indigo-400"
              },
              {
                icon: Activity,
                title: "Career Twin",
                desc: "Calculates live readiness scores and tracks skill portfolio gaps. No radar mockups, just genuine qualifications progress.",
                color: "group-hover:text-rose-400"
              },
              {
                icon: Shield,
                title: "Execution Workspace",
                desc: "Consolidates checked sprints, weekly consistency metrics, and log updates. Built entirely around privacy and portability.",
                color: "group-hover:text-emerald-400"
              }
            ].map(f => {
              return (
                <div
                  key={f.title}
                  className="group rounded-2xl border border-[#141417] hover:border-cyan-400/20 bg-[#07070a]/60 p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] flex items-start gap-4 relative overflow-hidden"
                >
                  <div className="pointer-events-none absolute -bottom-10 -right-10 h-24 w-24 bg-white/[0.01] rounded-full group-hover:bg-cyan-400/[0.01] transition blur-xl" />
                  
                  <div className="h-10 w-10 rounded-xl bg-[#0c0c0f] border border-[#202028] flex items-center justify-center shrink-0">
                    <Image src="/logo.png" alt="CareerOS" width={16} height={16} className="object-contain opacity-60 group-hover:opacity-100 transition duration-200" />
                  </div>
                  
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white">{f.title}</h3>
                    <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ═══ SECTION 9: FINAL CTA ════════════════════════════════════════════ */}
        <section className="mx-auto max-w-7xl px-6 py-24 sm:px-8 lg:px-10 border-t border-white/[0.04]">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#07070a] py-20 px-8 text-center max-w-4xl mx-auto">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.05),transparent_50%)] animate-pulse" />
            
            <div className="max-w-2xl mx-auto space-y-6 flex flex-col items-center">
              <Image src="/logo.png" alt="CareerOS" width={48} height={48} className="object-contain opacity-80 mb-2" />
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Stop collecting career advice.<br />Start executing.
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                Build your career operating system today. Track your milestones in one private workspace.
              </p>
              
              <div className="pt-4">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-cyan-400/50 bg-cyan-500/20 hover:bg-cyan-500/30 backdrop-blur-md px-8 py-4 text-xs font-bold text-white transition hover:scale-[1.02] shadow-[0_4px_24px_rgba(6,182,212,0.4)]"
                >
                  Start Building My Workspace
                  <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ FOOTER SECTION ════════════════════════════════════════════ */}
        <footer className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-10 border-t border-white/[0.04] mt-12 bg-black/40">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="CareerOS" width={28} height={28} className="object-contain" />
              <span className="text-base font-semibold tracking-wide text-white">CareerOS</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              &copy; {new Date().getFullYear()} CareerOS. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
