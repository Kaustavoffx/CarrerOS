"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, Cpu, Download, Printer, RefreshCw, Clock3,
  Check, ChevronDown, ChevronUp, ExternalLink, Search, LayoutGrid, List,
  FileText, Archive, Sparkles, Target, BookOpen, Activity, AlertTriangle,
  MessageSquare
} from "lucide-react";
import { FREE_GENERATIONS } from "@/lib/config";
import { MagneticButton } from "./magnetic-button";
import { FeatureGateButton, FeatureStatusBadge } from "./feature-status";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { normalizeRoadmapArray, normalizeRoadmapVersionArray, updateWorkspace } from "@/lib/app-data";
import { buildRoadmapExportBundle, generateRoadmapPdfBlob, type AuditBlob } from "@/lib/roadmap-export";
import type {
  AiProviderStatusRecord, RoadmapRecord, RoadmapVersionRecord,
  UserProfileRecord, WorkspaceSnapshotRecord
} from "@/lib/supabase/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type RoadmapsConsoleProps = {
  profile: UserProfileRecord | null;
  workspace: WorkspaceSnapshotRecord | null;
  roadmapHistory?: RoadmapVersionRecord[] | null;
  aiProviders?: AiProviderStatusRecord[] | null;
};

type ViewMode = "timeline" | "board";
type ResourceFilter = "all" | "courses" | "docs" | "practice" | "projects";
type MilestoneTab = "tasks" | "deliverables" | "resources";
type MilestoneStatus = "completed" | "active" | "upcoming";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

function formatDate(date: string) {
  return new Date(date).toISOString().split("T")[0];
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

function categorizeResource(provider: string): ResourceFilter {
  const p = provider.toLowerCase();
  if (p.includes("leetcode") || p.includes("hackerrank") || p.includes("exercism") || p.includes("codewars")) return "practice";
  if (p.includes("mdn") || p.includes("docs") || p.includes("documentation") || p.includes("mozilla") || p.includes("official")) return "docs";
  if (p.includes("github") || p.includes("project") || p.includes("portfolio")) return "projects";
  return "courses";
}

// ─── SVG Progress Ring ────────────────────────────────────────────────────────

function ProgressRing({ value, size = 110, stroke = 7, color = "#22d3ee" }: {
  value: number; size?: number; stroke?: number; color?: string;
}) {
  const [animated, setAnimated] = useState(0);
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(value / 100), 120);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#141418" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${animated * circ} ${circ}`}
        strokeDashoffset={circ * 0.25}
        style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.16,1,0.3,1)" }}
      />
      <text x={size / 2} y={size / 2 - 4} textAnchor="middle" fontSize="15" fontWeight="700" fill="#ffffff">
        {value}%
      </text>
      <text x={size / 2} y={size / 2 + 13} textAnchor="middle" fontSize="8" fill="#64748b" letterSpacing="0.1em">
        PROGRESS
      </text>
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RoadmapsConsole({ profile, workspace: initialWorkspace, roadmapHistory, aiProviders }: RoadmapsConsoleProps) {

  // ── Existing state (all preserved) ──────────────────────────────────────
  const [workspace, setWorkspace] = useState<WorkspaceSnapshotRecord | null>(initialWorkspace);
  const [isReplanning, setIsReplanning] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [freeGenerationsUsed, setFreeGenerationsUsed] = useState(0);
  const [limitExhausted, setLimitExhausted] = useState(false);

  // ── New UI state ─────────────────────────────────────────────────────────
  const [activeView, setActiveView] = useState<ViewMode>("timeline");
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(() => {
    const roadmaps = normalizeRoadmapArray(initialWorkspace?.roadmaps);
    if (roadmaps.length > 0) {
      const r = roadmaps[0];
      const ms = Array.isArray(r.milestones) ? r.milestones : [];
      if (ms.length > 0) {
        const cc = Math.floor((r.progress / 100) * ms.length);
        return ms[Math.min(cc, ms.length - 1)]?.title ?? ms[0].title;
      }
    }
    return null;
  });
  const [milestoneTab, setMilestoneTab] = useState<MilestoneTab>("tasks");
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({});
  const [resourceSearch, setResourceSearch] = useState("");
  const [resourceFilter, setResourceFilter] = useState<ResourceFilter>("all");
  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null);
  const [kanbanCols, setKanbanCols] = useState<Record<string, "notstarted" | "inprogress" | "completed">>(() => {
    const cols: Record<string, "notstarted" | "inprogress" | "completed"> = {};
    const roadmaps = normalizeRoadmapArray(initialWorkspace?.roadmaps);
    if (roadmaps.length > 0) {
      const r = roadmaps[0];
      const ms = Array.isArray(r.milestones) ? r.milestones : [];
      const cc = Math.floor((r.progress / 100) * ms.length);
      ms.forEach((m, i) => {
        const s = getMilestoneStatus(i, cc, ms.length);
        cols[m.title] = s === "completed" ? "completed" : s === "active" ? "inprogress" : "notstarted";
      });
    }
    return cols;
  });

  // ── Existing derived values (all preserved) ──────────────────────────────
  const supabase = getSupabaseBrowserClient();
  const safeRoadmapHistory = normalizeRoadmapVersionArray(roadmapHistory);
  const safeWorkspaceRoadmaps = normalizeRoadmapArray(workspace?.roadmaps);
  const hasConnectedProvider = Array.isArray(aiProviders) && aiProviders.some(p => p.connected);
  const connectedProviderRecord = Array.isArray(aiProviders) ? aiProviders.find(p => p.connected) : null;
  const connectedProviderName = connectedProviderRecord
    ? (connectedProviderRecord.provider === "openai" ? "OpenAI" : "Gemini")
    : "OpenAI";
  const freeGenerationsRemaining = Math.max(0, FREE_GENERATIONS - freeGenerationsUsed);
  const refreshDisabled = isReplanning || (!hasConnectedProvider && limitExhausted);

  // ── Active roadmap & milestones ──────────────────────────────────────────
  const activeRoadmap = safeWorkspaceRoadmaps[0] ?? null;
  const allMilestones = Array.isArray(activeRoadmap?.milestones) ? activeRoadmap!.milestones : [];
  const completedCount = activeRoadmap ? Math.floor((activeRoadmap.progress / 100) * allMilestones.length) : 0;
  const currentMilestoneIdx = allMilestones.length > 0 ? Math.min(completedCount, allMilestones.length - 1) : -1;
  const activeMilestone =
    allMilestones.find(m => m.title === expandedMilestone) ??
    (currentMilestoneIdx >= 0 ? allMilestones[currentMilestoneIdx] : null) ??
    null;

  // ── All resources (deduplicated by URL) ──────────────────────────────────
  const allResources = Array.from(
    new Map(
      safeWorkspaceRoadmaps.flatMap(r =>
        (Array.isArray(r.resource_links) ? r.resource_links : []).concat(
          (Array.isArray(r.milestones) ? r.milestones : []).flatMap(m =>
            Array.isArray(m.resource_links) ? m.resource_links : []
          )
        )
      ).map(res => [res.url, res])
    ).values()
  );
  const filteredResources = allResources.filter(res => {
    const matchSearch = !resourceSearch || res.label.toLowerCase().includes(resourceSearch.toLowerCase());
    const matchFilter = resourceFilter === "all" || categorizeResource(res.provider) === resourceFilter;
    return matchSearch && matchFilter;
  });

  // ── useEffects ────────────────────────────────────────────────────────────
  useEffect(() => { setWorkspace(initialWorkspace); }, [initialWorkspace]);

  // Re-initialize kanban when workspace changes (roadmap refresh)
  useEffect(() => {
    const roadmaps = normalizeRoadmapArray(workspace?.roadmaps);
    if (roadmaps.length > 0) {
      const r = roadmaps[0];
      const ms = Array.isArray(r.milestones) ? r.milestones : [];
      const cc = Math.floor((r.progress / 100) * ms.length);
      const cols: Record<string, "notstarted" | "inprogress" | "completed"> = {};
      ms.forEach((m, i) => {
        const s = getMilestoneStatus(i, cc, ms.length);
        cols[m.title] = s === "completed" ? "completed" : s === "active" ? "inprogress" : "notstarted";
      });
      setKanbanCols(cols);
    }
  }, [workspace]);

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
        } catch { /* Ignore usage lookup failures. */ }
      }
    }
    fetchUsage();
  }, [profile?.id, supabase]);

  // ── Functions (all preserved, debug console.log removed) ─────────────────
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
    showToast(`Restored version ${version.roadmap_version}.`);
  }

  async function handleReplan() {
    if (isReplanning || !workspace) return;
    if (limitExhausted && !hasConnectedProvider) {
      showToast("Free roadmap refreshes are exhausted for this account.");
      return;
    }
    setIsReplanning(true);
    showToast("Refreshing roadmap with curated project milestones...");
    try {
      const response = await fetch("/api/replan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, currentRoadmaps: safeWorkspaceRoadmaps }),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error("ROADMAP REPLAN FAILED", data || response.statusText);
        throw new Error(data.error || "Generation failed");
      }
      const responseRoadmaps = normalizeRoadmapArray(data.roadmaps);
      if (!responseRoadmaps.length) {
        console.error("EMPTY ROADMAP RESPONSE", data);
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
        : "Roadmap regenerated and synced.");
    } catch (error) {
      console.error("ROADMAP REPLAN PERSISTENCE FAILED", error);
      showToast("Roadmap refresh failed. Check console.");
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
      showToast(result.valid ? "PDF downloaded." : "Roadmap quality warning detected. Export generated successfully.");
    } catch (error) {
      console.error("PDF download failure:", error);
      showToast("PDF export failed.");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── TOAST ─────────────────────────────────────────────────────────── */}
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

      {/* ══ S1: COMMAND CENTER ════════════════════════════════════════════════ */}
      <section className="liquid-panel relative overflow-hidden rounded-[28px] p-7">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full bg-indigo-500/4 blur-2xl" />

        {/* BYOK exhausted banner (preserved) */}
        {limitExhausted && !hasConnectedProvider && (
          <div className="relative z-10 mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-200">Free generations exhausted</p>
                  <p className="mt-0.5 text-xs text-amber-200/70">Connect your own AI provider to keep generating fresh roadmaps.</p>
                </div>
              </div>
              <Link href="/settings#ai-providers" className="tactile-btn tactile-btn-primary shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-black">
                Configure Provider
              </Link>
            </div>
          </div>
        )}

        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center">
          {/* Left: Title & meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
              </span>
              <p className="caption text-cyan-400">Active Roadmap</p>
            </div>
            <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
              {activeRoadmap?.title ?? "No active roadmap yet"}
            </h2>
            <p className="mt-2 text-sm text-slate-400 max-w-xl line-clamp-2 leading-relaxed">
              {activeRoadmap?.summary ?? "Generate your first roadmap to begin your career execution journey."}
            </p>

            {/* Meta badges */}
            <div className="mt-3 flex flex-wrap gap-2">
              {activeRoadmap && (
                <>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-0.5 text-[11px] font-medium text-cyan-300">
                    {activeRoadmap.career_domain}
                  </span>
                  <span className="rounded-full border border-[#202028] bg-[#0d0d10] px-2.5 py-0.5 text-[11px] text-slate-400">
                    v{activeRoadmap.roadmap_version}
                  </span>
                  <span className="rounded-full border border-[#202028] bg-[#0d0d10] px-2.5 py-0.5 text-[11px] text-slate-400 capitalize">
                    {activeRoadmap.status}
                  </span>
                </>
              )}
              {/* Provider status (preserved) */}
              {hasConnectedProvider ? (
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  {connectedProviderName} Connected
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full border border-[#202028] bg-[#0d0d10] px-2.5 py-0.5 text-[11px] text-slate-500">
                  <Cpu className="h-3 w-3 text-cyan-400" />
                  {freeGenerationsRemaining}/{FREE_GENERATIONS} free
                </span>
              )}
            </div>

            {/* Feature badges */}
            <div className="mt-4 flex flex-wrap gap-2">
              <FeatureStatusBadge status="beta" featureName="AI Roadmap Generation" />
              <FeatureStatusBadge status="beta" featureName="Adaptive Replanning" />
              <FeatureStatusBadge status="coming-soon" featureName="Market Demand Score" />
              <FeatureStatusBadge status="coming-soon" featureName="Salary Intelligence" />
            </div>
          </div>

          {/* Center: Progress ring */}
          {activeRoadmap && (
            <div className="flex flex-col items-center gap-2 shrink-0">
              <ProgressRing value={activeRoadmap.progress} size={116} stroke={7} />
              <p className="text-[11px] text-slate-500 text-center">{activeRoadmap.estimated_completion_date}</p>
            </div>
          )}

          {/* Right: CTAs */}
          <div className="flex flex-col gap-3 shrink-0 min-w-[180px]">
            <MagneticButton asChild>
              <FeatureGateButton
                type="button"
                onClick={handleReplan}
                disabled={refreshDisabled}
                status="beta"
                featureName="AI Roadmap Generation"
                className="tactile-btn tactile-btn-primary inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-xs font-bold text-black disabled:opacity-40"
              >
                {isReplanning ? <span className="loading-spinner mr-1" /> : <RefreshCw className="h-3.5 w-3.5" />}
                {isReplanning ? "Refreshing..." : "Refresh Roadmap"}
              </FeatureGateButton>
            </MagneticButton>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/mentor"
                className="tactile-btn inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-[11px] font-semibold text-slate-300 hover:text-white transition"
              >
                <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
                AI Mentor
              </Link>
              <button
                type="button"
                onClick={() => document.getElementById("roadmap-timeline-section")?.scrollIntoView({ behavior: "smooth" })}
                className="tactile-btn inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-[11px] font-semibold text-slate-300 hover:text-white transition"
              >
                <Target className="h-3.5 w-3.5 text-indigo-400" />
                Current Sprint
              </button>
            </div>
          </div>
        </div>

        {/* KPI strip */}
        {activeRoadmap && (
          <div className="relative z-10 mt-7 flex flex-wrap gap-3 border-t border-white/5 pt-6">
            {[
              { label: "Readiness",    value: profile?.readiness_score ? `${profile.readiness_score}%` : "—", icon: Activity },
              { label: "Duration",     value: `${activeRoadmap.total_duration_weeks ?? "—"}w`,                  icon: CalendarDays },
              { label: "Weekly Hours", value: `${activeRoadmap.weekly_hours ?? "—"}h`,                          icon: Clock3 },
              { label: "Milestones",   value: String(allMilestones.length),                                     icon: Target },
              { label: "Demand Score", value: activeRoadmap.career_demand_score <= 10 ? `${activeRoadmap.career_demand_score}/10` : `${activeRoadmap.career_demand_score}/100`, icon: Sparkles },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-2.5 rounded-xl border border-[#141417] bg-[#08080a] px-4 py-2.5">
                <Icon className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
                  <p className="text-sm font-semibold text-white">{value}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ══ EMPTY STATE ════════════════════════════════════════════════════════ */}
      {!activeRoadmap && (
        <div className="flex flex-col items-center gap-4 rounded-[24px] border border-dashed border-[#202028] py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#202028] bg-[#0d0d10]">
            <BookOpen className="h-7 w-7 text-slate-600" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-400">No active roadmap</p>
            <p className="mt-1 text-sm text-slate-600">Generate your first roadmap to begin tracking your career execution journey.</p>
          </div>
          <MagneticButton asChild>
            <FeatureGateButton
              type="button"
              onClick={handleReplan}
              disabled={refreshDisabled}
              status="beta"
              featureName="AI Roadmap Generation"
              className="tactile-btn tactile-btn-primary mt-2 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-black disabled:opacity-40"
            >
              {isReplanning ? <span className="loading-spinner mr-1" /> : <RefreshCw className="h-4 w-4" />}
              {isReplanning ? "Generating..." : "Generate Roadmap"}
            </FeatureGateButton>
          </MagneticButton>
        </div>
      )}

      {/* ══ MAIN CONTENT (only when roadmap exists) ═══════════════════════════ */}
      {activeRoadmap && (
        <>
          {/* ─ VIEW TOGGLE ──────────────────────────────────────────────────── */}
          <div className="flex items-center gap-2">
            {(["timeline", "board"] as ViewMode[]).map(view => (
              <button
                key={view}
                type="button"
                onClick={() => setActiveView(view)}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold capitalize transition ${
                  activeView === view
                    ? "bg-cyan-400 text-black shadow-[0_0_14px_rgba(34,211,238,0.3)]"
                    : "border border-[#202028] bg-[#0d0d10] text-slate-400 hover:text-white"
                }`}
              >
                {view === "timeline" ? <List className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
                {view === "timeline" ? "Timeline View" : "Board View"}
              </button>
            ))}
          </div>

          {/* ══ S2 + S3: TIMELINE + ACTIVE MILESTONE ════════════════════════ */}
          {activeView === "timeline" && (
            <section id="roadmap-timeline-section" className="grid gap-5 lg:grid-cols-[3fr_2fr]">

              {/* LEFT: Vertical timeline */}
              <div className="liquid-panel rounded-[24px] p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="caption text-slate-500">Sprint Progress</p>
                    <h3 className="mt-1 text-base font-semibold text-white">Roadmap Timeline</h3>
                  </div>
                  <span className="rounded-full border border-[#202028] bg-[#0d0d10] px-3 py-1 text-[11px] font-semibold text-slate-400">
                    {completedCount}/{allMilestones.length} done
                  </span>
                </div>

                {allMilestones.length > 0 ? (
                  <div className="relative space-y-2">
                    {/* Vertical connector line */}
                    <div className="absolute left-[11px] top-3 bottom-3 w-px bg-gradient-to-b from-cyan-400/35 via-white/5 to-transparent" />

                    {allMilestones.map((milestone, idx) => {
                      const status: MilestoneStatus = getMilestoneStatus(idx, completedCount, allMilestones.length);
                      const isExpanded = expandedMilestone === milestone.title;

                      return (
                        <div key={milestone.title} className="relative pl-8">
                          {/* Node icon */}
                          <div className={`absolute left-0 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold transition-all ${
                            status === "completed"
                              ? "border-cyan-400 bg-cyan-400 text-black"
                              : status === "active"
                              ? "border-cyan-400 bg-cyan-400/15 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.4)]"
                              : "border-[#202028] bg-[#0d0d10] text-slate-600"
                          }`}>
                            {status === "completed" ? <Check className="h-3 w-3" /> : <span>{idx + 1}</span>}
                          </div>

                          {/* Milestone button */}
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedMilestone(isExpanded ? null : milestone.title);
                              if (!isExpanded) setMilestoneTab("tasks");
                            }}
                            className={`w-full rounded-xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 ${
                              isExpanded
                                ? "border-cyan-400/20 bg-cyan-950/10"
                                : status === "completed"
                                ? "border-[#141417] bg-[#07070a] opacity-60 hover:opacity-80"
                                : "border-[#141417] bg-[#07070a] hover:border-cyan-400/15"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold leading-snug ${
                                  status === "completed" ? "text-slate-400 line-through" : "text-white"
                                }`}>
                                  {milestone.title}
                                </p>
                                {!isExpanded && (
                                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold border ${
                                      milestone.difficulty_level === "Beginner"
                                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                                        : milestone.difficulty_level === "Advanced"
                                        ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
                                        : "border-amber-500/20 bg-amber-500/10 text-amber-300"
                                    }`}>{milestone.difficulty_level}</span>
                                    <span className="rounded-md border border-[#202028] bg-[#0d0d10] px-1.5 py-0.5 text-[10px] text-slate-500">
                                      {milestone.estimated_duration_weeks}w
                                    </span>
                                    {(milestone.resource_links?.length ?? 0) > 0 && (
                                      <span className="rounded-md border border-[#202028] bg-[#0d0d10] px-1.5 py-0.5 text-[10px] text-slate-500">
                                        {milestone.resource_links.length} resources
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              {isExpanded
                                ? <ChevronUp className="h-4 w-4 text-slate-500 shrink-0" />
                                : <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
                              }
                            </div>
                          </button>

                          {/* Expanded preview */}
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                key="expanded"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.28, ease: EASE }}
                                className="overflow-hidden"
                              >
                                <div className="mt-2 rounded-xl border border-white/[0.04] bg-white/[0.01] p-3">
                                  <p className="text-xs text-slate-400 leading-relaxed">{milestone.why_it_matters}</p>
                                  <p className="mt-2 text-[10px] font-semibold text-cyan-400">
                                    → Full detail in the execution panel →
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <Target className="h-10 w-10 text-slate-700" />
                    <p className="text-sm text-slate-500">No milestones yet. Refresh the roadmap to generate them.</p>
                  </div>
                )}
              </div>

              {/* RIGHT: Active milestone execution card */}
              <div className="liquid-panel rounded-[24px] p-6">
                {activeMilestone ? (
                  <div className="flex flex-col h-full gap-5">
                    {/* Milestone header */}
                    <div>
                      <p className="caption text-cyan-400">Active Milestone</p>
                      <h3 className="mt-2 text-lg font-semibold text-white leading-snug">{activeMilestone.title}</h3>
                      <p className="mt-2 text-xs text-slate-400 leading-relaxed">{activeMilestone.why_it_matters}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border ${
                          activeMilestone.difficulty_level === "Beginner"
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                            : activeMilestone.difficulty_level === "Advanced"
                            ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
                            : "border-amber-500/20 bg-amber-500/10 text-amber-300"
                        }`}>{activeMilestone.difficulty_level}</span>
                        <span className="rounded-lg border border-[#202028] bg-[#0d0d10] px-2.5 py-1 text-[11px] text-slate-400">
                          {activeMilestone.estimated_duration_weeks}w
                        </span>
                      </div>
                    </div>

                    {/* Tab switcher */}
                    <div className="flex gap-1 rounded-xl border border-[#141417] bg-[#07070a] p-1">
                      {(["tasks", "deliverables", "resources"] as MilestoneTab[]).map(tab => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setMilestoneTab(tab)}
                          className={`flex-1 rounded-lg py-1.5 text-[11px] font-semibold capitalize transition ${
                            milestoneTab === tab
                              ? "bg-[#141418] text-white"
                              : "text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    {/* Tab content */}
                    <div className="flex-1 space-y-2 overflow-y-auto pr-0.5">

                      {/* TASKS */}
                      {milestoneTab === "tasks" && (
                        <>
                          {(activeMilestone.project_tasks?.length ?? 0) > 0
                            ? activeMilestone.project_tasks.map((task, i) => {
                                const key = `${activeMilestone.title}::t::${i}`;
                                const done = checkedTasks[key] ?? false;
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => setCheckedTasks(prev => ({ ...prev, [key]: !prev[key] }))}
                                    className={`w-full flex items-start gap-3 rounded-lg border p-3 text-left text-xs transition ${
                                      done
                                        ? "border-cyan-400/15 bg-cyan-950/10 text-slate-400"
                                        : "border-[#141417] bg-[#07070a] text-slate-300 hover:border-[#252530]"
                                    }`}
                                  >
                                    <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                                      done ? "border-cyan-400 bg-cyan-400 text-black" : "border-[#303040]"
                                    }`}>
                                      {done && <Check className="h-2.5 w-2.5" />}
                                    </span>
                                    <span className={done ? "line-through opacity-60" : ""}>{task}</span>
                                  </button>
                                );
                              })
                            : <p className="py-6 text-center text-xs text-slate-500">No tasks for this milestone.</p>
                          }
                          {/* Completion criteria */}
                          {(activeMilestone.completion_criteria?.length ?? 0) > 0 && (
                            <div className="mt-3 rounded-xl border border-[#141417] bg-[#07070a] p-3">
                              <p className="caption text-slate-500 mb-2.5">Completion Criteria</p>
                              <ul className="space-y-2">
                                {activeMilestone.completion_criteria.map((c, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#303040] text-[9px] text-slate-600 font-bold">
                                      {i + 1}
                                    </span>
                                    {c}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      )}

                      {/* DELIVERABLES */}
                      {milestoneTab === "deliverables" && (
                        <>
                          {(activeMilestone.deliverables?.length ?? 0) > 0
                            ? activeMilestone.deliverables.map((d, i) => {
                                const key = `${activeMilestone.title}::d::${i}`;
                                const done = checkedTasks[key] ?? false;
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => setCheckedTasks(prev => ({ ...prev, [key]: !prev[key] }))}
                                    className={`w-full flex items-start gap-3 rounded-lg border p-3 text-left text-xs transition ${
                                      done
                                        ? "border-emerald-400/15 bg-emerald-950/10 text-slate-400"
                                        : "border-[#141417] bg-[#07070a] text-slate-300 hover:border-[#252530]"
                                    }`}
                                  >
                                    <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                                      done ? "border-emerald-400 bg-emerald-400 text-black" : "border-[#303040]"
                                    }`}>
                                      {done && <Check className="h-2.5 w-2.5" />}
                                    </span>
                                    <span className={done ? "line-through opacity-60" : ""}>{d}</span>
                                  </button>
                                );
                              })
                            : <p className="py-6 text-center text-xs text-slate-500">No deliverables for this milestone.</p>
                          }
                          {(activeMilestone.expected_outcomes?.length ?? 0) > 0 && (
                            <div className="mt-3 rounded-xl border border-[#141417] bg-[#07070a] p-3">
                              <p className="caption text-slate-500 mb-2.5">Expected Outcomes</p>
                              <ul className="space-y-2">
                                {activeMilestone.expected_outcomes.map((o, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-600" />
                                    {o}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      )}

                      {/* RESOURCES */}
                      {milestoneTab === "resources" && (
                        <>
                          {(activeMilestone.resource_links?.length ?? 0) > 0
                            ? activeMilestone.resource_links.map(res => (
                                <a
                                  key={res.url}
                                  href={res.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="group flex items-start justify-between gap-3 rounded-lg border border-[#141417] bg-[#07070a] p-3 text-xs transition hover:border-cyan-400/20 hover:bg-cyan-950/10"
                                >
                                  <div className="min-w-0">
                                    <p className="font-semibold text-white group-hover:text-cyan-300 transition truncate">
                                      {res.label}
                                    </p>
                                    <p className="mt-0.5 text-slate-500">{res.provider}</p>
                                  </div>
                                  <ExternalLink className="h-3.5 w-3.5 text-slate-600 group-hover:text-cyan-400 transition shrink-0 mt-0.5" />
                                </a>
                              ))
                            : <p className="py-6 text-center text-xs text-slate-500">No resources for this milestone.</p>
                          }
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center">
                    <Target className="h-10 w-10 text-slate-700" />
                    <p className="text-sm text-slate-500">Select a milestone from the timeline to view execution details.</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ══ S4: BOARD VIEW ═══════════════════════════════════════════════ */}
          {activeView === "board" && (
            <section className="grid gap-4 md:grid-cols-3">
              {(["notstarted", "inprogress", "completed"] as const).map(col => {
                const meta = {
                  notstarted: { label: "Not Started",  accent: "text-slate-400",   dot: "bg-slate-400",   badge: "bg-slate-500/10" },
                  inprogress: { label: "In Progress",  accent: "text-amber-300",   dot: "bg-amber-400",   badge: "bg-amber-500/10" },
                  completed:  { label: "Completed",    accent: "text-emerald-300", dot: "bg-emerald-400", badge: "bg-emerald-500/10" },
                }[col];
                const cards = allMilestones.filter(m => (kanbanCols[m.title] ?? "notstarted") === col);

                return (
                  <div
                    key={col}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault();
                      const title = e.dataTransfer.getData("milestoneTitle");
                      if (title) setKanbanCols(prev => ({ ...prev, [title]: col }));
                    }}
                    className="min-h-[220px] rounded-[20px] border border-[#141417] bg-[#07070a] p-4"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                        <span className={`text-xs font-semibold uppercase tracking-widest ${meta.accent}`}>{meta.label}</span>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.badge} ${meta.accent}`}>
                        {cards.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {cards.length === 0 ? (
                        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-[#202028] py-8">
                          <p className="text-[11px] text-slate-600">Drop milestones here</p>
                        </div>
                      ) : (
                        cards.map(milestone => (
                          <div
                            key={milestone.title}
                            draggable
                            onDragStart={e => { e.dataTransfer.setData("milestoneTitle", milestone.title); }}
                          >
                            <motion.div
                              whileHover={{ y: -3, boxShadow: "0 12px 40px rgba(0,0,0,0.8)" }}
                              className="cursor-grab active:cursor-grabbing rounded-xl border border-[#1a1a1f] bg-[#0a0a0d] p-4 select-none"
                            >
                              <p className="text-sm font-semibold text-white leading-snug line-clamp-2">{milestone.title}</p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold border ${
                                  milestone.difficulty_level === "Beginner"
                                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                                    : milestone.difficulty_level === "Advanced"
                                    ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
                                    : "border-amber-500/20 bg-amber-500/10 text-amber-300"
                                }`}>{milestone.difficulty_level}</span>
                                <span className="rounded-md border border-[#202028] bg-[#0d0d10] px-1.5 py-0.5 text-[10px] text-slate-500">
                                  {milestone.estimated_duration_weeks}w
                                </span>
                              </div>
                              {(milestone.resource_links?.length ?? 0) > 0 && (
                                <p className="mt-2 text-[10px] text-slate-600">{milestone.resource_links.length} resources</p>
                              )}
                            </motion.div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {/* ══ S5: RESOURCE CENTER ══════════════════════════════════════════ */}
          <section>
            <div className="mb-4">
              <p className="caption text-slate-500">Learning Materials</p>
              <h3 className="mt-1 text-lg font-semibold text-white">Resource Center</h3>
            </div>
            <div className="liquid-panel rounded-[24px] p-6">
              {/* Search + category filters */}
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    value={resourceSearch}
                    onChange={e => setResourceSearch(e.target.value)}
                    placeholder="Search resources..."
                    className="carved-input w-full rounded-xl py-2.5 pl-9 pr-4 text-sm text-white"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(["all", "courses", "docs", "practice", "projects"] as ResourceFilter[]).map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setResourceFilter(f)}
                      className={`rounded-full px-3.5 py-1.5 text-[11px] font-semibold capitalize transition ${
                        resourceFilter === f
                          ? "border border-cyan-400/30 bg-cyan-400/15 text-cyan-300"
                          : "border border-[#202028] bg-[#0d0d10] text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {filteredResources.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredResources.map((res, i) => (
                    <motion.a
                      key={`${res.url}-${i}`}
                      href={res.url}
                      target="_blank"
                      rel="noreferrer"
                      whileHover={{ scale: 1.02, boxShadow: "0 8px 28px rgba(0,0,0,0.75)" }}
                      className="group flex items-start justify-between gap-3 rounded-xl border border-[#141417] bg-[#08080a] p-4 transition"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white group-hover:text-cyan-300 transition leading-snug line-clamp-2">
                          {res.label}
                        </p>
                        <span className="mt-1.5 inline-block rounded-md border border-[#202028] bg-[#0d0d10] px-2 py-0.5 text-[10px] text-slate-500">
                          {res.provider}
                        </span>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-600 group-hover:text-cyan-400 transition mt-0.5" />
                    </motion.a>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-14 text-center">
                  <BookOpen className="h-10 w-10 text-slate-700" />
                  <p className="text-sm text-slate-500">
                    {resourceSearch ? `No resources match "${resourceSearch}"` : "No resources in this category."}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* ══ S7: AI INSIGHTS + S8: ANALYTICS ═════════════════════════════ */}
          <section className="grid gap-5 lg:grid-cols-2">

            {/* AI Insights */}
            <div className="liquid-panel rounded-[24px] p-6">
              <div className="mb-5 flex items-center gap-2.5">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <div>
                  <p className="caption text-slate-500">AI Analysis</p>
                  <h3 className="mt-0.5 text-base font-semibold text-white">Roadmap Insights</h3>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4">
                  <p className="caption text-emerald-400 mb-2">Strengths</p>
                  {(profile?.skills?.length ?? 0) > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {profile!.skills.slice(0, 5).map(s => (
                        <span key={s} className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-200">{s}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Complete profile to see strengths.</p>
                  )}
                </div>
                <div className="rounded-xl border border-rose-500/15 bg-rose-500/5 p-4">
                  <p className="caption text-rose-400 mb-2">Skill Gaps</p>
                  {(profile?.weaknesses?.length ?? 0) > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {profile!.weaknesses.slice(0, 4).map(w => (
                        <span key={w} className="rounded-md border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[11px] text-rose-200">{w}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No gaps identified yet.</p>
                  )}
                </div>
                <div className="rounded-xl border border-indigo-500/15 bg-indigo-500/5 p-4">
                  <p className="caption text-indigo-400 mb-2">Suggested Focus</p>
                  <div className="space-y-1.5">
                    {allMilestones.slice(completedCount, completedCount + 2).map(m => (
                      <p key={m.title} className="flex items-start gap-1.5 text-xs text-slate-300">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                        {m.title}
                      </p>
                    ))}
                    {allMilestones.slice(completedCount, completedCount + 2).length === 0 && (
                      <p className="text-xs text-slate-500">All milestones complete!</p>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4">
                  <p className="caption text-amber-400 mb-2">AI Reasoning</p>
                  <p className="text-xs text-slate-400 line-clamp-4 leading-relaxed">
                    {activeRoadmap.ai_reasoning ?? "Roadmap was generated based on your career goals and experience level."}
                  </p>
                </div>
              </div>
            </div>

            {/* Analytics */}
            <div className="liquid-panel rounded-[24px] p-6">
              <div className="mb-5">
                <p className="caption text-slate-500">Performance</p>
                <h3 className="mt-0.5 text-base font-semibold text-white">Roadmap Analytics</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Completion",    value: `${activeRoadmap.progress}%`,    color: "#22d3ee", pct: activeRoadmap.progress },
                  { label: "Milestones",    value: `${completedCount}/${allMilestones.length}`, color: "#818cf8", pct: allMilestones.length > 0 ? (completedCount / allMilestones.length) * 100 : 0 },
                  { label: "Market Demand", value: activeRoadmap.career_demand_score <= 10 ? `${activeRoadmap.career_demand_score}/10` : `${activeRoadmap.career_demand_score}/100`, color: "#f59e0b", pct: activeRoadmap.career_demand_score <= 10 ? activeRoadmap.career_demand_score * 10 : activeRoadmap.career_demand_score },
                  { label: "Projected",     value: activeRoadmap.estimated_completion_date, color: "#10b981", pct: 45 },
                ].map(({ label, value, color, pct }) => (
                  <div key={label} className="rounded-xl border border-[#141417] bg-[#08080a] p-4">
                    <p className="caption text-slate-500">{label}</p>
                    <p className="mt-2 text-lg font-bold text-white leading-none">{value}</p>
                    <div className="mt-3 h-1.5 rounded-full bg-[#141418] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(pct, 100)}%` }}
                        transition={{ duration: 1.2, ease: EASE }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* ══ S6: VERSION HISTORY (always visible) ══════════════════════════════ */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="caption text-slate-500">Snapshots</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Version History</h3>
          </div>
          <span className="text-[11px] text-slate-500">
            Latest {Math.min(safeRoadmapHistory.length, 12)} versions
          </span>
        </div>

        {safeRoadmapHistory.length > 0 ? (
          <div className="relative space-y-3">
            {/* Connector line */}
            <div className="absolute left-[15px] top-5 bottom-5 w-px bg-gradient-to-b from-white/10 via-white/5 to-transparent" />

            {safeRoadmapHistory.map((version, i) => {
              const isLatest = i === 0;
              const versionRoadmaps = Array.isArray(version.roadmaps) ? normalizeRoadmapArray(version.roadmaps) : [];
              return (
                <div key={version.id} className="relative flex gap-4 pl-10">
                  {/* Version node */}
                  <div className={`absolute left-0 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-bold ${
                    isLatest
                      ? "border-cyan-400 bg-cyan-400/15 text-cyan-300"
                      : "border-[#202028] bg-[#0d0d10] text-slate-500"
                  }`}>
                    v{version.roadmap_version}
                  </div>

                  <div className={`flex-1 rounded-[20px] border p-5 transition ${
                    isLatest ? "border-cyan-400/15 bg-cyan-950/5" : "border-[#141417] bg-[#07070a]"
                  }`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {isLatest && (
                            <span className="rounded-full border border-cyan-400/30 bg-cyan-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-cyan-300">
                              Current
                            </span>
                          )}
                          <span className="rounded-full border border-[#202028] bg-[#0d0d10] px-2 py-0.5 text-[10px] text-slate-400">
                            {version.career_domain}
                          </span>
                          <span className="text-[11px] text-slate-600">{formatDate(version.generated_at)}</span>
                          <span className="text-[11px] text-slate-600">
                            · {versionRoadmaps.length} roadmap{versionRoadmaps.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-white line-clamp-1">{version.career_goal}</h4>
                        <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">{version.ai_reasoning}</p>
                      </div>
                      {!isLatest && (
                        <button
                          type="button"
                          onClick={() => setRestoreConfirmId(version.id)}
                          className="tactile-btn shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-semibold text-slate-300 hover:text-white transition"
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-[24px] border border-dashed border-[#202028] py-14 text-center">
            <Activity className="h-10 w-10 text-slate-700" />
            <div>
              <p className="text-sm font-semibold text-slate-400">No version history yet</p>
              <p className="mt-1 text-xs text-slate-600">Refreshing a roadmap creates the first version snapshot.</p>
            </div>
          </div>
        )}
      </section>

      {/* ══ S9: EXPORT CENTER ══════════════════════════════════════════════════ */}
      <section>
        <div className="mb-4">
          <p className="caption text-slate-500">Data Portability</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Export Center</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Printer,  label: "Export PDF",      desc: "Professional PDF with milestones, resources & timeline",
              action: () => void handlePdfDownload(), disabled: !safeWorkspaceRoadmaps.length, primary: true,
            },
            {
              icon: FileText, label: "Export Markdown", desc: "Markdown for Notion, Obsidian, or GitHub",
              action: handleMarkdownExport, disabled: !safeWorkspaceRoadmaps.length, primary: false,
            },
            {
              icon: Download,  label: "Export JSON",    desc: "Raw roadmap data for integrations and tooling",
              action: handleJsonExport, disabled: !safeWorkspaceRoadmaps.length, primary: false,
            },
            {
              icon: Archive,  label: "Archive",         desc: "Archive this version to the snapshot history",
              action: () => showToast("Coming Soon: Archive will be available soon."), disabled: false, primary: false,
            },
          ].map(({ icon: Icon, label, desc, action, disabled, primary }) => (
            <motion.button
              key={label}
              type="button"
              onClick={action}
              disabled={disabled}
              whileHover={!disabled ? { y: -2, boxShadow: "0 12px 40px rgba(0,0,0,0.8)" } : {}}
              className={`relative flex flex-col items-start gap-3 rounded-[20px] border p-5 text-left transition disabled:opacity-40 disabled:cursor-not-allowed ${
                primary
                  ? "border-cyan-400/20 bg-cyan-950/10 hover:border-cyan-400/30"
                  : "border-[#141417] bg-[#07070a] hover:border-[#252530]"
              }`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                primary
                  ? "border-cyan-400/25 bg-cyan-400/15 text-cyan-300"
                  : "border-[#202028] bg-[#0d0d10] text-slate-400"
              }`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className={`text-sm font-semibold ${primary ? "text-cyan-300" : "text-white"}`}>{label}</p>
                <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">{desc}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* ══ RESTORE CONFIRM MODAL ══════════════════════════════════════════════ */}
      <AnimatePresence>
        {restoreConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/85">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="liquid-panel relative z-10 w-full max-w-sm rounded-[24px] p-6 text-center"
            >
              <AlertTriangle className="mx-auto h-8 w-8 text-amber-400 mb-4" />
              <h3 className="text-base font-semibold text-white">Restore this version?</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Your current roadmap will be replaced. The current state will be saved to version history automatically.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setRestoreConfirmId(null)}
                  className="tactile-btn flex-1 rounded-xl py-2.5 text-xs font-semibold text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const version = safeRoadmapHistory.find(v => v.id === restoreConfirmId);
                    if (version) void restoreRoadmapVersion(version);
                  }}
                  className="tactile-btn tactile-btn-primary flex-1 rounded-xl py-2.5 text-xs font-semibold text-black"
                >
                  Restore Version
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
