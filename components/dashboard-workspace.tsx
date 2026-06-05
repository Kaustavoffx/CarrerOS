"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Sparkles, Trash2, Check, TrendingUp, X, PlusCircle,
  Target, ChevronDown, ChevronUp, Search, Clock, Flame,
  Activity, Zap, BookOpen, GitBranch, MessageSquare, Star, MapPin,
  DollarSign, Bookmark
} from "lucide-react";
import { MagneticButton } from "./magnetic-button";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { generateId } from "@/lib/id";
import { updateWorkspace } from "@/lib/app-data";
import type { NoteRecord, ProgressRecord, UserProfileRecord, WorkspaceSnapshotRecord, RoadmapRecord } from "@/lib/supabase/types";

// ─── Types ───────────────────────────────────────────────────────────────────

type DashboardWorkspaceProps = {
  profile: UserProfileRecord | null;
  workspace: WorkspaceSnapshotRecord | null;
};

type KanbanColumn = "upcoming" | "inprogress" | "completed";

interface KanbanCard {
  id: string;
  title: string;
  summary: string;
  progress: number;
  effort: string;
  resourceCount: number;
  column: KanbanColumn;
}

interface ActivityItem {
  id: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  label: string;
  time: string;
}

// ─── SVG Progress Ring ────────────────────────────────────────────────────────

function ProgressRing({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
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
    const raf = requestAnimationFrame(() => {
      setTimeout(() => setAnimated(pct), 80);
    });
    return () => cancelAnimationFrame(raf);
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
          <text x={size / 2} y={size / 2 - 4} textAnchor="middle" fontSize="15" fontWeight="700" fill="#ffffff">
            {label}
          </text>
          {sublabel && (
            <text x={size / 2} y={size / 2 + 14} textAnchor="middle" fontSize="9" fill="#64748b" letterSpacing="0.08em">
              {sublabel.toUpperCase()}
            </text>
          )}
        </>
      )}
    </svg>
  );
}

// ─── Small metric ring ────────────────────────────────────────────────────────

function SmallRing({ value, color = "#22d3ee" }: { value: number; color?: string }) {
  const [animated, setAnimated] = useState(0);
  const r = 18;
  const circumference = 2 * Math.PI * r;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(value / 100), 200);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <svg width="48" height="48" viewBox="0 0 48 48" className="shrink-0">
      <circle cx="24" cy="24" r={r} fill="none" stroke="#141418" strokeWidth="3.5" />
      <circle
        cx="24" cy="24" r={r}
        fill="none" stroke={color} strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={`${animated * circumference} ${circumference}`}
        strokeDashoffset={circumference * 0.25}
        style={{ transition: "stroke-dasharray 1s cubic-bezier(0.16,1,0.3,1)" }}
      />
      <text x="24" y="28" textAnchor="middle" fontSize="10" fontWeight="700" fill="#ffffff">{value}</text>
    </svg>
  );
}

// ─── Kanban column helper ─────────────────────────────────────────────────────

function roadmapsToKanban(roadmaps: RoadmapRecord[]): KanbanCard[] {
  return roadmaps.map((r) => ({
    id: r.id,
    title: r.title,
    summary: r.summary,
    progress: r.progress,
    effort: `${r.total_duration_weeks ?? r.duration_weeks ?? 4}w`,
    resourceCount: r.resource_links?.length ?? 0,
    column: r.progress >= 100 ? "completed" : r.progress > 0 ? "inprogress" : "upcoming",
  }));
}

const COLUMN_META: Record<KanbanColumn, { label: string; accent: string; bg: string }> = {
  upcoming:   { label: "Upcoming",    accent: "text-slate-400",  bg: "bg-slate-500/10" },
  inprogress: { label: "In Progress", accent: "text-amber-300",  bg: "bg-amber-500/10" },
  completed:  { label: "Completed",   accent: "text-emerald-300",bg: "bg-emerald-500/10" },
};

// ─── Main Component ────────────────────────────────────────────────────────────

export function DashboardWorkspace({ profile, workspace: initialWorkspace }: DashboardWorkspaceProps) {
  const [workspace, setWorkspace] = useState<WorkspaceSnapshotRecord | null>(initialWorkspace);

  // Modals
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Notes form
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteTag, setNoteTag] = useState("Strategy");
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [noteSearch, setNoteSearch] = useState("");

  // Progress form
  const [progressLabel, setProgressLabel] = useState("");
  const [progressValue, setProgressValue] = useState(60);
  const [progressNote, setProgressNote] = useState("");

  // Kanban state
  const [kanban, setKanban] = useState<KanbanCard[]>(() =>
    roadmapsToKanban(initialWorkspace?.roadmaps ?? [])
  );
  const [savedJobs, setSavedJobs] = useState<string[]>([]);

  const supabase = getSupabaseBrowserClient();
  const hasDragged = useRef(false);

  useEffect(() => {
    setWorkspace(initialWorkspace);
    setKanban(roadmapsToKanban(initialWorkspace?.roadmaps ?? []));
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
    showToast("Note pinned.");
  }

  async function handleDeleteNote(noteId: string) {
    if (!workspace) return;
    await persistWorkspaceChange({ notes: workspace.notes.filter(n => n.id !== noteId) });
    showToast("Note archived.");
  }

  async function handleAddProgress() {
    if (!workspace) return;
    const newLog: ProgressRecord = {
      id: generateId(),
      label: progressLabel.trim() || "General Momentum",
      value: progressValue,
      date: "Today",
      note: progressNote.trim() || "Progress logged.",
    };
    await persistWorkspaceChange({ progress: [newLog, ...workspace.progress] });
    setProgressModalOpen(false);
    setProgressLabel("");
    setProgressNote("");
    showToast("Momentum logged.");
  }

  // ── Derived data ────────────────────────────────────────────────────────────

  const readiness = profile?.readiness_score ?? 0;
  const roadmaps = workspace?.roadmaps ?? [];
  const activeRoadmap = roadmaps.find(r => r.progress > 0 && r.progress < 100) ?? roadmaps[0] ?? null;
  const firstMilestone = activeRoadmap?.milestones?.[0] ?? null;
  const avgProgress = roadmaps.length
    ? Math.round(roadmaps.reduce((a, r) => a + r.progress, 0) / roadmaps.length)
    : 0;
  const totalMilestones = roadmaps.reduce((a, r) => a + (r.milestones?.length ?? 0), 0);
  const weeklyHours = activeRoadmap?.weekly_hours ?? 15;
  const completionDate = activeRoadmap?.estimated_completion_date ?? "Oct 2026";
  const avgMomentum = workspace?.progress.length
    ? Math.round(workspace.progress.reduce((a, p) => a + p.value, 0) / workspace.progress.length)
    : 72;

  const healthMetrics = [
    { label: "Readiness",    value: readiness > 0 ? readiness : 82, color: "#22d3ee",  trend: "up" },
    { label: "Consistency",  value: 78,             color: "#818cf8", trend: "up" },
    { label: "Momentum",     value: avgMomentum,    color: "#f59e0b", trend: avgMomentum > 70 ? "up" : "down" },
    { label: "Portfolio",    value: 65,             color: "#10b981", trend: "up" },
    { label: "Interview",    value: 70,             color: "#e879f9", trend: "down" },
  ];

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

  const activityItems: ActivityItem[] = [
    { id: "a1", icon: Check,       color: "bg-emerald-500/15 text-emerald-400", label: "Completed Git milestone",             time: "2h ago" },
    { id: "a2", icon: GitBranch,   color: "bg-cyan-500/15 text-cyan-400",       label: "Updated roadmap — Sprint 02",         time: "5h ago" },
    { id: "a3", icon: Sparkles,    color: "bg-indigo-500/15 text-indigo-400",   label: "AI Mentor recommendation generated",  time: "Yesterday" },
    { id: "a4", icon: BookOpen,    color: "bg-amber-500/15 text-amber-400",     label: "Added portfolio project",             time: "2 days ago" },
    { id: "a5", icon: Star,        color: "bg-pink-500/15 text-pink-400",       label: "Readiness score updated to 88",       time: "3 days ago" },
  ];

  const filteredNotes = (workspace?.notes ?? []).filter(n =>
    n.title.toLowerCase().includes(noteSearch.toLowerCase()) ||
    n.content.toLowerCase().includes(noteSearch.toLowerCase())
  );

  // Kanban drag: move a card to a column on drop
  function moveCard(cardId: string, col: KanbanColumn) {
    setKanban(prev => prev.map(c => c.id === cardId ? { ...c, column: col } : c));
  }

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07 } },
  };
  const cubicEase = [0.16, 1, 0.3, 1] as [number, number, number, number];
  const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: cubicEase } },
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Toast */}
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

      {/* ═══ SECTION 1 — COMMAND CENTER ═══════════════════════════════════════ */}
      <motion.section variants={fadeUp} className="grid gap-5 xl:grid-cols-[1fr_auto]">

        {/* Career Goal Card */}
        <div className="liquid-panel relative overflow-hidden rounded-[28px] p-7 sm:p-9">
          {/* Glow accent */}
          <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-cyan-500/5 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-48 w-48 rounded-full bg-indigo-500/4 blur-2xl" />

          <div className="relative z-10 flex flex-col gap-7 lg:flex-row lg:items-center">
            {/* Progress ring */}
            <div className="flex flex-col items-center gap-4 shrink-0">
              <div className="relative w-[152px] h-[152px]">
                {/* Target ring (outer) */}
                <ProgressRing
                  value={readiness > 0 ? readiness : 90}
                  size={152}
                  strokeWidth={8}
                  color="#22d3ee"
                />
                {/* Current progress ring (inner) */}
                <div className="absolute inset-[16px] flex items-center justify-center">
                  <ProgressRing
                    value={avgProgress > 0 ? avgProgress : 54}
                    size={120}
                    strokeWidth={6}
                    color="#818cf8"
                  />
                </div>
                {/* Center Content Area */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: "90px",
                      minHeight: "90px",
                      gap: "6px",
                    }}
                    className="select-none"
                  >
                    <span className="text-[24px] md:text-[30px] font-extrabold text-white leading-none">
                      {avgProgress > 0 ? avgProgress : 54}%
                    </span>
                    <span
                      style={{ whiteSpace: "nowrap" }}
                      className="text-[8px] md:text-[10px] font-bold uppercase tracking-wider text-slate-400"
                    >
                      Current Progress
                    </span>
                  </div>
                </div>
              </div>
              {/* Target & Current metrics legend outside the chart */}
              <div className="mt-2 flex flex-col items-center gap-3 w-full">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold whitespace-nowrap">Target Readiness</p>
                  <p className="mt-0.5 text-base font-extrabold text-cyan-400">
                    {readiness > 0 ? readiness : 90}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold whitespace-nowrap">Current Progress</p>
                  <p className="mt-0.5 text-base font-extrabold text-indigo-400">
                    {avgProgress > 0 ? avgProgress : 54}%
                  </p>
                </div>
              </div>
            </div>

            {/* Text content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
                </span>
                <p className="caption text-cyan-400">Active Career Goal</p>
              </div>

              <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
                {profile?.goal ?? "Set your career goal"}
              </h2>

              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">Target Readiness</p>
                  <p className="mt-1 font-semibold text-cyan-300">{readiness > 0 ? `${readiness}%` : "90%"}</p>
                </div>
                <div className="w-px bg-white/5" />
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">Current Progress</p>
                  <p className="mt-1 font-semibold text-indigo-300">{avgProgress > 0 ? `${avgProgress}%` : "54%"}</p>
                </div>
                <div className="w-px bg-white/5" />
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">Est. Completion</p>
                  <p className="mt-1 font-semibold text-white">{completionDate}</p>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <MagneticButton asChild>
                  <Link
                    href="/roadmaps"
                    className="tactile-btn tactile-btn-primary inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-semibold text-black"
                  >
                    Continue Sprint
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </MagneticButton>
                <MagneticButton asChild>
                  <Link
                    href="/mentor"
                    className="tactile-btn inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-semibold text-slate-300 hover:text-white"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                    Open Mentor
                  </Link>
                </MagneticButton>
              </div>
            </div>
          </div>
        </div>

        {/* Right metrics strip */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-1 xl:w-52">
          {[
            { label: "Roadmaps",      value: roadmaps.length > 0 ? String(roadmaps.length) : "0",    icon: GitBranch, sub: "Active paths" },
            { label: "Milestones",    value: totalMilestones > 0 ? String(totalMilestones) : "—",   icon: Target,    sub: "Total tasks" },
            { label: "Weekly Hours",  value: `${weeklyHours}h`,                                      icon: Clock,     sub: "Committed" },
            { label: "Cloud Sync",    value: "Live",                                                  icon: Activity,  sub: "All saved" },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="liquid-card rounded-2xl p-4 hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <p className="caption text-slate-500">{m.label}</p>
                  <Icon className="h-3.5 w-3.5 text-slate-600" />
                </div>
                <p className="mt-2.5 text-xl font-semibold text-white">{m.value}</p>
                <p className="mt-1 text-[11px] text-slate-500">{m.sub}</p>
              </div>
            );
          })}
        </div>
      </motion.section>

      {/* ═══ SECTION 2 — TODAY'S MISSION ════════════════════════════════════= */}
      <motion.section variants={fadeUp}>
        <div className="liquid-panel relative overflow-hidden rounded-[24px] border-l-[3px] border-l-amber-400 p-6 sm:p-8">
          <div className="pointer-events-none absolute top-0 right-0 h-40 w-64 rounded-full bg-amber-400/4 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-400" />
                <p className="caption text-amber-400">Today&apos;s Mission</p>
                <span className="ml-2 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-red-400">
                  High Priority
                </span>
              </div>
              <h3 className="mt-3 text-xl font-semibold text-white sm:text-2xl leading-snug">
                {firstMilestone?.title ?? "Complete React component architecture milestone"}
              </h3>
              <p className="mt-2 text-sm text-slate-400 max-w-2xl">
                {firstMilestone?.why_it_matters ?? "Mastering component design patterns unlocks the full-stack sprint pathway and validates your core frontend competency."}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> 45 minutes estimated</span>
                <span className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" />
                  {firstMilestone?.resource_links?.length ?? 3} resources
                </span>
              </div>
            </div>
            <MagneticButton asChild>
              <Link
                href="/roadmaps"
                className="tactile-btn tactile-btn-primary inline-flex shrink-0 items-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold text-black"
              >
                <Zap className="h-4 w-4" />
                Start Work
              </Link>
            </MagneticButton>
          </div>
        </div>
      </motion.section>

      {/* ═══ SECTION 3 — KANBAN BOARD ════════════════════════════════════════ */}
      <motion.section variants={fadeUp}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="caption text-slate-500">Roadmap Execution</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Sprint Board</h3>
          </div>
          <Link href="/roadmaps" className="caption text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {(["upcoming", "inprogress", "completed"] as KanbanColumn[]).map((col) => {
            const meta = COLUMN_META[col];
            const cards = kanban.filter(c => c.column === col);
            return (
              <div
                key={col}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("cardId");
                  if (id) { moveCard(id, col); hasDragged.current = false; }
                }}
                className="min-h-[200px] rounded-[20px] border border-[#141417] bg-[#07070a] p-4"
              >
                {/* Column header */}
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${col === "upcoming" ? "bg-slate-400" : col === "inprogress" ? "bg-amber-400" : "bg-emerald-400"}`} />
                    <span className={`text-xs font-semibold uppercase tracking-widest ${meta.accent}`}>{meta.label}</span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.bg} ${meta.accent}`}>{cards.length}</span>
                </div>

                {/* Cards */}
                <div className="space-y-3">
                  {cards.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#202028] py-8 text-center">
                      <div className="h-8 w-8 rounded-full bg-[#0d0d10] flex items-center justify-center">
                        <Target className="h-4 w-4 text-slate-600" />
                      </div>
                      <p className="text-[11px] text-slate-600">Drop roadmaps here</p>
                    </div>
                  ) : (
                    cards.map((card) => (
                      <motion.div
                        key={card.id}
                        draggable
                        onDragStart={(e) => {
                          if ("dataTransfer" in e) {
                            (e as unknown as React.DragEvent).dataTransfer.setData("cardId", card.id);
                          }
                          hasDragged.current = true;
                        }}
                        whileHover={{ y: -3, boxShadow: "0 12px 40px rgba(0,0,0,0.8)" }}
                        whileDrag={{ scale: 1.04, boxShadow: "0 20px 60px rgba(0,0,0,0.9)", zIndex: 50, opacity: 0.9 }}
                        className="cursor-grab active:cursor-grabbing rounded-xl border border-[#1a1a1f] bg-[#0a0a0d] p-4 select-none"
                      >
                        <h4 className="text-sm font-semibold text-white leading-snug line-clamp-2">{card.title}</h4>
                        <p className="mt-1.5 text-[11px] text-slate-500 line-clamp-2">{card.summary}</p>
                        <div className="mt-3 flex items-center justify-between text-[10px]">
                          <div className="flex gap-2">
                            <span className="rounded-md border border-[#202028] bg-[#0d0d10] px-2 py-0.5 text-slate-400">
                              {card.effort}
                            </span>
                            {card.resourceCount > 0 && (
                              <span className="rounded-md border border-[#202028] bg-[#0d0d10] px-2 py-0.5 text-slate-400">
                                {card.resourceCount} links
                              </span>
                            )}
                          </div>
                          <span className={`font-bold ${card.progress >= 100 ? "text-emerald-400" : card.progress > 0 ? "text-amber-400" : "text-slate-500"}`}>
                            {card.progress}%
                          </span>
                        </div>
                        {card.progress > 0 && (
                          <div className="mt-2.5 h-1 rounded-full bg-[#141418] overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${card.progress}%` }}
                              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                            />
                          </div>
                        )}
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {kanban.length === 0 && (
          <div className="mt-4 flex flex-col items-center gap-3 rounded-[20px] border border-dashed border-[#202028] py-14 text-center">
            <div className="h-14 w-14 rounded-2xl bg-[#0d0d10] flex items-center justify-center">
              <Map className="h-6 w-6 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-400">No roadmaps yet</p>
              <p className="mt-1 text-xs text-slate-600">Generate your first roadmap to start tracking sprints</p>
            </div>
            <Link href="/roadmaps" className="mt-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-5 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/15 transition">
              Build Roadmap
            </Link>
          </div>
        )}
      </motion.section>

      {/* ═══ SECTION 4 + 5: CAREER HEALTH + AI MENTOR (side-by-side) ════════ */}
      <motion.section variants={fadeUp} className="grid gap-5 lg:grid-cols-[1fr_380px]">

        {/* CAREER HEALTH PANEL */}
        <div className="liquid-panel rounded-[24px] p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="caption text-slate-500">Career Metrics</p>
              <h3 className="mt-1 text-lg font-semibold text-white">Health Panel</h3>
            </div>
            <button
              type="button"
              onClick={() => setProgressModalOpen(true)}
              className="tactile-btn tactile-btn-primary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-semibold text-black"
            >
              <TrendingUp className="h-3 w-3" />
              Log Progress
            </button>
          </div>

          <div className="flex flex-wrap justify-around gap-6">
            {healthMetrics.map((m) => (
              <div key={m.label} className="flex flex-col items-center gap-2">
                <SmallRing value={m.value} color={m.color} />
                <div className="text-center">
                  <p className="text-[11px] font-semibold text-white">{m.label}</p>
                  <p className={`text-[10px] font-bold ${m.trend === "up" ? "text-emerald-400" : "text-rose-400"}`}>
                    {m.trend === "up" ? "↑ Rising" : "↓ Needs work"}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Progress logs */}
          {(workspace?.progress.length ?? 0) > 0 && (
            <div className="mt-6 space-y-3 border-t border-white/5 pt-5">
              {workspace!.progress.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400 truncate">{item.label}</span>
                      <span className="text-cyan-300 font-semibold shrink-0 ml-2">{item.value}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#141418] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${item.value}%` }}
                        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI MENTOR CARD */}
        <div className="liquid-panel relative overflow-hidden rounded-[24px] p-6">
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-cyan-500/5 blur-3xl" />
          <div className="relative z-10 flex flex-col h-full gap-5">
            <div className="flex items-center gap-3">
              {/* Pulse glow avatar */}
              <div className="relative shrink-0">
                <div className="absolute -inset-2 rounded-full bg-cyan-400/10 animate-pulse" />
                <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-950/30 text-cyan-300">
                  <Sparkles className="h-5 w-5" />
                </div>
              </div>
              <div>
                <p className="caption text-cyan-400">AI Mentor</p>
                <p className="text-sm font-semibold text-white">Latest Recommendation</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.04] bg-white/[0.01] p-4 flex-1">
              <p className="text-sm leading-relaxed text-slate-300">
                &ldquo;{workspace?.ai_chats?.[0]?.messages?.slice(-1)?.[0]?.content ??
                  "You should focus on React state management before beginning system design. Complete the useReducer patterns first — it will make the architecture module significantly easier."}&rdquo;
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <MagneticButton asChild>
                <Link href="/mentor" className="tactile-btn tactile-btn-primary flex items-center justify-center gap-2 rounded-full py-2.5 text-xs font-semibold text-black">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Ask Mentor
                </Link>
              </MagneticButton>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/roadmaps" className="tactile-btn flex items-center justify-center gap-1.5 rounded-full py-2 text-[11px] font-semibold text-slate-300 hover:text-white">
                  <GitBranch className="h-3 w-3 text-cyan-400" />
                  Generate Plan
                </Link>
                <Link href="/roadmaps" className="tactile-btn flex items-center justify-center gap-1.5 rounded-full py-2 text-[11px] font-semibold text-slate-300 hover:text-white">
                  <Activity className="h-3 w-3 text-indigo-400" />
                  Review Progress
                </Link>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ═══ SECTION 6 — CAREER TWIN BENTO ══════════════════════════════════ */}
      <motion.section variants={fadeUp}>
        <div className="mb-4">
          <p className="caption text-slate-500">Career Intelligence</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Career Twin Insights</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {/* Strengths — large */}
          <div className="liquid-card col-span-2 lg:col-span-3 rounded-[20px] p-5 hover:-translate-y-1">
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-4 w-4 text-amber-400" />
              <p className="caption text-amber-400">Core Strengths</p>
            </div>
            {(profile?.skills?.length ?? 0) > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile!.skills.slice(0, 8).map((skill) => (
                  <span key={skill} className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-xs text-slate-500">Complete onboarding to see your strengths</p>
              </div>
            )}
          </div>

          {/* Skill Gaps — medium */}
          <div className="liquid-card col-span-2 lg:col-span-3 rounded-[20px] p-5 hover:-translate-y-1">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-4 w-4 text-rose-400" />
              <p className="caption text-rose-400">Skill Gaps</p>
            </div>
            {(profile?.weaknesses?.length ?? 0) > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile!.weaknesses.slice(0, 6).map((w) => (
                  <span key={w} className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-200">
                    {w}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-xs text-slate-500">No gaps identified yet</p>
              </div>
            )}
          </div>

          {/* Predicted Timeline */}
          <div className="liquid-card col-span-2 lg:col-span-2 rounded-[20px] p-5 hover:-translate-y-1">
            <p className="caption text-slate-500">Predicted Timeline</p>
            <p className="mt-3 text-2xl font-bold text-white">6–8 months</p>
            <p className="mt-1 text-xs text-slate-400">to target readiness at current pace</p>
            <div className="mt-3 h-1.5 rounded-full bg-[#141418] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-cyan-400"
                initial={{ width: 0 }}
                animate={{ width: "38%" }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <p className="mt-2 text-[10px] text-slate-600">38% of journey complete</p>
          </div>

          {/* Market Match */}
          <div className="liquid-card col-span-2 lg:col-span-2 rounded-[20px] p-5 hover:-translate-y-1">
            <p className="caption text-slate-500">Market Match</p>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-3xl font-bold text-emerald-300">87</span>
              <span className="mb-1 text-sm text-slate-400">/ 100</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Strong alignment with SDE-I market demand</p>
            <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
              ↑ High demand domain
            </div>
          </div>

          {/* Experience Level */}
          <div className="liquid-card col-span-2 lg:col-span-2 rounded-[20px] p-5 hover:-translate-y-1">
            <p className="caption text-slate-500">Experience Level</p>
            <p className="mt-3 text-xl font-bold text-white capitalize">{profile?.experience_level ?? "Student"}</p>
            <p className="mt-1 text-xs text-slate-400">
              {profile?.learning_style ? `Learning style: ${profile.learning_style}` : "Structured self-paced learning"}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              {profile?.time_availability ? `${profile.time_availability} available weekly` : `${weeklyHours}h / week committed`}
            </p>
          </div>
        </div>
      </motion.section>

      {/* ═══ SECTION 7 — NOTES (COLLAPSIBLE) ════════════════════════════════ */}
      <motion.section variants={fadeUp}>
        <div
          className="liquid-panel rounded-[24px] overflow-hidden"
        >
          {/* Accordion trigger */}
          <button
            type="button"
            onClick={() => setNotesExpanded(e => !e)}
            className="w-full flex items-center justify-between px-6 py-5 cursor-pointer hover:bg-white/[0.01] transition"
          >
            <div className="flex items-center gap-3">
              <BookOpen className="h-4 w-4 text-slate-400" />
              <div className="text-left">
                <p className="caption text-slate-500">Archive</p>
                <h3 className="mt-0.5 text-base font-semibold text-white">
                  Strategy Notes
                  {(workspace?.notes.length ?? 0) > 0 && (
                    <span className="ml-2 rounded-full bg-[#141418] border border-[#202028] px-2 py-0.5 text-xs text-slate-400">
                      {workspace!.notes.length}
                    </span>
                  )}
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setNoteModalOpen(true); }}
                className="tactile-btn tactile-btn-primary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-semibold text-black"
              >
                <PlusCircle className="h-3 w-3" />
                New Note
              </button>
              {notesExpanded ? (
                <ChevronUp className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              )}
            </div>
          </button>

          <AnimatePresence initial={false}>
            {notesExpanded && (
              <motion.div
                key="notes-content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6 space-y-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    <input
                      value={noteSearch}
                      onChange={(e) => setNoteSearch(e.target.value)}
                      placeholder="Search notes..."
                      className="carved-input w-full rounded-xl py-2.5 pl-9 pr-4 text-sm text-white"
                    />
                  </div>

                  <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                    {filteredNotes.length > 0 ? (
                      filteredNotes.map((note) => (
                        <div key={note.id} className="liquid-card group relative rounded-2xl p-4 hover:bg-[#141418]">
                          <div className="flex items-center justify-between">
                            <span className="rounded-md border border-cyan-400/25 bg-[#082f49] px-2 py-0.5 caption font-medium text-cyan-200">
                              {note.tag}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteNote(note.id)}
                              className="opacity-0 group-hover:opacity-100 rounded p-1 text-slate-500 hover:bg-[#1a1a20] hover:text-rose-400 transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <h4 className="mt-3 text-sm font-semibold text-white">{note.title}</h4>
                          <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">{note.content}</p>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center gap-2 py-10 text-center">
                        <BookOpen className="h-8 w-8 text-slate-700" />
                        <p className="text-sm text-slate-500">
                          {noteSearch ? "No notes match your search" : "No strategy notes yet"}
                        </p>
                        {!noteSearch && (
                          <button
                            type="button"
                            onClick={() => setNoteModalOpen(true)}
                            className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 transition"
                          >
                            Create your first note →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.section>

      {/* ═══ SECTION 8 — JOB MATCHES ══════════════════════════════════════════ */}
      <motion.section variants={fadeUp}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="caption text-slate-500">Opportunity Board</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Job Matches</h3>
          </div>
          <span className="rounded-full border border-[#202028] bg-[#0d0d10] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Coming Soon
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobListings.map((job) => {
            const saved = savedJobs.includes(job.id);
            return (
              <motion.div
                key={job.id}
                whileHover={{ y: -4, boxShadow: "0 20px 60px rgba(0,0,0,0.9)" }}
                className="liquid-card group relative rounded-[20px] p-5 cursor-pointer overflow-hidden"
              >
                {/* Company avatar */}
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#202028] bg-[#0d0d10] text-sm font-bold text-slate-300">
                    {job.company[0]}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSavedJobs(s => saved ? s.filter(x => x !== job.id) : [...s, job.id])}
                    className={`rounded-lg p-1.5 transition ${saved ? "text-amber-400" : "text-slate-600 hover:text-slate-400"}`}
                  >
                    <Bookmark className={`h-4 w-4 ${saved ? "fill-amber-400" : ""}`} />
                  </button>
                </div>

                <div className="mt-3">
                  <h4 className="text-sm font-semibold text-white">{job.role}</h4>
                  <p className="mt-0.5 text-xs text-slate-400">{job.company} · {job.type}</p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                  <span className="flex items-center gap-1 text-slate-500"><MapPin className="h-3 w-3" />{job.location}</span>
                  <span className="flex items-center gap-1 text-slate-500"><DollarSign className="h-3 w-3" />{job.salary}</span>
                </div>

                {/* Skills */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {job.skills.map(s => (
                    <span key={s} className="rounded-md border border-[#202028] bg-[#0d0d10] px-2 py-0.5 text-[10px] text-slate-400">{s}</span>
                  ))}
                </div>

                {/* Match badge + reveal button */}
                <div className="mt-4 flex items-center justify-between">
                  <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
                    {job.match}% Match
                  </span>
                  <button
                    type="button"
                    disabled
                    className="opacity-0 group-hover:opacity-100 transition rounded-full border border-[#202028] bg-[#0d0d10] px-3 py-1.5 text-[10px] font-medium text-slate-400 cursor-not-allowed"
                  >
                    Save Job
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* ═══ SECTION 9 — ACTIVITY FEED ════════════════════════════════════════ */}
      <motion.section variants={fadeUp}>
        <div className="mb-4">
          <p className="caption text-slate-500">History</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Activity Feed</h3>
        </div>

        <div className="liquid-panel rounded-[24px] p-6">
          <div className="relative space-y-5">
            {/* Vertical connector */}
            <div className="absolute left-[19px] top-4 bottom-4 w-px bg-gradient-to-b from-cyan-400/30 via-white/5 to-transparent" />

            {activityItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="relative flex items-start gap-4 pl-1"
                >
                  <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#202028] ${item.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0 pt-1.5">
                    <p className="text-sm text-slate-300 leading-snug">{item.label}</p>
                    <p className="mt-1 text-[11px] text-slate-600">{item.time}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* ═══ MODAL: CREATE NOTE ══════════════════════════════════════════════ */}
      <AnimatePresence>
        {noteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/85">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="liquid-panel w-full max-w-lg rounded-[24px] p-6 relative"
            >
              <button type="button" onClick={() => setNoteModalOpen(false)} className="absolute top-5 right-5 rounded-full p-2 text-slate-500 hover:text-white hover:bg-white/5 transition">
                <X className="h-4 w-4" />
              </button>
              <h3 className="text-base font-semibold text-white mb-5 relative z-10">Pin New Strategy Note</h3>
              <div className="space-y-4 relative z-10">
                <label className="block space-y-1.5">
                  <span className="caption text-slate-500">Title</span>
                  <input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="e.g. Portfolio positioning narrative" className="carved-input w-full rounded-xl px-4 py-2.5 text-sm text-white" />
                </label>
                <label className="block space-y-1.5">
                  <span className="caption text-slate-500">Content</span>
                  <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} rows={4} placeholder="Strategy actions, milestones, observations..." className="carved-input w-full rounded-xl px-4 py-2.5 text-sm text-white resize-none" />
                </label>
                <div>
                  <span className="caption text-slate-500 block mb-2">Tag</span>
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
              className="liquid-panel w-full max-w-lg rounded-[24px] p-6 relative"
            >
              <button type="button" onClick={() => setProgressModalOpen(false)} className="absolute top-5 right-5 rounded-full p-2 text-slate-500 hover:text-white hover:bg-white/5 transition">
                <X className="h-4 w-4" />
              </button>
              <h3 className="text-base font-semibold text-white mb-5 relative z-10">Log Career Momentum</h3>
              <div className="space-y-4 relative z-10">
                <label className="block space-y-1.5">
                  <span className="caption text-slate-500">Metric Label</span>
                  <input value={progressLabel} onChange={(e) => setProgressLabel(e.target.value)} placeholder="e.g. Portfolio Readiness, AWS Certificate..." className="carved-input w-full rounded-xl px-4 py-2.5 text-sm text-white" />
                </label>
                <label className="block space-y-1.5">
                  <span className="caption text-slate-500">Value ({progressValue}%)</span>
                  <div className="flex gap-4 items-center">
                    <input type="range" min={10} max={100} value={progressValue} onChange={(e) => setProgressValue(Number(e.target.value))} className="w-full accent-cyan-400 cursor-pointer" />
                    <span className="font-semibold text-sm text-cyan-300 shrink-0 w-10 text-right">{progressValue}%</span>
                  </div>
                </label>
                <label className="block space-y-1.5">
                  <span className="caption text-slate-500">Context Note</span>
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
    </motion.div>
  );
}

// Dummy icon used in empty kanban state
function Map({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  );
}
