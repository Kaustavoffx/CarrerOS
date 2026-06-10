"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion"; // Kept only for Confetti celebration animation
import {
  Download, Printer, RefreshCw, Clock3,
  Check, ExternalLink, Search,
  FileText, Archive, Target, BookOpen, AlertTriangle,
  MessageSquare, X, ChevronDown, ChevronRight
} from "lucide-react";
import { FREE_GENERATIONS } from "@/lib/config";
import { FeatureGateButton } from "./feature-status";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { normalizeRoadmapArray, normalizeRoadmapVersionArray, updateWorkspace } from "@/lib/app-data";
import { buildRoadmapExportBundle, generateRoadmapPdfBlob } from "@/lib/roadmap-export";
import type {
  AiProviderStatusRecord, RoadmapRecord, RoadmapVersionRecord,
  UserProfileRecord, WorkspaceSnapshotRecord, RoadmapResourceLink,
  RoadmapMilestoneRecord
} from "@/lib/supabase/types";
import { PageHero, CardSurface } from "@/components/ui";
import { buttonStyle, inputStyle } from "@/styles/careeros-design-system";

// ─── Types ────────────────────────────────────────────────────────────────────

type RoadmapsConsoleProps = {
  profile: UserProfileRecord | null;
  workspace: WorkspaceSnapshotRecord | null;
  roadmapHistory?: RoadmapVersionRecord[] | null;
  aiProviders?: AiProviderStatusRecord[] | null;
};

type ResourceFilter = "all" | "course" | "documentation" | "practice" | "project" | "interview";
type MilestoneStatus = "completed" | "active" | "upcoming";

type ResourceWithMilestone = RoadmapResourceLink & {
  milestoneDifficulty?: string;
  milestoneWeeks?: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: string) {
  if (!date) return "—";
  try {
    return new Date(date).toISOString().split("T")[0];
  } catch {
    return date;
  }
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}


function getMilestoneStatus(idx: number, completedCount: number, total: number): MilestoneStatus {
  if (idx < completedCount) return "completed";
  if (idx === Math.min(completedCount, total - 1)) return "active";
  return "upcoming";
}

function getResourceType(label: string, provider: string): ResourceFilter {
  const l = label.toLowerCase();
  const p = provider.toLowerCase();
  if (l.includes("interview") || p.includes("interview") || l.includes("mock") || p.includes("mock")) return "interview";
  if (p.includes("leetcode") || p.includes("hackerrank") || p.includes("exercism") || p.includes("codewars") || l.includes("solve") || l.includes("practice")) return "practice";
  if (p.includes("mdn") || p.includes("docs") || p.includes("documentation") || p.includes("mozilla") || p.includes("official") || l.includes("documentation") || l.includes("spec")) return "documentation";
  if (p.includes("github") || p.includes("project") || p.includes("portfolio") || l.includes("project") || l.includes("build")) return "project";
  return "course";
}

function getEstimatedHours(type: ResourceFilter, milestoneWeeks?: number): number {
  const base = {
    all: 4,
    course: 12,
    documentation: 2,
    practice: 4,
    project: 15,
    interview: 3,
  }[type] || 4;
  if (milestoneWeeks) {
    return Math.max(1, Math.round(base * (milestoneWeeks / 2)));
  }
  return base;
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

// ─── Main Component ───────────────────────────────────────────────────────────

export function RoadmapsConsole({ profile, workspace: initialWorkspace, roadmapHistory, aiProviders }: RoadmapsConsoleProps) {

  // ── Preserved state variables ───────────────────────────────────────────
  const [workspace, setWorkspace] = useState<WorkspaceSnapshotRecord | null>(initialWorkspace);
  const [isReplanning, setIsReplanning] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [freeGenerationsUsed, setFreeGenerationsUsed] = useState(0);
  const [limitExhausted, setLimitExhausted] = useState(false);

  // ── New Redesigned UI states ─────────────────────────────────────────────
  const [selectedMilestoneTitle, setSelectedMilestoneTitle] = useState<string | null>(null);
  const [resourceSearch, setResourceSearch] = useState("");
  const [resourceFilter, setResourceFilter] = useState<ResourceFilter>("all");
  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null);
  const [isVersionDrawerOpen, setIsVersionDrawerOpen] = useState(false);
  const [compareVersionId, setCompareVersionId] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [exportSuccessOpen, setExportSuccessOpen] = useState(false);
  const [exportedFilename, setExportedFilename] = useState("");

  // PDF Download Modal States
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfProgressText, setPdfProgressText] = useState("");
  const [pdfProgressPage, setPdfProgressPage] = useState("");
  const [pdfResultBlob, setPdfResultBlob] = useState<Blob | null>(null);
  const [pdfFilename, setPdfFilename] = useState("");
  const [pdfGenerationPhase, setPdfGenerationPhase] = useState<"generating" | "ready" | "error">("generating");

  // V4 Resource Status & Milestone Edit States
  const [bookmarkedResources, setBookmarkedResources] = useState<Record<string, boolean>>({});
  const [completedResources, setCompletedResources] = useState<Record<string, boolean>>({});
  const [isEditingMilestone, setIsEditingMilestone] = useState(false);
  const [editTasksText, setEditTasksText] = useState("");
  const [editDeliverablesText, setEditDeliverablesText] = useState("");
  const [editWhyItMatters, setEditWhyItMatters] = useState("");
  const [editNotesText, setEditNotesText] = useState("");
  const [expandedMilestones, setExpandedMilestones] = useState<Record<string, boolean>>({});

  // ── Load and persist checked tasks via localStorage & Database ──────────
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({});

  // ── Derived variables ────────────────────────────────────────────────────
  const safeRoadmapHistory = useMemo(() => normalizeRoadmapVersionArray(roadmapHistory), [roadmapHistory]);
  const safeWorkspaceRoadmaps = useMemo(() => normalizeRoadmapArray(workspace?.roadmaps), [workspace?.roadmaps]);
  const activeRoadmap = useMemo(() => safeWorkspaceRoadmaps[0] ?? null, [safeWorkspaceRoadmaps]);
  const allMilestones = useMemo(() => (Array.isArray(activeRoadmap?.milestones) ? activeRoadmap!.milestones : []), [activeRoadmap]);

  const derivedCompletedCount = useMemo(() => (activeRoadmap ? Math.floor((activeRoadmap.progress / 100) * allMilestones.length) : 0), [activeRoadmap, allMilestones]);
  
  const getMilestoneColumn = useCallback((m: RoadmapMilestoneRecord, idx: number): MilestoneStatus => {
    if (m.status === "completed" || m.status === "inprogress" || m.status === "upcoming") {
      return m.status === "inprogress" ? "active" : m.status;
    }
    // Fallback to sequential
    if (idx < derivedCompletedCount) return "completed";
    if (idx === Math.min(derivedCompletedCount, allMilestones.length - 1)) return "active";
    return "upcoming";
  }, [derivedCompletedCount, allMilestones]);

  const completedCount = useMemo(() => (activeRoadmap
    ? allMilestones.filter((m, idx) => getMilestoneColumn(m, idx) === "completed").length
    : 0), [activeRoadmap, allMilestones, getMilestoneColumn]);

  // Current active milestone (the first uncompleted milestone)
  const currentMilestoneIdx = useMemo(() => (allMilestones.length > 0
    ? allMilestones.findIndex((m, idx) => getMilestoneColumn(m, idx) !== "completed")
    : -1), [allMilestones, getMilestoneColumn]);
  const currentMilestone = useMemo(() => (currentMilestoneIdx >= 0 ? allMilestones[currentMilestoneIdx] : null), [allMilestones, currentMilestoneIdx]);

  // Selected milestone (defaults to current active milestone)
  const activeMilestone = useMemo(() => (allMilestones.find(m => m.title === (selectedMilestoneTitle || currentMilestone?.title)) ?? currentMilestone), [allMilestones, selectedMilestoneTitle, currentMilestone]);

  // Calculate current sprint list & progress
  const currentMilestoneTasks = useMemo(() => (currentMilestone?.project_tasks ?? []), [currentMilestone]);
  const currentMilestoneDeliverables = useMemo(() => (currentMilestone?.deliverables ?? []), [currentMilestone]);
  const totalSprintItems = useMemo(() => (currentMilestoneTasks.length + currentMilestoneDeliverables.length), [currentMilestoneTasks, currentMilestoneDeliverables]);
  
  const completedSprintItems = useMemo(() => (
    currentMilestoneTasks.filter((_, i) => checkedTasks[`${currentMilestone?.title}::t::${i}`]).length +
    currentMilestoneDeliverables.filter((_, i) => checkedTasks[`${currentMilestone?.title}::d::${i}`]).length
  ), [currentMilestone, currentMilestoneTasks, currentMilestoneDeliverables, checkedTasks]);
    
  const sprintProgress = useMemo(() => (totalSprintItems > 0 ? Math.round((completedSprintItems / totalSprintItems) * 100) : 0), [completedSprintItems, totalSprintItems]);

  useEffect(() => {
    if (currentMilestone) {
      setExpandedMilestones(prev => ({ ...prev, [currentMilestone.title]: true }));
    }
  }, [currentMilestone]);

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

      // Safeguard to only trigger state update if checklist values actually differ
      setCheckedTasks(prev => {
        const hasChanged = Object.keys(loadedChecked).length !== Object.keys(prev).length ||
          Object.keys(loadedChecked).some(k => loadedChecked[k] !== prev[k]);
        return hasChanged ? loadedChecked : prev;
      });
    }
  }, [activeRoadmap, profile?.id]);

  // Load resource status tracking on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const b = localStorage.getItem("careeros::bookmarked_resources");
        if (b) setBookmarkedResources(JSON.parse(b));
        const c = localStorage.getItem("careeros::completed_resources");
        if (c) setCompletedResources(JSON.parse(c));
      } catch (e) {
        console.error("Failed loading resources state:", e);
      }
    }
  }, []);

  // ── Derived variables ────────────────────────────────────────────────────
  const supabase = getSupabaseBrowserClient();
  const hasConnectedProvider = Array.isArray(aiProviders) && aiProviders.some(p => p.connected);
  const refreshDisabled = isReplanning || (!hasConnectedProvider && limitExhausted);

  // Calculate Next Action CTA
  let nextActionLabel = "";
  let nextActionIdx = -1;
  let isNextActionDeliverable = false;

  if (currentMilestone) {
    const firstUncheckedTaskIdx = currentMilestone.project_tasks.findIndex((_, i) => !checkedTasks[`${currentMilestone.title}::t::${i}`]);
    if (firstUncheckedTaskIdx !== -1) {
      nextActionLabel = currentMilestone.project_tasks[firstUncheckedTaskIdx];
      nextActionIdx = firstUncheckedTaskIdx;
      isNextActionDeliverable = false;
    } else {
      const firstUncheckedDeliverableIdx = currentMilestone.deliverables.findIndex((_, i) => !checkedTasks[`${currentMilestone.title}::d::${i}`]);
      if (firstUncheckedDeliverableIdx !== -1) {
        nextActionLabel = currentMilestone.deliverables[firstUncheckedDeliverableIdx];
        nextActionIdx = firstUncheckedDeliverableIdx;
        isNextActionDeliverable = true;
      }
    }
  }

  if (!nextActionLabel && allMilestones.length > 0) {
    const nextMilestone = allMilestones[currentMilestoneIdx + 1];
    if (nextMilestone) {
      nextActionLabel = `Start Milestone: ${nextMilestone.title}`;
    } else {
      nextActionLabel = "All Milestones Completed!";
    }
  }

  // Deduplicate and gather all resources with their parent milestone context
  const allResources: ResourceWithMilestone[] = useMemo(() => Array.from(
    new Map(
      safeWorkspaceRoadmaps.flatMap(r =>
        (Array.isArray(r.resource_links) ? r.resource_links : []).concat(
          (Array.isArray(r.milestones) ? r.milestones : []).flatMap(m =>
            (Array.isArray(m.resource_links) ? m.resource_links : []).map(res => ({
              ...res,
              milestoneDifficulty: m.difficulty_level,
              milestoneWeeks: m.estimated_duration_weeks
            }))
          )
        )
      ).map(res => [res.url, res])
    ).values()
  ), [safeWorkspaceRoadmaps]);

  const getResourceStats = (res: ResourceWithMilestone) => {
    const type = getResourceType(res.label, res.provider);
    const difficulty = res.milestoneDifficulty || "Intermediate";
    const hours = getEstimatedHours(type, res.milestoneWeeks);
    return { type, difficulty, hours };
  };

  const filteredResources = allResources.filter(res => {
    const stats = getResourceStats(res);
    const matchSearch = !resourceSearch || res.label.toLowerCase().includes(resourceSearch.toLowerCase());
    const matchFilter = resourceFilter === "all" || stats.type === resourceFilter;
    return matchSearch && matchFilter;
  });



  // ── Sync initial workspace prop ──────────────────────────────────────────
  useEffect(() => { setWorkspace(initialWorkspace); }, [initialWorkspace]);

  useEffect(() => {
    async function fetchUsage() {
      if (supabase && profile?.id) {
        try {
          const { data } = await supabase
            .from("user_usage")
            .select("free_generations_used")
            .eq("user_id", profile.id)
            .maybeSingle();
          if (data) {
            setFreeGenerationsUsed(data.free_generations_used);
            setLimitExhausted(data.free_generations_used >= FREE_GENERATIONS);
          }
        } catch { /* Ignore usage failures */ }
      }
    }
    fetchUsage();
  }, [profile?.id, supabase]);

  // ── Action Handlers ──────────────────────────────────────────────────────
  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  async function persistRoadmaps(updatedRoadmaps: RoadmapRecord[]) {
    const safeRoadmaps = normalizeRoadmapArray(updatedRoadmaps);
    setWorkspace(curr => curr ? { ...curr, roadmaps: safeRoadmaps } : null);
    if (supabase && profile?.id) {
      await updateWorkspace(supabase, profile.id, { roadmaps: safeRoadmaps });
    }
  }

  const toggleBookmark = (url: string) => {
    setBookmarkedResources(prev => {
      const updated = { ...prev, [url]: !prev[url] };
      if (typeof window !== "undefined") {
        localStorage.setItem("careeros::bookmarked_resources", JSON.stringify(updated));
      }
      return updated;
    });
    showToast("Resource bookmark updated.");
  };

  const toggleCompleted = (url: string) => {
    setCompletedResources(prev => {
      const updated = { ...prev, [url]: !prev[url] };
      if (typeof window !== "undefined") {
        localStorage.setItem("careeros::completed_resources", JSON.stringify(updated));
      }
      return updated;
    });
    showToast("Resource completion updated.");
  };


  const saveMilestoneDetails = async () => {
    if (!activeRoadmap || !activeMilestone) return;
    
    const parsedTasks = editTasksText.split("\n").map(t => t.trim()).filter(Boolean);
    const parsedDeliverables = editDeliverablesText.split("\n").map(d => d.trim()).filter(Boolean);

    const updatedMilestones = allMilestones.map(m => {
      if (m.title === activeMilestone.title) {
        return {
          ...m,
          why_it_matters: editWhyItMatters.trim(),
          project_tasks: parsedTasks,
          deliverables: parsedDeliverables,
          notes: editNotesText.trim()
        };
      }
      return m;
    });

    const updatedRoadmap = {
      ...activeRoadmap,
      milestones: updatedMilestones
    };

    await persistRoadmaps([updatedRoadmap, ...safeWorkspaceRoadmaps.slice(1)]);
    setIsEditingMilestone(false);
    showToast("Milestone specifications updated in profile.");
  };

  async function restoreRoadmapVersion(version: RoadmapVersionRecord) {
    if (!workspace) return;
    await persistRoadmaps(normalizeRoadmapArray(version.roadmaps));
    setRestoreConfirmId(null);
    setIsVersionDrawerOpen(false);
    showToast(`Restored version v${version.roadmap_version}.`);
  }

  async function handleReplan() {
    if (isReplanning || !workspace) return;
    if (limitExhausted && !hasConnectedProvider) {
      showToast("Free roadmap refreshes are exhausted for this account.");
      return;
    }
    setIsReplanning(true);
    showToast("Refreshing roadmap workspace...");
    try {
      const response = await fetch("/api/replan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, currentRoadmaps: safeWorkspaceRoadmaps }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }
      const responseRoadmaps = normalizeRoadmapArray(data.roadmaps);
      if (!responseRoadmaps.length) {
        throw new Error("Empty roadmap response");
      }
      await persistRoadmaps(responseRoadmaps);
      setFreeGenerationsUsed(prev => {
        const next = prev + 1;
        setLimitExhausted(next >= FREE_GENERATIONS);
        return next;
      });
      showToast(data?.provider_prompt
        ? (data.provider_prompt_message || "Connect your own AI provider to continue.")
        : "Roadmap regenerated successfully.");
    } catch (error) {
      console.error("ROADMAP REPLAN FAILURE:", error);
      showToast("Roadmap refresh failed. Try again.");
    } finally {
      setIsReplanning(false);
    }
  }

  function handleJsonExport() {
    if (!safeWorkspaceRoadmaps.length) return;
    const bundle = buildRoadmapExportBundle(safeWorkspaceRoadmaps, `${profile?.goal ?? "CareerOS"} Roadmap`);
    const fn = bundle.pdf.filename.replace(/\.pdf$/, ".json");
    downloadTextFile(
      fn,
      bundle.json, "application/json;charset=utf-8"
    );
    setExportedFilename(fn);
    setExportSuccessOpen(true);
  }

  function handleMarkdownExport() {
    if (!safeWorkspaceRoadmaps.length) return;
    const bundle = buildRoadmapExportBundle(safeWorkspaceRoadmaps, `${profile?.goal ?? "CareerOS"} Roadmap`);
    const fn = `${(profile?.goal ?? "careeros-roadmap").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-roadmap.md`;
    downloadTextFile(
      fn,
      bundle.markdown, "text/markdown;charset=utf-8"
    );
    setExportedFilename(fn);
    setExportSuccessOpen(true);
  }

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
        
        const totalItems = msTasks.length + msDels.length;
        const completedItems = completedTasks.length + completedDels.length;
        const nextStatus: "upcoming" | "inprogress" | "completed" | undefined = completedItems === totalItems ? "completed" : m.status === "completed" ? "inprogress" : m.status;
        
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
    
    const updatedRoadmaps = [updatedRoadmap, ...safeWorkspaceRoadmaps.slice(1)];

    setWorkspace(prev => prev ? { ...prev, roadmaps: updatedRoadmaps } : null);
    
    setCheckedTasks(prev => {
      const checking = !prev[key];
      const nextChecked = { ...prev, [key]: checking };
      
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

    await persistRoadmaps(updatedRoadmaps);
  }

  async function handleCompleteActiveMilestone() {
    if (!workspace || !activeRoadmap || currentMilestoneIdx === -1) return;
    
    const updatedMilestones = allMilestones.map((m, idx) => {
      if (idx === currentMilestoneIdx) {
        return {
          ...m,
          status: "completed" as const,
          completed_tasks: [...(m.project_tasks ?? [])],
          completed_deliverables: [...(m.deliverables ?? [])]
        };
      }
      if (!m.status) {
        const status = getMilestoneColumn(m, idx);
        return { ...m, status: status === "active" ? ("inprogress" as const) : (status as "completed" | "upcoming") };
      }
      return m;
    });

    const nextCompletedCount = updatedMilestones.filter(m => m.status === "completed").length;
    const nextProgress = Math.min(100, Math.round((nextCompletedCount / allMilestones.length) * 100));
    
    const updatedRoadmap = {
      ...activeRoadmap,
      progress: nextProgress,
      milestones: updatedMilestones
    };
    
    const updatedRoadmaps = [updatedRoadmap, ...safeWorkspaceRoadmaps.slice(1)];
    
    setCheckedTasks(prev => {
      const nextChecked = { ...prev };
      const m = allMilestones[currentMilestoneIdx];
      if (m) {
        (m.project_tasks ?? []).forEach((_, i) => {
          nextChecked[`${m.title}::t::${i}`] = true;
        });
        (m.deliverables ?? []).forEach((_, i) => {
          nextChecked[`${m.title}::d::${i}`] = true;
        });
      }
      if (profile?.id) {
        try {
          localStorage.setItem(`careeros::roadmap_checked_tasks::${profile.id}`, JSON.stringify(nextChecked));
        } catch {}
      }
      return nextChecked;
    });

    await persistRoadmaps(updatedRoadmaps);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 4000);
    showToast(`Sprint milestone completed! Active track progress is now ${nextProgress}%.`);
  }

  function triggerActualDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  const handlePdfDownloadClick = () => {
    if (pdfResultBlob && pdfFilename) {
      triggerActualDownload(pdfResultBlob, pdfFilename);
      showToast("PDF downloaded successfully.");
    }
  };

  async function handlePdfDownload() {
    if (!safeWorkspaceRoadmaps.length || pdfModalOpen) return;
    
    const bundle = buildRoadmapExportBundle(safeWorkspaceRoadmaps, `${profile?.goal ?? "CareerOS"} Roadmap`);
    bundle.pdf.report.careerGoal = profile?.goal;
    bundle.pdf.report.readinessScore = profile?.readiness_score;

    setPdfFilename(bundle.pdf.filename);
    setPdfModalOpen(true);
    setPdfProgress(0);
    setPdfProgressText("Analyzing roadmap...");
    setPdfProgressPage("");
    setPdfResultBlob(null);
    setPdfGenerationPhase("generating");

    try {
      const blob = await generateRoadmapPdfBlob(bundle.pdf.report, (percent, phase, pageText) => {
        setPdfProgress(percent);
        setPdfProgressText(phase);
        if (pageText) {
          setPdfProgressPage(pageText);
        }
      });
      
      setPdfResultBlob(blob);
      setPdfGenerationPhase("ready");
      setPdfProgress(100);
      setPdfProgressText("PDF generated successfully");

      // Auto download after exactly 1 second
      setTimeout(() => {
        triggerActualDownload(blob, bundle.pdf.filename);
        showToast("PDF downloaded successfully.");
      }, 1000);

    } catch (error) {
      console.error("PDF generation failure:", error);
      setPdfGenerationPhase("error");
      const errMsg = error instanceof Error ? error.message : "PDF export failed.";
      setPdfProgressText(errMsg);
      showToast("PDF export failed.");
    }
  }
  function handleCompleteNextAction() {
    if (!currentMilestone || nextActionIdx === -1) return;
    const typeKey = isNextActionDeliverable ? "d" : "t";
    const key = `${currentMilestone.title}::${typeKey}::${nextActionIdx}`;
    toggleTaskState(key);
    showToast("Completed next action!");
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {showCelebration && <Confetti />}
      <span className="sr-only" aria-hidden="true">{freeGenerationsUsed}</span>

      {/* ── TOAST MESSENGER — CSS only ─────────────────────────────────────── */}
      <div
        className={`toast-base fixed bottom-24 right-6 z-50 xl:bottom-6 rounded-xl border border-cyan-400/25 bg-[#0a0a0c] px-4 py-3 text-xs font-semibold text-cyan-200 shadow-[0_4px_16px_rgba(0,0,0,0.8)] ${toastMessage ? "toast-enter" : "toast-exit"}`}
        aria-live="polite"
      >
        {toastMessage}
      </div>

      {limitExhausted && !hasConnectedProvider && (
        <CardSurface variant="glass" className="mb-6 border-amber-500/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-200">Free generations exhausted</p>
                <p className="mt-0.5 text-xs text-amber-200/70">Configure your custom AI Provider key in Settings to resume limitless regenerations.</p>
              </div>
            </div>
            <Link 
              href="/settings#ai-providers" 
              style={buttonStyle("primary")}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-black justify-center"
            >
              Configure Provider
            </Link>
          </div>
        </CardSurface>
      )}

      {/* ══ SECTION 1: ROADMAP HERO ══════════════════════ */}
      <PageHero
        badge={activeRoadmap ? `Navigation Engine • ${activeRoadmap.career_domain} • v${activeRoadmap.roadmap_version}` : "Navigation Engine"}
        title="Your Career Roadmap"
        subtitle={`Target Career Goal: ${profile?.goal || "SDE I"} • ${activeRoadmap?.summary || "Create your career track roadmap to initiate execution guides."}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {activeRoadmap && (
              <button 
                onClick={() => setIsVersionDrawerOpen(true)}
                style={buttonStyle("ghost")}
                className="flex items-center gap-1 text-[10px] px-3.5 py-2 rounded-xl"
              >
                <Clock3 className="h-3 w-3" />
                History
              </button>
            )}
            <Link
              href="/mentor"
              style={buttonStyle("ghost")}
              className="px-4 py-2 rounded-xl text-xs flex items-center gap-1.5"
            >
              <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
              Open Mentor
            </Link>
            <FeatureGateButton
              type="button"
              onClick={handleReplan}
              disabled={refreshDisabled}
              status="beta"
              featureName="AI Roadmap Generation"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs text-black font-bold disabled:opacity-40"
              style={buttonStyle("primary")}
            >
              {isReplanning ? <span className="loading-spinner h-3 w-3 border-black" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {isReplanning ? "Syncing..." : "Refresh track"}
            </FeatureGateButton>
          </div>
        }
      />

      {/* Primary CTA Next Action Area */}
      {activeRoadmap && nextActionLabel && (
        <CardSurface variant="glass" className="mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-cyan-400/10 border border-cyan-400/25 flex items-center justify-center shrink-0 mt-0.5">
                <Target className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Primary Next Action</span>
                <p className="text-xs sm:text-sm font-semibold text-white truncate max-w-xl">
                  {nextActionLabel}
                </p>
              </div>
            </div>
            {nextActionLabel !== "All Milestones Completed!" && (
              <button
                onClick={handleCompleteNextAction}
                style={buttonStyle("primary")}
                className="font-bold text-xs px-4 py-2 rounded-xl transition inline-flex items-center gap-1.5 shrink-0 self-end sm:self-center text-black"
              >
                <Check className="h-3.5 w-3.5 stroke-[3]" />
                Done
              </button>
            )}
          </div>
        </CardSurface>
      )}

      {/* ══ EMPTY STATE CONTAINER ════════════════════════════════════════════ */}
      {!activeRoadmap && (
        <CardSurface variant="surface" className="flex flex-col items-center gap-4 py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#202028] bg-[#0d0d10]">
            <BookOpen className="h-8 w-8 text-slate-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-300">No active roadmap track</h3>
            <p className="mt-1.5 text-xs text-slate-500 max-w-sm leading-relaxed">
              Initialize your execution parameters. Generate your dynamic career roadmap workspace now.
            </p>
          </div>
          <FeatureGateButton
            type="button"
            onClick={handleReplan}
            disabled={refreshDisabled}
            status="beta"
            featureName="AI Roadmap Generation"
            style={buttonStyle("primary")}
            className="mt-2 inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-bold text-black justify-center"
          >
            {isReplanning ? <span className="loading-spinner h-4 w-4 border-black" /> : <RefreshCw className="h-4 w-4" />}
            Generate Career Roadmap
          </FeatureGateButton>
        </CardSurface>
      )}

      {activeRoadmap && (
        <>
          {/* ══ SECTION 2: CURRENT SPRINT (Spotlight Card 1) ═══════════════════ */}
          <section id="current-sprint-section" className="scroll-mt-6">
            <CardSurface variant="glass" dust="tr">
              
              <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="h-4 w-4 text-cyan-400" />
                    <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Current Sprint</p>
                    <span className="rounded-full border border-cyan-400/10 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-cyan-300">
                      Execution Focus
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold text-white leading-snug">
                    {currentMilestone?.title || "No Sprint Active"}
                  </h3>
                  <p className="mt-2 text-xs text-slate-300 max-w-2xl leading-relaxed">
                    {currentMilestone?.why_it_matters || "Studies and deliverables of your active milestone."}
                  </p>

                  <div className="mt-5 space-y-2 max-w-xl">
                    {currentMilestoneTasks.map((task, i) => {
                      const key = `${currentMilestone?.title}::t::${i}`;
                      const isDone = checkedTasks[key] ?? false;
                      return (
                        <button
                          key={key}
                          onClick={() => toggleTaskState(key)}
                          className={`w-full flex items-start gap-3 rounded-xl border p-3 text-left text-xs transition ${
                            isDone
                              ? "border-cyan-500/10 bg-cyan-950/5 text-slate-500"
                              : "border-white/[0.05] bg-white/[0.03] text-slate-300 hover:bg-white/[0.06] hover:border-white/[0.1]"
                          }`}
                        >
                          <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                            isDone ? "border-cyan-400 bg-cyan-400 text-black" : "border-slate-700"
                          }`}>
                            {isDone && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                          </span>
                          <span className={isDone ? "line-through opacity-60 font-medium" : "font-medium"}>
                            {task}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="shrink-0 flex flex-col justify-between items-end gap-3 self-stretch min-w-[170px] bg-white/[0.02] border border-white/[0.06] backdrop-blur-md p-4 rounded-2xl">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Estimated Duration</span>
                    <span className="text-sm font-bold text-white mt-1 block">{currentMilestone?.estimated_duration_weeks || 1} weeks</span>
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

                  {sprintProgress === 100 && (
                    <button
                      onClick={() => void handleCompleteActiveMilestone()}
                      style={buttonStyle("primary")}
                      className="font-bold text-xs w-full py-2 rounded-xl transition flex items-center justify-center gap-1.5 mt-2 text-black"
                    >
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                      Complete Sprint
                    </button>
                  )}
                </div>
              </div>
            </CardSurface>
          </section>

          {/* ══ SECTION 3: ROADMAP JOURNEY TIMELINE (Linear-style Planning Studio) ════ */}
          <section className="space-y-4">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-semibold">Workspace Journey</span>
              <h3 className="text-base font-bold text-white mt-1">Planning Studio</h3>
            </div>

            <CardSurface variant="surface" className="sm:p-6">
              {/* Table Header Row */}
              <div className="hidden md:grid md:grid-cols-[3fr_1.2fr_1.2fr_1.2fr_1fr] gap-4 px-4 py-2.5 text-[9px] text-slate-500 font-bold uppercase tracking-wider border-b border-white/5 mb-2">
                <span>Milestone Track Title</span>
                <span>Status</span>
                <span>Difficulty</span>
                <span>Effort Target</span>
                <span>Items Cleared</span>
              </div>

              {/* Milestones Rows */}
              <div className="space-y-2">
                {allMilestones.map((m, idx) => {
                  const status = getMilestoneStatus(idx, completedCount, allMilestones.length);
                  const isCurrentActiveSprint = currentMilestone?.title === m.title;
                  
                  const msTasks = m.project_tasks ?? [];
                  const msDels = m.deliverables ?? [];
                  const msTotal = msTasks.length + msDels.length;
                  const msCompleted =
                    msTasks.filter((_, i) => checkedTasks[`${m.title}::t::${i}`]).length +
                    msDels.filter((_, i) => checkedTasks[`${m.title}::d::${i}`]).length;

                  const isExpanded = !!expandedMilestones[m.title];
                  const isEditing = isEditingMilestone && activeMilestone?.title === m.title;

                  return (
                    <div
                      key={m.title}
                      className="border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] rounded-lg transition overflow-hidden"
                    >
                      {/* Row Header Grid */}
                      <div
                        onClick={() => {
                          setExpandedMilestones(prev => ({ ...prev, [m.title]: !prev[m.title] }));
                          setSelectedMilestoneTitle(m.title);
                          setIsEditingMilestone(false);
                        }}
                        className="grid grid-cols-1 md:grid-cols-[3fr_1.2fr_1.2fr_1.2fr_1fr] gap-3 md:gap-4 items-center px-4 py-3 cursor-pointer text-xs select-none"
                      >
                        {/* Title & Chevron */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-slate-500">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </span>
                          <span className={`font-semibold truncate text-white leading-none ${status === "completed" ? "opacity-60" : ""}`}>
                            {m.title}
                          </span>
                        </div>

                        {/* Status tag */}
                        <div className="flex items-center">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            status === "completed"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                              : isCurrentActiveSprint
                              ? "bg-cyan-500/10 text-cyan-300 border border-cyan-400/25 animate-pulse"
                              : "bg-white/5 text-slate-400 border border-white/5"
                          }`}>
                            {status === "completed" ? "Completed" : isCurrentActiveSprint ? "Active Sprint" : "Backlog"}
                          </span>
                        </div>

                        {/* Difficulty */}
                        <div className="text-slate-400">
                          <span className="text-[10px] bg-white/[0.02] border border-white/5 rounded px-2 py-0.5 font-bold uppercase">
                            {m.difficulty_level || "Intermediate"}
                          </span>
                        </div>

                        {/* Duration / Effort */}
                        <div className="text-slate-400 font-medium font-mono text-[11px]">
                          {m.estimated_duration_weeks || 1} {m.estimated_duration_weeks === 1 ? "week" : "weeks"}
                        </div>

                        {/* Ratio stats */}
                        <div className="text-slate-400 font-semibold text-[10px]">
                          {msCompleted} / {msTotal} cleared
                        </div>
                      </div>

                      {/* Expanded Accordion Area */}
                      {isExpanded && (
                        <div className="border-t border-white/5 px-4 py-4 space-y-4 bg-white/[0.005]">
                          {isEditing ? (
                            /* Inline Row Editor Form */
                            <div className="space-y-4 text-xs">
                              <h4 className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">Edit Milestone Specifications</h4>
                              <label className="block">
                                <span className="text-slate-500 font-semibold block mb-1">Why it matters</span>
                                <DesignTextarea
                                  value={editWhyItMatters}
                                  onChange={(e) => setEditWhyItMatters(e.target.value)}
                                  className="w-full rounded-lg px-3 py-2 h-16 resize-none"
                                />
                              </label>
                              <div className="grid gap-4 md:grid-cols-2">
                                <label className="block">
                                  <span className="text-slate-500 font-semibold block mb-1">Milestone Tasks (one per line)</span>
                                  <DesignTextarea
                                    value={editTasksText}
                                    onChange={(e) => setEditTasksText(e.target.value)}
                                    className="w-full rounded-lg px-3 py-2 h-24 font-mono text-[10.5px] leading-relaxed"
                                  />
                                </label>
                                <label className="block">
                                  <span className="text-slate-500 font-semibold block mb-1">Deliverables (one per line)</span>
                                  <DesignTextarea
                                    value={editDeliverablesText}
                                    onChange={(e) => setEditDeliverablesText(e.target.value)}
                                    className="w-full rounded-lg px-3 py-2 h-24 font-mono text-[10.5px] leading-relaxed"
                                  />
                                </label>
                              </div>
                              <label className="block">
                                <span className="text-slate-500 font-semibold block mb-1">Study/Concept Notes</span>
                                <DesignTextarea
                                  value={editNotesText}
                                  onChange={(e) => setEditNotesText(e.target.value)}
                                  className="w-full rounded-lg px-3 py-2 h-16"
                                  placeholder="Add concepts, definitions, or study notes..."
                                />
                              </label>

                              <div className="flex gap-2 justify-end pt-2 border-t border-white/5">
                                <button
                                  type="button"
                                  onClick={() => setIsEditingMilestone(false)}
                                  style={buttonStyle("ghost")}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={saveMilestoneDetails}
                                  style={buttonStyle("primary")}
                                  className="px-4 py-1.5 text-xs font-semibold rounded-lg text-black"
                                >
                                  Save Specifications
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Structured Read-only Info */
                            <div className="space-y-4">
                              <div className="flex justify-between items-start border-b border-white/5 pb-2">
                                <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                                  {m.why_it_matters || "No description set for this milestone."}
                                </p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedMilestoneTitle(m.title);
                                    setEditWhyItMatters(m.why_it_matters || "");
                                    setEditTasksText((m.project_tasks || []).join("\n"));
                                    setEditDeliverablesText((m.deliverables || []).join("\n"));
                                    setEditNotesText(m.notes || "");
                                    setIsEditingMilestone(true);
                                  }}
                                  className="text-[10px] font-bold text-cyan-400 hover:text-white uppercase tracking-wider shrink-0"
                                >
                                  Edit specifications
                                </button>
                              </div>

                              {/* Nested Tasks / Deliverables side-by-side layout */}
                              <div className="grid gap-6 md:grid-cols-2 text-xs">
                                {/* Tasks checklist */}
                                <div className="space-y-2">
                                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Milestone Tasks</span>
                                  <div className="space-y-1.5">
                                    {msTasks.map((t, tIdx) => {
                                      const key = `${m.title}::t::${tIdx}`;
                                      const isDone = checkedTasks[key] ?? false;
                                      return (
                                        <button
                                          key={key}
                                          onClick={(e) => { e.stopPropagation(); void toggleTaskState(key); }}
                                          className={`w-full flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition ${isDone
                                            ? "border-cyan-500/5 bg-cyan-950/5 text-slate-500"
                                            : "border-white/5 bg-white/[0.01] text-slate-300 hover:bg-white/[0.02]"
                                          }`}
                                        >
                                          <span className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition ${isDone ? "border-cyan-400 bg-cyan-400 text-black" : "border-slate-700"}`}>
                                            {isDone && <Check className="h-2 w-2 stroke-[3]" />}
                                          </span>
                                          <span className={isDone ? "line-through opacity-60" : ""}>{t}</span>
                                        </button>
                                      );
                                    })}
                                    {msTasks.length === 0 && (
                                      <p className="text-[10px] text-slate-600">No tasks defined.</p>
                                    )}
                                  </div>
                                </div>

                                {/* Deliverables checklist */}
                                <div className="space-y-2">
                                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Milestone Deliverables</span>
                                  <div className="space-y-1.5">
                                    {msDels.map((d, dIdx) => {
                                      const key = `${m.title}::d::${dIdx}`;
                                      const isDone = checkedTasks[key] ?? false;
                                      return (
                                        <button
                                          key={key}
                                          onClick={(e) => { e.stopPropagation(); void toggleTaskState(key); }}
                                          className={`w-full flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition ${isDone
                                            ? "border-cyan-500/5 bg-cyan-950/5 text-slate-500"
                                            : "border-white/5 bg-white/[0.01] text-slate-300 hover:bg-white/[0.02]"
                                          }`}
                                        >
                                          <span className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition ${isDone ? "border-cyan-400 bg-cyan-400 text-black" : "border-slate-700"}`}>
                                            {isDone && <Check className="h-2 w-2 stroke-[3]" />}
                                          </span>
                                          <span className={isDone ? "line-through opacity-60" : ""}>{d}</span>
                                        </button>
                                      );
                                    })}
                                    {msDels.length === 0 && (
                                      <p className="text-[10px] text-slate-600">No deliverables defined.</p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Resources nested inline */}
                              {m.resource_links?.length > 0 && (
                                <div className="space-y-2 border-t border-white/5 pt-3">
                                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Recommended Learning Materials</span>
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    {m.resource_links.map((res, rIdx) => (
                                      <a
                                        key={rIdx}
                                        href={res.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-between border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] p-2.5 rounded-lg text-xs transition group"
                                      >
                                        <div className="truncate min-w-0">
                                          <p className="font-semibold text-slate-300 group-hover:text-cyan-300 truncate">{res.label}</p>
                                          <span className="text-[10px] text-slate-500 block">{res.provider}</span>
                                        </div>
                                        <ExternalLink className="h-3.5 w-3.5 text-slate-500 group-hover:text-cyan-400 shrink-0" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Concept notes */}
                              {m.notes && (
                                <div className="p-3 bg-white/[0.01] border border-white/5 rounded-lg text-xs">
                                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Concept Notes</span>
                                  <p className="text-slate-300 leading-relaxed font-medium">{m.notes}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardSurface>
          </section>

          {/* ══ SECTION 4: RESOURCE HUB (Bookmark / Completed Status Tracking) ══ */}
          <section>
            <div className="mb-4">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-semibold">Learning References</span>
              <h3 className="text-base font-bold text-white mt-1">Resource Hub</h3>
            </div>

            <CardSurface variant="surface">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <DesignInput
                    value={resourceSearch}
                    onChange={e => setResourceSearch(e.target.value)}
                    placeholder="Search resources..."
                    className="w-full pl-9"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(["all", "course", "documentation", "practice", "project", "interview"] as ResourceFilter[]).map(f => (
                    <button
                      key={f}
                      onClick={() => setResourceFilter(f)}
                      style={resourceFilter === f ? buttonStyle("secondary") : buttonStyle("ghost")}
                      className="rounded-full px-3.5 py-1.5 text-[10px] uppercase tracking-wider"
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {filteredResources.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredResources.map((res, idx) => {
                    const stats = getResourceStats(res);
                    const isBookmarked = bookmarkedResources[res.url] ?? false;
                    const isCompleted = completedResources[res.url] ?? false;

                    return (
                      <CardSurface
                        key={`${res.url}-${idx}`}
                        variant="glass"
                        hover
                        noPadding
                        className="p-4 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                              {res.provider}
                            </span>
                            <div className="flex gap-1 items-center">
                              {isCompleted && (
                                <span className="rounded bg-emerald-500/15 text-emerald-400 text-[8px] px-1.5 py-0.5 border border-emerald-500/25 font-bold uppercase">
                                  Completed
                                </span>
                              )}
                              {isBookmarked && (
                                <span className="rounded bg-cyan-500/15 text-cyan-400 text-[8px] px-1.5 py-0.5 border border-cyan-500/25 font-bold uppercase">
                                  Bookmarked
                                </span>
                              )}
                              <span className="rounded bg-[#0d0d10] text-slate-400 border border-[#202028] text-[9px] px-1.5 py-0.5 font-bold uppercase">
                                {stats.type}
                              </span>
                            </div>
                          </div>

                          <h4 className="text-xs sm:text-sm font-semibold text-white group-hover:text-cyan-300 transition duration-200 line-clamp-2 leading-snug">
                            {res.label}
                          </h4>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[#141417] flex items-center justify-between gap-2">
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => toggleBookmark(res.url)}
                              className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase border transition ${
                                isBookmarked 
                                  ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
                                  : "border-white/[0.05] bg-white/[0.02] text-slate-400 hover:text-slate-300"
                              }`}
                            >
                              Bookmark
                            </button>
                            <button
                              onClick={() => toggleCompleted(res.url)}
                              className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase border transition ${
                                isCompleted
                                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                                  : "border-white/[0.05] bg-white/[0.02] text-slate-400 hover:text-slate-300"
                              }`}
                            >
                              Completed
                            </button>
                          </div>
                          
                          <a
                            href={res.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] font-bold text-cyan-400 group-hover:underline inline-flex items-center gap-1 shrink-0"
                          >
                            Open Resource
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </CardSurface>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <BookOpen className="h-9 w-9 text-slate-700 mb-2" />
                  <p className="text-xs text-slate-500">
                    {resourceSearch ? `No resource matches "${resourceSearch}"` : "No resources in this segment."}
                  </p>
                </div>
              )}
            </CardSurface>
          </section>

          {/* ══ SECTION 5: DYNAMIC INSIGHTS (Strengths, Blockers, Recommended) ══ */}
          <section className="grid gap-5 md:grid-cols-3">
            {/* Strengths */}
            <CardSurface variant="surface" className="p-5">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mb-2">Strengths</span>
              {profile?.skills && profile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {profile.skills.slice(0, 4).map(s => (
                    <span key={s} className="rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-200 text-[10px] px-1.5 py-0.5">{s}</span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-500">Complete profile to map strengths.</span>
              )}
            </CardSurface>

            {/* Skill Gaps / Obstacles */}
            <CardSurface variant="surface" className="p-5">
              <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block mb-2">Active Blockers</span>
              {profile?.weaknesses && profile.weaknesses.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {profile.weaknesses.slice(0, 3).map(w => (
                    <span key={w} className="rounded border border-rose-500/20 bg-rose-500/10 text-rose-200 text-[10px] px-1.5 py-0.5">{w}</span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-500">No skill gaps calculated yet.</span>
              )}
            </CardSurface>

            {/* Recommended Focus */}
            <CardSurface variant="surface" className="p-5">
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block mb-2">Recommended Focus</span>
              {currentMilestone ? (
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  Focus on completing tasks inside <strong className="text-white">{currentMilestone.title}</strong> to keep up consistency.
                </p>
              ) : (
                <span className="text-xs text-slate-500">All milestones completed.</span>
              )}
            </CardSurface>
          </section>
        </>
      )}

      {/* ══ SECTION 8: EXPORT CENTER ═════════════════════════════════════════ */}
      {activeRoadmap && (
        <section className="pt-2">
          <CardSurface variant="surface" noPadding className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-slate-400" />
              <p className="text-xs text-slate-400 font-semibold">
                Export Options &amp; Portability Snapshot
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkdownExport}
                style={buttonStyle("ghost")}
                className="px-3.5 py-2 rounded-xl text-xs transition inline-flex items-center gap-1.5 font-bold text-slate-300 hover:text-white"
              >
                <FileText className="h-3.5 w-3.5 text-cyan-400" />
                Markdown
              </button>
              <button
                onClick={handleJsonExport}
                style={buttonStyle("ghost")}
                className="px-3.5 py-2 rounded-xl text-xs transition inline-flex items-center gap-1.5 font-bold text-slate-300 hover:text-white"
              >
                <Download className="h-3.5 w-3.5 text-cyan-400" />
                JSON
              </button>
              <button
                onClick={() => void handlePdfDownload()}
                style={buttonStyle("ghost")}
                className="px-3.5 py-2 rounded-xl text-xs transition inline-flex items-center gap-1.5 font-bold text-slate-300 hover:text-white"
              >
                <Printer className="h-3.5 w-3.5 text-cyan-400" />
                PDF
              </button>
            </div>
          </CardSurface>
        </section>
      )}

      {/* ══ VERSION HISTORY DRAWER — CSS transition 220ms ═════════════════════════ */}
      {isVersionDrawerOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => {
              setIsVersionDrawerOpen(false);
              setCompareVersionId(null);
            }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />
          {/* Drawer */}
          <div
            className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#09090b]/90 border-l border-white/10 p-6 shadow-2xl flex flex-col justify-between backdrop-blur-xl"
            style={{ transform: "translateX(0)", transition: "transform 220ms ease" }}
          >
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex items-center justify-between border-b border-[#202028] pb-4 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Version History</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Explore or compare past career tracks</p>
                  </div>
                  <button
                    onClick={() => {
                      setIsVersionDrawerOpen(false);
                      setCompareVersionId(null);
                    }}
                    className="h-8 w-8 rounded-full border border-[#202028] hover:border-cyan-400/25 flex items-center justify-center transition text-slate-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {safeRoadmapHistory.length > 0 ? (
                  <div className="space-y-3.5 overflow-y-auto flex-1 pr-1.5 pb-4">
                    {safeRoadmapHistory.map((version, idx) => {
                      const isLatest = idx === 0;
                      const isComparing = compareVersionId === version.id;
                      const versionRoadmaps = Array.isArray(version.roadmaps) ? normalizeRoadmapArray(version.roadmaps) : [];
                      const versionRoadmap = versionRoadmaps[0] ?? null;

                      return (
                        <div
                          key={version.id}
                          className={`rounded-xl border p-4 transition ${
                            isLatest ? "border-cyan-400/25 bg-cyan-950/5" : "border-[#141418] bg-[#07070a]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                <span className={`text-[10px] font-bold ${isLatest ? "text-cyan-300" : "text-slate-400"}`}>
                                  v{version.roadmap_version}
                                </span>
                                {isLatest && (
                                  <span className="rounded bg-cyan-500/10 text-cyan-400 text-[8px] px-1 py-0.2 border border-cyan-500/20 font-bold uppercase">
                                    Current
                                  </span>
                                )}
                                <span className="text-[9px] text-slate-500">{formatDate(version.generated_at)}</span>
                              </div>
                              <h4 className="text-xs font-semibold text-white truncate">{version.career_goal}</h4>
                            </div>

                            <div className="flex gap-1 shrink-0">
                              {!isLatest && (
                                <button
                                  onClick={() => setRestoreConfirmId(version.id)}
                                  className="px-2.5 py-1 rounded bg-[#0d0d10] border border-[#202028] hover:border-cyan-400/30 text-[9px] font-bold uppercase text-slate-300 hover:text-white transition"
                                >
                                  Restore
                                </button>
                              )}
                              <button
                                onClick={() => setCompareVersionId(isComparing ? null : version.id)}
                                className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase transition ${
                                  isComparing
                                    ? "bg-cyan-400 text-black"
                                    : "bg-[#0d0d10] border border-[#202028] hover:border-cyan-400/30 text-slate-300 hover:text-white"
                                }`}
                              >
                                {isComparing ? "Close" : "Compare"}
                              </button>
                            </div>
                          </div>

                          <p className="mt-2 text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                            {version.ai_reasoning || "No system logs attached."}
                          </p>

                          {/* CSS max-height accordion — replaces Framer height animation */}
                          <div
                            style={{
                              maxHeight: isComparing && versionRoadmap ? "200px" : "0",
                              overflow: "hidden",
                              transition: "max-height 220ms ease"
                            }}
                          >
                            {versionRoadmap && (
                              <div className="mt-3 pt-3 border-t border-[#1e1e24] text-[11px] text-slate-400 space-y-2.5">
                                <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider block">Comparison Matrix</span>
                                <div className="grid grid-cols-2 gap-2 bg-[#09090b] border border-[#1c1c22] p-2.5 rounded-lg">
                                  <div>
                                    <span className="text-[9px] text-slate-500 block">Current Workspace (v{activeRoadmap?.roadmap_version})</span>
                                    <span className="text-white font-bold block truncate mt-0.5">{activeRoadmap?.title}</span>
                                    <span className="text-[9px] text-slate-400 block mt-1">{allMilestones.length} Milestones</span>
                                    <span className="text-[9px] text-slate-400 block">{activeRoadmap?.total_duration_weeks ?? 0} Weeks</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-slate-500 block">Snapshot (v{version.roadmap_version})</span>
                                    <span className="text-cyan-300 font-bold block truncate mt-0.5">{versionRoadmap.title}</span>
                                    <span className="text-[9px] text-slate-400 block mt-1">{(versionRoadmap.milestones || []).length} Milestones</span>
                                    <span className="text-[9px] text-slate-400 block">{versionRoadmap.total_duration_weeks ?? 0} Weeks</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Clock3 className="h-8 w-8 text-slate-600 mb-2" />
                    <p className="text-xs text-slate-500">No versions tracked yet.</p>
                  </div>
                )}
              </div>

              <div className="border-t border-[#202028] pt-4 flex gap-2">
                <button
                  onClick={() => {
                    setIsVersionDrawerOpen(false);
                    setCompareVersionId(null);
                  }}
                  style={buttonStyle("ghost")}
                  className="w-full py-2.5 text-xs font-semibold"
                >
                  Close History
                </button>
              </div>
          </div>
        </>
      )}

      {/* ══ RESTORE CONFIRMATION MODAL — plain CSS ══════════════════════════════ */}
      {restoreConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <div className="liquid-panel relative z-10 w-full max-w-sm rounded-[24px] p-6 text-center border border-amber-500/25 bg-[#09090b]">
            <AlertTriangle className="mx-auto h-8 w-8 text-amber-400 mb-4" />
            <h3 className="text-base font-bold text-white">Restore selected version?</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Your current roadmap workspace will be overwritten with the snapshot. Your active checkpoints will update.
            </p>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setRestoreConfirmId(null)}
                style={buttonStyle("ghost")}
                className="flex-1 rounded-xl py-2.5 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const version = safeRoadmapHistory.find(v => v.id === restoreConfirmId);
                  if (version) void restoreRoadmapVersion(version);
                }}
                style={buttonStyle("primary")}
                className="flex-1 rounded-xl py-2.5 text-xs font-semibold text-black"
              >
                Confirm Restore
              </button>
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

      {/* ══ PDF PROGRESS DOWNLOAD MODAL ════════════════════════════════════════ */}
      {pdfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm select-none animate-fadeIn">
          <div className="liquid-panel w-full max-w-md rounded-[24px] p-6 text-center bg-[#09090b]/90 border border-cyan-500/20 relative shadow-[0_30px_100px_rgba(0,0,0,0.5)]">
            
            {/* Close button for error or ready state */}
            {pdfGenerationPhase !== "generating" && (
              <button
                type="button"
                onClick={() => setPdfModalOpen(false)}
                className="absolute top-5 right-5 rounded-full p-2 text-slate-500 hover:text-white hover:bg-white/5 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <div className="flex flex-col items-center gap-5 py-4">
              {/* Logo container */}
              <div className="relative flex items-center justify-center mb-1">
                <div className="absolute h-16 w-16 bg-cyan-400/10 rounded-full animate-pulse" />
                <div className="h-12 w-12 rounded-2xl bg-cyan-950/40 border border-cyan-400/30 flex items-center justify-center relative z-10">
                  <Image src="/logo.png" alt="CareerOS" width={28} height={28} className="object-contain animate-spin-slow" />
                </div>
              </div>

              {pdfGenerationPhase === "generating" ? (
                <>
                  <h3 className="text-sm font-bold text-white tracking-wider uppercase text-cyan-400">Generating Career Execution Plan</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Please wait while CareerOS prepares your personalized report.</p>
                  
                  {/* Progress Ring or Bar */}
                  <div className="w-full bg-[#141b26] rounded-full h-1.5 overflow-hidden mt-3">
                    <div 
                      className="bg-gradient-to-r from-cyan-500 to-cyan-300 h-1.5 rounded-full transition-all duration-300 ease-out" 
                      style={{ width: `${pdfProgress}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between w-full text-xs text-slate-400 font-semibold px-1 mt-1">
                    <span>{pdfProgressText}</span>
                    <span className="text-cyan-400 font-mono">{pdfProgress}%</span>
                  </div>

                  {/* Active Page Indicator */}
                  {pdfProgressPage && (
                    <div className="text-[10px] font-mono font-semibold tracking-wider text-slate-500 bg-white/[0.02] px-2.5 py-1 rounded-md border border-white/5">
                      {pdfProgressPage}
                    </div>
                  )}

                  {/* Step status checklist */}
                  <div className="w-full text-left space-y-2 mt-4 bg-white/[0.01] border border-white/5 p-4 rounded-xl text-xs text-slate-400 font-normal">
                    <div className="flex items-center gap-2">
                      <div className={`h-4 w-4 rounded-full border flex items-center justify-center text-[10px] shrink-0 font-bold
                        ${pdfProgress >= 15 ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "border-slate-800 text-slate-600"}`}>
                        {pdfProgress >= 15 ? "✓" : "1"}
                      </div>
                      <span className={pdfProgress >= 5 && pdfProgress < 15 ? "text-cyan-300 font-semibold" : pdfProgress >= 15 ? "text-slate-300 line-through opacity-60" : ""}>
                        Collecting roadmap data
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`h-4 w-4 rounded-full border flex items-center justify-center text-[10px] shrink-0 font-bold
                        ${pdfProgress >= 40 ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "border-slate-800 text-slate-600"}`}>
                        {pdfProgress >= 40 ? "✓" : "2"}
                      </div>
                      <span className={pdfProgress >= 15 && pdfProgress < 40 ? "text-cyan-300 font-semibold" : pdfProgress >= 40 ? "text-slate-300 line-through opacity-60" : ""}>
                        Building report pages
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`h-4 w-4 rounded-full border flex items-center justify-center text-[10px] shrink-0 font-bold
                        ${pdfProgress >= 85 ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "border-slate-800 text-slate-600"}`}>
                        {pdfProgress >= 85 ? "✓" : "3"}
                      </div>
                      <span className={pdfProgress >= 40 && pdfProgress < 85 ? "text-cyan-300 font-semibold" : pdfProgress >= 85 ? "text-slate-300 line-through opacity-60" : ""}>
                        Optimizing layout
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`h-4 w-4 rounded-full border flex items-center justify-center text-[10px] shrink-0 font-bold
                        ${pdfProgress >= 98 ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "border-slate-800 text-slate-600"}`}>
                        {pdfProgress >= 98 ? "✓" : "4"}
                      </div>
                      <span className={pdfProgress >= 85 && pdfProgress < 98 ? "text-cyan-300 font-semibold" : pdfProgress >= 98 ? "text-slate-300 line-through opacity-60" : ""}>
                        Preparing download
                      </span>
                    </div>
                  </div>
                </>
              ) : pdfGenerationPhase === "ready" ? (
                <>
                  <h3 className="text-sm font-bold text-white tracking-wider uppercase">Download Ready</h3>
                  <div className="relative flex items-center justify-center">
                    <div className="absolute h-12 w-12 bg-emerald-500/10 rounded-full animate-ping" />
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 relative z-10">
                      <Check className="h-6 w-6 stroke-[3]" />
                    </div>
                  </div>
                  
                  <div className="text-xs text-slate-300 leading-relaxed max-w-xs">
                    <p className="font-semibold text-white">PDF generated successfully!</p>
                    <p className="mt-1 text-slate-400">File download will start automatically in a second.</p>
                    <p className="mt-2 text-[10px] font-mono text-cyan-400 bg-cyan-950/20 border border-cyan-500/10 px-2.5 py-1 rounded-lg truncate select-all">
                      {pdfFilename}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handlePdfDownloadClick}
                    style={buttonStyle("primary")}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-black mt-2 inline-flex items-center justify-center gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download PDF
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-bold text-red-400 tracking-wider uppercase">Generation Failed</h3>
                  <div className="h-10 w-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  
                  <div className="text-xs text-slate-400 leading-relaxed max-w-xs">
                    {pdfProgressText.includes("LAYOUT FAILURE") ? (
                      <div className="bg-red-950/20 border border-red-500/15 p-3 rounded-lg text-left font-mono text-[10px] text-red-300 overflow-x-auto max-h-[160px]">
                        <p className="font-bold uppercase text-[11px] mb-1">Layout Validation Error:</p>
                        {pdfProgressText}
                      </div>
                    ) : (
                      <p>An error occurred while compiling your career report. Spacing issues are skipped, so this indicates a critical asset or memory constraint.</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => void handlePdfDownload()}
                    style={buttonStyle("primary")}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-black mt-2"
                  >
                    Retry Generation
                  </button>
                </>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
