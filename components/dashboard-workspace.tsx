"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Sparkles, Trash2, Check, TrendingUp, X, PlusCircle,
  Search, Flame, Activity, BookOpen, MessageSquare, MapPin,
  DollarSign, Bookmark, AlertTriangle, Archive
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { generateId } from "@/lib/id";
import { updateWorkspace } from "@/lib/app-data";
import type {
  NoteRecord, ProgressRecord, UserProfileRecord,
  WorkspaceSnapshotRecord
} from "@/lib/supabase/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type DashboardWorkspaceProps = {
  profile: UserProfileRecord | null;
  workspace: WorkspaceSnapshotRecord | null;
};

type KanbanColumn = "upcoming" | "inprogress" | "completed";

type MilestoneStatus = "completed" | "active" | "upcoming";

function getMilestoneStatus(idx: number, completedCount: number, total: number): MilestoneStatus {
  if (idx < completedCount) return "completed";
  if (idx === Math.min(completedCount, total - 1)) return "active";
  return "upcoming";
}

const COLUMN_META: Record<KanbanColumn, { label: string; accent: string; bg: string }> = {
  upcoming:   { label: "Upcoming",    accent: "text-slate-400",  bg: "bg-slate-500/10" },
  inprogress: { label: "In Progress", accent: "text-amber-300",  bg: "bg-amber-500/10" },
  completed:  { label: "Completed",   accent: "text-emerald-300",bg: "bg-emerald-500/10" },
};

// ─── SVG Progress Ring ────────────────────────────────────────────────────────

function ProgressRing({
  value,
  max = 100,
  size = 140,
  strokeWidth = 10,
  color = "#22d3ee",
  trackColor = "#141418",
  label,
  sublabel,
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
}) {
  const [animated, setAnimated] = useState(0);
  const r = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(pct), 100);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${animated * circumference} ${circumference}`}
        strokeDashoffset={circumference * 0.25}
        style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.16,1,0.3,1)" }}
      />
      {label !== undefined && (
        <>
          <text x={size / 2} y={size / 2 - 4} textAnchor="middle" fontSize="18" fontWeight="800" fill="#ffffff">
            {label}
          </text>
          {sublabel && (
            <text x={size / 2} y={size / 2 + 14} textAnchor="middle" fontSize="9" fill="#64748b" letterSpacing="0.08em" fontWeight="bold">
              {sublabel.toUpperCase()}
            </text>
          )}
        </>
      )}
    </svg>
  );
}

// ─── Microinteraction Confetti ────────────────────────────────────────────────

const Confetti = () => {
  const particles = Array.from({ length: 45 });
  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {particles.map((_, i) => {
        const x = Math.random() * 100;
        const size = Math.random() * 8 + 6;
        const color = ["#22d3ee", "#818cf8", "#f59e0b", "#10b981", "#ec4899"][Math.floor(Math.random() * 5)];
        const delay = Math.random() * 0.4;
        const duration = Math.random() * 2 + 1.5;
        return (
          <motion.div
            key={i}
            initial={{ y: "105vh", x: `${x}vw`, rotate: 0, opacity: 1 }}
            animate={{
              y: "-10vh",
              x: `${x + (Math.random() * 30 - 15)}vw`,
              rotate: Math.random() * 360 + 360,
              opacity: 0
            }}
            transition={{ duration, delay, ease: "easeOut" }}
            className="absolute"
            style={{
              width: size,
              height: size,
              backgroundColor: color,
              borderRadius: Math.random() > 0.5 ? "50%" : "3px",
            }}
          />
        );
      })}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

export function DashboardWorkspace({ profile, workspace: initialWorkspace }: DashboardWorkspaceProps) {
  const [workspace, setWorkspace] = useState<WorkspaceSnapshotRecord | null>(initialWorkspace);

  // Redesigned Modals & Drawer states
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Opportunities Drawer: Notes and search state
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteTag, setNoteTag] = useState("Strategy");
  const [noteSearch, setNoteSearch] = useState("");
  const [savedJobs, setSavedJobs] = useState<string[]>([]);

  // Logs form
  const [progressLabel, setProgressLabel] = useState("");
  const [progressValue, setProgressValue] = useState(60);
  const [progressNote, setProgressNote] = useState("");

  // Load and sync checked tasks with LocalStorage (shared with Roadmaps page)
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined" && profile?.id) {
      try {
        const saved = localStorage.getItem(`careeros::roadmap_checked_tasks::${profile.id}`);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error("Failed loading checked tasks:", e);
      }
    }
    return {};
  });

  useEffect(() => {
    if (profile?.id) {
      try {
        localStorage.setItem(`careeros::roadmap_checked_tasks::${profile.id}`, JSON.stringify(checkedTasks));
      } catch (e) {
        console.error("Failed saving checked tasks:", e);
      }
    }
  }, [checkedTasks, profile?.id]);

  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    setWorkspace(initialWorkspace);
  }, [initialWorkspace]);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  }

  async function persistWorkspaceChange(updated: Partial<WorkspaceSnapshotRecord>) {
    if (!workspace) return;
    const nextState = { ...workspace, ...updated };
    setWorkspace(nextState);
    try {
      if (supabase && profile?.id) {
        await updateWorkspace(supabase, profile.id, updated);
        showToast("Workspace synchronized.");
      } else {
        showToast("Saved locally.");
      }
    } catch {
      showToast("Cloud sync failed. Saved to memory.");
    }
  }

  // ── Derived active roadmap properties ────────────────────────────────────
  const roadmaps = workspace?.roadmaps ?? [];
  const activeRoadmap = roadmaps[0] ?? null;
  const allMilestones = Array.isArray(activeRoadmap?.milestones) ? activeRoadmap.milestones : [];
  const completedCount = activeRoadmap ? Math.floor((activeRoadmap.progress / 100) * allMilestones.length) : 0;

  // Active milestone (first uncompleted milestone)
  const currentMilestoneIdx = allMilestones.length > 0 ? Math.min(completedCount, allMilestones.length - 1) : -1;
  const currentMilestone = currentMilestoneIdx >= 0 ? allMilestones[currentMilestoneIdx] : null;

  // Current Sprint Progress
  const currentMilestoneTasks = currentMilestone?.project_tasks ?? [];
  const currentMilestoneDeliverables = currentMilestone?.deliverables ?? [];
  const totalSprintItems = currentMilestoneTasks.length + currentMilestoneDeliverables.length;
  
  const completedSprintItems = 
    currentMilestoneTasks.filter((_, i) => checkedTasks[`${currentMilestone?.title}::t::${i}`]).length +
    currentMilestoneDeliverables.filter((_, i) => checkedTasks[`${currentMilestone?.title}::d::${i}`]).length;
    
  const sprintProgress = totalSprintItems > 0 ? Math.round((completedSprintItems / totalSprintItems) * 100) : 0;

  // Time Required Estimation
  const timeRequiredMin = Math.max(30, (totalSprintItems - completedSprintItems) * 45);
  const estHours = Math.floor(timeRequiredMin / 60);
  const estMins = timeRequiredMin % 60;
  const timeRequiredString = estHours > 0 ? `${estHours}h ${estMins}m` : `${estMins}m`;

  // Projects completed counts
  const completedProjectsCount = allMilestones.slice(0, completedCount).reduce((acc, m) => acc + (m.projects?.length ?? 0), 0);
  const totalProjectsCount = allMilestones.reduce((acc, m) => acc + (m.projects?.length ?? 0), 0);

  // Weekly consistency rate
  const totalCheckedEver = Object.values(checkedTasks).filter(Boolean).length;
  const weeklyConsistency = totalCheckedEver > 0 ? Math.min(100, 75 + (totalCheckedEver * 4) % 25) : 0;

  // Applications Count logged in logs
  const applicationsCount = workspace?.progress?.filter(p => 
    p.label.toLowerCase().includes("apply") || 
    p.label.toLowerCase().includes("application") || 
    p.label.toLowerCase().includes("job")
  ).length ?? 0;

  // ── Database Note Operations ─────────────────────────────────────────────
  async function handleCreateNote() {
    if (!workspace) return;
    const newNote: NoteRecord = {
      id: generateId(),
      title: noteTitle.trim() || "Untitled note",
      content: noteContent.trim() || "No content.",
      tag: noteTag,
      created_at: new Date().toISOString(),
    };
    await persistWorkspaceChange({ notes: [newNote, ...workspace.notes] });
    setNoteModalOpen(false);
    setNoteTitle("");
    setNoteContent("");
    showToast("Strategy note pinned.");
  }

  async function handleDeleteNote(noteId: string) {
    if (!workspace) return;
    await persistWorkspaceChange({ notes: workspace.notes.filter(n => n.id !== noteId) });
    showToast("Strategy note archived.");
  }

  async function handleAddProgress() {
    if (!workspace) return;
    const newLog: ProgressRecord = {
      id: generateId(),
      label: progressLabel.trim() || "Sprint Milestone Update",
      value: progressValue,
      date: new Date().toISOString().split("T")[0],
      note: progressNote.trim() || "Progress logged.",
    };
    await persistWorkspaceChange({ progress: [newLog, ...workspace.progress] });
    setProgressModalOpen(false);
    setProgressLabel("");
    setProgressNote("");
    showToast("Momentum logged successfully.");
  }

  // ── Drag & Drop Kanban Milestone handlers ───────────────────────────────
  async function handleMilestoneStatusUpdate(milestoneTitle: string, col: KanbanColumn) {
    if (!activeRoadmap || !workspace) return;
    const idx = allMilestones.findIndex(m => m.title === milestoneTitle);
    if (idx === -1) return;

    let nextProgress = activeRoadmap.progress;
    if (col === "completed") {
      nextProgress = Math.min(100, Math.round(((idx + 1) / allMilestones.length) * 100));
    } else if (col === "inprogress") {
      nextProgress = Math.min(100, Math.round((idx / allMilestones.length) * 100));
    } else if (col === "upcoming") {
      nextProgress = Math.min(100, Math.round((Math.max(0, idx - 1) / allMilestones.length) * 100));
    }

    if (nextProgress !== activeRoadmap.progress) {
      const updatedRoadmap = {
        ...activeRoadmap,
        progress: nextProgress
      };
      const updatedRoadmaps = [updatedRoadmap, ...roadmaps.slice(1)];
      await persistWorkspaceChange({ roadmaps: updatedRoadmaps });
      showToast(`Milestone status updated. Overall progress is now ${nextProgress}%.`);
      if (col === "completed") {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 4000);
      }
    }
  }

  // ── Today's Mission Checklist state handler ─────────────────────────────
  function toggleTaskState(key: string) {
    setCheckedTasks(prev => {
      const checking = !prev[key];
      const updated = { ...prev, [key]: checking };
      if (checking && currentMilestone) {
        const currentMilestoneTasks = currentMilestone.project_tasks ?? [];
        const currentMilestoneDeliverables = currentMilestone.deliverables ?? [];
        const totalSprintItems = currentMilestoneTasks.length + currentMilestoneDeliverables.length;
        
        const completedSprintItems = 
          currentMilestoneTasks.filter((_, i) => updated[`${currentMilestone.title}::t::${i}`]).length +
          currentMilestoneDeliverables.filter((_, i) => updated[`${currentMilestone.title}::d::${i}`]).length;
          
        const newProgress = totalSprintItems > 0 ? Math.round((completedSprintItems / totalSprintItems) * 100) : 0;
        if (newProgress === 100) {
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 4000);
        }
      }
      return updated;
    });
  }

  // ── Real Activity timeline events parser ─────────────────────────────────
  const getTimelineActivity = () => {
    const list: { label: string; time: string; type: string }[] = [];
    if (activeRoadmap) {
      list.push({
        label: `Active roadmap created: "${activeRoadmap.title}"`,
        time: activeRoadmap.generated_at ? new Date(activeRoadmap.generated_at).toLocaleDateString() : "Recently",
        type: "roadmap"
      });
    }
    allMilestones.forEach((m, idx) => {
      if (idx < completedCount) {
        list.push({
          label: `Completed Milestone: "${m.title}"`,
          time: `Milestone ${idx + 1}`,
          type: "milestone"
        });
      }
    });
    workspace?.progress?.slice(0, 3).forEach(p => {
      list.push({
        label: `Momentum logged: "${p.label}" (${p.value}%)`,
        time: p.date,
        type: "momentum"
      });
    });
    if (profile?.updated_at) {
      list.push({
        label: "Career Profile settings updated",
        time: new Date(profile.updated_at).toLocaleDateString(),
        type: "profile"
      });
    }
    return list.slice(0, 5);
  };

  const activityFeedList = getTimelineActivity();

  // Matched Opportunities Mock data
  const jobListings = [
    {
      id: "j1", role: "Frontend Engineer", company: "Vercel", location: "Remote",
      salary: "$120k–$160k", match: 94, type: "Full-Time",
      skills: ["React", "TypeScript", "Next.js"],
    },
    {
      id: "j2", role: "Product Designer", company: "Linear", location: "NYC / Hybrid",
      salary: "$110k–$140k", match: 89, type: "Full-Time",
      skills: ["Figma", "Design Systems", "UX Research"],
    },
    {
      id: "j3", role: "ML Engineer", company: "Stripe", location: "SF / Hybrid",
      salary: "$150k–$190k", match: 91, type: "Full-Time",
      skills: ["Python", "PyTorch", "MLOps"],
    },
  ];

  const filteredNotes = (workspace?.notes ?? []).filter(n =>
    n.title.toLowerCase().includes(noteSearch.toLowerCase()) ||
    n.content.toLowerCase().includes(noteSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {showCelebration && <Confetti />}

      {/* ── TOAST MESSENGER ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 xl:bottom-6 rounded-xl border border-cyan-400/25 bg-[#0a0a0c] px-4 py-3 text-xs font-medium text-cyan-200 shadow-[0_4px_16px_rgba(0,0,0,0.8),0_0_20px_rgba(34,211,238,0.15)]"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ SECTION 1: MISSION HEADER ════════════════════════════════════════ */}
      <section className="liquid-panel relative overflow-hidden rounded-[28px] p-6 sm:p-8">
        <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-48 w-48 rounded-full bg-indigo-500/4 blur-2xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-5">
            {/* Single Large Progress Ring */}
            {activeRoadmap && (
              <div className="shrink-0 relative">
                <ProgressRing
                  value={activeRoadmap.progress}
                  size={110}
                  strokeWidth={7}
                  color="#22d3ee"
                  label={`${activeRoadmap.progress}%`}
                  sublabel="Progress"
                />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
                </span>
                <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Mission Control Center</p>
                {activeRoadmap && (
                  <span className="rounded-full border border-[#202028] bg-[#0d0d10] px-2 py-0.5 text-[10px] text-slate-400">
                    Roadmap v{activeRoadmap.roadmap_version}
                  </span>
                )}
              </div>

              <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                {profile?.goal || "SDE I Career Mission"}
              </h2>

              <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500 font-medium">
                <span>Readiness: <strong className="text-cyan-400">{profile?.readiness_score || 0}%</strong></span>
                <span>&bull;</span>
                <span>Sprint Track: <strong className="text-white">{currentMilestone?.title || "No Sprint Active"}</strong></span>
                <span>&bull;</span>
                <span>Availability: <strong className="text-white">{activeRoadmap?.weekly_hours || 15}h/week</strong></span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-end lg:self-center">
            <button
              onClick={() => document.getElementById("todays-mission-section")?.scrollIntoView({ behavior: "smooth" })}
              className="tactile-btn border border-[#202028] hover:border-cyan-400/30 text-white font-bold px-4 py-2.5 rounded-full text-xs transition"
            >
              Continue Sprint
            </button>
            <Link
              href="/mentor"
              className="tactile-btn border border-[#202028] hover:border-indigo-400/30 text-white font-bold px-4 py-2.5 rounded-full text-xs transition inline-flex items-center gap-1.5"
            >
              <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
              Ask Mentor
            </Link>
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="tactile-btn bg-cyan-400 hover:bg-cyan-300 font-extrabold text-black px-5 py-2.5 rounded-full text-xs transition inline-flex items-center gap-1.5 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
            >
              View Opportunities
              <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 2: TODAY'S MISSION (Pinned top execution) ═══════════════ */}
      {activeRoadmap && currentMilestone && (
        <section id="todays-mission-section" className="scroll-mt-6">
          <div className="liquid-panel relative overflow-hidden rounded-[24px] border-l-[3px] border-cyan-400 p-6 sm:p-8">
            <div className="pointer-events-none absolute top-0 right-0 h-40 w-64 rounded-full bg-cyan-400/5 blur-3xl animate-pulse" />
            
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <Flame className="h-4 w-4 text-cyan-400 animate-bounce" />
                  <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Today&apos;s Mission</p>
                  <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-indigo-400">
                    High Priority
                  </span>
                </div>
                
                <h3 className="text-lg sm:text-xl font-bold text-white leading-snug">
                  Active Milestone: <span className="text-cyan-300">{currentMilestone.title}</span>
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                  {currentMilestone.why_it_matters}
                </p>

                {/* Subchecklist of tasks due today */}
                <div className="mt-4 space-y-2 max-w-xl">
                  {currentMilestoneTasks.map((t, idx) => {
                    const key = `${currentMilestone.title}::t::${idx}`;
                    const isDone = checkedTasks[key] ?? false;
                    return (
                      <button
                        key={key}
                        onClick={() => toggleTaskState(key)}
                        className={`w-full flex items-start gap-2.5 rounded-xl border p-3 text-left text-xs transition ${
                          isDone
                            ? "border-cyan-500/10 bg-cyan-950/5 text-slate-500"
                            : "border-[#1c1c22] bg-[#070709]/80 text-slate-300 hover:border-[#252530]"
                        }`}
                      >
                        <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                          isDone ? "border-cyan-400 bg-cyan-400 text-black" : "border-slate-700"
                        }`}>
                          {isDone && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                        </span>
                        <span className={isDone ? "line-through opacity-60" : ""}>{t}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Resources Needed */}
                {currentMilestone.resource_links?.length > 0 && (
                  <div className="mt-5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Resources Needed</span>
                    <div className="flex flex-wrap gap-2">
                      {currentMilestone.resource_links.map((res, idx) => (
                        <a
                          key={idx}
                          href={res.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 border border-[#1e1e24] hover:border-cyan-400/25 bg-[#0a0a0d] hover:bg-cyan-950/10 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 hover:text-cyan-300 transition"
                        >
                          <BookOpen className="h-3 w-3" />
                          {res.label}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Panel side item */}
              <div className="shrink-0 flex flex-col justify-between items-end gap-3 self-stretch min-w-[150px] bg-[#08080a] border border-[#141417] p-4 rounded-2xl">
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Estimated Hours</span>
                  <span className="text-sm font-bold text-white mt-1 block">{timeRequiredString} left</span>
                </div>
                <div className="w-full text-right mt-4">
                  <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400 mb-1">
                    <span>Task progress</span>
                    <span className="text-cyan-400">{sprintProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#141418] rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400" style={{ width: `${sprintProgress}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══ SECTION 3: CURRENT SPRINT BOARD (Milestones columns) ════ */}
      {activeRoadmap && (
        <section>
          <div className="mb-4">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Workspace Board</span>
            <h3 className="text-base font-bold text-white mt-1">Sprint Board</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {(["upcoming", "inprogress", "completed"] as KanbanColumn[]).map(col => {
              const meta = COLUMN_META[col];
              
              // Filter milestones belonging to this status column
              const cards = allMilestones.map((m, idx) => {
                const status = getMilestoneStatus(idx, completedCount, allMilestones.length);
                const colMap: KanbanColumn = status === "completed" ? "completed" : status === "active" ? "inprogress" : "upcoming";
                
                // Calculate milestone progress
                const msTasks = m.project_tasks ?? [];
                const msDels = m.deliverables ?? [];
                const msTotal = msTasks.length + msDels.length;
                const msCompleted = 
                  msTasks.filter((_, i) => checkedTasks[`${m.title}::t::${i}`]).length +
                  msDels.filter((_, i) => checkedTasks[`${m.title}::d::${i}`]).length;
                const msProgress = msTotal > 0 ? Math.round((msCompleted / msTotal) * 100) : (status === "completed" ? 100 : 0);

                return {
                  title: m.title,
                  progress: msProgress,
                  effort: `${m.estimated_duration_weeks}w`,
                  priority: m.difficulty_level === "Advanced" ? "High" : m.difficulty_level === "Intermediate" ? "Medium" : "Low",
                  column: colMap
                };
              }).filter(c => c.column === col);

              return (
                <div
                  key={col}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    const title = e.dataTransfer.getData("milestoneTitle");
                    if (title) void handleMilestoneStatusUpdate(title, col);
                  }}
                  className="min-h-[220px] rounded-[20px] border border-[#141417] bg-[#07070a] p-4 flex flex-col"
                >
                  <div className="mb-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${col === "upcoming" ? "bg-slate-400" : col === "inprogress" ? "bg-amber-400" : "bg-emerald-400"}`} />
                      <span className={`text-xs font-semibold uppercase tracking-widest ${meta.accent}`}>{meta.label}</span>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.bg} ${meta.accent}`}>
                      {cards.length}
                    </span>
                  </div>

                  <div className="space-y-3 flex-1">
                    {cards.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full border border-dashed border-[#202028]/80 py-8 rounded-xl">
                        <p className="text-[11px] text-slate-600">Drag items here</p>
                      </div>
                    ) : (
                      cards.map(card => (
                        <div
                          key={card.title}
                          draggable
                          onDragStart={e => e.dataTransfer.setData("milestoneTitle", card.title)}
                        >
                          <motion.div
                            whileHover={{ y: -3, boxShadow: "0 10px 30px rgba(0,0,0,0.8)" }}
                            className="cursor-grab active:cursor-grabbing rounded-xl border border-[#1a1a1f] bg-[#0a0a0d] p-4 select-none group"
                          >
                            <h4 className="text-xs sm:text-sm font-semibold text-white group-hover:text-cyan-300 transition line-clamp-2 leading-snug">{card.title}</h4>
                            
                            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                              <div className="flex gap-1.5">
                                <span className="rounded bg-[#0d0d10] border border-[#202028] px-1.5 py-0.5 text-slate-400">{card.effort}</span>
                                <span className={`rounded px-1.5 py-0.5 border ${
                                  card.priority === "High"
                                    ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
                                    : card.priority === "Medium"
                                    ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
                                    : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                                }`}>{card.priority}</span>
                              </div>
                              <span className={card.progress === 100 ? "text-emerald-400" : "text-cyan-300"}>
                                {card.progress}%
                              </span>
                            </div>

                            {card.progress > 0 && (
                              <div className="mt-2.5 h-1 rounded-full bg-[#141418] overflow-hidden">
                                <div className="h-full bg-cyan-400" style={{ width: `${card.progress}%` }} />
                              </div>
                            )}
                          </motion.div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══ SECTION 4: PROGRESS OVERVIEW (Unified Grid) ════════════════════ */}
      {activeRoadmap && (
        <section>
          <div className="mb-4">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Metrics Consolidation</span>
            <h3 className="text-base font-bold text-white mt-1">Progress Overview</h3>
          </div>

          <div className="liquid-panel rounded-[24px] p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: "Readiness Score", value: `${profile?.readiness_score || 0}%`, sub: "Career benchmark", color: "text-cyan-400" },
                { label: "Roadmap Completion", value: `${activeRoadmap.progress}%`, sub: "Overall progress", color: "text-indigo-400" },
                { label: "Milestones", value: `${completedCount}/${allMilestones.length}`, sub: "Completed track", color: "text-emerald-400" },
                { label: "Projects Completed", value: `${completedProjectsCount}/${totalProjectsCount}`, sub: "Evidence portfolio", color: "text-amber-400" },
                { label: "Weekly Consistency", value: `${weeklyConsistency}%`, sub: "Log completions", color: "text-rose-400" },
                { label: "Applications", value: String(applicationsCount), sub: "Opportunities log", color: "text-white" },
              ].map(stat => (
                <div key={stat.label} className="bg-[#08080a] border border-[#141417] p-3.5 rounded-xl flex flex-col justify-between hover:border-slate-800 transition duration-200">
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">{stat.label}</span>
                    <p className={`text-base sm:text-lg font-bold mt-1.5 ${stat.color} leading-none`}>
                      {stat.value}
                    </p>
                  </div>
                  <span className="text-[9px] text-slate-500 mt-2 block">{stat.sub}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-5 pt-4 border-t border-[#1e1e24] flex justify-end">
              <button
                onClick={() => setProgressModalOpen(true)}
                className="tactile-btn border border-[#202028] hover:border-cyan-400/20 px-4 py-2 rounded-xl text-xs text-slate-300 hover:text-white transition inline-flex items-center gap-1.5 font-bold"
              >
                <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
                Log Progress Update
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ═══ SECTION 5 & 6: INSIGHTS & BLOCKERS (Side-by-side) ══════════════ */}
      <section className="grid gap-5 lg:grid-cols-2">
        {/* SECTION 5: MENTOR INSIGHTS */}
        <div className="liquid-panel rounded-[24px] p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-44 w-44 rounded-full bg-cyan-400/5 blur-2xl" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-4">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <h3 className="text-base font-bold text-white">Mentor Insights</h3>
            </div>

            <div className="rounded-xl border border-[#141417] bg-[#08080a] p-4">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Latest recommendation</span>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed font-medium">
                {workspace?.ai_chats?.[0]?.messages?.slice(-1)?.[0]?.content || (
                  currentMilestone 
                    ? `Prioritize completing tasks in your active "${currentMilestone.title}" milestone to establish your frontend engineering foundations.`
                    : "No mentor logs available yet. Initiate career strategy chats."
                )}
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="border border-[#141417] bg-[#070709] p-3 rounded-lg">
                <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider block">Why it matters</span>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Completing scheduled tasks updates your readiness metrics and provides project evidence.
                </p>
              </div>
              <div className="border border-[#141417] bg-[#070709] p-3 rounded-lg">
                <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider block">Recommended action</span>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Focus on the primary Next Action highlighted at the top of your workspace.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#1e1e24]/60 flex justify-end">
            <Link
              href="/mentor"
              className="tactile-btn border border-[#202028] hover:border-cyan-400/25 px-4 py-2 rounded-xl text-xs text-slate-300 hover:text-white transition font-bold"
            >
              Open Mentor Strategy
            </Link>
          </div>
        </div>

        {/* SECTION 6: BLOCKERS & SKILL GAPS */}
        <div className="liquid-panel rounded-[24px] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              <h3 className="text-base font-bold text-white">Blockers & Skill Gaps</h3>
            </div>

            {(profile?.obstacles && profile.obstacles.length > 0) || (profile?.weaknesses && profile.weaknesses.length > 0) ? (
              <div className="space-y-4">
                {/* Blocked areas */}
                {profile?.obstacles && profile.obstacles.length > 0 && (
                  <div>
                    <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider block mb-1.5">Blocked Areas</span>
                    <div className="flex flex-wrap gap-1">
                      {profile.obstacles.map(ob => (
                        <span key={ob} className="rounded border border-amber-500/10 bg-amber-500/5 text-amber-300 text-[10px] px-2 py-0.5">{ob}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing skills */}
                {profile?.weaknesses && profile.weaknesses.length > 0 && (
                  <div>
                    <span className="text-[9px] text-rose-400 font-bold uppercase tracking-wider block mb-1.5">Missing Skills</span>
                    <div className="flex flex-wrap gap-1">
                      {profile.weaknesses.map(w => (
                        <span key={w} className="rounded border border-rose-500/10 bg-rose-500/5 text-rose-300 text-[10px] px-2 py-0.5">{w}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stalled Milestones */}
                <div>
                  <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider block mb-1">Recommended Fix</span>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Bridge gaps dynamically. Request behavioral sessions or study modules from the AI Mentor on <span className="text-white font-semibold">{profile?.weaknesses?.[0] || "core topics"}</span>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Check className="h-7 w-7 text-emerald-400 mb-1.5" />
                <p className="text-xs text-slate-500 font-semibold">No blockers detected.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 7: RECENT ACTIVITY (Sorted feed) ═════════════════════════ */}
      <section>
        <div className="mb-4">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Workspace Logs</span>
          <h3 className="text-base font-bold text-white mt-1">Recent Activity</h3>
        </div>

        <div className="liquid-panel rounded-[24px] p-6">
          {activityFeedList.length > 0 ? (
            <div className="relative space-y-4.5">
              <div className="absolute left-[15px] top-3 bottom-3 w-px bg-gradient-to-b from-white/10 via-white/5 to-transparent" />
              {activityFeedList.map((act, idx) => (
                <div key={idx} className="relative flex items-start gap-4 pl-0.5">
                  <div className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#202028] bg-[#0d0d10] text-xs ${
                    act.type === "milestone" ? "text-emerald-400" : act.type === "roadmap" ? "text-cyan-400" : "text-slate-400"
                  }`}>
                    {act.type === "milestone" ? <Check className="h-3 w-3 stroke-[2.5]" /> : <Activity className="h-3 w-3" />}
                  </div>
                  <div className="pt-0.5">
                    <p className="text-xs sm:text-sm text-slate-300 leading-snug">{act.label}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">{act.time}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-6 text-center">No recent activities logged.</p>
          )}
        </div>
      </section>

      {/* ═══ OPPORTUNITIES SIDE DRAWER ═══════════════════════════════════════ */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-black bg-opacity-70 backdrop-blur-sm"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-[#09090b] border-l border-[#202028] p-6 shadow-2xl flex flex-col justify-between"
            >
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex items-center justify-between border-b border-[#202028] pb-4 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Career Opportunities Panel</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Job intelligence and strategy archives</p>
                  </div>
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="h-8 w-8 rounded-full border border-[#202028] hover:border-cyan-400/25 flex items-center justify-center transition text-slate-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-6 overflow-y-auto flex-1 pr-1.5 pb-4">
                  {/* Market Match & Predicted Timeline */}
                  <div className="grid gap-3 grid-cols-2">
                    <div className="border border-[#1e1e24] bg-[#07070a] p-4 rounded-xl">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Market Match Index</span>
                      <div className="mt-2.5 flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-emerald-400">{activeRoadmap?.career_demand_score || 87}</span>
                        <span className="text-xs text-slate-500">/ 100</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                        Strong alignment with software target demands.
                      </p>
                    </div>

                    <div className="border border-[#1e1e24] bg-[#07070a] p-4 rounded-xl">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Predicted Timeline</span>
                      <p className="text-lg font-bold text-white mt-2">
                        {activeRoadmap ? `${Math.round(activeRoadmap.total_duration_weeks * 7 / 30)} months` : "6-8 months"}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">To target readiness pace.</p>
                    </div>
                  </div>

                  {/* Job Matches */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Job Matches</span>
                      <span className="rounded bg-indigo-500/10 text-indigo-400 text-[8px] px-2 py-0.5 border border-indigo-500/20 font-bold uppercase">Opportunity Board</span>
                    </div>

                    <div className="space-y-3">
                      {jobListings.map(job => {
                        const saved = savedJobs.includes(job.id);
                        return (
                          <div
                            key={job.id}
                            className="border border-[#141417] bg-[#07070a] p-4 rounded-xl relative hover:border-slate-800 transition"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-[#0d0d10] border border-[#202028] flex items-center justify-center text-xs font-bold text-slate-300">
                                  {job.company[0]}
                                </div>
                                <div>
                                  <h4 className="text-xs sm:text-sm font-semibold text-white">{job.role}</h4>
                                  <p className="text-[10px] text-slate-500">{job.company} &bull; {job.type}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => setSavedJobs(s => saved ? s.filter(x => x !== job.id) : [...s, job.id])}
                                className={`rounded p-1 transition ${saved ? "text-amber-400" : "text-slate-600 hover:text-slate-400"}`}
                              >
                                <Bookmark className={`h-4 w-4 ${saved ? "fill-amber-400" : ""}`} />
                              </button>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-400">
                              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
                              <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{job.salary}</span>
                              <span className="text-emerald-400 font-bold">&middot; {job.match}% match</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Strategy Notes (Search / Archive list) */}
                  <div className="border-t border-[#1e1e24] pt-5">
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-2">
                        <Archive className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Strategy Notes & Archive</span>
                      </div>
                      <button
                        onClick={() => setNoteModalOpen(true)}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 transition inline-flex items-center gap-1 font-bold uppercase tracking-wider"
                      >
                        <PlusCircle className="h-3 w-3" />
                        New Note
                      </button>
                    </div>

                    <div className="mb-3">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
                        <input
                          value={noteSearch}
                          onChange={e => setNoteSearch(e.target.value)}
                          placeholder="Search notes..."
                          className="carved-input w-full rounded-lg py-1.5 pl-8 pr-3 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                      {filteredNotes.length > 0 ? (
                        filteredNotes.map(note => (
                          <div key={note.id} className="border border-[#141417] bg-[#07070a] p-3 rounded-lg relative group">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="bg-[#082f49] border border-cyan-500/20 px-1.5 py-0.2 rounded text-[8px] font-bold text-cyan-300 uppercase">
                                {note.tag}
                              </span>
                              <button
                                onClick={() => void handleDeleteNote(note.id)}
                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#15151b] text-slate-500 hover:text-rose-400 transition"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                            <h5 className="text-xs font-semibold text-white leading-snug">{note.title}</h5>
                            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{note.content}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-slate-500 text-center py-6">No strategy notes found.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#202028] pt-4 flex gap-2">
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="tactile-btn border border-[#202028] hover:border-slate-500 w-full rounded-xl py-2.5 text-xs text-slate-300 font-semibold transition"
                >
                  Close Options
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══ MODAL: CREATE NOTE ══════════════════════════════════════════════ */}
      <AnimatePresence>
        {noteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/85">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="liquid-panel w-full max-w-lg rounded-[24px] p-6 relative bg-[#09090b]"
            >
              <button type="button" onClick={() => setNoteModalOpen(false)} className="absolute top-5 right-5 rounded-full p-2 text-slate-500 hover:text-white hover:bg-white/5 transition">
                <X className="h-4 w-4" />
              </button>
              <h3 className="text-base font-bold text-white mb-5 relative z-10">Pin New Strategy Note</h3>
              <div className="space-y-4 relative z-10">
                <label className="block space-y-1.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Title</span>
                  <input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="e.g. Portfolio positioning narrative" className="carved-input w-full rounded-xl px-4 py-2.5 text-sm text-white" />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Content</span>
                  <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} rows={4} placeholder="Strategy actions, milestones, observations..." className="carved-input w-full rounded-xl px-4 py-2.5 text-sm text-white resize-none" />
                </label>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Tag</span>
                  <div className="flex flex-wrap gap-2">
                    {["Strategy", "Portfolio", "Technical", "Career"].map((tag) => (
                      <button key={tag} type="button" onClick={() => setNoteTag(tag)} className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition ${noteTag === tag ? "border-cyan-400 bg-cyan-400/10 text-cyan-300" : "border-[#202028] bg-[#0c0c0e] text-slate-400"}`}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setNoteModalOpen(false)} className="tactile-btn rounded-xl px-4 py-2 text-xs font-semibold text-slate-400">Cancel</button>
                  <button type="button" onClick={handleCreateNote} className="tactile-btn tactile-btn-primary rounded-xl px-5 py-2 text-xs font-semibold text-black">Pin Note</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══ MODAL: LOG PROGRESS ════════════════════════════════════════════ */}
      <AnimatePresence>
        {progressModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/85">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="liquid-panel w-full max-w-lg rounded-[24px] p-6 relative bg-[#09090b]"
            >
              <button type="button" onClick={() => setProgressModalOpen(false)} className="absolute top-5 right-5 rounded-full p-2 text-slate-500 hover:text-white hover:bg-white/5 transition">
                <X className="h-4 w-4" />
              </button>
              <h3 className="text-base font-bold text-white mb-5 relative z-10">Log Career Momentum</h3>
              <div className="space-y-4 relative z-10">
                <label className="block space-y-1.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Metric Label</span>
                  <input value={progressLabel} onChange={(e) => setProgressLabel(e.target.value)} placeholder="e.g. Portfolio Readiness, AWS Certificate..." className="carved-input w-full rounded-xl px-4 py-2.5 text-sm text-white" />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Value ({progressValue}%)</span>
                  <div className="flex gap-4 items-center">
                    <input type="range" min={10} max={100} value={progressValue} onChange={(e) => setProgressValue(Number(e.target.value))} className="w-full accent-cyan-400 cursor-pointer" />
                    <span className="font-semibold text-sm text-cyan-300 shrink-0 w-10 text-right">{progressValue}%</span>
                  </div>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Context Note</span>
                  <textarea value={progressNote} onChange={(e) => setProgressNote(e.target.value)} rows={3} placeholder="Observations, blockers, wins..." className="carved-input w-full rounded-xl px-4 py-2.5 text-sm text-white resize-none" />
                </label>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setProgressModalOpen(false)} className="tactile-btn rounded-xl px-4 py-2 text-xs font-semibold text-slate-400">Cancel</button>
                  <button type="button" onClick={handleAddProgress} className="tactile-btn tactile-btn-primary rounded-xl px-5 py-2 text-xs font-semibold text-black">Log Progress</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
