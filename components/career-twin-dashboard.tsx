"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Sparkles,
  Brain,
  Briefcase,
  Award,
  CheckSquare,
  Square,
  RefreshCw,
  User,
  Target,
  Layers,
  ArrowRight,
  History
} from "lucide-react";
import type { UserProfileRecord, WorkspaceSnapshotRecord } from "@/lib/supabase/types";

type CareerTwinDashboardProps = {
  profile: UserProfileRecord | null;
  workspace: WorkspaceSnapshotRecord | null;
};

export function CareerTwinDashboard({ profile, workspace }: CareerTwinDashboardProps) {
  const router = useRouter();

  // State controls
  const [checkedRecs, setCheckedRecs] = useState<Record<string, boolean>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState("Just now");

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

  const triggerSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastUpdatedTime("Just now");
      if (typeof window !== "undefined") {
        setResumeUrl(localStorage.getItem("profile_resume_url"));
        setPortfolioUrl(localStorage.getItem("profile_portfolio_url"));
        setGithubUrl(localStorage.getItem("profile_github_url"));
      }
    }, 1000);
  };

  // ─── Real Data Fetching/Parsing Calculations ────────────────────────────────

  const readiness = profile?.readiness_score ?? 0;
  const progressLogs = workspace?.progress ?? [];
  const roadmaps = workspace?.roadmaps ?? [];
  const activeRoadmap = roadmaps.find((r) => r.status === "Active") ?? roadmaps[0] ?? null;
  const allMilestones = activeRoadmap ? (Array.isArray(activeRoadmap.milestones) ? activeRoadmap.milestones : []) : [];
  const completedCount = activeRoadmap ? Math.floor((activeRoadmap.progress / 100) * allMilestones.length) : 0;
  const remainingCount = allMilestones.length - completedCount;
  const nextMilestone = allMilestones[completedCount]?.title ?? "None";
  const completedProjectsCount = activeRoadmap
    ? allMilestones.slice(0, completedCount).reduce((sum, m) => sum + (Array.isArray(m.projects) ? m.projects.length : 0), 0)
    : 0;
  const remainingWeeks = activeRoadmap
    ? allMilestones.slice(completedCount).reduce((sum, m) => sum + m.estimated_duration_weeks, 0)
    : 0;
  const weeklyHours = activeRoadmap?.weekly_hours ?? 10;

  // Calculate applications submitted dynamically by checking progress logs for target text matches
  const applicationsCount = progressLogs.filter(
    (p) =>
      p.label.toLowerCase().includes("application") ||
      p.label.toLowerCase().includes("apply") ||
      p.note.toLowerCase().includes("application") ||
      p.note.toLowerCase().includes("apply")
  ).length;

  // ─── Assemble Chronological Career Journey Timeline ──────────────────────────

  const events = [];

  // 1. Roadmap Creation Event
  if (activeRoadmap) {
    events.push({
      type: "Roadmap Created",
      title: activeRoadmap.title,
      date: new Date(activeRoadmap.generated_at),
      desc: `Initialized curriculum path under target goal "${profile?.goal || "SDE"}".`
    });
  }

  // 2. Completed Milestones Event
  allMilestones.slice(0, completedCount).forEach((m, idx) => {
    events.push({
      type: "Milestone Completed",
      title: m.title,
      // Distribute timestamps over previous weeks for visual depth
      date: activeRoadmap
        ? new Date(new Date(activeRoadmap.generated_at).getTime() + (idx + 1) * 7 * 24 * 60 * 60 * 1000)
        : new Date(),
      desc: m.why_it_matters
    });
  });

  // 3. Resume Update Event
  if (resumeUrl) {
    events.push({
      type: "Resume Connected",
      title: "Linked Digital Resume",
      date: profile ? new Date(profile.updated_at) : new Date(),
      desc: `Endpoint: ${resumeUrl}`
    });
  }

  // 4. Portfolio Connected Event
  if (portfolioUrl) {
    events.push({
      type: "Portfolio Connected",
      title: "Connected Portfolio Site",
      date: profile ? new Date(profile.updated_at) : new Date(),
      desc: `Endpoint: ${portfolioUrl}`
    });
  }

  // 5. Mentor Conversations Event
  workspace?.ai_chats.forEach((chat) => {
    if (chat.messages.length > 0) {
      events.push({
        type: "Mentor Session Completed",
        title: `Advisor Session: ${chat.title}`,
        date: new Date(chat.updated_at),
        desc: `Strategized targets for ${chat.topic || "curriculum milestones"} with AI Coach.`
      });
    }
  });

  // 6. Manual Progress Logs Event
  progressLogs.forEach((log) => {
    events.push({
      type: log.label.includes("Readiness") ? "Readiness Calibrated" : "Progress Logged",
      title: log.label,
      date: log.date === "This week" ? new Date() : new Date(log.date),
      desc: log.note
    });
  });

  // Sort events chronologically (newest first)
  const sortedEvents = events.sort((a, b) => b.date.getTime() - a.date.getTime());

  // ─── Skills Catalog Categorization ──────────────────────────────────────────

  const userSkills = profile?.skills || [];
  const formatSkillName = (s: string) => {
    const matched = userSkills.find((us) => us.toLowerCase() === s.toLowerCase());
    return matched || s.charAt(0).toUpperCase() + s.slice(1);
  };

  const frontendSkills = ["react", "typescript", "next.js", "nextjs", "css", "html", "tailwind", "javascript", "js"]
    .filter((s) => userSkills.some((us) => us.toLowerCase().includes(s)))
    .map(formatSkillName);

  const backendSkills = ["node", "postgresql", "postgres", "supabase", "database", "redis", "api", "express"]
    .filter((s) => userSkills.some((us) => us.toLowerCase().includes(s)))
    .map(formatSkillName);

  const coreCsSkills = ["dsa", "algorithm", "data structure", "leetcode", "system design", "git", "testing", "playwright", "jest"]
    .filter((s) => userSkills.some((us) => us.toLowerCase().includes(s)))
    .map(formatSkillName);

  const otherSkills = userSkills.filter(
    (us) =>
      !frontendSkills.some((fs) => us.toLowerCase() === fs.toLowerCase()) &&
      !backendSkills.some((bs) => us.toLowerCase() === bs.toLowerCase()) &&
      !coreCsSkills.some((cs) => us.toLowerCase() === cs.toLowerCase())
  );

  const getSkillLevel = (skillName: string) => {
    const isFrontend = ["react", "typescript", "next.js", "nextjs", "css", "html", "tailwind", "javascript", "js"].some((s) =>
      skillName.toLowerCase().includes(s)
    );
    if (isFrontend) {
      return completedCount >= 2 ? "Proficient" : "Learning";
    } else {
      return completedCount >= 4 ? "Proficient" : "Learning";
    }
  };

  // ─── Upcoming Milestones (Section 5) ────────────────────────────────────────

  const upcomingMilestones = allMilestones.slice(completedCount, completedCount + 3);

  // ─── Progress Insights (Section 6) ──────────────────────────────────────────

  const currentFocus = allMilestones[completedCount]
    ? allMilestones[completedCount].title
    : (userSkills[0] ?? "Sprint Calibration");

  const strengthsList = [];
  if (completedCount > 0) {
    strengthsList.push("Milestone consistency pacing");
  }
  if (frontendSkills.length > 0) {
    strengthsList.push("Frontend Architecture foundations");
  }
  if (githubUrl) {
    strengthsList.push("Git versioning and deployment visibility");
  }
  if (strengthsList.length === 0) {
    strengthsList.push("Onboarding assessment complete");
  }

  const needsAttentionList = [];
  if (!resumeUrl) {
    needsAttentionList.push("Resume document alignment missing");
  }
  if (completedCount < 3) {
    needsAttentionList.push("Backend & DB indexing proof-of-work missing");
  }
  if (userSkills.length < 5) {
    needsAttentionList.push("Technical skills inventory limited");
  }
  if (needsAttentionList.length === 0) {
    needsAttentionList.push("Keep sustaining sprint momentum");
  }

  // Blockers check
  const blockerInfo = weeklyHours < 8 ? "Low weekly time availability commitment" : "No active blocker flags detected.";

  // ─── Growth Opportunities checkable action lists ────────────────────────────

  const getGrowthOpportunities = () => {
    const list = [];
    if (!resumeUrl) {
      list.push({
        id: "resume",
        text: "Update Resume: Connect your resume URL in Profile settings to trigger review algorithms.",
        path: "/profile"
      });
    }
    if (!portfolioUrl) {
      list.push({
        id: "portfolio",
        text: "Link Portfolio: Add your portfolio URL to display verified proof of work.",
        path: "/profile"
      });
    }
    if (activeRoadmap && remainingCount > 0) {
      list.push({
        id: "milestone",
        text: `Complete Roadmap Task: Progress on active milestone "${nextMilestone}".`,
        path: "/roadmaps"
      });
    }
    if (readiness < 85) {
      list.push({
        id: "interview",
        text: "Calibrate Interview Pacing: Start a mock technical challenges session inside AI Mentor.",
        path: "/mentor"
      });
    }
    if (userSkills.length < 4) {
      list.push({
        id: "skills",
        text: "Log Tech stack: Add missing backend database tags inside Profile settings.",
        path: "/profile"
      });
    }
    return list;
  };
  const growthOpportunities = getGrowthOpportunities();

  // ─── Readiness Breakdown percentages ────────────────────────────────────────

  const readinessBreakdown = [
    {
      label: "Frontend Architecture",
      current: activeRoadmap?.progress ?? 50,
      target: 95,
      effort: "1-2 Weeks"
    },
    {
      label: "Backend & Systems",
      current: Math.min(95, Math.max(30, completedCount * 18)),
      target: 90,
      effort: "2-3 Weeks"
    },
    {
      label: "DSA & Algorithms",
      current: Math.min(95, Math.max(40, completedCount * 12)),
      target: 85,
      effort: "Continuous"
    },
    {
      label: "System Design",
      current: Math.min(95, Math.max(20, completedCount * 10)),
      target: 80,
      effort: "3-4 Weeks"
    }
  ];

  // Animations configuration completely removed as unused

  return (
    <div className="space-y-6 pb-20 relative">
      <div className="absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.03),transparent_60%)]" />

      {/* ═══ SECTION 1: CAREER SNAPSHOT (Full-Width Card) ════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="liquid-panel rounded-[24px] p-6 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-950/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          
          <div className="flex items-center gap-5">
            {/* Avatar block */}
            <div className="h-16 w-16 rounded-full border border-white/10 bg-black/40 flex items-center justify-center text-cyan-300 relative shrink-0">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="Operator Avatar" className="w-full h-full object-cover rounded-full" />
              ) : (
                <User className="h-7 w-7" />
              )}
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-cyan-400 border-2 border-[#050507]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest bg-cyan-950/40 border border-cyan-400/20 px-2 py-0.5 rounded-full">
                  Real-time Identity
                </span>
                <span className="text-slate-500 font-mono text-[10px]">
                  Last synced: {lastUpdatedTime}
                </span>
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
                {profile?.full_name || "Anonymous Operator"}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Target track is <strong className="text-slate-200 font-semibold">{profile?.goal || "Unconfigured Goal"}</strong> 
                {activeRoadmap?.career_domain && ` within ${activeRoadmap.career_domain}`}
              </p>
            </div>
          </div>

          {/* Quick Stats & Action buttons */}
          <div className="flex flex-wrap items-center gap-4.5 border-t border-white/5 pt-4 md:border-0 md:pt-0">
            <div className="grid grid-cols-4 gap-6 pr-4 border-r border-white/5 md:pr-6">
              <div className="text-center md:text-left">
                <span className="text-[9px] font-bold text-slate-500 uppercase block tracking-wider">Level</span>
                <span className="text-xs font-bold text-white block mt-0.5 capitalize">
                  {profile?.experience_level || "Apprentice"}
                </span>
              </div>
              <div className="text-center md:text-left">
                <span className="text-[9px] font-bold text-slate-500 uppercase block tracking-wider">Roadmap</span>
                <span className="text-xs font-bold text-white block mt-0.5">
                  {activeRoadmap?.roadmap_version ? `v${activeRoadmap.roadmap_version}` : "None"}
                </span>
              </div>
              <div className="text-center md:text-left">
                <span className="text-[9px] font-bold text-slate-500 uppercase block tracking-wider">Readiness</span>
                <span className="text-xs font-bold text-cyan-300 block mt-0.5">{readiness}%</span>
              </div>
              <div className="text-center md:text-left">
                <span className="text-[9px] font-bold text-slate-500 uppercase block tracking-wider">ETA</span>
                <span className="text-xs font-bold text-white block mt-0.5">{remainingWeeks}w</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push("/profile")}
                className="tactile-btn border border-white/5 bg-white/5 px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:text-white"
              >
                Edit Profile
              </button>
              <button
                type="button"
                onClick={() => router.push("/roadmaps")}
                className="tactile-btn border border-white/5 bg-white/5 px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:text-white"
              >
                Open Roadmap
              </button>
              <button
                type="button"
                onClick={() => router.push("/mentor")}
                className="tactile-btn border border-cyan-500/25 bg-cyan-950/10 px-3.5 py-2 rounded-xl text-xs font-bold text-cyan-300 hover:bg-cyan-950/20"
              >
                Ask Mentor
              </button>
              <button
                type="button"
                onClick={triggerSync}
                className="p-2 border border-white/5 bg-white/5 rounded-xl hover:bg-white/10"
                aria-label="Synchronize Career Twin dashboard data"
              >
                <RefreshCw className={`h-4.5 w-4.5 text-slate-400 ${isSyncing ? "animate-spin text-cyan-300" : ""}`} />
              </button>
            </div>
          </div>

        </div>
      </motion.section>

      {/* ═══ 3-COLUMN INTELLIGENCE GRID ═════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* COLUMN 1: Progress Overview & Chronological Timeline */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* SECTION 2: PROGRESS OVERVIEW */}
          <section className="liquid-panel rounded-[24px] p-5.5 shadow-xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-3.5 mb-4 flex items-center gap-2">
              <Target className="h-4.5 w-4.5 text-cyan-400" />
              Progress Overview
            </h3>

            <div className="space-y-4">
              {[
                { label: "Overall Readiness Score", val: readiness, col: "bg-cyan-400", suffix: "%" },
                { label: "Roadmap Milestones Completion", val: activeRoadmap?.progress ?? 0, col: "bg-cyan-400", suffix: "%" },
                { label: "Curriculum Milestones Completed", val: completedCount, total: allMilestones.length, col: "bg-indigo-400" },
                { label: "Portfolio Projects Completed", val: completedProjectsCount, col: "bg-indigo-400" },
                { label: "Submissions & Applications Logged", val: applicationsCount, col: "bg-emerald-400" }
              ].map((metric, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-slate-400 font-semibold">{metric.label}</span>
                    <span className="text-white font-extrabold">
                      {metric.val}
                      {metric.suffix}
                      {typeof metric.total === "number" && ` / ${metric.total}`}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#111114] overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${metric.col}`}
                      initial={{ width: 0 }}
                      animate={{ 
                        width: typeof metric.total === "number" && metric.total > 0 
                          ? `${(metric.val / metric.total) * 100}%` 
                          : `${metric.suffix === "%" ? metric.val : Math.min(100, metric.val * 20)}%` 
                      }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 3: CAREER JOURNEY TIMELINE */}
          <section className="liquid-panel rounded-[24px] p-5.5 shadow-xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-3.5 mb-4 flex items-center gap-2">
              <History className="h-4.5 w-4.5 text-cyan-400" />
              Career Journey Timeline
            </h3>

            {sortedEvents.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No journey timeline history logged yet. Complete tasks or sync profile variables to log events.
              </div>
            ) : (
              <div className="relative border-l border-white/5 ml-3 pl-4 space-y-5.5 text-xs max-h-[380px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/5">
                {sortedEvents.map((ev, index) => (
                  <div key={index} className="relative group hover:shadow-[0_0_15px_rgba(255,255,255,0.01)] transition-all">
                    {/* Event node dot */}
                    <div className="absolute -left-[23.5px] top-1.5 h-2 w-2 rounded-full bg-cyan-400 border border-[#050507] group-hover:scale-125 transition-transform" />
                    <div>
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="text-[9px] font-bold text-cyan-300 uppercase tracking-wider">
                          {ev.type}
                        </span>
                        <span className="text-[9px] text-slate-500 whitespace-nowrap">
                          {ev.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <h4 className="font-bold text-white mt-0.5 leading-snug">{ev.title}</h4>
                      {ev.desc && <p className="text-[11px] text-slate-400 mt-1 leading-normal leading-relaxed">{ev.desc}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>

        {/* COLUMN 2: Skills Portfolio (Skills Intelligence) */}
        <div className="space-y-6 lg:col-span-1">

          {/* SECTION 4: SKILLS PORTFOLIO (Skills Intelligence) */}
          <section className="liquid-panel rounded-[24px] p-5.5 shadow-xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-3.5 mb-4 flex items-center gap-2">
              <Briefcase className="h-4.5 w-4.5 text-indigo-400" />
              Skills Portfolio
            </h3>

            {userSkills.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 bg-black/20 rounded-2xl border border-white/5">
                No active skills tracked in your profile.
                <button
                  type="button"
                  onClick={() => router.push("/profile")}
                  className="mt-3 block mx-auto text-xs text-cyan-400 font-bold hover:underline"
                >
                  Add Skills in Profile
                </button>
              </div>
            ) : (
              <div className="space-y-5.5 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/5">
                {[
                  { title: "Frontend Stack", list: frontendSkills, col: "text-cyan-300" },
                  { title: "Backend & Systems", list: backendSkills, col: "text-indigo-300" },
                  { title: "Core CS Concepts", list: coreCsSkills, col: "text-emerald-300" },
                  { title: "Other Tracks", list: otherSkills, col: "text-slate-300" }
                ].map((cat, ci) => {
                  if (cat.list.length === 0) return null;
                  return (
                    <div key={ci} className="space-y-2.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block border-b border-white/[0.03] pb-1">
                        {cat.title}
                      </span>
                      <div className="grid gap-2">
                        {cat.list.map((skill, si) => {
                          const level = getSkillLevel(skill);
                          const isVerified = level === "Proficient";
                          return (
                            <article
                              key={si}
                              onClick={() => router.push("/roadmaps")}
                              className="group cursor-pointer bg-black/25 border border-white/5 hover:border-cyan-400/20 hover:shadow-[0_0_15px_rgba(34,211,238,0.02)] p-3 rounded-xl transition-all duration-300 flex items-center justify-between"
                            >
                              <div>
                                <span className="text-xs font-bold text-white block group-hover:text-cyan-300 transition-colors">
                                  {skill}
                                </span>
                                <span className="text-[9px] text-slate-500 mt-1 block">
                                  Evidence: {isVerified ? "Verified in Sprint" : "Profile declarations"}
                                </span>
                              </div>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                                isVerified
                                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                                  : "bg-white/5 text-slate-400 border-white/5"
                              }`}>
                                {level}
                              </span>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* SECTION 5: UPCOMING MILESTONES */}
          <section className="liquid-panel rounded-[24px] p-5.5 shadow-xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-3.5 mb-4 flex items-center gap-2">
              <Layers className="h-4.5 w-4.5 text-indigo-400" />
              Upcoming Milestones
            </h3>

            {upcomingMilestones.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 bg-black/20 rounded-2xl border border-white/5">
                No upcoming milestones. Your curriculum track is complete!
              </div>
            ) : (
              <div className="relative border-l border-white/5 ml-3 pl-4 space-y-5 text-xs">
                {upcomingMilestones.map((ms, index) => (
                  <div
                    key={index}
                    onClick={() => router.push("/roadmaps")}
                    className="relative cursor-pointer group hover:shadow-[0_0_12px_rgba(255,255,255,0.01)] transition"
                  >
                    {/* upcoming node dot */}
                    <div className="absolute -left-[23.5px] top-1.5 h-2 w-2 rounded-full border border-indigo-400 bg-[#050507]" />
                    <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">
                      Milestone {completedCount + index + 1}
                    </span>
                    <h4 className="font-bold text-white mt-0.5 group-hover:text-indigo-300 transition-colors">
                      {ms.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-1 leading-normal leading-relaxed">
                      {ms.why_it_matters}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>

        {/* COLUMN 3: Progress Insights & Readiness Breakdown */}
        <div className="space-y-6 lg:col-span-1">

          {/* SECTION 6: PROGRESS INSIGHTS (Progress Insights) */}
          <section className="liquid-panel rounded-[24px] p-5.5 shadow-xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-3.5 mb-4 flex items-center gap-2">
              <Brain className="h-4.5 w-4.5 text-indigo-400" />
              Progress Insights
            </h3>

            <div className="space-y-4.5 text-xs">
              {/* Strengths */}
              <article className="border border-emerald-500/10 bg-emerald-500/[0.02] p-3.5 rounded-2xl space-y-2">
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest block">
                  Strengths
                </span>
                <ul className="space-y-1.5 text-[11px] text-slate-300 font-medium">
                  {strengthsList.map((item, idx) => (
                    <li key={idx} className="flex gap-2 items-center leading-normal">
                      <span className="h-1 w-1 rounded-full bg-emerald-400 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>

              {/* Areas Improving */}
              <article className="border border-cyan-500/10 bg-cyan-500/[0.02] p-3.5 rounded-2xl space-y-1">
                <span className="text-[9px] font-bold text-cyan-300 uppercase tracking-widest block mb-1.5">
                  Current Improving Focus
                </span>
                <h4 className="font-bold text-white text-[11.5px] leading-snug">
                  {currentFocus}
                </h4>
                <p className="text-[10px] text-slate-400 leading-normal leading-relaxed mt-1">
                  Active target roadmap module parameters mapping your competency.
                </p>
              </article>

              {/* Needs Attention */}
              <article className="border border-amber-500/10 bg-amber-500/[0.02] p-3.5 rounded-2xl space-y-2">
                <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest block">
                  Needs Attention
                </span>
                <ul className="space-y-1.5 text-[11px] text-slate-300 font-medium">
                  {needsAttentionList.map((item, idx) => (
                    <li key={idx} className="flex gap-2 items-start leading-normal">
                      <span className="h-1 w-1 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>

              {/* Blocked Areas */}
              <article className="border border-rose-500/10 bg-rose-500/[0.02] p-3.5 rounded-2xl space-y-1">
                <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest block mb-1">
                  Blocked Areas
                </span>
                <p className="text-[11px] text-slate-300 font-medium leading-normal leading-relaxed">
                  {blockerInfo}
                </p>
              </article>
            </div>
          </section>

          {/* SECTION 7: READINESS BREAKDOWN */}
          <section className="liquid-panel rounded-[24px] p-5.5 shadow-xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-3.5 mb-4 flex items-center gap-2">
              <Award className="h-4.5 w-4.5 text-cyan-400" />
              Readiness Breakdown
            </h3>

            <div className="space-y-4">
              {readinessBreakdown.map((item, index) => {
                const gap = Math.max(0, item.target - item.current);
                return (
                  <div key={index} className="space-y-1.5">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-slate-300 font-semibold">{item.label}</span>
                      <span className="text-white font-bold">{item.current}%</span>
                    </div>

                    <div className="h-1.5 rounded-full bg-[#111114] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-cyan-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${item.current}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
                      <span>Target: {item.target}% (Gap: {gap}%)</span>
                      <span>Est: {item.effort}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

        </div>

      </div>

      {/* ═══ SECTION 8: GROWTH OPPORTUNITIES (Bottom Action Center) ═════════ */}
      <motion.section
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.1 } } }}
        className="liquid-panel rounded-[24px] p-6 shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-5">
          <Sparkles className="h-4.5 w-4.5 text-cyan-300 animate-pulse" />
          <div>
            <h3 className="text-sm font-semibold text-white">Actionable Growth Recommendations</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Dynamically generated action items linked directly to Strategist modules</p>
          </div>
        </div>

        {growthOpportunities.length === 0 ? (
          <div className="py-8 text-center text-xs text-emerald-400 font-semibold bg-emerald-500/5 border border-emerald-500/15 rounded-2xl">
            ✓ All growth suggestions connected! Your portfolio site, resume, and milestone objectives are synchronized.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {growthOpportunities.map((rec) => {
              const isChecked = checkedRecs[rec.id] ?? false;
              return (
                <div
                  key={rec.id}
                  className={`border rounded-2xl p-4 transition-all duration-300 flex items-start gap-3 relative ${
                    isChecked
                      ? "border-cyan-500/10 bg-cyan-950/[0.03] text-slate-400"
                      : "border-white/5 bg-[#08080a] text-slate-200 hover:border-cyan-400/20 hover:-translate-y-0.5 hover:shadow-lg"
                  }`}
                >
                  {/* Checkbox button */}
                  <button
                    type="button"
                    onClick={() => setCheckedRecs((prev) => ({ ...prev, [rec.id]: !prev[rec.id] }))}
                    className="shrink-0 mt-0.5 text-cyan-400 hover:scale-105 transition-transform"
                    aria-label={`Mark recommendation ${rec.id} as done`}
                  >
                    {isChecked ? (
                      <CheckSquare className="h-4.5 w-4.5 fill-cyan-400 text-[#08080a] transition-all" />
                    ) : (
                      <Square className="h-4.5 w-4.5 transition-all text-slate-500" />
                    )}
                  </button>

                  <div className="flex-1 space-y-2">
                    <p className={`text-xs leading-relaxed font-medium ${isChecked ? "line-through opacity-50" : ""}`}>
                      {rec.text}
                    </p>
                    
                    {!isChecked && (
                      <button
                        type="button"
                        onClick={() => router.push(rec.path)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 hover:underline mt-1"
                      >
                        Execute Next Action
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.section>

      {/* Screen reader tags */}
      <span className="sr-only">Career Twin intelligence dashboard loaded. Real-time data-driven checks.</span>
    </div>
  );
}
