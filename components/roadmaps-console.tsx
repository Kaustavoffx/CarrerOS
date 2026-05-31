"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Cpu, Download, Printer, RefreshCw, ShieldAlert, Clock3 } from "lucide-react";
import { FREE_GENERATIONS } from "@/lib/config";
import { MagneticButton } from "./magnetic-button";
import { FeatureGateButton, FeatureStatusBadge } from "./feature-status";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { normalizeRoadmapArray, normalizeRoadmapVersionArray, updateWorkspace } from "@/lib/app-data";
import { buildRoadmapExportBundle, generateRoadmapPdfBlob, type AuditBlob } from "@/lib/roadmap-export";
import type { AiProviderStatusRecord, RoadmapRecord, RoadmapVersionRecord, UserProfileRecord, WorkspaceSnapshotRecord } from "@/lib/supabase/types";

type RoadmapsConsoleProps = {
  profile: UserProfileRecord | null;
  workspace: WorkspaceSnapshotRecord | null;
  roadmapHistory?: RoadmapVersionRecord[] | null;
  aiProviders?: AiProviderStatusRecord[] | null;
};

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function downloadPdfFile(filename: string, report: Parameters<typeof generateRoadmapPdfBlob>[0]): Promise<{ valid: boolean; warnings: string[] }> {
  const blob = await generateRoadmapPdfBlob(report);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);

  const auditBlob = blob as AuditBlob;
  return {
    valid: auditBlob.valid !== false,
    warnings: auditBlob.warnings || []
  };
}

export function RoadmapsConsole({ profile, workspace: initialWorkspace, roadmapHistory, aiProviders }: RoadmapsConsoleProps) {
  const [workspace, setWorkspace] = useState<WorkspaceSnapshotRecord | null>(initialWorkspace);
  const [isReplanning, setIsReplanning] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [freeGenerationsUsed, setFreeGenerationsUsed] = useState(0);
  const [limitExhausted, setLimitExhausted] = useState(false);

  const supabase = getSupabaseBrowserClient();
  const safeRoadmapHistory = normalizeRoadmapVersionArray(roadmapHistory);
  const safeWorkspaceRoadmaps = normalizeRoadmapArray(workspace?.roadmaps);
  const hasConnectedProvider = Array.isArray(aiProviders) && aiProviders.some((provider) => provider.connected);
  const freeGenerationsRemaining = Math.max(0, FREE_GENERATIONS - freeGenerationsUsed);

  useEffect(() => {
    setWorkspace(initialWorkspace);
  }, [initialWorkspace]);

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
        } catch {
          // Ignore usage lookup failures and keep the console functional.
        }
      }
    }

    fetchUsage();
  }, [profile?.id, supabase]);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  async function persistRoadmaps(updatedRoadmaps: RoadmapRecord[]) {
    const safeRoadmaps = normalizeRoadmapArray(updatedRoadmaps);

    setWorkspace((curr) => {
      if (!curr) return null;
      return { ...curr, roadmaps: safeRoadmaps };
    });

    if (supabase && profile?.id) {
      await updateWorkspace(supabase, profile.id, { roadmaps: safeRoadmaps });
    }
  }

  async function restoreRoadmapVersion(version: RoadmapVersionRecord) {
    if (!workspace) return;

    await persistRoadmaps(normalizeRoadmapArray(version.roadmaps));
    showToast(`Restored version ${version.roadmap_version}.`);
  }

  async function handleReplan() {
    if (isReplanning || !workspace) return;

    if (limitExhausted) {
      showToast("Free roadmap refreshes are exhausted for this account.");
      return;
    }

    setIsReplanning(true);
    showToast("Refreshing roadmap with curated project milestones...");

    try {
      const requestPayload = {
        profile,
        currentRoadmaps: safeWorkspaceRoadmaps
      };
      const response = await fetch("/api/replan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload)
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

      const updatedRoadmaps: RoadmapRecord[] = responseRoadmaps;
      await persistRoadmaps(updatedRoadmaps);
      setFreeGenerationsUsed((prev) => {
        const next = prev + 1;
        setLimitExhausted(next >= FREE_GENERATIONS);
        return next;
      });
      if (data?.provider_prompt) {
        showToast(data.provider_prompt_message || "Connect your own AI provider to continue.");
      } else {
        showToast("Roadmap regenerated and synced.");
      }
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
    downloadTextFile(`${(profile?.goal ?? "careeros-roadmap").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-roadmap.json`, bundle.json, "application/json;charset=utf-8");
    showToast("JSON export downloaded.");
  }

  function handleMarkdownExport() {
    if (!safeWorkspaceRoadmaps.length) return;
    const bundle = buildRoadmapExportBundle(safeWorkspaceRoadmaps, `${profile?.goal ?? "CareerOS"} Roadmap`);
    downloadTextFile(`${(profile?.goal ?? "careeros-roadmap").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-roadmap.md`, bundle.markdown, "text/markdown;charset=utf-8");
    showToast("Markdown export downloaded.");
  }

  async function handlePdfDownload() {
    if (!safeWorkspaceRoadmaps.length) return;
    const bundle = buildRoadmapExportBundle(safeWorkspaceRoadmaps, `${profile?.goal ?? "CareerOS"} Roadmap`);
    bundle.pdf.report.careerGoal = profile?.goal;
    bundle.pdf.report.readinessScore = profile?.readiness_score;
    try {
      const result = await downloadPdfFile(bundle.pdf.filename, bundle.pdf.report);
      if (!result.valid) {
        showToast("Roadmap quality warning detected. Export generated successfully.");
      } else {
        showToast("PDF downloaded.");
      }
    } catch (error) {
      console.error("PDF download failure:", error);
      showToast("PDF export failed.");
    }
  }

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-cyan-400/30 bg-[#0a0a0c] px-4 py-2 text-xs font-semibold text-cyan-200 shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08),0_0_20px_rgba(34,211,238,0.2)]">
          {toastMessage}
        </div>
      )}

      <section className="liquid-panel rounded-[24px] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.6)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="caption text-slate-500">Milestones</p>
            <h2 className="mt-2 font-sinistre text-dashboard font-black text-white">Your roadmap is built from real projects</h2>
            <p className="mt-2 max-w-2xl small text-slate-400">
              Each sprint now carries milestone detail, real learning resources, project tasks, deliverables, and export-ready data you can download or print.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <FeatureStatusBadge status="beta" featureName="AI Roadmap Generation" />
              <FeatureStatusBadge status="beta" featureName="Adaptive Replanning" />
              <FeatureStatusBadge status="coming-soon" featureName="Market Demand Score" />
              <FeatureStatusBadge status="coming-soon" featureName="Salary Intelligence" />
              <FeatureStatusBadge status="coming-soon" featureName="Automation Risk" />
              <FeatureStatusBadge status="coming-soon" featureName="Weekly Planner" />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 caption text-slate-500">
              <span className="flex items-center gap-2 rounded-xl border border-[#141417] bg-[#0c0c0e] px-2 py-1">
                <Cpu className="h-3.5 w-3.5 text-cyan-400" /> Free generations remaining: {freeGenerationsRemaining}/{FREE_GENERATIONS}
              </span>
              {limitExhausted ? (
                <span className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-2 py-1 text-red-300">
                  <ShieldAlert className="h-3.5 w-3.5" /> Refresh limit reached
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <MagneticButton asChild>
              <button
                type="button"
                onClick={handleJsonExport}
                className="inline-flex items-center gap-2 rounded-full border border-[#202028] bg-[#121218] px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white"
              >
                <Download className="h-4 w-4" />
                JSON
              </button>
            </MagneticButton>
            <MagneticButton asChild>
              <button
                type="button"
                onClick={handleMarkdownExport}
                className="inline-flex items-center gap-2 rounded-full border border-[#202028] bg-[#121218] px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white"
              >
                <ArrowRight className="h-4 w-4" />
                Markdown
              </button>
            </MagneticButton>
            <MagneticButton asChild>
              <button
                type="button"
                onClick={() => void handlePdfDownload()}
                className="inline-flex items-center gap-2 rounded-full border border-[#202028] bg-[#121218] px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white"
              >
                <Printer className="h-4 w-4" />
                PDF
              </button>
            </MagneticButton>
            <MagneticButton asChild>
              <FeatureGateButton
                type="button"
                onClick={handleReplan}
                disabled={isReplanning || limitExhausted}
                status="beta"
                featureName="AI Roadmap Generation"
                className="tactile-btn tactile-btn-primary inline-flex items-center gap-2 rounded-full px-6 py-2 text-xs font-bold text-black shadow-[0_0_15px_rgba(34,211,238,0.2)] disabled:opacity-40"
              >
                {isReplanning ? <span className="loading-spinner mr-1.5" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
                {isReplanning ? "Refreshing roadmap..." : "Refresh roadmap"}
              </FeatureGateButton>
            </MagneticButton>
          </div>
        </div>
      </section>

      {limitExhausted && !hasConnectedProvider ? (
        <section className="rounded-[24px] border border-amber-400/20 bg-amber-400/10 p-5 text-amber-50 shadow-[0_24px_90px_rgba(0,0,0,0.35)]">
          <p className="caption text-amber-200">BYOK required</p>
          <h3 className="mt-2 heading-card text-white">Your free generations are exhausted.</h3>
          <p className="mt-2 max-w-2xl small text-amber-50/90">Connect your own AI provider to continue generating fresh roadmaps without interruption.</p>
          <div className="mt-4">
            <Link href="/settings#ai-providers" className="tactile-btn tactile-btn-primary inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-black">
              Configure AI Provider
            </Link>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="col-span-full rounded-[24px] border border-[#141417] bg-[#070708] p-5 space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="caption text-slate-500">Version history</p>
              <h3 className="heading-card text-white">Roadmap snapshots and restore points</h3>
            </div>
            <p className="caption text-slate-500">Latest {Math.min(safeRoadmapHistory.length, 12)} versions from Supabase</p>
          </div>

          {safeRoadmapHistory.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {safeRoadmapHistory.map((version) => {
                const versionRoadmaps = Array.isArray(version.roadmaps) ? normalizeRoadmapArray(version.roadmaps) : [];

                return (
                <div key={version.id} className="rounded-2xl border border-[#141417] bg-[#050506] p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="caption text-slate-500">Version {version.roadmap_version}</p>
                      <h4 className="heading-card text-white">{version.career_goal}</h4>
                    </div>
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 caption text-cyan-300">
                      {version.career_domain}
                    </span>
                  </div>
                  <p className="small text-slate-400 line-clamp-3">{version.ai_reasoning}</p>
                  <div className="flex items-center justify-between caption text-slate-500">
                    <span>{new Date(version.generated_at).toLocaleDateString()}</span>
                    <span>{versionRoadmaps.length} roadmap(s)</span>
                  </div>
                  <MagneticButton asChild>
                    <button
                      type="button"
                      onClick={() => restoreRoadmapVersion(version)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#202028] bg-[#121218] px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white"
                    >
                      Restore version
                    </button>
                  </MagneticButton>
                </div>
              );})}
            </div>
          ) : (
            <p className="small text-slate-400">No version history yet. Refreshing a roadmap will create the first snapshot.</p>
          )}
        </div>

        {safeWorkspaceRoadmaps.length ? (
          safeWorkspaceRoadmaps.map((roadmap) => {
            const weeklySchedule = Array.isArray(roadmap.weekly_schedule) ? roadmap.weekly_schedule : [];
            const learningOutcomes = Array.isArray(roadmap.learning_outcomes) ? roadmap.learning_outcomes : [];
            const resourceLinks = Array.isArray(roadmap.resource_links) ? roadmap.resource_links : [];
            const expectedOutcomes = Array.isArray(roadmap.expected_outcomes) ? roadmap.expected_outcomes : [];
            const milestones = Array.isArray(roadmap.milestones) ? roadmap.milestones : [];

            return (
              <article key={roadmap.id} className="liquid-card rounded-[24px] p-6 relative overflow-hidden group space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="rounded-md bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 caption text-cyan-300">
                      {roadmap.status}
                    </span>
                    <h3 className="mt-3 heading-card text-white">{roadmap.title}</h3>
                    <p className="mt-2 small text-slate-400">{roadmap.summary}</p>
                    <div className="mt-3 flex flex-wrap gap-2 caption text-slate-400">
                      <span className="rounded-full border border-[#141417] bg-[#0a0a0c] px-2 py-1">{roadmap.career_domain}</span>
                      <span className="rounded-full border border-[#141417] bg-[#0a0a0c] px-2 py-1">Demand {roadmap.career_demand_score}/100</span>
                      <span className="rounded-full border border-[#141417] bg-[#0a0a0c] px-2 py-1">Version {roadmap.roadmap_version}</span>
                    </div>
                  </div>
                  <span className="text-cyan-300 font-sinistre font-black text-sm bg-[#0c0c0e] border border-[#141417] px-2.5 py-1 rounded-xl">
                    {roadmap.progress}%
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[#141417] bg-[#09090b] p-3">
                    <div className="flex items-center gap-2 caption text-slate-500">
                      <CalendarDays className="h-3.5 w-3.5 text-cyan-400" /> Duration
                    </div>
                    <p className="mt-2 text-sm font-semibold text-white">{roadmap.total_duration_weeks} weeks</p>
                  </div>
                  <div className="rounded-2xl border border-[#141417] bg-[#09090b] p-3">
                    <div className="flex items-center gap-2 caption text-slate-500">
                      <Clock3 className="h-3.5 w-3.5 text-cyan-400" /> Weekly hours
                    </div>
                    <p className="mt-2 text-sm font-semibold text-white">{roadmap.weekly_hours} hours</p>
                  </div>
                  <div className="rounded-2xl border border-[#141417] bg-[#09090b] p-3">
                    <div className="flex items-center gap-2 caption text-slate-500">
                      <Cpu className="h-3.5 w-3.5 text-cyan-400" /> Completion
                    </div>
                    <p className="mt-2 text-sm font-semibold text-white">{roadmap.estimated_completion_date}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[#141417] bg-[#09090b] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="caption text-slate-500">Market outlook</p>
                      <FeatureStatusBadge status="coming-soon" featureName="Market Demand Score" />
                    </div>
                    <p className="mt-2 text-sm text-slate-200">{roadmap.market_outlook || "Coming Soon"}</p>
                  </div>
                  <div className="rounded-2xl border border-[#141417] bg-[#09090b] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="caption text-slate-500">Salary range</p>
                      <FeatureStatusBadge status="coming-soon" featureName="Salary Intelligence" />
                    </div>
                    <p className="mt-2 text-sm text-slate-200">{roadmap.salary_range || "Coming Soon"}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="caption text-slate-500">Automation risk</p>
                      <FeatureStatusBadge status="coming-soon" featureName="Automation Risk" />
                    </div>
                    <p className="mt-2 text-sm text-slate-200">{roadmap.automation_risk || "Coming Soon"}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#141417] bg-[#080809] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="caption text-slate-500">Weekly structure</p>
                    <FeatureStatusBadge status="coming-soon" featureName="Weekly Planner" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {weeklySchedule.length ? weeklySchedule.map((item) => (
                      <span key={item} className="rounded-full border border-cyan-400/15 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
                        {item}
                      </span>
                    )) : <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-200">Coming Soon</span>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 caption text-slate-400">
                    {learningOutcomes.length ? learningOutcomes.map((item) => (
                      <span key={item} className="rounded-full border border-[#141417] bg-[#0b0b0d] px-2 py-1">
                        {item}
                      </span>
                    )) : <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-amber-200">Coming Soon</span>}
                  </div>
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-[#040405] border border-[#141418]">
                  <div
                    className="h-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)] transition-all duration-500"
                    style={{ width: `${roadmap.progress}%` }}
                  />
                </div>

                <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                  <div className="space-y-3 rounded-2xl border border-[#141417] bg-[#070708] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="caption text-slate-500">Resources</p>
                      <FeatureStatusBadge status="coming-soon" featureName="Curated Learning Resources" />
                    </div>
                    <ul className="space-y-2 text-xs text-slate-300">
                      {resourceLinks.length ? resourceLinks.map((resource) => (
                        <li key={resource.url}>
                          <span className="text-slate-200" title="Coming Soon: verified learning resources are not yet production-ready.">
                            {resource.label}
                          </span>
                          <span className="text-slate-500"> · {resource.provider}</span>
                        </li>
                      )) : <li className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-amber-200">Coming Soon</li>}
                    </ul>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-[#141417] bg-[#070708] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="caption text-slate-500">Project recommendations</p>
                      <FeatureStatusBadge status="coming-soon" featureName="Project Recommendations" />
                    </div>
                    <ul className="space-y-2 text-xs text-slate-300">
                      {expectedOutcomes.length ? expectedOutcomes.map((item) => (
                        <li key={item}>• {item}</li>
                      )) : <li className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-amber-200">Coming Soon</li>}
                    </ul>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="caption text-slate-500">Milestones</p>
                    <FeatureStatusBadge status="coming-soon" featureName="Milestone Generator" />
                  </div>
                  <div className="space-y-3">
                    {milestones.map((milestone) => {
                      const completionCriteria = Array.isArray(milestone.completion_criteria) ? milestone.completion_criteria : [];
                      const projects = Array.isArray(milestone.projects) ? milestone.projects : [];
                      const projectTasks = Array.isArray(milestone.project_tasks) ? milestone.project_tasks : [];
                      const deliverables = Array.isArray(milestone.deliverables) ? milestone.deliverables : [];
                      const milestoneResources = Array.isArray(milestone.resource_links) ? milestone.resource_links : [];

                      return (
                        <div key={milestone.title} className="rounded-2xl border border-[#141417] bg-[#050506] p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <h4 className="heading-card text-white">{milestone.title}</h4>
                              <p className="mt-1 small text-slate-400">{milestone.why_it_matters}</p>
                            </div>
                            <div className="text-xs text-slate-400 sm:text-right">
                              <div>{milestone.estimated_duration_weeks} week(s)</div>
                              <div>{milestone.difficulty_level}</div>
                            </div>
                          </div>

                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div>
                              <p className="caption text-slate-500">Completion criteria</p>
                              <ul className="mt-2 space-y-1 text-xs text-slate-300">
                                {completionCriteria.map((item) => (
                                  <li key={item}>• {item}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="caption text-slate-500">Projects</p>
                              <ul className="mt-2 space-y-1 text-xs text-slate-300">
                                {projects.map((project) => (
                                  <li key={project}>• {project}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="caption text-slate-500">Project tasks</p>
                              <ul className="mt-2 space-y-1 text-xs text-slate-300">
                                {projectTasks.map((task) => (
                                  <li key={task}>• {task}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="caption text-slate-500">Deliverables</p>
                              <ul className="mt-2 space-y-1 text-xs text-slate-300">
                                {deliverables.map((deliverable) => (
                                  <li key={deliverable}>• {deliverable}</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div className="mt-3">
                            <p className="caption text-slate-500">Milestone resources</p>
                            <ul className="mt-2 space-y-2 text-xs text-slate-300">
                              {milestoneResources.map((resource) => (
                                <li key={resource.url}>
                                  <a className="text-cyan-300 hover:underline" href={resource.url} target="_blank" rel="noreferrer">
                                    {resource.label}
                                  </a>
                                  <span className="text-slate-500"> · {resource.provider}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-4 caption text-slate-500">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-3.5 w-3.5 text-cyan-400" /> Curated roadmap
                  </div>
                  <div>Updated: {new Date(roadmap.updated_at).toLocaleDateString()}</div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="col-span-full rounded-3xl border border-dashed border-[#141417] bg-[#040405] p-10 text-center text-slate-500 italic text-xs">
            No active roadmaps synced. Trigger a refresh above to generate one.
          </div>
        )}
      </section>
    </div>
  );
}
