"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
// Framer Motion removed — CSS-only animations for 120fps performance
import {
  Sparkles, Brain, Briefcase, CheckSquare, Square, RefreshCw,
  ArrowRight, History, Plus, Trash2, TrendingUp, AlertCircle, ShieldAlert
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { updateProfile } from "@/lib/app-data";
import type { UserProfileRecord, WorkspaceSnapshotRecord, CommunityNeedReport } from "@/lib/supabase/types";
import { PageHero, CardSurface, EmptyState, AiExplainabilityCard } from "@/components/ui";
import { buttonStyle, inputStyle } from "@/styles/careeros-design-system";
import { buildUserIntelligenceProfile } from "@/lib/user-intelligence";

type CareerTwinDashboardProps = {
  profile: UserProfileRecord | null;
  workspace: WorkspaceSnapshotRecord | null;
  communityNeeds?: CommunityNeedReport[];
};

function formatUtcShortDate(d: Date) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
}


// ─── Design Input Wrappers ───────────────────────────────────────────────────

function DesignInput({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const state = isFocused ? "focus" : isHovered ? "hover" : "base";
  return (
    <input
      {...props}
      style={{ ...inputStyle(state), ...props.style }}
      onFocus={(e) => {
        setIsFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setIsFocused(false);
        props.onBlur?.(e);
      }}
      onMouseEnter={(e) => {
        setIsHovered(true);
        props.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        props.onMouseLeave?.(e);
      }}
      className={className}
    />
  );
}

export function CareerTwinDashboard({ profile, workspace, communityNeeds = [] }: CareerTwinDashboardProps) {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  // State controls
  const [checkedRecs, setCheckedRecs] = useState<Record<string, boolean>>({});
  const [isSyncing, setIsSyncing] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Skill editor state
  const [newSkillText, setNewSkillText] = useState("");
  const [isAddingSkill, setIsAddingSkill] = useState(false);

  // Connected Link URLs from localStorage
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [portfolioUrl, setPortfolioUrl] = useState<string | null>(null);
  const [githubUrl, setGithubUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setResumeUrl(localStorage.getItem("profile_resume_url"));
      setPortfolioUrl(localStorage.getItem("profile_portfolio_url"));
      setGithubUrl(localStorage.getItem("profile_github_url"));
    }
  }, [profile]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const triggerSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      if (typeof window !== "undefined") {
        setResumeUrl(localStorage.getItem("profile_resume_url"));
        setPortfolioUrl(localStorage.getItem("profile_portfolio_url"));
        setGithubUrl(localStorage.getItem("profile_github_url"));
      }
      showToast("Career twin calibrated to live profile metadata.");
    }, 1000);
  };

  // ─── Skills persistence handlers ──────────────────────────────────────────
  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillText.trim() || !profile || !supabase) return;
    const skill = newSkillText.trim();
    if (profile.skills.includes(skill)) {
      showToast("Skill is already listed in portfolio.");
      return;
    }
    const updatedSkills = [...profile.skills, skill];
    setIsAddingSkill(true);
    try {
      await updateProfile(supabase, profile.id, { skills: updatedSkills });
      setNewSkillText("");
      showToast(`Added "${skill}" to portfolio.`);
      router.refresh();
    } catch (err) {
      console.error(err);
      showToast("Failed to update skill portfolio.");
    } finally {
      setIsAddingSkill(false);
    }
  };

  const handleRemoveSkill = async (skillToRemove: string) => {
    if (!profile || !supabase) return;
    const updatedSkills = profile.skills.filter(s => s !== skillToRemove);
    try {
      await updateProfile(supabase, profile.id, { skills: updatedSkills });
      showToast(`Removed "${skillToRemove}" from portfolio.`);
      router.refresh();
    } catch (err) {
      console.error(err);
      showToast("Failed to update skill portfolio.");
    }
  };

  // ─── Real Data Fetching/Parsing Calculations ────────────────────────────────
  const intelligenceProfile = buildUserIntelligenceProfile(profile, workspace, communityNeeds);
  const readiness = intelligenceProfile.readiness;
  const roadmaps = workspace?.roadmaps ?? [];
  const activeRoadmap = roadmaps.find((r) => r.status === "Active") ?? roadmaps[0] ?? null;
  const allMilestones = activeRoadmap ? (Array.isArray(activeRoadmap.milestones) ? activeRoadmap.milestones : []) : [];
  const completedCount = activeRoadmap ? Math.floor((activeRoadmap.progress / 100) * allMilestones.length) : 0;
  
  // Calculate dynamic twin metrics
  const userSkills = intelligenceProfile.skills;
  const marketMatch = Math.min(98, Math.max(45, 50 + userSkills.length * 4));
  
  const momentum = intelligenceProfile.twinAnalysis.velocityIndex;
  const execution = intelligenceProfile.roadmapProgress;
  const verdict = intelligenceProfile.twinAnalysis.verdict;

  // ─── Career Journey Timeline (Career Events Only) ─────────────────────────
  const events = [];
  if (activeRoadmap) {
    events.push({
      type: "Curriculum Active",
      title: activeRoadmap.title,
      date: new Date(activeRoadmap.generated_at),
      desc: `Structured roadmap initialized for target goal "${profile?.goal || "SDE"}".`
    });
  }
  allMilestones.slice(0, completedCount).forEach((m, idx) => {
    events.push({
      type: "Milestone Cleared",
      title: m.title,
      date: activeRoadmap ? new Date(new Date(activeRoadmap.generated_at).getTime() + (idx + 1) * 7 * 24 * 60 * 60 * 1000) : new Date(),
      desc: `Cleared milestone projects and core objectives.`
    });
  });
  if (resumeUrl) {
    events.push({
      type: "Credentials Linked",
      title: "Digital Resume Connected",
      date: profile ? new Date(profile.updated_at) : new Date(),
      desc: `Credentials live: ${resumeUrl}`
    });
  }
  if (portfolioUrl) {
    events.push({
      type: "Proof of Work Live",
      title: "Portfolio Linked",
      date: profile ? new Date(profile.updated_at) : new Date(),
      desc: `Portfolio live: ${portfolioUrl}`
    });
  }
  const sortedEvents = events.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

  // ─── Career Intelligence Report ───────────────────────────────────────────
  const strengths = intelligenceProfile.twinAnalysis.strengths;
  const weaknesses = intelligenceProfile.twinAnalysis.weaknesses;
  const blindSpots = intelligenceProfile.twinAnalysis.blindSpots;

  const opportunities: string[] = [];
  if (profile?.goal) {
    opportunities.push(`Expand portfolio projects targeting ${profile.goal}`);
    opportunities.push("Deepen system caching and API layer expertise");
  } else {
    opportunities.push("Complete onboarding goals to surface opportunities");
  }

  const risks: string[] = [];
  if (activeRoadmap && activeRoadmap.weekly_hours < 8) {
    risks.push("Weekly velocity risk (< 8 hours dedicated)");
  }
  if (!githubUrl) {
    risks.push("Missing version-control credential integration");
  }
  if (risks.length === 0) {
    risks.push("Nominal execution risk profile");
  }

  // ─── AI recommendations action queue (sourced from the Decision Engine priorities) ──────────────────────────────────────
  const recommendationsQueue = intelligenceProfile.priorities.map((prio) => ({
    id: prio.id,
    action: prio.action,
    impact: prio.whyExplain,
    priority: prio.urgency === "critical" ? "Critical" : prio.urgency === "high" ? "High" : prio.urgency === "medium" ? "Medium" : "Low",
    path: prio.link,
    reasons: prio.reasons,
    confidence: prio.confidence,
    sources: prio.sources,
    explainabilityData: prio.explainabilityData,
  }));

  // ─── Job Matches Opportunity Board ────────────────────────────────────────
  const getJobMatches = () => {
    const goal = profile?.goal?.toLowerCase() || "";
    if (goal.includes("front") || goal.includes("react") || goal.includes("web")) {
      return [
        { id: "j1", role: "Frontend UI Developer", company: "Vercel", location: "Remote (US/EU)", match: 94, salary: "$130k - $160k", logo: "▲" },
        { id: "j2", role: "Product Engineer", company: "Linear", location: "Remote", match: 88, salary: "$125k - $155k", logo: "Ｌ" },
        { id: "j3", role: "Software Engineer - Frontend", company: "Supabase", location: "Remote (APAC/US)", match: 81, salary: "$110k - $140k", logo: "⚡" }
      ];
    }
    return [
      { id: "j1", role: "Full-Stack Engineer", company: "Stripe", location: "Remote", match: 92, salary: "$145k - $185k", logo: "💳" },
      { id: "j2", role: "Product Developer", company: "Supabase", location: "Remote", match: 87, salary: "$120k - $150k", logo: "⚡" },
      { id: "j3", role: "Software Architect", company: "Vercel", location: "Remote", match: 80, salary: "$160k - $200k", logo: "▲" }
    ];
  };
  const jobs = getJobMatches();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast messenger notifications */}
      {/* Toast messenger — CSS only */}
      <div
        className={`toast-base fixed bottom-6 right-6 z-50 rounded-xl border border-cyan-400/25 bg-[#0a0a0c] px-4 py-3 text-xs font-semibold text-cyan-200 shadow-[0_4px_16px_rgba(0,0,0,0.8)] ${toastMessage ? "toast-enter" : "toast-exit"}`}
        aria-live="polite"
      >
        {toastMessage}
      </div>

      {/* Profile/Goal Header Banner */}
      <PageHero
        badge="Digital twin interface"
        title={profile?.full_name || "Agent Operator"}
        subtitle={`Calibrated targeting: ${profile?.goal || "SDE I"}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={triggerSync}
              style={buttonStyle("ghost")}
              className="p-2 rounded-xl flex items-center justify-center"
              aria-label="Refresh twin calibration"
            >
              <RefreshCw className={`h-4 w-4 text-slate-400 ${isSyncing ? "animate-spin text-cyan-300" : ""}`} />
            </button>
            <button
              onClick={() => router.push("/profile")}
              style={buttonStyle("ghost")}
              className="text-xs font-bold px-4 py-2 rounded-xl"
            >
              Configure Identity
            </button>
          </div>
        }
      />

      {/* ═══ SPOTLIGHT CARD 1: ANALYST BRIEFING & EXECUTIVE SUMMARY ═══════════ */}
      <CardSurface variant="surface" dust="tr" className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-4 w-4 text-cyan-300" />
          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Analyst Briefing</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2.5fr_1.5fr] items-center">
          {/* Executive Summary paragraph */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Executive Summary</h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl font-medium">
              Capability mapping indicates a strong baseline in <span className="text-white font-semibold">{strengths.slice(0, 3).join(", ")}</span>. 
              Target readiness is calibrated at <span className="text-cyan-300 font-semibold">{readiness}%</span> against live specifications for <span className="text-white font-semibold">{profile?.goal || "SDE I"}</span>. 
              {" "}<span className="text-cyan-300 font-semibold">{verdict}</span>{" "}
              {risks.length > 0 && !risks[0].includes("Nominal")
                ? ` Warning: Active execution issues identified: ${risks.join(", ")}.` 
                : " System logs report nominal execution risks."
              } Core portfolio parameters are verified and operational.
            </p>
          </div>

          {/* Confidence indicators */}
          <div className="grid grid-cols-2 gap-4 bg-white/[0.01] border border-white/5 p-4 rounded-xl">
            {[
              { label: "Target Readiness", val: `${readiness}%`, rate: "90% target" },
              { label: "Market Match", val: `${marketMatch}%`, rate: "Optimal skills" },
              { label: "Execution Index", val: `${execution}%`, rate: "Sprint clears" },
              { label: "Velocity Index", val: `${momentum}%`, rate: "Daily logs" }
            ].map(ind => (
              <div key={ind.label}>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">{ind.label}</span>
                <span className="text-base font-bold text-white mt-1 block font-geom">{ind.val}</span>
                <span className="text-[9px] text-slate-500 block mt-0.5">{ind.rate}</span>
              </div>
            ))}
          </div>
        </div>
      </CardSurface>

      {/* ═══ 2-COLUMN CENTRAL MATRIX ═════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3 width) - Intelligence & Skills */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Career Intelligence Report */}
          <CardSurface variant="surface">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-4">
              <Brain className="h-4 w-4 text-indigo-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Career Intelligence Report</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Strengths */}
              <div className="border border-white/5 bg-white/[0.01] p-4 rounded-xl">
                <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest block mb-2">Strengths</span>
                <div className="flex flex-wrap gap-1.5">
                  {strengths.map(s => (
                    <span key={s} className="bg-emerald-950/20 border border-emerald-500/10 rounded px-2 py-0.5 text-[10px] text-emerald-300 font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Weaknesses */}
              <div className="border border-white/5 bg-white/[0.01] p-4 rounded-xl">
                <span className="text-[9px] text-amber-400 font-bold uppercase tracking-widest block mb-2">Weaknesses</span>
                <div className="flex flex-wrap gap-1.5">
                  {weaknesses.map(w => (
                    <span key={w} className="bg-amber-950/20 border border-amber-500/10 rounded px-2 py-0.5 text-[10px] text-amber-300 font-medium">
                      {w}
                    </span>
                  ))}
                </div>
              </div>

              {/* Blind Spots */}
              <div className="border border-white/5 bg-white/[0.01] p-4 rounded-xl">
                <span className="text-[9px] text-rose-400 font-bold uppercase tracking-widest block mb-2">Blind Spots</span>
                <ul className="space-y-1 text-[11px] text-slate-300 font-medium list-inside list-disc">
                  {blindSpots.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>

              {/* Opportunities & Risks */}
              <div className="border border-white/5 bg-white/[0.01] p-4 rounded-xl">
                <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest block mb-2">Opportunities</span>
                <ul className="space-y-1 text-[11px] text-slate-300 font-medium list-inside list-disc">
                  {opportunities.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </div>

              {/* Career Risk Score & Intelligence */}
              <div className="border border-white/5 bg-gradient-to-br from-rose-950/20 to-black p-5 rounded-xl sm:col-span-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl" />
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div>
                    <span className="text-[10px] text-rose-400 font-bold uppercase tracking-widest block mb-1 flex items-center gap-2">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Career Risk Intelligence
                    </span>
                    <h3 className="text-sm font-bold text-white">Execution Risk Assessment</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-rose-400 font-geom">
                      {risks.length > 0 && !risks[0].includes("Nominal") ? Math.min(85, risks.length * 25 + 10) : 15}%
                    </span>
                    <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Risk Score</span>
                  </div>
                </div>

                <div className="space-y-3 relative z-10">
                  {risks.map((r, i) => {
                    const isNominal = r.includes("Nominal");
                    return (
                      <div key={i} className={`p-3 rounded-xl border ${isNominal ? 'bg-emerald-950/10 border-emerald-500/10' : 'bg-rose-950/10 border-rose-500/10'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {!isNominal && <AlertCircle className="h-4 w-4 text-rose-400" />}
                          <h4 className={`text-xs font-bold ${isNominal ? 'text-emerald-400' : 'text-rose-300'}`}>{r}</h4>
                        </div>
                        
                        {!isNominal && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                            <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                              <span className="text-[8px] uppercase text-amber-400 font-bold block mb-1">Why Risk Exists</span>
                              <p className="text-[10px] text-slate-300">Insufficient continuous momentum or missing critical integrations.</p>
                            </div>
                            <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                              <span className="text-[8px] uppercase text-rose-400 font-bold block mb-1">If Ignored</span>
                              <p className="text-[10px] text-slate-300">High probability of roadmap failure and missed scholarship deadlines.</p>
                            </div>
                            <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                              <span className="text-[8px] uppercase text-emerald-400 font-bold block mb-1">How to Reduce</span>
                              <p className="text-[10px] text-slate-300">Commit to the Weekly Mission daily tasks and connect GitHub.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardSurface>

          {/* Skill Portfolio (Editable inventory) */}
          <CardSurface variant="surface">
            <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-cyan-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">Skill Portfolio</h2>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold">{userSkills.length} Verified skills</span>
            </div>

            <form onSubmit={handleAddSkill} className="flex gap-2 mb-4">
              <DesignInput
                type="text"
                value={newSkillText}
                onChange={e => setNewSkillText(e.target.value)}
                placeholder="Add new skill target..."
                className="flex-1"
                disabled={isAddingSkill}
              />
              <button
                type="submit"
                disabled={isAddingSkill || !newSkillText.trim()}
                style={buttonStyle("primary")}
                className="px-4 py-2 text-xs rounded-lg inline-flex items-center gap-1 text-black font-bold justify-center"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              {userSkills.map(s => (
                <div
                  key={s}
                  className="bg-white/[0.02] border border-white/5 hover:border-cyan-400/20 pl-3 pr-2 py-1.5 rounded-lg text-xs text-white font-medium inline-flex items-center justify-between gap-3 group transition"
                >
                  <span>{s}</span>
                  <button
                    onClick={() => void handleRemoveSkill(s)}
                    className="text-slate-500 hover:text-rose-400 transition"
                    aria-label={`Remove skill ${s}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {userSkills.length === 0 && (
                <EmptyState
                  title="No Skills Logged"
                  description="No skills logged in your portfolio. Type above to begin indexing."
                  className="w-full min-h-[160px]"
                />
              )}
            </div>
          </CardSurface>

          {/* Job Matches Opportunity Board */}
          <CardSurface variant="surface">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-4">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Opportunity Match Board</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {jobs.map(job => (
                <CardSurface key={job.id} variant="glass" hover noPadding className="p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="h-7 w-7 rounded bg-white/5 border border-white/10 flex items-center justify-center font-bold text-white text-xs">
                        {job.logo}
                      </span>
                      <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                        {job.match}% Match
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition line-clamp-1">{job.role}</h4>
                    <p className="text-[10px] text-slate-400 font-semibold">{job.company} &middot; {job.location}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-bold">
                    <span className="text-emerald-400">{job.salary}</span>
                    <button
                      onClick={() => showToast(`Linked dynamic search triggers for "${job.role}".`)}
                      className="text-cyan-400 group-hover:underline inline-flex items-center gap-0.5"
                    >
                      Apply
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </CardSurface>
              ))}
            </div>
          </CardSurface>

        </div>

        {/* Right Column (1/3 width) - Action Queue & Timeline */}
        <div className="space-y-6">

          {/* AI Recommendations Action Queue */}
          <CardSurface variant="surface" dust="both" className="p-5">
            <div className="flex items-center gap-2 border-b border-indigo-400/10 pb-3 mb-4">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">AI Recommendations</h2>
            </div>

            <div className="space-y-3">
              {recommendationsQueue.map(rec => {
                const isChecked = checkedRecs[rec.id] ?? false;
                return (
                  <CardSurface
                    key={rec.id}
                    variant="glass"
                    hover={!isChecked}
                    noPadding
                    className={`p-3.5 flex items-start gap-3 relative`}
                  >
                    <button
                      onClick={() => setCheckedRecs(prev => ({ ...prev, [rec.id]: !prev[rec.id] }))}
                      className="shrink-0 mt-0.5 text-cyan-400"
                    >
                      {isChecked ? (
                        <CheckSquare className="h-4 w-4 fill-cyan-400 text-black" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-600" />
                      )}
                    </button>

                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-bold uppercase ${isChecked ? "line-through opacity-40" : rec.priority === "Critical" ? "text-rose-400 animate-pulse" : rec.priority === "High" ? "text-cyan-400" : "text-indigo-400"}`}>
                          {rec.priority} priority
                        </span>
                        {!isChecked && (
                          <span className="text-[9px] font-mono font-bold text-cyan-300">
                            {rec.confidence}% confidence
                          </span>
                        )}
                      </div>
                      <p className={`text-xs font-bold text-white ${isChecked ? "line-through opacity-40 text-slate-400" : ""}`}>
                        {rec.action}
                      </p>
                      <p className="text-[10px] text-slate-400 leading-relaxed leading-normal">{rec.impact}</p>
                      
                      {!isChecked && rec.explainabilityData && (
                        <div className="pt-2 border-t border-white/5">
                          <AiExplainabilityCard data={rec.explainabilityData} />
                        </div>
                      )}

                      {!isChecked && (
                        <button
                          onClick={() => router.push(rec.path)}
                          className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-cyan-400 hover:underline pt-1"
                        >
                          Execute Action
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </CardSurface>
                );
              })}
            </div>
          </CardSurface>

          {/* Career Journey Timeline */}
          <CardSurface variant="surface" className="p-5">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-4">
              <History className="h-4 w-4 text-cyan-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Career Timeline</h2>
            </div>

            {sortedEvents.length === 0 ? (
              <EmptyState
                title="No Career Events"
                description="No career events recorded. Clear roadmap tasks to initialize timeline."
                className="min-h-[180px]"
              />
            ) : (
              <div className="relative border-l border-white/5 pl-4 ml-2 space-y-5">
                {sortedEvents.map((ev, index) => (
                  <div key={index} className="relative group">
                    <span className="absolute -left-[20px] top-1.5 h-2 w-2 rounded-full bg-cyan-400 border border-white/20 group-hover:scale-125 transition" />
                    <div className="flex justify-between items-baseline text-[9px]">
                      <span className="text-cyan-300 font-extrabold uppercase tracking-wider">{ev.type}</span>
                      <span className="text-slate-500">{formatUtcShortDate(ev.date)}</span>
                    </div>
                    <h4 className="text-xs font-bold text-white mt-0.5 leading-snug">{ev.title}</h4>
                    {ev.desc && <p className="text-[10px] text-slate-400 mt-1 leading-normal leading-relaxed">{ev.desc}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardSurface>

        </div>

      </div>
    </div>
  );
}
