"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { 
  ArrowRight, 
  Sparkles, 
  Compass, 
  TrendingUp, 
  Lock, 
  RefreshCw, 
  Activity, 
  Target, 
  Check,
  Users
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "roadmaps" | "mentor">("dashboard");
  
  // Animate metrics counters on mount
  const [milestonesCount, setMilestonesCount] = useState(48200);
  const [roadmapsCount, setRoadmapsCount] = useState(850);
  const [accuracyPercent, setAccuracyPercent] = useState(80);

  useEffect(() => {
    const duration = 1500; // 1.5s animation
    const steps = 30;
    const intervalTime = duration / steps;
    
    let currentStep = 0;
    
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setMilestonesCount(52400);
        setRoadmapsCount(1250);
        setAccuracyPercent(95);
        clearInterval(timer);
      } else {
        const factor = currentStep / steps;
        setMilestonesCount(Math.round(48200 + (52400 - 48200) * factor));
        setRoadmapsCount(Math.round(850 + (1250 - 850) * factor));
        setAccuracyPercent(Math.round(80 + (95 - 80) * factor));
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, []);

  return (
    <main className="relative isolate overflow-hidden bg-[#050505] text-white">
      {/* Background radial glow and grid mask */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[36rem] bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_65%)]" />
        <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(circle_at_center,black_35%,transparent_92%)]" />
      </div>

      <div className="relative z-10">
        <SiteHeader />

        {/* SECTION 1 — HERO */}
        <section className="mx-auto max-w-7xl px-6 pb-20 pt-32 sm:px-8 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-10 lg:pt-40">
          {/* Hero Left Side */}
          <div className="flex flex-col justify-center lg:col-span-6 space-y-8">
            <div className="inline-flex self-start items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" />
              Private Career Operating System
            </div>

            <div className="space-y-6">
              <h1 className="text-5xl font-medium leading-[0.96] tracking-[-0.04em] text-white sm:text-7xl">
                Turn career goals into an execution system.
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-slate-300">
                CareerOS creates structured roadmaps, tracks execution progress, stores AI mentor guidance, and keeps every next step organized in one workspace.
              </p>
            </div>

            <div className="flex flex-col gap-3.5 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2.5 rounded-full border border-cyan-300/20 bg-cyan-300 px-7 py-3.5 text-sm font-semibold text-black transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(34,211,238,0.25)] hover:bg-cyan-200"
              >
                Start Building
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-7 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.03] hover:bg-white/[0.08]"
              >
                View Dashboard
              </Link>
            </div>

            {/* Trust row */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5 text-sm text-slate-400">
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-cyan-300" />
                Roadmaps
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-cyan-300" />
                AI Mentor
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-cyan-300" />
                Progress Tracking
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-cyan-300" />
                Private Workspace
              </span>
            </div>
          </div>

          {/* Hero Right Side — Interactive Dashboard Preview */}
          <div className="mt-16 lg:mt-0 lg:col-span-6 flex items-center justify-center">
            <div className="relative w-full max-w-lg rounded-[2rem] border border-white/10 bg-[#0a0a0c]/80 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.8)] backdrop-blur-md transition-all duration-500 hover:scale-[1.01] hover:border-cyan-500/20 group">
              {/* Scoring Badge */}
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
                    <Activity className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Active Workspace</p>
                    <p className="text-sm font-medium text-white">Software Engineer I</p>
                  </div>
                </div>
                <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 px-3 py-1.5 text-right">
                  <p className="text-[10px] text-cyan-400 uppercase tracking-widest">Readiness Score</p>
                  <p className="text-base font-bold text-cyan-300">88 / 100</p>
                </div>
              </div>

              {/* Active Roadmap & Sprints */}
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Sprint 01: Core Foundations</span>
                    <span className="text-cyan-300">64% complete</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-[#141417]">
                    <div className="h-full rounded-full bg-cyan-400 transition-all duration-1000" style={{ width: "64%" }} />
                  </div>
                </div>

                {/* Weekly Goals Checklist */}
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500">Weekly Focus</p>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-3 rounded-lg border border-white/[0.02] bg-white/[0.01] px-3 py-2 text-xs text-slate-300">
                      <span className="flex h-4 w-4 items-center justify-center rounded bg-cyan-400/20 text-cyan-300">
                        <Check className="h-3 w-3" />
                      </span>
                      <span>Implement input/output operations</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border border-white/[0.02] bg-white/[0.01] px-3 py-2 text-xs text-slate-300">
                      <span className="h-4 w-4 rounded border border-white/20" />
                      <span>Solve 5 LeetCode DSA exercises</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border border-white/[0.02] bg-white/[0.01] px-3 py-2 text-xs text-slate-300">
                      <span className="h-4 w-4 rounded border border-white/20" />
                      <span>Review System Design fundamentals</span>
                    </div>
                  </div>
                </div>

                {/* AI Mentor Guidance Card */}
                <div className="rounded-xl border border-white/[0.04] bg-cyan-950/10 p-4">
                  <div className="flex items-center gap-2 text-xs text-cyan-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Mentor Recommendation</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">
                    &quot;Prioritize the full-stack Capstone Project this week. It will satisfy the validation criteria for database schema design and operations.&quot;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2 — FEATURE STRIP */}
        <section className="mx-auto max-w-7xl px-6 py-20 sm:px-8 lg:px-10 border-t border-white/[0.04]">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/[0.04] bg-white/[0.01] p-6 transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1.5 hover:border-cyan-500/20 hover:bg-white/[0.03]">
              <Compass className="h-7 w-7 text-cyan-300" />
              <h3 className="mt-4 text-base font-semibold text-white">Roadmaps</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">Structured paths designed around actual domain competency boundaries.</p>
            </div>
            <div className="rounded-2xl border border-white/[0.04] bg-white/[0.01] p-6 transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1.5 hover:border-cyan-500/20 hover:bg-white/[0.03]">
              <Sparkles className="h-7 w-7 text-cyan-300" />
              <h3 className="mt-4 text-base font-semibold text-white">AI Mentor</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">Generates custom workspace recommendation queries for skill validation.</p>
            </div>
            <div className="rounded-2xl border border-white/[0.04] bg-white/[0.01] p-6 transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1.5 hover:border-cyan-500/20 hover:bg-white/[0.03]">
              <Users className="h-7 w-7 text-cyan-300" />
              <h3 className="mt-4 text-base font-semibold text-white">Career Twin</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">Identifies alignment gaps between your profile stats and market benchmarks.</p>
            </div>
            <div className="rounded-2xl border border-white/[0.04] bg-white/[0.01] p-6 transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1.5 hover:border-cyan-500/20 hover:bg-white/[0.03]">
              <TrendingUp className="h-7 w-7 text-cyan-300" />
              <h3 className="mt-4 text-base font-semibold text-white">Progress Tracking</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">Visual progress indicators compile sprint milestones into measurable status metrics.</p>
            </div>
          </div>
        </section>

        {/* SECTION 3 — HOW IT WORKS */}
        <section className="mx-auto max-w-7xl px-6 py-24 sm:px-8 lg:px-10 border-t border-white/[0.04]">
          <div className="text-center space-y-4">
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">The Framework</p>
            <h2 className="text-4xl font-medium tracking-tight text-white sm:text-5xl">How CareerOS Drives Growth</h2>
            <p className="mx-auto max-w-2xl text-slate-400">A structured plan for executing and iterating on your career objectives.</p>
          </div>

          <div className="relative mt-16 grid gap-8 md:grid-cols-3">
            {/* Horizontal Connector Line */}
            <div className="absolute top-1/2 left-0 right-0 hidden h-0.5 -translate-y-1/2 bg-gradient-to-r from-cyan-500/10 via-cyan-400/40 to-cyan-500/10 md:block z-0" />

            {/* Step 1 */}
            <div className="relative z-10 flex flex-col items-center text-center p-6 rounded-2xl border border-white/[0.04] bg-[#08080a] hover:border-cyan-500/20 transition duration-300">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-950/30 text-cyan-300 text-lg font-bold">1</span>
              <h3 className="mt-6 text-xl font-medium text-white">Define Goal</h3>
              <p className="mt-2 text-sm text-slate-400">Choose your target role and skill level. Define your exact career profile.</p>
            </div>

            {/* Step 2 */}
            <div className="relative z-10 flex flex-col items-center text-center p-6 rounded-2xl border border-white/[0.04] bg-[#08080a] hover:border-cyan-500/20 transition duration-300">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-950/30 text-cyan-300 text-lg font-bold">2</span>
              <h3 className="mt-6 text-xl font-medium text-white">Generate Plan</h3>
              <p className="mt-2 text-sm text-slate-400">Receive roadmap milestones tailored to SDE domain constraints.</p>
            </div>

            {/* Step 3 */}
            <div className="relative z-10 flex flex-col items-center text-center p-6 rounded-2xl border border-white/[0.04] bg-[#08080a] hover:border-cyan-500/20 transition duration-300">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-950/30 text-cyan-300 text-lg font-bold">3</span>
              <h3 className="mt-6 text-xl font-medium text-white">Execute</h3>
              <p className="mt-2 text-sm text-slate-400">Track milestones, build capstones, and receive AI mentor guidance.</p>
            </div>
          </div>
        </section>

        {/* SECTION 4 — PRODUCT PREVIEW */}
        <section className="mx-auto max-w-7xl px-6 py-24 sm:px-8 lg:px-10 border-t border-white/[0.04]">
          <div className="text-center space-y-4">
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Dashboard Workspace</p>
            <h2 className="text-4xl font-medium tracking-tight text-white sm:text-5xl">The Execution Workspace</h2>
          </div>

          <div className="mt-12 space-y-6">
            {/* Interactive Tabs */}
            <div className="flex justify-center gap-2">
              <button
                onMouseEnter={() => setActiveTab("dashboard")}
                onClick={() => setActiveTab("dashboard")}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  activeTab === "dashboard"
                    ? "bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.25)]"
                    : "border border-white/10 bg-white/[0.02] text-slate-400 hover:text-white"
                }`}
              >
                Dashboard
              </button>
              <button
                onMouseEnter={() => setActiveTab("roadmaps")}
                onClick={() => setActiveTab("roadmaps")}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  activeTab === "roadmaps"
                    ? "bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.25)]"
                    : "border border-white/10 bg-white/[0.02] text-slate-400 hover:text-white"
                }`}
              >
                Roadmaps
              </button>
              <button
                onMouseEnter={() => setActiveTab("mentor")}
                onClick={() => setActiveTab("mentor")}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  activeTab === "mentor"
                    ? "bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.25)]"
                    : "border border-white/10 bg-white/[0.02] text-slate-400 hover:text-white"
                }`}
              >
                AI Mentor
              </button>
            </div>

            {/* Browser Frame Mockup */}
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#070709] shadow-[0_30px_100px_rgba(0,0,0,0.85)]">
              {/* Browser bar */}
              <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#0c0c0f] px-5 py-3">
                <div className="flex gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-500/70" />
                  <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
                  <span className="h-3 w-3 rounded-full bg-green-500/70" />
                </div>
                <div className="rounded-md bg-[#040405] px-16 py-1 text-xs text-slate-500 border border-white/[0.03]">
                  careeros.com/workspace
                </div>
                <div className="w-10" />
              </div>

              {/* Mockup content wrapper */}
              <div className="p-8 min-h-[300px]">
                {activeTab === "dashboard" && (
                  <div className="animate-fade-in space-y-6">
                    <div className="grid gap-6 md:grid-cols-3">
                      <div className="rounded-xl border border-white/[0.05] bg-white/[0.01] p-5">
                        <p className="text-xs uppercase tracking-wider text-slate-500">Goal Alignment</p>
                        <p className="mt-2 text-xl font-medium text-white">SDE-I Profile</p>
                        <span className="mt-2 inline-block rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs text-cyan-300">Software Engineering</span>
                      </div>
                      <div className="rounded-xl border border-white/[0.05] bg-white/[0.01] p-5">
                        <p className="text-xs uppercase tracking-wider text-slate-500">Total Duration</p>
                        <p className="mt-2 text-xl font-medium text-white">12 Weeks</p>
                        <span className="mt-2 inline-block rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs text-slate-300">Active</span>
                      </div>
                      <div className="rounded-xl border border-white/[0.05] bg-white/[0.01] p-5">
                        <p className="text-xs uppercase tracking-wider text-slate-500">Readiness Score</p>
                        <p className="mt-2 text-xl font-medium text-white">88 / 100</p>
                        <span className="mt-2 inline-block rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs text-green-300">Strong</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "roadmaps" && (
                  <div className="animate-fade-in space-y-4">
                    <h3 className="text-lg font-semibold text-white">Active Roadmap: Software Engineering</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-[#0a0a0c] p-4">
                        <div>
                          <p className="text-xs font-semibold text-cyan-300 uppercase tracking-widest">Milestone 01</p>
                          <h4 className="text-sm font-medium text-white">Programming Fundamentals & Git</h4>
                        </div>
                        <span className="text-xs text-slate-500">Beginner · 4 weeks</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-[#0a0a0c] p-4">
                        <div>
                          <p className="text-xs font-semibold text-cyan-300 uppercase tracking-widest">Milestone 02</p>
                          <h4 className="text-sm font-medium text-white">React, APIs & TypeScript Integration</h4>
                        </div>
                        <span className="text-xs text-slate-500">Intermediate · 4 weeks</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-[#0a0a0c] p-4">
                        <div>
                          <p className="text-xs font-semibold text-cyan-300 uppercase tracking-widest">Milestone 03</p>
                          <h4 className="text-sm font-medium text-white">System Design & Scaling Infrastructure</h4>
                        </div>
                        <span className="text-xs text-slate-500">Advanced · 4 weeks</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "mentor" && (
                  <div className="animate-fade-in space-y-4 max-w-lg mx-auto">
                    <div className="flex items-start gap-3 justify-end">
                      <div className="rounded-2xl bg-[#141417] px-4 py-2.5 text-xs text-slate-200">
                        How should I start learning System Design principles?
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-300">
                        <Sparkles className="h-4 w-4" />
                      </span>
                      <div className="rounded-2xl border border-white/[0.04] bg-[#0a0a0c] px-4 py-3 text-xs leading-relaxed text-slate-300">
                        To learn System Design, focus on topics like Caching, CDNs, database partitioning/sharding, load balancing, and messaging systems. Start by mapping out a mockup tinyURL service or design a mock rate limiter.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5 — BENEFITS */}
        <section className="mx-auto max-w-7xl px-6 py-24 sm:px-8 lg:px-10 border-t border-white/[0.04]">
          <div className="text-center space-y-4">
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">The Advantages</p>
            <h2 className="text-4xl font-medium tracking-tight text-white sm:text-5xl">Designed for Career Execution</h2>
          </div>

          {/* Bento Grid */}
          <div className="mt-16 grid gap-6 md:grid-cols-6 lg:grid-cols-6">
            {/* Card 1: Career Clarity */}
            <div className="col-span-3 rounded-3xl border border-white/[0.04] bg-[#08080a] p-8 hover:border-cyan-500/20 hover:-translate-y-1.5 transition-all duration-300">
              <Compass className="h-8 w-8 text-cyan-300" />
              <h3 className="mt-4 text-xl font-medium text-white">Career Clarity</h3>
              <p className="mt-2 text-sm text-slate-400">Clear domain mapping and target profiling eliminate the ambiguity of planning next steps.</p>
            </div>

            {/* Card 2: Focused Execution */}
            <div className="col-span-3 rounded-3xl border border-white/[0.04] bg-[#08080a] p-8 hover:border-cyan-500/20 hover:-translate-y-1.5 transition-all duration-300">
              <Target className="h-8 w-8 text-cyan-300" />
              <h3 className="mt-4 text-xl font-medium text-white">Focused Execution</h3>
              <p className="mt-2 text-sm text-slate-400">Keep goals, milestones, resources, and checklists in one centralized, single-purpose system.</p>
            </div>

            {/* Card 3: AI Guidance */}
            <div className="col-span-2 rounded-3xl border border-white/[0.04] bg-[#08080a] p-8 hover:border-cyan-500/20 hover:-translate-y-1.5 transition-all duration-300">
              <Sparkles className="h-8 w-8 text-cyan-300" />
              <h3 className="mt-4 text-xl font-medium text-white">AI Guidance</h3>
              <p className="mt-2 text-sm text-slate-400">Personalized mentor loops offer role-specific guidance and actionable tips on demand.</p>
            </div>

            {/* Card 4: Progress Visibility */}
            <div className="col-span-4 rounded-3xl border border-white/[0.04] bg-[#08080a] p-8 hover:border-cyan-500/20 hover:-translate-y-1.5 transition-all duration-300">
              <TrendingUp className="h-8 w-8 text-cyan-300" />
              <h3 className="mt-4 text-xl font-medium text-white">Progress Visibility</h3>
              <p className="mt-2 text-sm text-slate-400">Beautiful metrics, sprint progression indicators, and readiness charts make tracking your milestones visual and rewarding.</p>
            </div>

            {/* Card 5: Private Workspace */}
            <div className="col-span-3 rounded-3xl border border-white/[0.04] bg-[#08080a] p-8 hover:border-cyan-500/20 hover:-translate-y-1.5 transition-all duration-300">
              <Lock className="h-8 w-8 text-cyan-300" />
              <h3 className="mt-4 text-xl font-medium text-white">Private Workspace</h3>
              <p className="mt-2 text-sm text-slate-400">Your state, details, and planning reside securely within your private Supabase-backed workspace.</p>
            </div>

            {/* Card 6: Continuous Improvement */}
            <div className="col-span-3 rounded-3xl border border-white/[0.04] bg-[#08080a] p-8 hover:border-cyan-500/20 hover:-translate-y-1.5 transition-all duration-300">
              <RefreshCw className="h-8 w-8 text-cyan-300" />
              <h3 className="mt-4 text-xl font-medium text-white">Continuous Improvement</h3>
              <p className="mt-2 text-sm text-slate-400">Evolve your path with interactive replanning modules, updating your goals as you acquire skills.</p>
            </div>
          </div>
        </section>

        {/* SECTION 6 — SOCIAL PROOF */}
        <section className="mx-auto max-w-7xl px-6 py-20 sm:px-8 lg:px-10 border-t border-white/[0.04]">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 text-center">
            <div className="space-y-2">
              <p className="text-3xl font-bold text-white tracking-tight">{milestonesCount.toLocaleString()}+</p>
              <p className="text-xs uppercase tracking-wider text-slate-500">milestones generated</p>
            </div>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-white tracking-tight">{roadmapsCount.toLocaleString()}+</p>
              <p className="text-xs uppercase tracking-wider text-slate-500">roadmaps created</p>
            </div>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-white tracking-tight">{accuracyPercent}%</p>
              <p className="text-xs uppercase tracking-wider text-slate-500">completion tracking accuracy</p>
            </div>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-white tracking-tight">24 / 7</p>
              <p className="text-xs uppercase tracking-wider text-slate-500">AI mentoring availability</p>
            </div>
          </div>
        </section>

        {/* SECTION 7 — FINAL CTA */}
        <section className="mx-auto max-w-7xl px-6 py-24 sm:px-8 lg:px-10 border-t border-white/[0.04] text-center">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#08080a] py-20 px-8">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.06),transparent_50%)]" />
            <div className="max-w-2xl mx-auto space-y-6">
              <h2 className="text-4xl font-medium tracking-tight text-white sm:text-5xl">Stop collecting career advice. Start executing.</h2>
              <p className="text-slate-400 max-w-lg mx-auto">Build roadmaps, track execution, consult your mentor, and check your alignment scores on one private workspace.</p>
              <div className="pt-4">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2.5 rounded-full border border-cyan-300/20 bg-cyan-300 px-8 py-4 text-sm font-semibold text-black transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(34,211,238,0.25)] hover:bg-cyan-200"
                >
                  Create My Workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
