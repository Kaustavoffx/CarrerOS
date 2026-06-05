"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download, Printer, RefreshCw, Clock3,
  Check, ExternalLink, Search,
  FileText, Archive, Sparkles, Target, BookOpen, Activity, AlertTriangle,
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

  // Calculate Projects Completed
  const completedProjectsCount = allMilestones.slice(0, completedCount).reduce((acc, m) => acc + (m.projects?.length ?? 0), 0);
  const totalProjectsCount = allMilestones.reduce((acc, m) => acc + (m.projects?.length ?? 0), 0);

  // Weekly consistency derived from total checklist inputs checked
  const totalCheckedEver = Object.values(checkedTasks).filter(Boolean).length;
  const weeklyConsistency = totalCheckedEver > 0 ? Math.min(100, 75 + (totalCheckedEver * 4) % 25) : 0;

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

      {/* ── TOAST MESSENGER ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 xl:bottom-6 rounded-xl border border-cyan-400/25 bg-[#0a0a0c] px-4 py-3 text-xs font-semibold text-cyan-200 shadow-[0_4px_16px_rgba(0,0,0,0.8),0_0_20px_rgba(34,211,238,0.15)]"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ SECTION 1: ROADMAP HERO ══════════════════════════════════════════ */}
      <section className="liquid-panel relative overflow-hidden rounded-[28px] p-6 sm:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full bg-indigo-500/4 blur-2xl" />

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
              <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Career Workspace Roadmap</p>
              
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
                  {!hasConnectedProvider && (
                    <span className="rounded-full border border-[#202028] bg-[#0d0d10] px-2 py-0.5 text-[10px] text-slate-400 font-semibold">
                      {FREE_GENERATIONS - freeGenerationsUsed} free refreshes left
                    </span>
                  )}
                </>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              {activeRoadmap?.title ?? "No active roadmap"}
            </h1>
            
            <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Target Goal: <span className="text-white font-semibold">{profile?.goal || "SDE I"}</span> &middot; {activeRoadmap?.summary || "Create your career track roadmap to initiate execution guides."}
            </p>

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
              <span>Readiness: <strong className="text-white">{profile?.readiness_score || 0}%</strong></span>
              <span>&bull;</span>
              <span>Completion: <strong className="text-cyan-400">{activeRoadmap?.progress || 0}%</strong></span>
              <span>&bull;</span>
              <span>ETA: <strong className="text-white">{activeRoadmap?.estimated_completion_date || "—"}</strong></span>
              <span>&bull;</span>
              <span>Last Sync: <strong className="text-slate-400">{activeRoadmap ? formatDate(activeRoadmap.updated_at) : "—"}</strong></span>
            </div>
          </div>

          {/* Quick Actions Header Section */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => document.getElementById("current-sprint-section")?.scrollIntoView({ behavior: "smooth" })}
              className="tactile-btn border border-[#202028] hover:border-cyan-400/30 text-white font-semibold px-4 py-2.5 rounded-full text-xs transition"
            >
              Continue Sprint
            </button>
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
              {isReplanning ? "Syncing..." : "Refresh"}
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
          {/* ══ SECTION 2: CURRENT SPRINT (Directly below Hero) ═══════════════ */}
          <section id="current-sprint-section" className="grid gap-5 md:grid-cols-[5fr_4fr]">
            {/* Sprint Checklist Card */}
            <div className="liquid-panel rounded-[24px] p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#1e1e24] pb-4 mb-4">
                  <div>
                    <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Active Sprint Track</span>
                    <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                      {currentMilestone?.title || "No Active Milestone"}
                    </h3>
                  </div>
                  {currentMilestone && (
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block font-medium">Estimated Effort</span>
                      <span className="text-xs text-cyan-300 font-bold">{currentMilestone.estimated_duration_weeks} weeks</span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                  {currentMilestone?.why_it_matters || "Milestone description is empty."}
                </p>

                {/* Combined checklist: Tasks & Deliverables */}
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {currentMilestone ? (
                    <>
                      {currentMilestoneTasks.map((task, i) => {
                        const key = `${currentMilestone.title}::t::${i}`;
                        const isDone = checkedTasks[key] ?? false;
                        return (
                          <button
                            key={key}
                            onClick={() => toggleTaskState(key)}
                            className={`w-full flex items-start gap-3 rounded-xl border p-3.5 text-left text-xs transition ${
                              isDone
                                ? "border-cyan-500/10 bg-cyan-950/5 text-slate-500"
                                : "border-[#1c1c22] bg-[#08080a] text-slate-300 hover:border-[#252530]"
                            }`}
                          >
                            <motion.span 
                              whileTap={{ scale: 0.8 }}
                              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                                isDone ? "border-cyan-400 bg-cyan-400 text-black animate-scaleIn" : "border-slate-700"
                              }`}
                            >
                              {isDone && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                            </motion.span>
                            <span className={isDone ? "line-through opacity-60 font-medium" : "font-medium"}>
                              {task}
                            </span>
                          </button>
                        );
                      })}

                      {currentMilestoneDeliverables.map((deliverable, i) => {
                        const key = `${currentMilestone.title}::d::${i}`;
                        const isDone = checkedTasks[key] ?? false;
                        return (
                          <button
                            key={key}
                            onClick={() => toggleTaskState(key)}
                            className={`w-full flex items-start gap-3 rounded-xl border p-3.5 text-left text-xs transition ${
                              isDone
                                ? "border-emerald-500/10 bg-emerald-950/5 text-slate-500"
                                : "border-[#1c1c22] bg-[#08080a] text-slate-300 hover:border-[#252530]"
                            }`}
                          >
                            <motion.span 
                              whileTap={{ scale: 0.8 }}
                              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                                isDone ? "border-emerald-400 bg-emerald-400 text-black animate-scaleIn" : "border-slate-700"
                              }`}
                            >
                              {isDone && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                            </motion.span>
                            <div className="flex-1">
                              <span className={isDone ? "line-through opacity-60 font-medium" : "font-medium"}>
                                {deliverable}
                              </span>
                              <span className="ml-2 inline-block rounded bg-emerald-500/10 text-emerald-400 text-[9px] px-1 py-0.2 border border-emerald-500/20 font-bold uppercase">Deliverable</span>
                            </div>
                          </button>
                        );
                      })}
                    </>
                  ) : (
                    <p className="text-xs text-slate-500 py-6 text-center">No tasks currently defined.</p>
                  )}
                </div>
              </div>

              {currentMilestone && (
                <div className="mt-6 pt-5 border-t border-[#1e1e24] flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-1">
                      <span>Sprint Progress</span>
                      <span className="text-cyan-400">{sprintProgress}%</span>
                    </div>
                    <div className="h-2 w-full bg-[#141418] rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${sprintProgress}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full bg-cyan-400 rounded-full"
                      />
                    </div>
                  </div>

                  {sprintProgress === 100 && (
                    <button
                      onClick={() => handleCompleteActiveMilestone()}
                      className="tactile-btn bg-emerald-500 text-black font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-emerald-400 transition"
                    >
                      Complete Milestone
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Selected Milestone Inspection Sidebar */}
            <div className="liquid-panel rounded-[24px] p-6 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Milestone Inspector</span>
                <h3 className="text-base font-bold text-white mt-1">
                  {activeMilestone?.title || "Inspect a milestone"}
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {activeMilestone?.why_it_matters || "No details available."}
                </p>

                {activeMilestone && (
                  <div className="mt-4 flex gap-1.5 rounded-xl bg-[#08080b] border border-[#141417] p-1">
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
                )}

                <div className="mt-4 space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {activeMilestone ? (
                    <>
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
                          <p className="text-xs text-slate-500 py-4 text-center">No learning assets listed.</p>
                        )
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-slate-500 py-6 text-center">Inspect milestone items from the journey map.</p>
                  )}
                </div>
              </div>

              {activeMilestone && (
                <div className="mt-5 pt-4 border-t border-[#1e1e24] flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>Difficulty: <strong className="text-white">{activeMilestone.difficulty_level}</strong></span>
                  <span>&bull;</span>
                  <span>Duration: <strong className="text-white">{activeMilestone.estimated_duration_weeks} weeks</strong></span>
                </div>
              )}
            </div>
          </section>

          {/* ══ SECTION 3: ROADMAP JOURNEY ════════════════════════════════════ */}
          <section className="hidden md:block">
            <div className="mb-4">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Milestone Sequence</span>
              <h3 className="text-base font-bold text-white mt-1">Roadmap Journey</h3>
            </div>
            
            <div className="liquid-panel rounded-[24px] p-6 overflow-x-auto">
              <div className="flex items-center gap-4 min-w-[800px] py-2">
                {allMilestones.map((m, idx) => {
                  const status = getMilestoneStatus(idx, completedCount, allMilestones.length);
                  const isCurrentSelection = activeMilestone?.title === m.title;
                  const isCurrentActiveSprint = currentMilestone?.title === m.title;

                  return (
                    <div key={m.title} className="flex items-center flex-1 last:flex-none">
                      {/* Milestone Step Pin */}
                      <button
                        onClick={() => {
                          setSelectedMilestoneTitle(m.title);
                          setMilestoneTab("tasks");
                        }}
                        className={`flex items-center gap-2.5 rounded-full border px-4 py-2 text-xs transition duration-200 ${
                          isCurrentSelection
                            ? "bg-cyan-400 text-black border-cyan-400 font-extrabold shadow-[0_0_12px_rgba(34,211,238,0.25)]"
                            : status === "completed"
                            ? "border-cyan-500/30 bg-cyan-950/10 text-cyan-300 hover:border-cyan-400/50"
                            : isCurrentActiveSprint
                            ? "border-indigo-500 bg-indigo-950/10 text-indigo-300 font-bold"
                            : "border-[#1e1e24] bg-[#09090c] text-slate-500 hover:text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <span className="flex items-center justify-center shrink-0">
                          {status === "completed" ? (
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-current" />
                          )}
                        </span>
                        <span className="truncate max-w-[120px]">{m.title}</span>
                      </button>

                      {/* Connection Track Line */}
                      {idx < allMilestones.length - 1 && (
                        <div className={`h-[2px] flex-1 min-w-[32px] mx-2 ${
                          idx < completedCount 
                            ? "bg-gradient-to-r from-cyan-400/60 to-cyan-400/20" 
                            : "bg-dotted border-t border-dashed border-[#202028]"
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ══ SECTION 4: RESOURCE HUB ══════════════════════════════════════ */}
          <section>
            <div className="mb-4">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Learning & References</span>
              <h3 className="text-base font-bold text-white mt-1">Resource Hub</h3>
            </div>

            <div className="liquid-panel rounded-[24px] p-6">
              {/* Filters & search */}
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

              {/* Resource Cards Grid */}
              {filteredResources.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredResources.map((res, idx) => {
                    const stats = getResourceStats(res);
                    return (
                      <motion.div
                        key={`${res.url}-${idx}`}
                        whileHover={{ y: -4, boxShadow: "0 8px 30px rgba(0,0,0,0.8)" }}
                        className="group flex flex-col justify-between border border-[#141417] hover:border-cyan-400/20 bg-[#08080a] p-4 rounded-2xl transition duration-200"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                              {res.provider}
                            </span>
                            <span className="rounded bg-[#0d0d10] text-slate-400 border border-[#202028] text-[9px] px-1.5 py-0.5 font-bold uppercase">
                              {stats.type}
                            </span>
                          </div>

                          <h4 className="text-xs sm:text-sm font-semibold text-white group-hover:text-cyan-300 transition duration-200 line-clamp-2 leading-snug">
                            {res.label}
                          </h4>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[#141417] flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                            <span className="capitalize">{stats.difficulty}</span>
                            <span>&bull;</span>
                            <span>{stats.hours} hours</span>
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
                      </motion.div>
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

          {/* ══ SECTION 5 & 6: INSIGHTS & ANALYTICS ══════════════════════════ */}
          <section className="grid gap-5 lg:grid-cols-2">
            
            {/* S5: ROADMAP INSIGHTS */}
            <div className="liquid-panel rounded-[24px] p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-base font-bold text-white">Roadmap Insights</h3>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Strengths */}
                  <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4 flex flex-col justify-between min-h-[100px]">
                    <div>
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
                  </div>

                  {/* Skill Gaps */}
                  <div className="rounded-xl border border-rose-500/10 bg-rose-500/5 p-4 flex flex-col justify-between min-h-[100px]">
                    <div>
                      <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block mb-2">Skill Gaps</span>
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
                  </div>

                  {/* Blocked Areas */}
                  <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4 flex flex-col justify-between min-h-[100px]">
                    <div>
                      <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block mb-2">Blocked Areas</span>
                      {profile?.obstacles && profile.obstacles.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {profile.obstacles.slice(0, 3).map(ob => (
                            <span key={ob} className="rounded border border-amber-500/20 bg-amber-500/10 text-amber-200 text-[10px] px-1.5 py-0.5">{ob}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">No active blockers identified.</span>
                      )}
                    </div>
                  </div>

                  {/* Recommended Focus */}
                  <div className="rounded-xl border border-indigo-500/10 bg-indigo-500/5 p-4 flex flex-col justify-between min-h-[100px]">
                    <div>
                      <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block mb-1">Recommended Focus</span>
                      {currentMilestone ? (
                        <p className="text-xs text-slate-300 font-medium leading-relaxed mt-1">
                          Focus on completing tasks inside <strong className="text-white">{currentMilestone.title}</strong>
                        </p>
                      ) : (
                        <span className="text-xs text-slate-500">All milestones completed.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* S6: PROGRESS ANALYTICS (Single compact card) */}
            <div className="liquid-panel rounded-[24px] p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-base font-bold text-white">Progress Analytics</h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Completion", value: `${activeRoadmap.progress}%`, sub: "Total progress", color: "text-cyan-400" },
                    { label: "Milestones", value: `${completedCount}/${allMilestones.length}`, sub: "Completed track", color: "text-indigo-400" },
                    { label: "Projects", value: `${completedProjectsCount}/${totalProjectsCount}`, sub: "Delivered builds", color: "text-emerald-400" },
                    { label: "Consistency", value: `${weeklyConsistency}%`, sub: "Weekly checks", color: "text-amber-400" },
                    { label: "Readiness", value: `${profile?.readiness_score || 0}%`, sub: "Skill readiness", color: "text-rose-400" },
                    { label: "Completion ETA", value: activeRoadmap.estimated_completion_date || "—", sub: "ETA target date", color: "text-white" },
                  ].map(stat => (
                    <div key={stat.label} className="bg-[#08080a] border border-[#141417] p-3.5 rounded-xl flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">{stat.label}</span>
                        <p className={`text-base font-bold mt-1 ${stat.color} leading-none`}>
                          {stat.value}
                        </p>
                      </div>
                      <span className="text-[9px] text-slate-500 mt-2 block">{stat.sub}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ══ SECTION 8: EXPORT CENTER (Compact bottom layout) ═══════════════ */}
      {activeRoadmap && (
        <section className="pt-2">
          <div className="liquid-panel rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-slate-400" />
              <p className="text-xs text-slate-400 font-semibold">
                Export Options & Portability Snapshot
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

      {/* ══ VERSION HISTORY DRAWER ═════════════════════════════════════════ */}
      <AnimatePresence>
        {isVersionDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsVersionDrawerOpen(false);
                setCompareVersionId(null);
              }}
              className="fixed inset-0 z-40 bg-black bg-opacity-70 backdrop-blur-sm"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#09090b] border-l border-[#202028] p-6 shadow-2xl flex flex-col justify-between"
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

                          {/* Expansion Compare View */}
                          <AnimatePresence>
                            {isComparing && versionRoadmap && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden mt-3 pt-3 border-t border-[#1e1e24] text-[11px] text-slate-400 space-y-2.5"
                              >
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
                              </motion.div>
                            )}
                          </AnimatePresence>
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
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══ RESTORE CONFIRMATION MODAL ═══════════════════════════════════════ */}
      <AnimatePresence>
        {restoreConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="liquid-panel relative z-10 w-full max-w-sm rounded-[24px] p-6 text-center border border-amber-500/25 bg-[#09090b]"
            >
              <AlertTriangle className="mx-auto h-8 w-8 text-amber-400 mb-4 animate-bounce" />
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
