"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion"; // Kept only for Confetti celebration animation
import {
  ArrowRight, Trash2, Check, X, PlusCircle,
  Search, Flame, Activity, BookOpen
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { generateId } from "@/lib/id";
import { updateWorkspace } from "@/lib/app-data";
import type {
  NoteRecord, ProgressRecord, UserProfileRecord,
  WorkspaceSnapshotRecord, RoadmapMilestoneRecord, CommunityNeedReport
} from "@/lib/supabase/types";
import { PageHero, CardSurface, ActionCenter } from "@/components/ui";
import { buttonStyle, inputStyle } from "@/styles/careeros-design-system";
import { buildUserIntelligenceProfile } from "@/lib/user-intelligence";

// ─── Types ────────────────────────────────────────────────────────────────────

type DashboardWorkspaceProps = {
  profile: UserProfileRecord | null;
  workspace: WorkspaceSnapshotRecord | null;
  communityNeeds?: CommunityNeedReport[];
};

type KanbanColumn = "upcoming" | "inprogress" | "completed";

function formatUtcDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
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

function DesignTextarea({ className = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const state = isFocused ? "focus" : isHovered ? "hover" : "base";
  return (
    <textarea
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

export function DashboardWorkspace({ profile, workspace: initialWorkspace, communityNeeds = [] }: DashboardWorkspaceProps) {
  const [workspace, setWorkspace] = useState<WorkspaceSnapshotRecord | null>(initialWorkspace);
  const intelligenceProfile = buildUserIntelligenceProfile(profile, workspace, communityNeeds);

  // Redesigned Modals & Drawer states
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [activityLimit, setActivityLimit] = useState(5);
  const [exportSuccessOpen, setExportSuccessOpen] = useState(false);
  const exportedFilename = "careeros-snapshot.pdf";

  // Opportunities Drawer: Notes and search state
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteTag, setNoteTag] = useState("Strategy");
  const [noteSearch, setNoteSearch] = useState("");

  // Logs form
  const [progressLabel, setProgressLabel] = useState("");
  const [progressValue, setProgressValue] = useState(60);
  const [progressNote, setProgressNote] = useState("");

  // Load and sync checked tasks with LocalStorage & Database
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({});

  // ── Derived active roadmap properties ────────────────────────────────────
  const roadmaps = workspace?.roadmaps ?? [];
  const activeRoadmap = roadmaps[0] ?? null;
  const allMilestones = Array.isArray(activeRoadmap?.milestones) ? activeRoadmap.milestones : [];

  const derivedCompletedCount = activeRoadmap ? Math.floor((activeRoadmap.progress / 100) * allMilestones.length) : 0;
  
  const getMilestoneColumn = (m: RoadmapMilestoneRecord, idx: number): KanbanColumn => {
    if (m.status === "completed" || m.status === "inprogress" || m.status === "upcoming") {
      return m.status;
    }
    // Fallback to sequential
    if (idx < derivedCompletedCount) return "completed";
    if (idx === Math.min(derivedCompletedCount, allMilestones.length - 1)) return "inprogress";
    return "upcoming";
  };

  const completedCount = activeRoadmap
    ? allMilestones.filter((m, idx) => getMilestoneColumn(m, idx) === "completed").length
    : 0;

  // Active milestone (first uncompleted milestone)
  const currentMilestoneIdx = allMilestones.length > 0
    ? allMilestones.findIndex((m, idx) => getMilestoneColumn(m, idx) !== "completed")
    : -1;
  const currentMilestone = currentMilestoneIdx >= 0 ? allMilestones[currentMilestoneIdx] : null;

  // Current Sprint Progress
  const currentMilestoneTasks = currentMilestone?.project_tasks ?? [];
  const currentMilestoneDeliverables = currentMilestone?.deliverables ?? [];
  const totalSprintItems = currentMilestoneTasks.length + currentMilestoneDeliverables.length;

  const completedSprintItems =
    currentMilestoneTasks.filter((_, i) => checkedTasks[`${currentMilestone?.title}::t::${i}`]).length +
    currentMilestoneDeliverables.filter((_, i) => checkedTasks[`${currentMilestone?.title}::d::${i}`]).length;

  useEffect(() => {
    if (profile?.id) {
      const loadedChecked: Record<string, boolean> = {};
      
      // 1. Load from active roadmap milestones stored in the database
      if (activeRoadmap && Array.isArray(activeRoadmap.milestones)) {
        activeRoadmap.milestones.forEach(m => {
          const msTasks = m.project_tasks ?? [];
          const msDels = m.deliverables ?? [];
          if (Array.isArray(m.completed_tasks)) {
            msTasks.forEach((t, i) => {
              if (m.completed_tasks!.includes(t)) {
                loadedChecked[`${m.title}::t::${i}`] = true;
              }
            });
          }
          if (Array.isArray(m.completed_deliverables)) {
            msDels.forEach((d, i) => {
              if (m.completed_deliverables!.includes(d)) {
                loadedChecked[`${m.title}::d::${i}`] = true;
              }
            });
          }
        });
      }

      // 2. Merge with localStorage for backwards compatibility
      try {
        const saved = localStorage.getItem(`careeros::roadmap_checked_tasks::${profile.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          Object.keys(parsed).forEach(key => {
            if (parsed[key]) {
              loadedChecked[key] = true;
            }
          });
        }
      } catch (e) {
        console.error("Failed loading checked tasks:", e);
      }

      setCheckedTasks(loadedChecked);
    }
  }, [activeRoadmap, profile?.id]);

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


  const sprintProgress = totalSprintItems > 0 ? Math.round((completedSprintItems / totalSprintItems) * 100) : 0;

  // Time Required Estimation
  const timeRequiredMin = Math.max(30, (totalSprintItems - completedSprintItems) * 45);
  const estHours = Math.floor(timeRequiredMin / 60);
  const estMins = timeRequiredMin % 60;
  const timeRequiredString = estHours > 0 ? `${estHours}h ${estMins}m` : `${estMins}m`;

  // Weekly consistency rate
  const totalCheckedEver = Object.values(checkedTasks).filter(Boolean).length;
  const weeklyConsistency = totalCheckedEver > 0 ? Math.min(100, 75 + (totalCheckedEver * 4) % 25) : 0;


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
  // ── Today's Mission Checklist state handler ─────────────────────────────
  async function toggleTaskState(key: string) {
    if (!activeRoadmap || !workspace) return;
    
    const parts = key.split("::");
    if (parts.length < 3) return;
    const mTitle = parts[0];
    const type = parts[1]; // "t" or "d"
    const idx = parseInt(parts[2]);
    
    const updatedMilestones = allMilestones.map(m => {
      if (m.title === mTitle) {
        const msTasks = m.project_tasks ?? [];
        const msDels = m.deliverables ?? [];
        
        let completedTasks = Array.isArray(m.completed_tasks) ? [...m.completed_tasks] : [];
        let completedDels = Array.isArray(m.completed_deliverables) ? [...m.completed_deliverables] : [];
        
        if (type === "t") {
          const taskTitle = msTasks[idx];
          if (taskTitle) {
            if (completedTasks.includes(taskTitle)) {
              completedTasks = completedTasks.filter(t => t !== taskTitle);
            } else {
              completedTasks.push(taskTitle);
            }
          }
        } else if (type === "d") {
          const delTitle = msDels[idx];
          if (delTitle) {
            if (completedDels.includes(delTitle)) {
              completedDels = completedDels.filter(d => d !== delTitle);
            } else {
              completedDels.push(delTitle);
            }
          }
        }
        
        // Auto transition status to completed if all items are checked
        const totalItems = msTasks.length + msDels.length;
        const completedItems = completedTasks.length + completedDels.length;
        const nextStatus: KanbanColumn | undefined = completedItems === totalItems ? "completed" : m.status === "completed" ? "inprogress" : m.status;
        
        return {
          ...m,
          completed_tasks: completedTasks,
          completed_deliverables: completedDels,
          status: nextStatus
        };
      }
      return m;
    });

    const nextCompletedCount = updatedMilestones.filter((m, idx) => {
      const status = m.status || (idx < derivedCompletedCount ? "completed" : "upcoming");
      return status === "completed";
    }).length;
    
    const nextProgress = Math.min(100, Math.round((nextCompletedCount / allMilestones.length) * 100));

    const updatedRoadmap = {
      ...activeRoadmap,
      progress: nextProgress,
      milestones: updatedMilestones
    };
    
    const updatedRoadmaps = [updatedRoadmap, ...roadmaps.slice(1)];

    // Optimistic UI updates
    setWorkspace(prev => prev ? { ...prev, roadmaps: updatedRoadmaps } : null);
    
    setCheckedTasks(prev => {
      const checking = !prev[key];
      const nextChecked = { ...prev, [key]: checking };
      
      // Auto celebrate on 100% sprint progress
      if (checking && currentMilestone && mTitle === currentMilestone.title) {
        const msTasks = currentMilestone.project_tasks ?? [];
        const msDels = currentMilestone.deliverables ?? [];
        const totalSprintItems = msTasks.length + msDels.length;
        const completedSprintItems =
          msTasks.filter((_, i) => nextChecked[`${currentMilestone.title}::t::${i}`]).length +
          msDels.filter((_, i) => nextChecked[`${currentMilestone.title}::d::${i}`]).length;

        if (totalSprintItems > 0 && completedSprintItems === totalSprintItems) {
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 4000);
        }
      }
      
      if (profile?.id) {
        try {
          localStorage.setItem(`careeros::roadmap_checked_tasks::${profile.id}`, JSON.stringify(nextChecked));
        } catch {}
      }
      return nextChecked;
    });

    try {
      if (supabase && profile?.id) {
        await updateWorkspace(supabase, profile.id, { roadmaps: updatedRoadmaps });
        showToast("Progress synchronized.");
      } else {
        showToast("Saved locally.");
      }
    } catch {
      showToast("Cloud sync failed. Saved to memory.");
    }
  }

  // ── Real Activity timeline events parser ─────────────────────────────────
  const getTimelineActivity = () => {
    const list: { label: string; time: string; type: string }[] = [];
    if (activeRoadmap) {
      list.push({
        label: `Active roadmap created: "${activeRoadmap.title}"`,
        time: activeRoadmap.generated_at ? formatUtcDate(activeRoadmap.generated_at) : "Recently",
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
        time: formatUtcDate(profile.updated_at),
        type: "profile"
      });
    }
    return list;
  };

  const allActivities = getTimelineActivity();
  const activityFeedList = allActivities.slice(0, activityLimit);

  if (!workspace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="relative flex items-center justify-center">
          <div className="absolute h-16 w-16 bg-cyan-500/10 rounded-full animate-ping pointer-events-none" />
          <Image
            src="/logo.png"
            alt="CareerOS"
            width={48}
            height={48}
            className="object-contain animate-pulse relative z-10"
          />
        </div>
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest animate-pulse">
          Initializing Mission Control...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {showCelebration && <Confetti />}

      {/* ── TOAST MESSENGER — CSS only ─────────────────────────────────────── */}
      <div
        className={`toast-base fixed bottom-24 right-6 z-50 xl:bottom-6 rounded-xl border border-white/5 bg-[#0a0a0c] px-4 py-3 text-xs font-semibold text-cyan-200 shadow-[0_4px_16px_rgba(0,0,0,0.5)] ${toastMessage ? "toast-enter" : "toast-exit"}`}
        aria-live="polite"
      >
        {toastMessage}
      </div>

      {/* ═══ LEVEL 1: MISSION CONTROL HERO ═══════════════════ */}
      <PageHero
        badge={activeRoadmap ? `Mission Control (Roadmap v${activeRoadmap.roadmap_version})` : "Mission Control"}
        title={profile?.goal || "SDE I Target Track"}
        subtitle={`Readiness Score: ${profile?.readiness_score || 0}% • Active Sprint: ${currentMilestone?.title || "No Sprint Active"} • Weekly Hours Target: ${activeRoadmap?.weekly_hours || 10} hours`}
        actions={
          <button
            onClick={() => setIsDrawerOpen(true)}
            style={buttonStyle("ghost")}
            className="px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
          >
            View Notes Archives
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        }
      />

      {/* ── Action Center ── */}
      <ActionCenter intelligenceProfile={intelligenceProfile} />

      {/* ═══ UNIFIED INTELLIGENCE STREAM ═════════════════════════════════════ */}
      <section className="space-y-4">
        <div>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Live telemetry</span>
          <h3 className="text-base font-bold text-white mt-1">Unified Intelligence Feed</h3>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Item 1: Roadmap status */}
          <CardSurface variant="glass" dust="tr" className="p-5 flex flex-col justify-between min-h-[160px]">
            <div>
              <div className="flex items-center justify-between gap-2.5 mb-3">
                <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                  Roadmap Pipeline
                </span>
                <span className="text-[10px] text-slate-500 font-bold">Active</span>
              </div>
              {activeRoadmap ? (
                <>
                  <h4 className="text-xs font-bold text-white leading-snug">
                    Target: {activeRoadmap.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                    Overall curriculum is {intelligenceProfile.roadmapProgress}% completed. Next milestone sprint: &ldquo;{currentMilestone?.title || "Complete Track"}&rdquo;.
                  </p>
                </>
              ) : (
                <>
                  <h4 className="text-xs font-bold text-white leading-snug">
                    Curriculum Inactive
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                    No active learning roadmap loaded. Initialize a path to calibrate target readiness tracking.
                  </p>
                </>
              )}
            </div>
            <div className="pt-3 border-t border-white/5 flex items-center justify-between mt-4">
              <span className="text-[9px] font-bold text-slate-500">Telemetry synced</span>
              <Link href="/roadmaps" className="text-[9px] font-extrabold text-cyan-400 hover:underline inline-flex items-center gap-0.5">
                View roadmap &rarr;
              </Link>
            </div>
          </CardSurface>

          {/* Item 2: Twin verdict */}
          <CardSurface variant="glass" dust="tr" className="p-5 flex flex-col justify-between min-h-[160px]">
            <div>
              <div className="flex items-center justify-between gap-2.5 mb-3">
                <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                  Twin Diagnostics
                </span>
                <span className="text-[10px] text-slate-500 font-bold">Calibrated</span>
              </div>
              <h4 className="text-xs font-bold text-white leading-snug">
                Twin Calibration Verdict
              </h4>
              <p className="text-[10px] text-slate-400 leading-relaxed mt-1 italic">
                &ldquo;{intelligenceProfile.twinAnalysis.verdict}&rdquo;
              </p>
            </div>
            <div className="pt-3 border-t border-white/5 flex items-center justify-between mt-4">
              <span className="text-[9px] font-bold text-slate-500">Index: {intelligenceProfile.twinAnalysis.velocityIndex}%</span>
              <Link href="/career-twin" className="text-[9px] font-extrabold text-cyan-400 hover:underline inline-flex items-center gap-0.5">
                Analyze twin &rarr;
              </Link>
            </div>
          </CardSurface>

          {/* Item 3: Support alerts & Geolocation reports */}
          <CardSurface variant="glass" dust="tr" className="p-5 flex flex-col justify-between min-h-[160px]">
            <div>
              {intelligenceProfile.supportNeeds.length > 0 ? (
                <>
                  <div className="flex items-center justify-between gap-2.5 mb-3">
                    <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                      Support Alert
                    </span>
                    <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wide">Urgent</span>
                  </div>
                  <h4 className="text-xs font-bold text-white leading-snug">
                    Mentorship Need Reported
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                    Active reported need for {intelligenceProfile.supportNeeds[0].category.replace("_", " ")} is unresolved. Scan nearby support listings or contact AI mentor.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2.5 mb-3">
                    <span className="bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                      Community Intel
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">Nominal</span>
                  </div>
                  <h4 className="text-xs font-bold text-white leading-snug">
                    Command Centre Online
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                    No active coordinate alerts registered. Nearby geolocated support services and resources are online.
                  </p>
                </>
              )}
            </div>
            <div className="pt-3 border-t border-white/5 flex items-center justify-between mt-4">
              <span className="text-[9px] font-bold text-slate-500">GPS verified</span>
              <Link href="/community" className="text-[9px] font-extrabold text-cyan-400 hover:underline inline-flex items-center gap-0.5">
                Scan help &rarr;
              </Link>
            </div>
          </CardSurface>
        </div>
      </section>

      {/* Quick Actions Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "AI Strategist", href: "/mentor", color: "text-indigo-400" },
          { label: "Log Progress", onClick: () => setProgressModalOpen(true), color: "text-cyan-400" },
          { label: "Review Roadmap", href: "/roadmaps", color: "text-amber-400" },
          { label: "Profile Identity", href: "/profile", color: "text-slate-400" }
        ].map((act, i) => {
          const content = (
            <>
              <span className={`text-[9px] uppercase tracking-wider block font-bold ${act.color}`}>{act.label}</span>
              <span className="text-xs font-semibold text-white mt-1.5 block group-hover:text-cyan-300 transition duration-150">Action &rarr;</span>
            </>
          );
          if (act.href) {
            return (
              <Link
                key={i}
                href={act.href}
                className="group block"
              >
                <CardSurface variant="surface" hover className="p-4">
                  {content}
                </CardSurface>
              </Link>
            );
          } else {
            return (
              <button
                key={i}
                onClick={act.onClick}
                className="group block text-left w-full"
              >
                <CardSurface variant="surface" hover className="p-4">
                  {content}
                </CardSurface>
              </button>
            );
          }
        })}
      </div>

      {/* Empty State: No active roadmap track */}
      {!activeRoadmap && (
        <CardSurface variant="surface" className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/5 bg-white/[0.02]">
            <Image src="/logo.png" alt="CareerOS" width={24} height={24} className="object-contain" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-300">No active roadmap track</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm leading-relaxed mx-auto">
              Initialize your execution parameters on the Roadmaps tab to sync your workspace.
            </p>
          </div>
          <Link
            href="/roadmaps"
            style={buttonStyle("primary")}
            className="mt-2 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-black justify-center"
          >
            Generate Career Roadmap &rarr;
          </Link>
        </CardSurface>
      )}

      {/* ═══ LEVEL 2: SPRINT PROGRESS (Active Milestone Checklist) ═══════════════ */}
      {activeRoadmap && currentMilestone && (
        <section id="todays-mission-section" className="scroll-mt-6 space-y-4">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-semibold">Active Track</span>
            <h3 className="text-base font-bold text-white mt-1">Sprint Progress</h3>
          </div>

          <CardSurface variant="surface" className="sm:p-8">
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <Flame className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="rounded-full border border-cyan-400/10 bg-cyan-400/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-cyan-300">
                    Active Milestone
                  </span>
                </div>

                <h4 className="text-base font-bold text-white leading-snug font-geom">
                  {currentMilestone.title}
                </h4>
                <p className="mt-2 text-xs text-slate-400 max-w-2xl leading-relaxed">
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
                        className={`w-full flex items-start gap-2.5 rounded-lg border p-3 text-left text-xs transition ${isDone
                            ? "border-cyan-500/5 bg-cyan-950/5 text-slate-500"
                            : "border-white/5 bg-white/[0.01] text-slate-300 hover:bg-white/[0.03] hover:border-white/10"
                          }`}
                      >
                        <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${isDone ? "border-cyan-400 bg-cyan-400 text-black" : "border-slate-700"
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
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Resources Needed</span>
                    <div className="flex flex-wrap gap-2">
                      {currentMilestone.resource_links.map((res, idx) => (
                        <a
                          key={idx}
                          href={res.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-cyan-400/20 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 hover:text-cyan-300 transition"
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
              <div className="shrink-0 flex flex-col justify-between items-end gap-3 self-stretch min-w-[170px] bg-white/[0.01] border border-white/5 p-4 rounded-xl">
                <div className="text-right">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Estimated Hours</span>
                  <span className="text-sm font-bold text-white mt-1 block">{timeRequiredString} left</span>
                  <span className="text-[10px] text-slate-400 mt-1 block">{currentMilestoneTasks.length - completedSprintItems} tasks remaining</span>
                </div>

                <div className="w-full text-right mt-4">
                  <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400 mb-1">
                    <span>Sprint Progress</span>
                    <span className="text-cyan-400">{sprintProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/[0.03] rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400" style={{ width: `${sprintProgress}%` }} />
                  </div>
                </div>

                <Link
                  href="/roadmaps"
                  style={buttonStyle("primary")}
                  className="w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 mt-2 text-black"
                >
                  Start Working &rarr;
                </Link>
              </div>
            </div>
          </CardSurface>
        </section>
      )}

      {/* ═══ LEVEL 3: METRICS (Consolidated Horizonal Metrics Grid) ═══════════════ */}
      {activeRoadmap && (
        <section className="space-y-4">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-semibold">Consolidated Status</span>
            <h3 className="text-base font-bold text-white mt-1">Metrics</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: "Readiness Score", value: `${profile?.readiness_score || 0}%`, sub: "Target calibration" },
              { label: "Roadmap Progress", value: `${activeRoadmap.progress}%`, sub: "Overall track cleared" },
              { label: "Milestones Cleared", value: `${completedCount}/${allMilestones.length}`, sub: "Sprint tracks" },
              { label: "Consistency Rate", value: `${weeklyConsistency}%`, sub: "Workspace actions" },
              { label: "Logged Progress Items", value: String(workspace.progress?.length ?? 0), sub: "Momentum events" },
            ].map(stat => (
              <CardSurface key={stat.label} variant="surface" noPadding className="p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">{stat.label}</span>
                  <p className="text-lg font-bold text-white mt-1.5 leading-none font-geom">{stat.value}</p>
                </div>
                <span className="text-[9px] text-slate-500 mt-2 block">{stat.sub}</span>
              </CardSurface>
            ))}
          </div>
        </section>
      )}

      {/* ═══ LEVEL 4: ACTIVITY LOGS (Workspace Logs) ═══════════════ */}
      <section className="space-y-4">
        <div>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">System Logs</span>
          <h3 className="text-base font-bold text-white mt-1">Activity Logs</h3>
        </div>

        <CardSurface variant="surface">
          {activityFeedList.length > 0 ? (
            <div className="relative space-y-4">
              <div className="absolute left-[15px] top-3 bottom-3 w-px bg-white/5" />
              {activityFeedList.map((act, idx) => (
                <div key={idx} className="relative flex items-start gap-4 pl-0.5">
                  <div className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/5 bg-[#0d0d10] text-xs ${act.type === "milestone" ? "text-emerald-400" : act.type === "roadmap" ? "text-cyan-400" : "text-slate-400"
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
                    style={buttonStyle("ghost")}
                    className="px-4 py-1.5 text-xs font-semibold"
                  >
                    Load More Activities
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-6 text-center">No recent activities logged.</p>
          )}
        </CardSurface>
      </section>

      {/* ═══ NOTES SIDE DRAWER — CSS transition 220ms ══════════════════════════ */}
      {isDrawerOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[4px]"
            style={{ animation: "none" }}
          />
          {/* Drawer */}
          <div
            className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#09090b]/90 border-l border-white/10 p-6 shadow-2xl flex flex-col justify-between backdrop-blur-xl"
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
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                      <DesignInput
                        value={noteSearch}
                        onChange={e => setNoteSearch(e.target.value)}
                        placeholder="Search notes..."
                        className="w-full pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {filteredNotes.length > 0 ? (
                      filteredNotes.map(note => (
                        <CardSurface key={note.id} variant="glass" noPadding className="p-3 relative group">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="bg-cyan-950/30 border border-cyan-500/20 px-1.5 py-0.2 rounded text-[8px] font-bold text-cyan-300 uppercase">
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
                        </CardSurface>
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
                style={buttonStyle("ghost")}
                className="w-full py-2.5 text-xs font-semibold"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </>
      )}

      {/* ═══ MODAL: CREATE NOTE ══════════════════════════════════════════════ */}
      {noteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
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
                <DesignInput value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="e.g. Portfolio positioning narrative" className="w-full" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Content</span>
                <DesignTextarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} rows={4} placeholder="Strategy actions, milestones, observations..." className="w-full resize-none p-3 h-auto" />
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
                <button type="button" onClick={() => setNoteModalOpen(false)} style={buttonStyle("ghost")} className="px-4 py-2 text-xs font-semibold">Cancel</button>
                <button type="button" onClick={handleCreateNote} style={buttonStyle("primary")} className="px-5 py-2 text-xs font-semibold text-black">Pin Note</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: LOG PROGRESS ════════════════════════════════════════════ */}
      {progressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
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
                <DesignInput value={progressLabel} onChange={(e) => setProgressLabel(e.target.value)} placeholder="e.g. Portfolio Readiness, AWS Certificate..." className="w-full" />
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
                <DesignTextarea value={progressNote} onChange={(e) => setProgressNote(e.target.value)} rows={3} placeholder="Observations, blockers, wins..." className="w-full resize-none p-3 h-auto" />
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setProgressModalOpen(false)} style={buttonStyle("ghost")} className="px-4 py-2 text-xs font-semibold">Cancel</button>
                <button type="button" onClick={handleAddProgress} style={buttonStyle("primary")} className="px-5 py-2 text-xs font-semibold text-black">Log Progress</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Export Success Modal */}
      {exportSuccessOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <div className="liquid-panel w-full max-w-sm rounded-[24px] p-6 text-center bg-[#09090b] border border-cyan-500/20 relative">
            <button
              type="button"
              onClick={() => setExportSuccessOpen(false)}
              className="absolute top-5 right-5 rounded-full p-2 text-slate-500 hover:text-white hover:bg-white/5 transition"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="relative flex items-center justify-center">
                <div className="absolute h-14 w-14 bg-emerald-500/10 rounded-full animate-pulse" />
                <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 relative z-10">
                  <Check className="h-6 w-6 stroke-[3]" />
                </div>
              </div>
              <Image src="/logo.png" alt="CareerOS" width={32} height={32} className="object-contain" />
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-wider">Export Successful</h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Your data package has been compiled and downloaded successfully.
                </p>
                {exportedFilename && (
                  <p className="mt-2 text-[10px] font-mono text-cyan-400 bg-cyan-950/20 border border-cyan-500/10 px-2.5 py-1 rounded-lg">
                    {exportedFilename}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setExportSuccessOpen(false)}
                style={buttonStyle("primary")}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-black mt-2"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
