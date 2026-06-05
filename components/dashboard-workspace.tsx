"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion"; // Kept only for Confetti celebration animation
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

export function DashboardWorkspace({ profile, workspace: initialWorkspace }: DashboardWorkspaceProps) {
  const [workspace, setWorkspace] = useState<WorkspaceSnapshotRecord | null>(initialWorkspace);

  // Redesigned Modals & Drawer states
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [activityLimit, setActivityLimit] = useState(5);

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
    } catch (err) {
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

  // Filtered Notes
  const notes = workspace?.notes ?? [];
  const filteredNotes = notes.filter(n =>
    n.title.toLowerCase().includes(noteSearch.toLowerCase()) ||
    n.content.toLowerCase().includes(noteSearch.toLowerCase()) ||
    (n.tag && n.tag.toLowerCase().includes(noteSearch.toLowerCase()))
  );

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
    workspace?.progress?.forEach(p => {
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
    return list;
  };

  const allActivities = getTimelineActivity();
  const activityFeedList = allActivities.slice(0, activityLimit);

   return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {showCelebration && <Confetti />}

      {/* ── TOAST MESSENGER — CSS only ─────────────────────────────────────── */}
      <div
        className={`toast-base fixed bottom-24 right-6 z-50 xl:bottom-6 rounded-xl border border-cyan-400/25 bg-[#0a0a0c] px-4 py-3 text-xs font-medium text-cyan-200 shadow-[0_4px_16px_rgba(0,0,0,0.8)] ${toastMessage ? "toast-enter" : "toast-exit"}`}
        aria-live="polite"
      >
        {toastMessage}
      </div>

      {/* ═══ MISSION HEADER (Neutral Info Bar) ═══════════════════════════════ */}
      <section className="card-data relative overflow-hidden rounded-[24px] p-6">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
                </span>
                <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Mission Workspace</p>
                {activeRoadmap && (
                  <span className="rounded-full border border-[#202028] bg-[#0d0d10] px-2 py-0.5 text-[10px] text-slate-400">
                    Roadmap v{activeRoadmap.roadmap_version}
                  </span>
                )}
              </div>

              <h2 className="mt-2 text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-tight">
                {profile?.goal || "SDE I Target Track"}
              </h2>

              <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500 font-medium">
                <span>Readiness Score: <strong className="text-cyan-400">{profile?.readiness_score || 0}%</strong></span>
                <span>&bull;</span>
                <span>Active Sprint: <strong className="text-white">{currentMilestone?.title || "No Sprint Active"}</strong></span>
                <span>&bull;</span>
                <span>Weekly Available Target: <strong className="text-white">{activeRoadmap?.weekly_hours || 10} hours</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="tactile-btn bg-cyan-400 hover:bg-cyan-300 font-extrabold text-black px-5 py-2.5 rounded-full text-xs transition inline-flex items-center gap-1.5 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
            >
              View Notes Archives
              <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </section>

      {/* ── QUICK ACTIONS ROW (Action Cards) ──────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => document.getElementById("todays-mission-section")?.scrollIntoView({ behavior: "smooth" })}
          className="card-action p-4 rounded-xl text-left flex flex-col justify-between"
        >
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Sprint Plan</span>
          <span className="text-xs font-bold text-white mt-2">Continue Sprint &rarr;</span>
        </button>
        <Link
          href="/mentor"
          className="card-action p-4 rounded-xl text-left flex flex-col justify-between"
        >
          <span className="text-[10px] text-indigo-400 uppercase tracking-wider block">AI Strategist</span>
          <span className="text-xs font-bold text-white mt-2">Open Mentor &rarr;</span>
        </Link>
        <button
          onClick={() => setProgressModalOpen(true)}
          className="card-action p-4 rounded-xl text-left flex flex-col justify-between"
        >
          <span className="text-[10px] text-cyan-400 uppercase tracking-wider block">Log Metrics</span>
          <span className="text-xs font-bold text-white mt-2">Log Progress &rarr;</span>
        </button>
        <Link
          href="/roadmaps"
          className="card-action p-4 rounded-xl text-left flex flex-col justify-between"
        >
          <span className="text-[10px] text-amber-400 uppercase tracking-wider block">Execution Track</span>
          <span className="text-xs font-bold text-white mt-2">Review Roadmap &rarr;</span>
        </Link>
      </div>

      {/* ═══ SECTION 2: TODAY'S MISSION (Spotlight Card 1) ═══════════════ */}
      {activeRoadmap && currentMilestone && (
        <section id="todays-mission-section" className="scroll-mt-6">
          <div className="card-spotlight relative overflow-hidden rounded-[24px] p-6 sm:p-8">
            <div className="pointer-events-none absolute top-0 right-0 h-40 w-64 bg-cyan-400/5 rounded-full blur-3xl animate-pulse" />
            
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <Flame className="h-4 w-4 text-cyan-400 animate-bounce" />
                  <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Today&apos;s Mission</p>
                  <span className="rounded-full border border-cyan-400/10 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-cyan-300">
                    Active Sprint Milestone
                  </span>
                </div>
                
                <h3 className="text-lg sm:text-xl font-bold text-white leading-snug">
                  {currentMilestone.title}
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
              <div className="shrink-0 flex flex-col justify-between items-end gap-3 self-stretch min-w-[170px] bg-black/40 border border-white/5 p-4 rounded-2xl">
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Estimated Hours</span>
                  <span className="text-sm font-bold text-white mt-1 block">{timeRequiredString} left</span>
                  <span className="text-[10px] text-slate-400 mt-1 block">{currentMilestoneTasks.length - completedSprintItems} tasks remaining</span>
                </div>
                
                <div className="w-full text-right mt-4">
                  <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400 mb-1">
                    <span>Sprint Progress</span>
                    <span className="text-cyan-400">{sprintProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#141418] rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400" style={{ width: `${sprintProgress}%` }} />
                  </div>
                </div>

                <Link
                  href="/roadmaps"
                  className="tactile-btn tactile-btn-primary w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 mt-2"
                >
                  Start Working &rarr;
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══ SECTION 3: CURRENT SPRINT BOARD (Neutral Kanban card layout) ════ */}
      {activeRoadmap && (
        <section>
          <div className="mb-4">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-semibold">Workspace Board</span>
            <h3 className="text-base font-bold text-white mt-1">Sprint Board</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {(["upcoming", "inprogress", "completed"] as KanbanColumn[]).map(col => {
              const meta = COLUMN_META[col];
              
              const cards = allMilestones.map((m, idx) => {
                const status = getMilestoneStatus(idx, completedCount, allMilestones.length);
                const colMap: KanbanColumn = status === "completed" ? "completed" : status === "active" ? "inprogress" : "upcoming";
                
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
                  className="min-h-[200px] rounded-[20px] border border-[#141417] bg-[#07070a] p-4 flex flex-col"
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
                          <div className="cursor-grab active:cursor-grabbing rounded-xl border border-[#1a1a1f] bg-[#0a0a0d] p-4 select-none group transition-colors duration-[120ms] hover:border-[#252530]">
                            <h4 className="text-xs sm:text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors duration-[120ms] line-clamp-2 leading-snug">{card.title}</h4>
                            
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
                          </div>
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

      {/* ═══ SECTION 4: PROGRESS OVERVIEW (Compact Horizontal Metrics Strip) ═══ */}
      {activeRoadmap && (
        <section>
          <div className="mb-4">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-semibold">Metrics Consolidation</span>
            <h3 className="text-base font-bold text-white mt-1">Progress Overview</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {[
              { label: "Readiness Score", value: `${profile?.readiness_score || 0}%`, sub: "Career benchmark" },
              { label: "Roadmap progress", value: `${activeRoadmap.progress}%`, sub: "Overall completed" },
              { label: "Completed milestones", value: `${completedCount}/${allMilestones.length}`, sub: "Milestone tracks" },
              { label: "Projects Completed", value: `${completedProjectsCount}/${totalProjectsCount}`, sub: "Evidence items" },
              { label: "Consistency Rate", value: `${weeklyConsistency}%`, sub: "Sprint logins" },
              { label: "Logged Applications", value: String(applicationsCount), sub: "Target tracking" },
            ].map(stat => (
              <div key={stat.label} className="card-data p-3.5 rounded-xl flex flex-col justify-between border border-[#1f1f23]">
                <div>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">{stat.label}</span>
                  <p className="text-base font-extrabold text-white mt-1.5 leading-none">{stat.value}</p>
                </div>
                <span className="text-[9px] text-slate-500 mt-2 block">{stat.sub}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ SECTION 5 & 6: AI MENTOR SPOTLIGHT & BLOCKERS (Side-by-side) ═════ */}
      <section className="grid gap-5 lg:grid-cols-2">
        {/* SECTION 5: AI MENTOR CARD (Purple gradient — AI semantic card) */}
        <div className="card-purple rounded-[24px] p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-44 w-44 bg-indigo-400/5 rounded-full blur-2xl" />
          
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <h3 className="text-base font-bold text-white">AI Mentor Insights</h3>
              <span className="rounded-full bg-cyan-400/10 text-cyan-300 border border-cyan-400/25 text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider">AI Strategist</span>
            </div>

            <div className="bg-black/30 border border-white/5 p-4 rounded-xl">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Latest recommendation</span>
              <p className="text-xs sm:text-sm text-slate-200 mt-1.5 leading-relaxed font-medium">
                {workspace?.ai_chats?.[0]?.messages?.slice(-1)?.[0]?.content || (
                  currentMilestone 
                    ? `Prioritize completing tasks in your active "${currentMilestone.title}" milestone to establish your frontend engineering foundations.`
                    : "No advisor recommendation logged. Start conversations inside the Mentor module."
                )}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="bg-black/20 border border-white/5 p-3 rounded-lg">
                <span className="text-[9px] text-cyan-300 font-bold uppercase tracking-wider block">Why this matters</span>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Completing recommended tasks updates readiness metrics and logs project evidence.
                </p>
              </div>
              <div className="bg-black/20 border border-white/5 p-3 rounded-lg">
                <span className="text-[9px] text-indigo-300 font-bold uppercase tracking-wider block">Generated timestamp</span>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  {workspace?.ai_chats?.[0]?.updated_at ? new Date(workspace.ai_chats[0].updated_at).toLocaleTimeString() : "Just now"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-white/5 flex justify-end">
            <Link
              href="/mentor"
              className="tactile-btn border border-[#202028] hover:border-cyan-400/35 px-4 py-2 rounded-xl text-xs text-slate-300 hover:text-white transition font-bold"
            >
              Open Mentor Strategy
            </Link>
          </div>
        </div>

        {/* SECTION 6: BLOCKERS & SKILL GAPS (Neutral Data Card) */}
        <div className="card-data rounded-[24px] p-6 flex flex-col justify-between">
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

      {/* ═══ SECTION 7: RECENT ACTIVITY (Compact timeline logs) ═══════════════ */}
      <section>
        <div className="mb-4">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Workspace Logs</span>
          <h3 className="text-base font-bold text-white mt-1">Recent Activity</h3>
        </div>

        <div className="card-data rounded-[24px] p-6">
          {activityFeedList.length > 0 ? (
            <div className="relative space-y-4">
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

              {allActivities.length > activityLimit && (
                <div className="mt-4 flex justify-center border-t border-white/5 pt-4">
                  <button
                    onClick={() => setActivityLimit(prev => prev + 5)}
                    className="tactile-btn border border-[#202028] hover:border-slate-500 px-4 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition font-semibold"
                  >
                    Load More Activities
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-6 text-center">No recent activities logged.</p>
          )}
        </div>
      </section>

      {/* ═══ NOTES SIDE DRAWER — CSS transition 220ms ══════════════════════════ */}
      {isDrawerOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]"
            style={{ animation: "none" }}
          />
          {/* Drawer */}
          <div
            className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#09090b] border-l border-[#202028] p-6 shadow-2xl flex flex-col justify-between"
            style={{ transform: "translateX(0)", transition: "transform 220ms ease" }}
          >
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex items-center justify-between border-b border-[#202028] pb-4 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Strategy Notes & Archives</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Workspace notes and execution strategies</p>
                  </div>
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="h-8 w-8 rounded-full border border-[#202028] hover:border-cyan-400/25 flex items-center justify-center transition text-slate-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-6 overflow-y-auto flex-1 pr-1.5 pb-4">
                  {/* Strategy Notes Panel */}
                  <div>
                    <div className="flex items-center justify-between mb-3.5">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">All Active Notes</span>
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

                    <div className="space-y-2">
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
                  Close Drawer
                </button>
              </div>
          </div>
        </>
      )}

      {/* ═══ MODAL: CREATE NOTE ══════════════════════════════════════════════ */}
      {noteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/85">
          <div
            className="liquid-panel w-full max-w-lg rounded-[24px] p-6 relative bg-[#09090b]"
            style={{ animation: "none" }}
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
          </div>
        </div>
      )}

      {/* ═══ MODAL: LOG PROGRESS ════════════════════════════════════════════ */}
      {progressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/85">
          <div
            className="liquid-panel w-full max-w-lg rounded-[24px] p-6 relative bg-[#09090b]"
            style={{ animation: "none" }}
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
          </div>
        </div>
      )}
    </div>
  );
}
