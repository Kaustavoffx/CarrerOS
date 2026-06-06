"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
// Framer Motion removed — CSS-only animations for 120fps performance
import {
  Sparkles, Brain, Briefcase, Award, CheckSquare, Square, RefreshCw, User,
  ArrowRight, History, Plus, Trash2, TrendingUp, AlertCircle
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { updateProfile } from "@/lib/app-data";
import type { UserProfileRecord, WorkspaceSnapshotRecord } from "@/lib/supabase/types";

type CareerTwinDashboardProps = {
  profile: UserProfileRecord | null;
  workspace: WorkspaceSnapshotRecord | null;
};

function formatUtcShortDate(d: Date) {
  if (!d || isNaN(d.getTime())) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function CareerTwinDashboard({ profile, workspace }: CareerTwinDashboardProps) {
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
  const readiness = profile?.readiness_score ?? 0;
  const progressLogs = workspace?.progress ?? [];
  const roadmaps = workspace?.roadmaps ?? [];
  const activeRoadmap = roadmaps.find((r) => r.status === "Active") ?? roadmaps[0] ?? null;
  const allMilestones = activeRoadmap ? (Array.isArray(activeRoadmap.milestones) ? activeRoadmap.milestones : []) : [];
  const completedCount = activeRoadmap ? Math.floor((activeRoadmap.progress / 100) * allMilestones.length) : 0;
  
  // Calculate dynamic twin metrics
  const userSkills = profile?.skills || [];
  const marketMatch = Math.min(98, Math.max(45, 50 + userSkills.length * 4));
  
  const totalCheckedEver = progressLogs.length + completedCount;
  const momentum = totalCheckedEver > 0 ? Math.min(100, 65 + (totalCheckedEver * 5) % 35) : 50;
  
  const execution = activeRoadmap?.progress ?? 0;

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
  const strengths = userSkills.slice(0, 4);
  if (strengths.length === 0) strengths.push("Initial profile assessment");

  const weaknesses = profile?.weaknesses?.slice(0, 3) || [];
  if (weaknesses.length === 0) weaknesses.push("Skill gap profiling pending");

  const blindSpots: string[] = [];
  if (!resumeUrl) blindSpots.push("Resume lack of verified parsing");
  if (!portfolioUrl) blindSpots.push("No linked digital sandbox portfolio");
  if (userSkills.length < 5) blindSpots.push("Thin core skills directory");
  if (blindSpots.length === 0) blindSpots.push("No critical blind spots detected");

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

  // ─── AI recommendations action queue ──────────────────────────────────────
  const recommendationsQueue = [
    {
      id: "rec1",
      action: "Link Professional Credentials",
      impact: "Triggers resume parser algorithms and matches tailored listings.",
      priority: "High",
      path: "/profile"
    },
    {
      id: "rec2",
      action: "Complete active roadmap sprint tasks",
      impact: "Increments overall readiness score and unlocks subsequent milestones.",
      priority: "High",
      path: "/roadmaps"
    },
    {
      id: "rec3",
      action: "Optimize technical skills tags",
      impact: "Improves market matching accuracy inside Career Twin database.",
      priority: "Medium",
      path: "/profile"
    },
    {
      id: "rec4",
      action: "Initiate mock system architecture board session",
      impact: "Builds credentials for interview performance metrics.",
      priority: "Medium",
      path: "/mentor"
    }
  ];

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

      {/* Profile/Goal Header Banner (Neutral Page Header) */}
      <section className="card-data rounded-[24px] p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full border border-white/10 bg-black/40 flex items-center justify-center text-cyan-300 relative shrink-0">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover rounded-full" />
              ) : (
                <User className="h-6 w-6 text-slate-500" />
              )}
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-cyan-400 border-2 border-[#09090b]" />
            </div>

            <div>
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest bg-cyan-950/40 border border-cyan-400/20 px-2 py-0.5 rounded-full">
                Digital twin interface
              </span>
              <h1 className="text-xl font-bold tracking-tight text-white mt-1">
                {profile?.full_name || "Agent Operator"}
              </h1>
              <p className="text-xs text-slate-400">
                Calibrated targeting: <strong className="text-slate-200 font-semibold">{profile?.goal || "SDE I"}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={triggerSync}
              className="tactile-btn p-2 rounded-xl"
              aria-label="Refresh twin calibration"
            >
              <RefreshCw className={`h-4 w-4 text-slate-400 ${isSyncing ? "animate-spin text-cyan-300" : ""}`} />
            </button>
            <button
              onClick={() => router.push("/profile")}
              className="tactile-btn text-xs font-bold text-slate-300 hover:text-white px-4 py-2 rounded-xl"
            >
              Configure Identity
            </button>
          </div>
        </div>
      </section>

      {/* ═══ SPOTLIGHT CARD 1: CAREER HEALTH SUMMARY ═══════════════════════ */}
      <section>
        <div className="card-green rounded-[24px] p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-48 bg-emerald-400/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Award className="h-4.5 w-4.5 text-emerald-400" />
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Career Health Summary</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Metric 1 */}
              <div className="bg-white/[0.03] border border-white/[0.06] backdrop-blur-md p-4 rounded-2xl">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Readiness Score</span>
                  <span className="text-lg font-extrabold text-cyan-300">{readiness}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400" style={{ width: `${readiness}%` }} />
                </div>
                <span className="text-[9px] text-slate-500 block mt-1.5 font-medium">Target velocity: 85%+</span>
              </div>

              {/* Metric 2 */}
              <div className="bg-white/[0.03] border border-white/[0.06] backdrop-blur-md p-4 rounded-2xl">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Market Match</span>
                  <span className="text-lg font-extrabold text-cyan-300">{marketMatch}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400" style={{ width: `${marketMatch}%` }} />
                </div>
                <span className="text-[9px] text-slate-500 block mt-1.5 font-medium">Based on skill tags count</span>
              </div>

              {/* Metric 3 */}
              <div className="bg-white/[0.03] border border-white/[0.06] backdrop-blur-md p-4 rounded-2xl">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Momentum</span>
                  <span className="text-lg font-extrabold text-cyan-300">{momentum}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400" style={{ width: `${momentum}%` }} />
                </div>
                <span className="text-[9px] text-slate-500 block mt-1.5 font-medium">Active logs & milestones consistency</span>
              </div>

              {/* Metric 4 */}
              <div className="bg-white/[0.03] border border-white/[0.06] backdrop-blur-md p-4 rounded-2xl">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Execution</span>
                  <span className="text-lg font-extrabold text-cyan-300">{execution}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400" style={{ width: `${execution}%` }} />
                </div>
                <span className="text-[9px] text-slate-500 block mt-1.5 font-medium">Roadmap progress tracks completed</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 2-COLUMN CENTRAL MATRIX ═════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3 width) - Intelligence & Skills */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Career Intelligence Report */}
          <section className="card-data rounded-[24px] p-6">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-4">
              <Brain className="h-4.5 w-4.5 text-indigo-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Career Intelligence Report</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Strengths */}
              <div className="border border-emerald-500/10 bg-emerald-500/[0.01] p-4 rounded-2xl">
                <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest block mb-2">Strengths</span>
                <div className="flex flex-wrap gap-1.5">
                  {strengths.map(s => (
                    <span key={s} className="bg-emerald-950/20 border border-emerald-500/20 rounded px-2 py-0.5 text-[10px] text-emerald-300 font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Weaknesses */}
              <div className="border border-amber-500/10 bg-amber-500/[0.01] p-4 rounded-2xl">
                <span className="text-[9px] text-amber-400 font-bold uppercase tracking-widest block mb-2">Weaknesses</span>
                <div className="flex flex-wrap gap-1.5">
                  {weaknesses.map(w => (
                    <span key={w} className="bg-amber-950/20 border border-amber-500/20 rounded px-2 py-0.5 text-[10px] text-amber-300 font-medium">
                      {w}
                    </span>
                  ))}
                </div>
              </div>

              {/* Blind Spots */}
              <div className="border border-rose-500/10 bg-rose-500/[0.01] p-4 rounded-2xl">
                <span className="text-[9px] text-rose-400 font-bold uppercase tracking-widest block mb-2">Blind Spots</span>
                <ul className="space-y-1 text-[11px] text-slate-300 font-medium list-inside list-disc">
                  {blindSpots.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>

              {/* Opportunities & Risks */}
              <div className="border border-indigo-500/10 bg-indigo-500/[0.01] p-4 rounded-2xl">
                <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest block mb-2">Opportunities</span>
                <ul className="space-y-1 text-[11px] text-slate-300 font-medium list-inside list-disc">
                  {opportunities.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </div>

              <div className="border border-white/5 bg-white/[0.02] p-4 rounded-2xl sm:col-span-2">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Execution Risks</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {risks.map((r, i) => (
                    <span key={i} className="text-xs text-rose-300 bg-rose-950/10 border border-rose-500/20 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5">
                      <AlertCircle className="h-3 w-3 text-rose-400" />
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Skill Portfolio (Editable inventory) */}
          <section className="card-data rounded-[24px] p-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4.5 w-4.5 text-cyan-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Skill Portfolio</h2>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold">{userSkills.length} Verified skills</span>
            </div>

            <form onSubmit={handleAddSkill} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newSkillText}
                onChange={e => setNewSkillText(e.target.value)}
                placeholder="Add new skill target..."
                className="carved-input flex-1 px-3.5 py-2 text-xs rounded-xl"
                disabled={isAddingSkill}
              />
              <button
                type="submit"
                disabled={isAddingSkill || !newSkillText.trim()}
                className="tactile-btn tactile-btn-primary px-4 py-2 text-xs rounded-xl inline-flex items-center gap-1 text-black font-bold"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              {userSkills.map(s => (
                <div
                  key={s}
                  className="bg-white/[0.03] border border-white/[0.06] hover:border-cyan-400/20 pl-3 pr-2 py-1.5 rounded-xl text-xs text-white font-medium inline-flex items-center justify-between gap-3 group transition"
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
                <p className="text-xs text-slate-500 text-center py-6 w-full">No skills logged. Type above to begin indexing.</p>
              )}
            </div>
          </section>

          {/* Job Matches Opportunity Board */}
          <section className="card-data rounded-[24px] p-6">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-4">
              <TrendingUp className="h-4.5 w-4.5 text-cyan-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Opportunity Match Board</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {jobs.map(job => (
                <div key={job.id} className="border border-white/10 bg-white/[0.02] hover:border-cyan-400/20 p-4 rounded-2xl flex flex-col justify-between transition group">
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
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Right Column (1/3 width) - Action Queue & Timeline */}
        <div className="space-y-6">

          {/* AI Recommendations Action Queue */}
          <section className="card-purple rounded-[24px] p-5">
            <div className="flex items-center gap-2 border-b border-indigo-400/10 pb-3 mb-4">
              <Sparkles className="h-4.5 w-4.5 text-indigo-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">AI Recommendations</h2>
            </div>

            <div className="space-y-3.5">
              {recommendationsQueue.map(rec => {
                const isChecked = checkedRecs[rec.id] ?? false;
                return (
                  <div
                    key={rec.id}
                    className={`border p-3.5 rounded-2xl transition duration-200 flex items-start gap-3 relative ${
                      isChecked
                        ? "border-cyan-500/10 bg-cyan-950/[0.02] text-slate-500"
                        : "border-white/[0.06] bg-white/[0.03] hover:border-cyan-400/20"
                    }`}
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

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-bold uppercase ${isChecked ? "line-through opacity-40" : rec.priority === "High" ? "text-cyan-400" : "text-indigo-400"}`}>
                          {rec.priority} priority
                        </span>
                      </div>
                      <p className={`text-xs font-bold text-white ${isChecked ? "line-through opacity-40 text-slate-400" : ""}`}>
                        {rec.action}
                      </p>
                      <p className="text-[10px] text-slate-400 leading-relaxed leading-normal">{rec.impact}</p>
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
                  </div>
                );
              })}
            </div>
          </section>

          {/* Career Journey Timeline */}
          <section className="card-data rounded-[24px] p-5">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-4">
              <History className="h-4.5 w-4.5 text-cyan-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Career Timeline</h2>
            </div>

            {sortedEvents.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No career events recorded. Clear roadmap tasks to initialize timeline.</p>
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
          </section>

        </div>

      </div>
    </div>
  );
}
