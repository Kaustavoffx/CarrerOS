"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion"; // Kept only for Confetti celebration animation
import {
  Download, Printer, RefreshCw, Clock3,
  Check, ExternalLink, Search,
  FileText, Archive, Target, BookOpen, AlertTriangle,
  MessageSquare, X
} from "lucide-react";
import { FREE_GENERATIONS } from "@/lib/config";
import { FeatureGateButton } from "./feature-status";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { normalizeRoadmapArray, normalizeRoadmapVersionArray, updateWorkspace } from "@/lib/app-data";
import { buildRoadmapExportBundle, generateRoadmapPdfBlob, type AuditBlob } from "@/lib/roadmap-export";
import type {
  AiProviderStatusRecord, RoadmapRecord, RoadmapVersionRecord,
  UserProfileRecord, WorkspaceSnapshotRecord, RoadmapResourceLink
} from "@/lib/supabase/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type RoadmapsConsoleProps = {
  profile: UserProfileRecord | null;
  workspace: WorkspaceSnapshotRecord | null;
  roadmapHistory?: RoadmapVersionRecord[] | null;
  aiProviders?: AiProviderStatusRecord[] | null;
};

type ResourceFilter = "all" | "course" | "documentation" | "practice" | "project" | "interview";
type MilestoneTab = "tasks" | "deliverables" | "resources";
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

async function downloadPdfFile(
  filename: string,
  report: Parameters<typeof generateRoadmapPdfBlob>[0]
): Promise<{ valid: boolean; warnings: string[] }> {
  const blob = await generateRoadmapPdfBlob(report);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  const auditBlob = blob as AuditBlob;
  return { valid: auditBlob.valid !== false, warnings: auditBlob.warnings || [] };
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
  const [milestoneTab, setMilestoneTab] = useState<MilestoneTab>("tasks");
  const [resourceSearch, setResourceSearch] = useState("");
  const [resourceFilter, setResourceFilter] = useState<ResourceFilter>("all");
  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null);
  const [isVersionDrawerOpen, setIsVersionDrawerOpen] = useState(false);
  const [compareVersionId, setCompareVersionId] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  // V4 Resource Status & Milestone Edit States
  const [bookmarkedResources, setBookmarkedResources] = useState<Record<string, boolean>>({});
  const [completedResources, setCompletedResources] = useState<Record<string, boolean>>({});
  const [isEditingMilestone, setIsEditingMilestone] = useState(false);
  const [editTasksText, setEditTasksText] = useState("");
  const [editDeliverablesText, setEditDeliverablesText] = useState("");
  const [editWhyItMatters, setEditWhyItMatters] = useState("");
  const [editNotesText, setEditNotesText] = useState("");

  // ── Load and persist checked tasks via localStorage ─────────────────────
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

  useEffect(() => {
    if (profile?.id) {
      try {
        localStorage.setItem(`careeros::roadmap_checked_tasks::${profile.id}`, JSON.stringify(checkedTasks));
      } catch (e) {
        console.error("Failed saving checked tasks:", e);
      }
    }
  }, [checkedTasks, profile?.id]);

  // ── Derived variables ────────────────────────────────────────────────────
  const supabase = getSupabaseBrowserClient();
  const safeRoadmapHistory = normalizeRoadmapVersionArray(roadmapHistory);
  const safeWorkspaceRoadmaps = normalizeRoadmapArray(workspace?.roadmaps);
  const hasConnectedProvider = Array.isArray(aiProviders) && aiProviders.some(p => p.connected);
  const refreshDisabled = isReplanning || (!hasConnectedProvider && limitExhausted);

  const activeRoadmap = safeWorkspaceRoadmaps[0] ?? null;
  const allMilestones = Array.isArray(activeRoadmap?.milestones) ? activeRoadmap!.milestones : [];
  const completedCount = activeRoadmap ? Math.floor((activeRoadmap.progress / 100) * allMilestones.length) : 0;

  // Current active milestone (the first uncompleted milestone)
  const currentMilestoneIdx = allMilestones.length > 0 ? Math.min(completedCount, allMilestones.length - 1) : -1;
  const currentMilestone = currentMilestoneIdx >= 0 ? allMilestones[currentMilestoneIdx] : null;

  // Selected milestone (defaults to current active milestone)
  const activeMilestone = allMilestones.find(m => m.title === (selectedMilestoneTitle || currentMilestone?.title)) ?? currentMilestone;

  // Calculate current sprint list & progress
  const currentMilestoneTasks = currentMilestone?.project_tasks ?? [];
  const currentMilestoneDeliverables = currentMilestone?.deliverables ?? [];
  const totalSprintItems = currentMilestoneTasks.length + currentMilestoneDeliverables.length;
  
  const completedSprintItems = 
    currentMilestoneTasks.filter((_, i) => checkedTasks[`${currentMilestone?.title}::t::${i}`]).length +
    currentMilestoneDeliverables.filter((_, i) => checkedTasks[`${currentMilestone?.title}::d::${i}`]).length;
    
  const sprintProgress = totalSprintItems > 0 ? Math.round((completedSprintItems / totalSprintItems) * 100) : 0;

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
  const allResources: ResourceWithMilestone[] = Array.from(
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
  );

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

  const startEditingMilestone = () => {
    if (!activeMilestone) return;
    setEditWhyItMatters(activeMilestone.why_it_matters || "");
    setEditTasksText((activeMilestone.project_tasks || []).join("\n"));
    setEditDeliverablesText((activeMilestone.deliverables || []).join("\n"));
    setEditNotesText(activeMilestone.notes || "");
    setIsEditingMilestone(true);
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
    downloadTextFile(
      `${(profile?.goal ?? "careeros-roadmap").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-roadmap.json`,
      bundle.json, "application/json;charset=utf-8"
    );
    showToast("JSON export downloaded.");
  }

  function handleMarkdownExport() {
    if (!safeWorkspaceRoadmaps.length) return;
    const bundle = buildRoadmapExportBundle(safeWorkspaceRoadmaps, `${profile?.goal ?? "CareerOS"} Roadmap`);
    downloadTextFile(
      `${(profile?.goal ?? "careeros-roadmap").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-roadmap.md`,
      bundle.markdown, "text/markdown;charset=utf-8"
    );
    showToast("Markdown export downloaded.");
  }

  async function handlePdfDownload() {
    if (!safeWorkspaceRoadmaps.length) return;
    const bundle = buildRoadmapExportBundle(safeWorkspaceRoadmaps, `${profile?.goal ?? "CareerOS"} Roadmap`);
    bundle.pdf.report.careerGoal = profile?.goal;
    bundle.pdf.report.readinessScore = profile?.readiness_score;
    try {
      const result = await downloadPdfFile(bundle.pdf.filename, bundle.pdf.report);
      showToast(result.valid ? "PDF downloaded." : "Roadmap exported as PDF successfully.");
    } catch (error) {
      console.error("PDF download failure:", error);
      showToast("PDF export failed.");
    }
  }

  function toggleTaskState(key: string) {
    setCheckedTasks(prev => {
      const isChecking = !prev[key];
      const updated = { ...prev, [key]: isChecking };
      
      if (isChecking) {
        // Calculate new milestone completion
        if (currentMilestone) {
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
      }
      return updated;
    });
  }

  async function handleCompleteActiveMilestone() {
    if (!workspace || !activeRoadmap || currentMilestoneIdx === -1) return;
    const nextProgress = Math.min(100, Math.round(((currentMilestoneIdx + 1) / allMilestones.length) * 100));
    const updatedRoadmap = {
      ...activeRoadmap,
      progress: nextProgress,
    };
    const updatedRoadmaps = [updatedRoadmap, ...safeWorkspaceRoadmaps.slice(1)];
    await persistRoadmaps(updatedRoadmaps);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 4000);
    showToast(`Sprint milestone completed! Active track progress is now ${nextProgress}%.`);
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

      {/* ══ SECTION 1: ROADMAP HERO (Minimal Info Card) ══════════════════════ */}
      <section className="card-data relative overflow-hidden rounded-[24px] p-6 sm:p-8">
        {/* API limit alert banner */}
        {limitExhausted && !hasConnectedProvider && (
          <div className="relative z-10 mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-200">Free generations exhausted</p>
                  <p className="mt-0.5 text-xs text-amber-200/70">Configure your custom AI Provider key in Settings to resume limitless regenerations.</p>
                </div>
              </div>
              <Link href="/settings#ai-providers" className="tactile-btn tactile-btn-primary shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-black">
                Configure Provider
              </Link>
            </div>
          </div>
        )}

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
              </span>
              <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Workspace Roadmap</p>
              
              {activeRoadmap && (
                <>
                  <span className="rounded-full border border-cyan-400/15 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                    {activeRoadmap.career_domain}
                  </span>
                  <button 
                    onClick={() => setIsVersionDrawerOpen(true)}
                    className="flex items-center gap-1 hover:text-cyan-300 transition text-[10px] rounded-full border border-[#202028] bg-[#0d0d10] px-2 py-0.5 text-slate-400"
                  >
                    <Clock3 className="h-3 w-3" />
                    v{activeRoadmap.roadmap_version} History
                  </button>
                </>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-tight">
              {activeRoadmap?.title ?? "No active roadmap"}
            </h1>
            
            <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Target Career Goal: <span className="text-white font-semibold">{profile?.goal || "SDE I"}</span> &middot; {activeRoadmap?.summary || "Create your career track roadmap to initiate execution guides."}
            </p>
          </div>

          {/* Quick Actions Header Section */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              href="/mentor"
              className="tactile-btn border border-[#202028] hover:border-indigo-400/30 text-white font-semibold px-4 py-2.5 rounded-full text-xs transition inline-flex items-center gap-1.5"
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
              className="tactile-btn tactile-btn-primary font-bold px-4 py-2.5 rounded-full text-xs text-black transition inline-flex items-center gap-1.5 disabled:opacity-40"
            >
              {isReplanning ? <span className="loading-spinner h-3 w-3 border-black" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {isReplanning ? "Syncing..." : "Refresh track"}
            </FeatureGateButton>
          </div>
        </div>

        {/* Primary CTA Next Action Area */}
        {activeRoadmap && nextActionLabel && (
          <div className="mt-6 border-t border-[#1e1e24]/60 pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#08080a] border border-[#141417] p-4 rounded-2xl relative overflow-hidden">
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
                  className="tactile-btn bg-cyan-400 text-black hover:bg-cyan-300 font-bold text-xs px-4 py-2 rounded-xl transition inline-flex items-center gap-1.5 shrink-0 self-end sm:self-center"
                >
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                  Done
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ══ EMPTY STATE CONTAINER ════════════════════════════════════════════ */}
      {!activeRoadmap && (
        <div className="flex flex-col items-center gap-4 rounded-[28px] border border-dashed border-[#202028] py-24 text-center bg-[#070709]/40">
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
            className="tactile-btn tactile-btn-primary mt-2 inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-bold text-black"
          >
            {isReplanning ? <span className="loading-spinner h-4 w-4 border-black" /> : <RefreshCw className="h-4 w-4" />}
            Generate Career Roadmap
          </FeatureGateButton>
        </div>
      )}

      {activeRoadmap && (
        <>
          {/* ══ SECTION 2: CURRENT SPRINT (Spotlight Card 1) ═══════════════════ */}
          <section id="current-sprint-section" className="scroll-mt-6">
            <div className="card-spotlight rounded-[24px] p-6 relative overflow-hidden">
              <div className="pointer-events-none absolute top-0 right-0 h-40 w-64 bg-cyan-400/5 rounded-full blur-3xl animate-pulse" />
              
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
                              : "border-[#1c1c22] bg-[#08080a] text-slate-300 hover:border-[#252530]"
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

                <div className="shrink-0 flex flex-col justify-between items-end gap-3 self-stretch min-w-[170px] bg-black/40 border border-white/5 p-4 rounded-2xl">
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
                      className="tactile-btn bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs w-full py-2 rounded-xl transition flex items-center justify-center gap-1.5 mt-2"
                    >
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                      Complete Sprint
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ══ SECTION 3: ROADMAP JOURNEY TIMELINE RAIL ═══════════════════════ */}
          <section className="grid gap-5 md:grid-cols-[1.5fr_3.5fr]">
            {/* Left Col: Interactive Milestone Rail */}
            <div className="card-data rounded-[24px] p-5 flex flex-col space-y-4">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Timeline Journey</span>
              <h4 className="text-sm font-bold text-white leading-none">Milestone Rail</h4>
              
              <div className="relative border-l border-white/5 pl-4 ml-2.5 py-2 space-y-5">
                {allMilestones.map((m, idx) => {
                  const status = getMilestoneStatus(idx, completedCount, allMilestones.length);
                  const isCurrentSelection = activeMilestone?.title === m.title;
                  const isCurrentActiveSprint = currentMilestone?.title === m.title;
                  const isLocked = status === "upcoming" && !isCurrentActiveSprint;

                  return (
                    <div key={m.title} className="relative">
                      {/* Connection node indicator */}
                      <button
                        disabled={isLocked}
                        onClick={() => {
                          setSelectedMilestoneTitle(m.title);
                          setMilestoneTab("tasks");
                          setIsEditingMilestone(false);
                        }}
                        className={`absolute -left-[23px] top-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition ${
                          isCurrentSelection
                            ? "bg-cyan-400 border-cyan-400 text-black shadow-[0_0_10px_rgba(34,211,238,0.4)]"
                            : status === "completed"
                            ? "bg-cyan-950/20 border-cyan-400 text-cyan-300"
                            : isCurrentActiveSprint
                            ? "bg-indigo-950/20 border-indigo-400 text-indigo-300 animate-pulse"
                            : "bg-[#050507] border-slate-700 text-slate-500"
                        }`}
                      >
                        {status === "completed" ? (
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        )}
                      </button>

                      <div className="pl-1">
                        <button
                          disabled={isLocked}
                          onClick={() => {
                            setSelectedMilestoneTitle(m.title);
                            setMilestoneTab("tasks");
                            setIsEditingMilestone(false);
                          }}
                          className={`text-xs font-semibold text-left transition ${
                            isCurrentSelection
                              ? "text-cyan-300 font-bold"
                              : isLocked
                              ? "text-slate-600 cursor-not-allowed"
                              : "text-slate-300 hover:text-white"
                          }`}
                        >
                          {m.title}
                          {isLocked && <span className="ml-1 text-[9px] text-slate-600 block">(Locked)</span>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Col: Milestone Details & Inspector */}
            <div className="card-data rounded-[24px] p-6 flex flex-col justify-between border border-[#1f1f23]">
              <div>
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <div>
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Milestone Details</span>
                    <h3 className="text-base font-bold text-white mt-1">
                      {activeMilestone?.title || "Select a Milestone"}
                    </h3>
                  </div>
                  {activeMilestone && !isEditingMilestone && (
                    <button
                      onClick={startEditingMilestone}
                      className="text-xs font-semibold text-cyan-400 hover:text-white transition"
                    >
                      Edit details
                    </button>
                  )}
                </div>

                {activeMilestone && (
                  <div className="mt-4">
                    {isEditingMilestone ? (
                      <div className="space-y-4 text-xs">
                        <label className="block">
                          <span className="text-slate-400 font-semibold block mb-1">Why it matters</span>
                          <textarea
                            value={editWhyItMatters}
                            onChange={(e) => setEditWhyItMatters(e.target.value)}
                            className="carved-input w-full rounded-xl px-3 py-2 h-20 resize-none"
                          />
                        </label>
                        <label className="block">
                          <span className="text-slate-400 font-semibold block mb-1">Milestone Tasks (one per line)</span>
                          <textarea
                            value={editTasksText}
                            onChange={(e) => setEditTasksText(e.target.value)}
                            className="carved-input w-full rounded-xl px-3 py-2 h-24 font-mono text-[10.5px] leading-relaxed"
                          />
                        </label>
                        <label className="block">
                          <span className="text-slate-400 font-semibold block mb-1">Deliverables (one per line)</span>
                          <textarea
                            value={editDeliverablesText}
                            onChange={(e) => setEditDeliverablesText(e.target.value)}
                            className="carved-input w-full rounded-xl px-3 py-2 h-20 font-mono text-[10.5px] leading-relaxed"
                          />
                        </label>
                        <label className="block">
                          <span className="text-slate-400 font-semibold block mb-1">Study/Concept Notes</span>
                          <textarea
                            value={editNotesText}
                            onChange={(e) => setEditNotesText(e.target.value)}
                            className="carved-input w-full rounded-xl px-3 py-2 h-20"
                            placeholder="Add concepts, definitions, or study notes..."
                          />
                        </label>

                        <div className="flex gap-2 justify-end pt-2 border-t border-white/5">
                          <button
                            type="button"
                            onClick={() => setIsEditingMilestone(false)}
                            className="tactile-btn px-4 py-2 text-xs font-semibold rounded-xl text-slate-400"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={saveMilestoneDetails}
                            className="tactile-btn tactile-btn-primary px-5 py-2 text-xs font-semibold rounded-xl text-black"
                          >
                            Save specifications
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {activeMilestone.why_it_matters || "No description set."}
                        </p>

                        <div className="mt-4 flex gap-1 rounded-xl bg-[#08080b] border border-[#141417] p-1">
                          {(["tasks", "deliverables", "resources"] as MilestoneTab[]).map(tab => (
                            <button
                              key={tab}
                              onClick={() => setMilestoneTab(tab)}
                              className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${
                                milestoneTab === tab ? "bg-[#141418] text-white" : "text-slate-500 hover:text-slate-300"
                              }`}
                            >
                              {tab}
                            </button>
                          ))}
                        </div>

                        <div className="mt-4 space-y-2 max-h-[180px] overflow-y-auto pr-1">
                          {milestoneTab === "tasks" && (
                            activeMilestone.project_tasks?.map((t, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 border border-[#121216] bg-[#070709] p-2.5 rounded-lg">
                                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                                <span>{t}</span>
                              </div>
                            ))
                          )}
                          {milestoneTab === "deliverables" && (
                            activeMilestone.deliverables?.map((d, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 border border-[#121216] bg-[#070709] p-2.5 rounded-lg">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                <span>{d}</span>
                              </div>
                            ))
                          )}
                          {milestoneTab === "resources" && (
                            activeMilestone.resource_links?.length > 0 ? (
                              activeMilestone.resource_links.map((res, idx) => (
                                <a
                                  key={idx}
                                  href={res.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center justify-between gap-3 border border-[#121216] bg-[#070709] hover:bg-cyan-950/5 hover:border-cyan-400/20 p-2.5 rounded-lg text-xs transition group"
                                >
                                  <div className="truncate min-w-0">
                                    <p className="font-semibold text-slate-300 group-hover:text-cyan-300 truncate">{res.label}</p>
                                    <span className="text-[10px] text-slate-500 block">{res.provider}</span>
                                  </div>
                                  <ExternalLink className="h-3.5 w-3.5 text-slate-600 group-hover:text-cyan-400 shrink-0" />
                                </a>
                              ))
                            ) : (
                              <p className="text-xs text-slate-500 py-4 text-center">No resources listed.</p>
                            )
                          )}
                        </div>

                        {activeMilestone.notes && (
                          <div className="mt-4 p-3.5 rounded-xl border border-white/5 bg-black/10 text-xs">
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Milestone Concept Notes</span>
                            <p className="text-slate-300 leading-relaxed">{activeMilestone.notes}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ══ SECTION 4: RESOURCE HUB (Bookmark / Completed Status Tracking) ══ */}
          <section>
            <div className="mb-4">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-semibold">Learning References</span>
              <h3 className="text-base font-bold text-white mt-1">Resource Hub</h3>
            </div>

            <div className="card-data rounded-[24px] p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    value={resourceSearch}
                    onChange={e => setResourceSearch(e.target.value)}
                    placeholder="Search resources..."
                    className="carved-input w-full rounded-xl py-2 pl-9 pr-4 text-xs text-white"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(["all", "course", "documentation", "practice", "project", "interview"] as ResourceFilter[]).map(f => (
                    <button
                      key={f}
                      onClick={() => setResourceFilter(f)}
                      className={`rounded-full px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${
                        resourceFilter === f
                          ? "border border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
                          : "border border-[#202028] bg-[#0d0d10] text-slate-500 hover:text-slate-300"
                      }`}
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
                      <div
                        key={`${res.url}-${idx}`}
                        className="group flex flex-col justify-between border border-[#141417] hover:border-cyan-400/20 bg-[#08080a] p-4 rounded-2xl transition-colors duration-[120ms]"
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
                                  : "border-[#1e1e24] bg-black/40 text-slate-500 hover:text-slate-300"
                              }`}
                            >
                              Bookmark
                            </button>
                            <button
                              onClick={() => toggleCompleted(res.url)}
                              className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase border transition ${
                                isCompleted
                                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                                  : "border-[#1e1e24] bg-black/40 text-slate-500 hover:text-slate-300"
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
                      </div>
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
            </div>
          </section>

          {/* ══ SECTION 5: DYNAMIC INSIGHTS (Strengths, Blockers, Recommended) ══ */}
          <section className="grid gap-5 md:grid-cols-3">
            {/* Strengths */}
            <div className="card-data rounded-[24px] p-5 border border-[#1f1f23]">
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
            </div>

            {/* Skill Gaps / Obstacles */}
            <div className="card-data rounded-[24px] p-5 border border-[#1f1f23]">
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
            </div>

            {/* Recommended Focus */}
            <div className="card-data rounded-[24px] p-5 border border-[#1f1f23]">
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block mb-2">Recommended Focus</span>
              {currentMilestone ? (
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  Focus on completing tasks inside <strong className="text-white">{currentMilestone.title}</strong> to keep up consistency.
                </p>
              ) : (
                <span className="text-xs text-slate-500">All milestones completed.</span>
              )}
            </div>
          </section>
        </>
      )}

      {/* ══ SECTION 8: EXPORT CENTER ═════════════════════════════════════════ */}
      {activeRoadmap && (
        <section className="pt-2">
          <div className="card-data rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-slate-400" />
              <p className="text-xs text-slate-400 font-semibold">
                Export Options &amp; Portability Snapshot
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkdownExport}
                className="tactile-btn border border-[#202028] hover:border-cyan-400/20 px-3.5 py-2 rounded-xl text-xs text-slate-300 hover:text-white transition inline-flex items-center gap-1.5 font-bold"
              >
                <FileText className="h-3.5 w-3.5 text-cyan-400" />
                Markdown
              </button>
              <button
                onClick={handleJsonExport}
                className="tactile-btn border border-[#202028] hover:border-cyan-400/20 px-3.5 py-2 rounded-xl text-xs text-slate-300 hover:text-white transition inline-flex items-center gap-1.5 font-bold"
              >
                <Download className="h-3.5 w-3.5 text-cyan-400" />
                JSON
              </button>
              <button
                onClick={() => void handlePdfDownload()}
                className="tactile-btn bg-[#121216] border border-[#202028] hover:border-cyan-400/20 px-3.5 py-2 rounded-xl text-xs text-slate-300 hover:text-white transition inline-flex items-center gap-1.5 font-bold"
              >
                <Printer className="h-3.5 w-3.5 text-cyan-400" />
                PDF
              </button>
            </div>
          </div>
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
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
          />
          {/* Drawer */}
          <div
            className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#09090b] border-l border-[#202028] p-6 shadow-2xl flex flex-col justify-between"
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
                  className="tactile-btn border border-[#202028] hover:border-slate-500 w-full rounded-xl py-2.5 text-xs text-slate-300 font-semibold transition"
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
                className="tactile-btn flex-1 rounded-xl py-2.5 text-xs font-semibold text-slate-400 border border-[#202028] hover:border-slate-500 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const version = safeRoadmapHistory.find(v => v.id === restoreConfirmId);
                  if (version) void restoreRoadmapVersion(version);
                }}
                className="tactile-btn tactile-btn-primary flex-1 rounded-xl py-2.5 text-xs font-semibold text-black"
              >
                Confirm Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
