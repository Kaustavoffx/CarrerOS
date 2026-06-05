"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, TrendingUp, Zap, ShieldAlert, Brain, Compass, Briefcase,
  History, Award, ChevronDown, ChevronUp, CheckSquare, Square, Share2, RefreshCw
} from "lucide-react";
import type { UserProfileRecord, WorkspaceSnapshotRecord } from "@/lib/supabase/types";

// ─── Radar Chart Math & Configuration ────────────────────────────────────────

const RADAR_AXES = [
  { name: "Technical Skills", key: "skills" },
  { name: "Projects", key: "projects" },
  { name: "Interview Readiness", key: "interview" },
  { name: "Consistency", key: "consistency" },
  { name: "Portfolio", key: "portfolio" },
  { name: "Networking", key: "networking" },
  { name: "Execution", key: "execution" },
  { name: "System Design", key: "systemDesign" }
];

const AXIS_DESCRIPTIONS: Record<string, string> = {
  "Technical Skills": "Evaluates the depth and breadth of your coding stack and language proficiencies.",
  "Projects": "Measures commit history, complexity, and application deployments in your roadmap.",
  "Interview Readiness": "Tracks DSA speeds, mock scores, and behavioral preparation state.",
  "Consistency": "Tracks streak metrics, study frequency, and dashboard engagement stability.",
  "Portfolio": "Assesses project visibility, documentation completeness, and design polish.",
  "Networking": "Measures community contributions, review checks, and collaborative mock sessions.",
  "Execution": "Tracks completion rate of generated roadmap tasks and milestones.",
  "System Design": "Measures proficiency in layout scaling, backend services, and cache architectures."
};

// ─── Types ───────────────────────────────────────────────────────────────────

type CareerTwinDashboardProps = {
  profile: UserProfileRecord | null;
  workspace: WorkspaceSnapshotRecord | null;
};

export function CareerTwinDashboard({ profile, workspace }: CareerTwinDashboardProps) {
  // Data extraction and fallbacks
  const readiness = profile?.readiness_score ?? 82;
  const progressLogs = workspace?.progress ?? [];
  const roadmaps = workspace?.roadmaps ?? [];
  
  // Calculate base execution scores
  const avgProgress = roadmaps.length
    ? Math.round(roadmaps.reduce((a, r) => a + r.progress, 0) / roadmaps.length)
    : 54;
  const execution = avgProgress > 0 ? avgProgress : 72;
  const avgMomentum = progressLogs.length
    ? Math.round(progressLogs.reduce((a, p) => a + p.value, 0) / progressLogs.length)
    : 58;
  const healthScore = Math.round((readiness + avgMomentum + execution) / 3);

  // Compute Radar Chart dynamic scores
  const getRadarScore = (axisKey: string) => {
    switch (axisKey) {
      case "skills":
        return Math.min(95, Math.max(35, (profile?.skills?.length ?? 0) * 8 + 35));
      case "projects":
        return Math.min(95, Math.max(40, progressLogs.length * 8 + 42));
      case "interview":
        return Math.round(readiness * 0.9);
      case "consistency":
        return Math.min(90, Math.max(50, avgMomentum + 5));
      case "portfolio":
        return Math.min(90, Math.max(45, roadmaps.length * 15 + 40));
      case "networking":
        return 62;
      case "execution":
        return execution;
      case "systemDesign":
        return profile?.experience_level === "Senior" ? 75 : (profile?.experience_level === "Mid" ? 58 : 42);
      default:
        return 50;
    }
  };

  const radarData = RADAR_AXES.map(axis => ({
    name: axis.name,
    score: getRadarScore(axis.key)
  }));

  // State controls
  const [hoveredAxis, setHoveredAxis] = useState<{ name: string; score: number; x: number; y: number } | null>(null);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
  const [checkedRecs, setCheckedRecs] = useState<Record<string, boolean>>({
    dsa: false,
    project: false,
    github: false,
    mocks: false
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState("Just now");

  const triggerSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastUpdatedTime("Just now");
    }, 1200);
  };

  // Math coordinates for Radar Chart
  const svgSize = 320;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const chartRadius = 110;

  const getCoordinates = (index: number, score: number) => {
    const angle = (index * 2 * Math.PI) / RADAR_AXES.length - Math.PI / 2;
    const distance = (score / 100) * chartRadius;
    return {
      x: cx + distance * Math.cos(angle),
      y: cy + distance * Math.sin(angle)
    };
  };

  const getAxisEndCoordinates = (index: number) => {
    const angle = (index * 2 * Math.PI) / RADAR_AXES.length - Math.PI / 2;
    return {
      x: cx + chartRadius * Math.cos(angle),
      y: cy + chartRadius * Math.sin(angle)
    };
  };

  const radarPoints = radarData.map((d, i) => getCoordinates(i, d.score));

  // Animations configuration
  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }
  };

  return (
    <div className="space-y-7 pb-20 relative">
      <div className="absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.04),transparent_60%)]" />

      {/* ═══ SECTION 1: COMMAND CENTER ════════════════════════════════════════ */}
      <motion.section 
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        className="grid gap-6"
      >
        {/* Header bar */}
        <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
              </span>
              <p className="caption text-cyan-400">Career Twin</p>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Digital Career Snapshot</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right text-xs">
              <p className="text-slate-500 font-semibold uppercase tracking-wider">Last Sync Check</p>
              <p className="text-white font-medium mt-0.5">{lastUpdatedTime}</p>
            </div>
            <button
              onClick={triggerSync}
              className="rounded-full border border-white/10 bg-[#0d0d10] p-2.5 text-slate-400 hover:text-white transition hover:border-white/20 active:scale-95"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin text-cyan-400" : ""}`} />
            </button>
          </div>
        </motion.div>

        {/* Dynamic Metric Cards */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { name: "Readiness", value: readiness, color: "text-cyan-400", glow: "rgba(34,211,238,0.15)", desc: "Calculated preparation level" },
            { name: "Momentum", value: avgMomentum, color: "text-amber-400", glow: "rgba(245,158,11,0.15)", desc: "Weekly consistent velocity" },
            { name: "Execution", value: execution, color: "text-indigo-400", glow: "rgba(129,140,248,0.15)", desc: "Milestone completion rate" },
            { name: "Career Health", value: healthScore, color: "text-emerald-400", glow: "rgba(16,185,129,0.15)", desc: "Aggregated growth trajectory" }
          ].map((card) => (
            <motion.div
              key={card.name}
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              style={{ boxShadow: `0 8px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)` }}
              className="relative overflow-hidden rounded-[24px] border border-white/5 bg-[#08080a] p-6 transition-colors hover:bg-[#0c0c0f]"
            >
              <div 
                className="absolute -right-10 -top-10 h-24 w-24 rounded-full blur-2xl pointer-events-none"
                style={{ backgroundColor: card.glow }}
              />
              <span className="caption uppercase tracking-[0.2em] text-slate-500 font-semibold">{card.name}</span>
              <div className="mt-3.5 flex items-baseline gap-1.5">
                <span className={`text-4xl font-extrabold tracking-tight ${card.color}`}>{card.value}</span>
                <span className="text-xs text-slate-500">/100</span>
              </div>
              <p className="mt-2.5 text-[11px] text-slate-500 leading-normal">{card.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* Main 3-Column Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

        {/* ═══ COLUMN 1: CENTERPIECE Radar & Analysis ════════════════════════ */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* SECTION 2: 3D CAREER DNA PANEL */}
          <section className="liquid-panel rounded-[28px] p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.03),transparent_60%)]" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 border-b border-white/5 pb-4">
                <Compass className="h-4.5 w-4.5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-semibold text-white">3D Career DNA Panel</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Interactive vector metrics representation</p>
                </div>
              </div>

              {/* Vector Radar Chart Area */}
              <div className="relative mt-4 flex items-center justify-center">
                <svg width={svgSize} height={svgSize} className="overflow-visible">
                  {/* Outer rings grids */}
                  {[0.25, 0.5, 0.75, 1.0].map((scale, gridIdx) => {
                    const r = scale * chartRadius;
                    const points = RADAR_AXES.map((_, idx) => {
                      const angle = (idx * 2 * Math.PI) / RADAR_AXES.length - Math.PI / 2;
                      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
                    }).join(" ");
                    return (
                      <polygon
                        key={gridIdx}
                        points={points}
                        fill="none"
                        stroke="rgba(255,255,255,0.03)"
                        strokeWidth="1"
                      />
                    );
                  })}

                  {/* Circular outer layout */}
                  <circle cx={cx} cy={cy} r={chartRadius} fill="none" stroke="rgba(34,211,238,0.06)" strokeWidth="1" strokeDasharray="3 3" />

                  {/* Axis line lines */}
                  {RADAR_AXES.map((_, i) => {
                    const end = getAxisEndCoordinates(i);
                    return (
                      <line
                        key={i}
                        x1={cx}
                        y1={cy}
                        x2={end.x}
                        y2={end.y}
                        stroke="rgba(255,255,255,0.04)"
                        strokeWidth="1"
                      />
                    );
                  })}

                  {/* Radar Area Polygon */}
                  <polygon
                    points={radarPoints.map(p => `${p.x},${p.y}`).join(" ")}
                    fill="rgba(34,211,238,0.12)"
                    stroke="#22d3ee"
                    strokeWidth="2.5"
                    className="transition-all duration-500"
                  />

                  {/* Interactive Nodes */}
                  {radarPoints.map((p, i) => {
                    const d = radarData[i];
                    return (
                      <g key={i}>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="5.5"
                          fill="#030712"
                          stroke="#22d3ee"
                          strokeWidth="2.5"
                          className="cursor-crosshair transition-all duration-200 hover:scale-150 hover:fill-cyan-400"
                          onMouseEnter={() => setHoveredAxis({ name: d.name, score: d.score, x: p.x, y: p.y })}
                          onMouseLeave={() => setHoveredAxis(null)}
                        />
                      </g>
                    );
                  })}

                  {/* Radar Axes Text labels */}
                  {RADAR_AXES.map((axis, i) => {
                    const angle = (i * 2 * Math.PI) / RADAR_AXES.length - Math.PI / 2;
                    const labelDist = chartRadius + 22;
                    const lx = cx + labelDist * Math.cos(angle);
                    const ly = cy + labelDist * Math.sin(angle);
                    
                    let textAnchor: "start" | "middle" | "end" = "middle";
                    if (Math.cos(angle) > 0.1) textAnchor = "start";
                    if (Math.cos(angle) < -0.1) textAnchor = "end";

                    return (
                      <text
                        key={i}
                        x={lx}
                        y={ly + 4}
                        textAnchor={textAnchor}
                        fontSize="9"
                        fontWeight="700"
                        fill="#64748b"
                        className="tracking-wide uppercase pointer-events-none"
                      >
                        {axis.name.split(" ")[0]}
                      </text>
                    );
                  })}
                </svg>

                {/* Radar Interactive Tooltip Box */}
                <AnimatePresence>
                  {hoveredAxis && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute z-20 w-48 rounded-2xl border border-[#22d3ee]/20 bg-[#070709] p-3 text-xs shadow-2xl backdrop-blur-md"
                      style={{
                        left: `${Math.max(10, Math.min(svgSize - 190, hoveredAxis.x - 90))}px`,
                        top: `${Math.max(10, Math.min(svgSize - 90, hoveredAxis.y + 12))}px`
                      }}
                    >
                      <p className="font-bold text-white uppercase tracking-wider text-[10px]">{hoveredAxis.name}</p>
                      <p className="mt-1 text-cyan-300 font-extrabold text-sm">{hoveredAxis.score}% Readiness</p>
                      <p className="mt-1.5 text-[10px] text-slate-400 leading-normal leading-relaxed">
                        {AXIS_DESCRIPTIONS[hoveredAxis.name]}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </section>

          {/* SECTION 4: AI CAREER ANALYSIS */}
          <section className="liquid-panel rounded-[28px] p-6 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-4.5">
              <Brain className="h-4.5 w-4.5 text-indigo-400" />
              <div>
                <h3 className="text-sm font-semibold text-white">AI Career Analysis</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Click card parameter to toggle details</p>
              </div>
            </div>

            <div className="space-y-3.5">
              {[
                { 
                  type: "strength", 
                  title: "Strong foundations", 
                  color: "border-emerald-500/10 bg-emerald-500/5 hover:border-emerald-500/20 text-emerald-400 text-emerald-300", 
                  desc: "High score consistency in basic programming skills. Your mental models of scope, memory pointers, and async functions are highly integrated." 
                },
                { 
                  type: "risk", 
                  title: "Insufficient project depth", 
                  color: "border-rose-500/10 bg-rose-500/5 hover:border-rose-500/20 text-rose-400 text-rose-300", 
                  desc: "You have multiple small repos, but lack a unified production system utilizing databases, middleware routing, and caching. This stands out as a high pipeline risk." 
                },
                { 
                  type: "opportunity", 
                  title: "Open-source contribution", 
                  color: "border-cyan-500/10 bg-cyan-500/5 hover:border-cyan-500/20 text-cyan-400 text-cyan-300", 
                  desc: "Leveraging structured packages. Working on Next.js templates or contributing minor PRs to component packages will dramatically elevate interview credibility." 
                },
                { 
                  type: "weakness", 
                  title: "System design gap", 
                  color: "border-amber-500/10 bg-amber-500/5 hover:border-amber-500/20 text-amber-400 text-amber-300", 
                  desc: "Core backend architectures, horizontal databases, loading balances, and cache invalidation protocols need additional focus. Focus on system mock logs." 
                }
              ].map((item) => {
                const isExpanded = expandedInsight === item.type;
                return (
                  <div
                    key={item.type}
                    onClick={() => setExpandedInsight(isExpanded ? null : item.type)}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all duration-300 ${item.color} select-none`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="caption uppercase tracking-[0.2em] font-bold text-[10px]">
                        {item.type}
                      </span>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </div>
                    <p className="mt-2 text-sm font-bold text-white">{item.title}</p>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.p
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.28, ease: "easeInOut" }}
                          className="mt-3.5 text-xs text-slate-400 leading-relaxed overflow-hidden"
                        >
                          {item.desc}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* ═══ COLUMN 2: Identity, Projections & History ══════════════════════ */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* SECTION 3: CAREER IDENTITY */}
          <section className="liquid-panel rounded-[28px] p-6 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-5">
              <Briefcase className="h-4.5 w-4.5 text-indigo-400" />
              <div>
                <h3 className="text-sm font-semibold text-white">Career Identity</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Compact executive summary parameters</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { label: "Target Position", value: profile?.goal ?? "Unspecified SDE" },
                { label: "Primary Domain", value: "Full Stack Development" },
                { label: "Current Level", value: profile?.experience_level ?? "Apprentice" },
                { label: "Weekly Commitment", value: `${workspace?.roadmaps?.[0]?.weekly_hours ?? 15} hours` },
                { label: "Timeline Expectation", value: workspace?.roadmaps?.[0]?.estimated_completion_date ?? "6-8 months" },
                { label: "System Confidence", value: readiness > 75 ? "High Profile (82%)" : "Moderate (65%)" }
              ].map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-white/[0.03] last:border-0">
                  <span className="text-xs text-slate-500 font-semibold">{item.label}</span>
                  <span className="text-xs text-slate-200 font-bold text-right pl-3 truncate max-w-[170px]">{item.value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 6: FUTURE SIMULATION */}
          <section className="liquid-panel rounded-[28px] p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.03),transparent_50%)]" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-5">
                <Zap className="h-4.5 w-4.5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-semibold text-white">Future Simulation</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Timeline pacing index predictions</p>
                </div>
              </div>

              <div className="relative border-l border-white/10 pl-5 space-y-6">
                {[
                  { timeline: "3 Months", role: "Junior-ready", desc: "Build structured basic portfolio components, master basic integration systems, and Git teamwork protocols." },
                  { timeline: "6 Months", role: "Interview-ready", desc: "Master algorithms execution patterns, dynamic backend services patterns, and live mock practice mocks." },
                  { timeline: "12 Months", role: "SDE Candidate", desc: "Acquired database system caching schemas, advanced UI optimizations, and secure company placement pipelines." }
                ].map((item, index) => (
                  <div key={index} className="relative">
                    {/* Node indicator */}
                    <div className="absolute -left-[26px] top-1.5 h-3 w-3 rounded-full border border-indigo-400 bg-slate-950 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
                    <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider leading-none">
                      {item.timeline}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-1 leading-snug">{item.role}</h4>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 10: CAREER MEMORY */}
          <section className="liquid-panel rounded-[28px] p-6 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-5">
              <History className="h-4.5 w-4.5 text-indigo-400" />
              <div>
                <h3 className="text-sm font-semibold text-white">Career Memory</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Historical log of dashboard events</p>
              </div>
            </div>

            <div className="space-y-4.5">
              {[
                { title: "Profile Updated", date: "Just now", desc: "Synced career goals with backend profile preferences." },
                { title: "Roadmap Regenerated", date: "Yesterday", desc: "AI rebuilt milestone dependencies for Sprint 02." },
                { title: "Milestone Completed", date: "2 days ago", desc: "Marked React architecture milestone tasks as done." },
                { title: "Readiness Improved", date: "3 days ago", desc: "Score escalated by +4% following logs consistency streak." },
                { title: "Roadmap Created", date: "5 days ago", desc: "Initialized initial workspace layout targets." }
              ].map((item, index) => (
                <div key={index} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.8)] mt-1.5" />
                    {index !== 4 && <span className="w-px bg-white/5 flex-1 mt-1.5" />}
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-xs font-bold text-white">{item.title}</span>
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">{item.date}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ═══ COLUMN 3: Momentum, Gaps, Progress & Recommendations ══════════ */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* SECTION 5: CAREER MOMENTUM TIMELINE */}
          <section className="liquid-panel rounded-[28px] p-6 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-4">
              <TrendingUp className="h-4.5 w-4.5 text-cyan-400" />
              <div>
                <h3 className="text-sm font-semibold text-white">Career Momentum</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Progress trend timeline trajectories</p>
              </div>
            </div>

            {/* Custom SVG Line Graph */}
            <div className="relative h-[120px] w-full mt-4">
              <svg className="w-full h-full" viewBox="0 0 300 120" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="gradientLine" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal grid lines */}
                {[0.25, 0.5, 0.75, 1.0].map((h, i) => (
                  <line
                    key={i}
                    x1="0"
                    y1={h * 100}
                    x2="300"
                    y2={h * 100}
                    stroke="rgba(255,255,255,0.03)"
                    strokeWidth="1"
                  />
                ))}

                {/* Trajectory Data Path */}
                <path
                  d="M 15 105 Q 95 80 185 55 T 285 25"
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                
                {/* Area Gradient under line */}
                <path
                  d="M 15 105 Q 95 80 185 55 T 285 25 L 285 115 L 15 115 Z"
                  fill="url(#gradientLine)"
                />

                {/* Trajectory Nodes */}
                {[
                  { x: 15, y: 105, value: "45%" },
                  { x: 105, y: 82, value: "62%" },
                  { x: 195, y: 52, value: "74%" },
                  { x: 285, y: 25, value: `${readiness}%` }
                ].map((node, index) => (
                  <g key={index}>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="4"
                      fill="#030712"
                      stroke="#22d3ee"
                      strokeWidth="2.5"
                    />
                    <text
                      x={node.x}
                      y={node.y - 8}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="8"
                      fontWeight="bold"
                    >
                      {node.value}
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            <div className="mt-4 flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              <span>Last Quarter</span>
              <span>This Month</span>
              <span>This Week</span>
              <span className="text-cyan-400">Today</span>
            </div>
          </section>

          {/* SECTION 7: READINESS BREAKDOWN */}
          <section className="liquid-panel rounded-[28px] p-6 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-4">
              <Award className="h-4.5 w-4.5 text-indigo-400" />
              <div>
                <h3 className="text-sm font-semibold text-white">Readiness Breakdown</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Domain-specific preparation indexes</p>
              </div>
            </div>

            <div className="space-y-3.5">
              {[
                { label: "Programming Foundations", val: 86, color: "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]" },
                { label: "Data Structures & Algorithms (DSA)", val: 68, color: "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]" },
                { label: "System Design", val: 50, color: "bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.6)]" },
                { label: "Projects", val: 74, color: "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]" },
                { label: "Git & Version Control", val: 92, color: "bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.6)]" },
                { label: "Frontend Architectures", val: 80, color: "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]" },
                { label: "Backend Architectures", val: 58, color: "bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.6)]" },
                { label: "Interview Skills", val: 70, color: "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]" }
              ].map((item, index) => (
                <div key={index} className="space-y-1.5">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-slate-400 font-semibold">{item.label}</span>
                    <span className="text-white font-bold">{item.val}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#141418] overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${item.color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${item.val}%` }}
                      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 8: SKILL GAP ANALYZER */}
          <section className="liquid-panel rounded-[28px] p-6 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-4">
              <ShieldAlert className="h-4.5 w-4.5 text-indigo-400" />
              <div>
                <h3 className="text-sm font-semibold text-white">Skill Gap Analyzer</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Color-coded skill urgency matrix</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { cat: "Already Strong", color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5", list: ["React", "TypeScript", "Tailwind CSS", "Git flow"] },
                { cat: "Needs Improvement", color: "text-amber-400 border-amber-500/20 bg-amber-500/5", list: ["PostgreSQL schemas", "Next.js routing", "State machines"] },
                { cat: "Critical Missing", color: "text-rose-400 border-rose-500/20 bg-rose-500/5", list: ["Load balancing scales", "System caching", "Timed DSA tests"] }
              ].map((group, index) => (
                <div key={index} className={`rounded-2xl border p-4 ${group.color}`}>
                  <h4 className="caption uppercase font-bold text-[10px] tracking-wider leading-none">
                    {group.cat}
                  </h4>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {group.list.map((skill, si) => (
                      <span
                        key={si}
                        className="rounded-md border border-white/5 bg-black/35 px-2.5 py-1 text-xs text-slate-200 font-semibold"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 9: AI RECOMMENDATIONS */}
          <section className="liquid-panel rounded-[28px] p-6 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-4">
              <Sparkles className="h-4.5 w-4.5 text-cyan-400 animate-pulse" />
              <div>
                <h3 className="text-sm font-semibold text-white">AI Recommendations</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Dynamic checkable growth options</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { key: "dsa", text: "Improve DSA consistency by solving 1 stack problem daily." },
                { key: "project", text: "Build a second full production project with backend databases." },
                { key: "github", text: "Contribute at least 2 open-source commits to public codebases." },
                { key: "mocks", text: "Practice mock interview patterns with a peer once a week." }
              ].map((rec) => {
                const done = checkedRecs[rec.key] ?? false;
                return (
                  <button
                    key={rec.key}
                    onClick={() => setCheckedRecs(prev => ({ ...prev, [rec.key]: !prev[rec.key] }))}
                    className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 flex items-start gap-3 ${
                      done
                        ? "border-cyan-400/20 bg-cyan-950/10 text-slate-400"
                        : "border-white/5 bg-[#0a0a0c] text-slate-200 hover:border-cyan-400/20 hover:bg-[#0c0c10]"
                    }`}
                  >
                    <span className="shrink-0 mt-0.5 text-cyan-400 transition-colors">
                      {done ? <CheckSquare className="h-4.5 w-4.5 fill-cyan-400 text-black" /> : <Square className="h-4.5 w-4.5" />}
                    </span>
                    <span className={`text-xs leading-normal font-semibold ${done ? "line-through opacity-50" : ""}`}>
                      {rec.text}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

      </div>

      {/* Sticky Bottom Actions Pill on Mobile Devices */}
      <div className="sticky bottom-6 left-0 right-0 z-40 mx-auto max-w-[280px] rounded-full border border-white/10 bg-slate-950/70 p-1.5 backdrop-blur-xl shadow-2xl flex justify-around items-center sm:hidden md:hidden lg:hidden">
        <button
          onClick={triggerSync}
          className="flex items-center gap-1 px-3 py-2 rounded-full hover:bg-white/5 transition text-cyan-400 text-xs font-bold"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          Sync
        </button>
        <div className="h-4 w-px bg-white/10" />
        <button
          onClick={() => {
            if (typeof navigator !== "undefined" && navigator.clipboard) {
              void navigator.clipboard.writeText(window.location.href);
              alert("Career Snapshot link copied to clipboard!");
            }
          }}
          className="flex items-center gap-1 px-3 py-2 rounded-full hover:bg-white/5 transition text-slate-400 hover:text-white text-xs font-bold"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </button>
      </div>

    </div>
  );
}
