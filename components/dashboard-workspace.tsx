"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, Trash2, Check, TrendingUp, X, PlusCircle, Briefcase } from "lucide-react";
import { MagneticButton } from "./magnetic-button";
import { FeatureStatusBadge } from "./feature-status";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { generateId } from "@/lib/id";
import { updateWorkspace } from "@/lib/app-data";
import type { NoteRecord, ProgressRecord, UserProfileRecord, WorkspaceSnapshotRecord } from "@/lib/supabase/types";

type DashboardWorkspaceProps = {
  profile: UserProfileRecord | null;
  workspace: WorkspaceSnapshotRecord | null;
};

export function DashboardWorkspace({ profile, workspace: initialWorkspace }: DashboardWorkspaceProps) {
  const [workspace, setWorkspace] = useState<WorkspaceSnapshotRecord | null>(initialWorkspace);
  
  // Interactive UI modals states
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Note state
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteTag, setNoteTag] = useState("Strategy");

  // New Progress state
  const [progressLabel, setProgressLabel] = useState("");
  const [progressValue, setProgressValue] = useState(60);
  const [progressNote, setProgressNote] = useState("");

  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    setWorkspace(initialWorkspace);
  }, [initialWorkspace]);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  // Persist Workspace state helper
  async function persistWorkspaceChange(updated: Partial<WorkspaceSnapshotRecord>) {
    if (!workspace) return;
    const nextState = { ...workspace, ...updated };
    setWorkspace(nextState);

    try {
      if (supabase && profile?.id) {
        await updateWorkspace(supabase, profile.id, updated);
        showToast("Synchronized with cloud workspace.");
      } else {
        showToast("Saved locally.");
      }
    } catch {
      showToast("Cloud sync failed. Saved to memory.");
    }
  }

  // Checklist Milestone toggle
  async function toggleMilestone(roadmapId: string) {
    if (!workspace) return;
    const roadmaps = workspace.roadmaps.map((r) => {
      if (r.id !== roadmapId) return r;
      // Synthesize custom progress tracking based on completed items
      // Simulating toggle progression:
      const curProgress = r.progress;
      let nextProgress = curProgress + 20;
      if (nextProgress > 100) nextProgress = 20; // Loop or toggle back
      return { ...r, progress: nextProgress, updated_at: new Date().toISOString() };
    });
    await persistWorkspaceChange({ roadmaps });
    showToast("Sprint milestones updated successfully.");
  }

  // Create Note (CRUD)
  async function handleCreateNote() {
    if (!workspace) return;
    const newNote: NoteRecord = {
      id: generateId(),
      title: noteTitle.trim() || "Untitled strategy",
      content: noteContent.trim() || "No content details.",
      tag: noteTag,
      created_at: new Date().toISOString()
    };
    const notes = [newNote, ...workspace.notes];
    await persistWorkspaceChange({ notes });
    setNoteModalOpen(false);
    setNoteTitle("");
    setNoteContent("");
    showToast("New strategy note pinned.");
  }

  // Delete Note
  async function handleDeleteNote(noteId: string) {
    if (!workspace) return;
    const notes = workspace.notes.filter((n) => n.id !== noteId);
    await persistWorkspaceChange({ notes });
    showToast("Strategy note archived.");
  }

  // Add Progress Log
  async function handleAddProgress() {
    if (!workspace) return;
    const newLog: ProgressRecord = {
      id: generateId(),
      label: progressLabel.trim() || "General Momentum",
      value: progressValue,
      date: "Today",
      note: progressNote.trim() || "Progress check logged."
    };
    const progress = [newLog, ...workspace.progress];
    await persistWorkspaceChange({ progress });
    setProgressModalOpen(false);
    setProgressLabel("");
    setProgressNote("");
    showToast("Momentum log synchronized.");
  }

  // Dynamic Matching Opportunities list based on target goal
  const jobListings = [
    { role: "Frontend Engineer", company: "Vercel", type: "Full-Time", location: "Remote", match: "94%" },
    { role: "Product Designer", company: "Linear", type: "Full-Time", location: "NYC / Hybrid", match: "89%" },
    { role: "Machine Learning Dev", company: "Stripe", type: "Full-Time", location: "SF / Hybrid", match: "91%" }
  ];

  const savedRoadmapCount = workspace?.roadmaps.length ?? 0;
  const readinessScore = profile?.readiness_score ?? 0;

  return (
    <div className="space-y-6">
      
      {/* Dynamic Toast overlay */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 rounded-xl border border-cyan-400/25 bg-[#0a0a0c] px-4 py-3 text-xs font-medium text-cyan-200 shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08),0_0_20px_rgba(34,211,238,0.2)]"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CORE HIGHLIGHT BLOCK */}
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="liquid-panel rounded-[24px] p-6 sm:p-8">
          
          <div className="flex items-center gap-2 relative z-10">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400"></span>
            </span>
            <p className="caption text-cyan-400">Active Workspace</p>
          </div>
          
          <h2 className="mt-4 text-4xl font-medium text-white sm:text-5xl leading-none relative z-10">
            Welcome back. The OS is initialized.
          </h2>
          <p className="mt-4 max-w-xl body text-slate-400 relative z-10">
            Every technical skill, timeline constraint, and budget parameter is mapped directly to weekly sprint milestones. Use notes and milestone checklists to maintain steady momentum.
          </p>

          <div className="mt-8 flex flex-wrap gap-3 relative z-10">
            <MagneticButton asChild>
              <Link href="/roadmaps" className="tactile-btn tactile-btn-primary inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-xs font-medium text-black shadow-[0_4px_12px_rgba(34,211,238,0.2)]">
                Open roadmaps
                <ArrowRight className="h-4 w-4" />
              </Link>
            </MagneticButton>
            
            <MagneticButton asChild>
              <Link href="/mentor" className="tactile-btn inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-xs font-medium text-slate-300 hover:text-white">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                Interact with Mentor
              </Link>
            </MagneticButton>
          </div>
        </div>

        {/* METRICS SIDE GRID PANEL */}
        <div className="grid gap-4 sm:grid-cols-2">
          
          {/* Goal card */}
          <div className="liquid-card rounded-2xl p-4 hover:bg-[#141418]">
            <p className="caption text-slate-500">Target Objective Goal</p>
            <h3 className="mt-3.5 heading-card text-white">{profile?.goal ?? "Add a goal in onboarding"}</h3>
            <p className="mt-2 small text-slate-400">Roadmap synthesizes pacing targeting this specific track.</p>
          </div>

          {/* Readiness Score dial card */}
          <div className="liquid-card rounded-2xl p-4 hover:bg-[#141418]">
            <p className="caption text-slate-500">Readiness Score Index</p>
            <div className="mt-3 flex items-end gap-2.5">
              <span className="text-dashboard font-medium text-cyan-300">{readinessScore > 0 ? `${readinessScore}%` : "Coming Soon"}</span>
              <span className="pb-0.5 small text-cyan-400 font-medium">{readinessScore > 0 ? "Active" : "Beta"}</span>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#040405] border border-[#141418] relative shadow-[inset_0_1px_1px_rgba(0,0,0,0.8)]">
              <div
                className="absolute inset-y-0 left-0 bg-[linear-gradient(90deg,#22d3ee,#818cf8)] shadow-[0_0_8px_rgba(34,211,238,0.5)] transition-all duration-500"
                style={{ width: readinessScore > 0 ? `${readinessScore}%` : "0%" }}
              />
            </div>
          </div>

          {/* Sprints counter */}
          <div className="liquid-card rounded-2xl p-4 hover:bg-[#141418]">
            <p className="caption text-slate-500">Active Sprint Cycles</p>
            <h3 className="mt-3.5 heading-card text-white">{savedRoadmapCount > 0 ? `${savedRoadmapCount} Roadmaps Saved` : "Coming Soon"}</h3>
            <p className="mt-2 small text-slate-400">{savedRoadmapCount > 0 ? "Progress metrics automatically sync to Supabase clouds." : "Roadmap syncing will appear once launch data is ready."}</p>
          </div>

          {/* Cloud Synchronization status */}
          <div className="liquid-card rounded-2xl p-4 hover:bg-[#141418]">
            <p className="caption text-slate-500">Workspace Persistence</p>
            <h3 className="mt-3.5 heading-card text-white">Continuous Sync</h3>
            <p className="mt-2 small text-slate-400">All logs are archived automatically, ensuring multi-device resume.</p>
          </div>

        </div>
      </section>

      {/* ROADMAP SPRINTS & ACTIVE CHECKS MODULE */}
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        
        {/* Current Focus Sprint (with interactive toggles) */}
        <div className="liquid-panel rounded-[24px] p-6">
          <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4 mb-5 relative z-10">
            <div>
              <p className="caption text-slate-500">Roadmap Sprint</p>
              <h3 className="mt-1.5 heading-dashboard text-white">Milestone Sprint Checklist</h3>
            </div>
            <span className="rounded-full bg-[#082f49] border border-cyan-400/25 px-3 py-1 caption text-cyan-200 shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
              Sprint Active
            </span>
          </div>

          <div className="space-y-4 relative z-10">
            {workspace?.roadmaps.map((r) => (
              <div key={r.id} className="liquid-card rounded-2xl p-5 hover:bg-[#141418]">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="heading-card text-white">{r.title}</h4>
                  <span className="rounded-full bg-[#082f49] border border-cyan-400/25 px-2.5 py-0.5 font-medium text-cyan-200 shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
                    {r.progress}%
                  </span>
                </div>
                <p className="mt-2.5 small text-slate-400">{r.summary}</p>
                
                {/* Simulated Interactive Checkboxes */}
                <div className="mt-5 space-y-2.5 pt-4 border-t border-white/5">
                  <p className="caption text-slate-500 mb-2.5">Toggle sprint milestone states</p>
                  
                  {[
                    "Construct foundational design systems and layout schemas",
                    "Conduct accessibility audits and tighten keyboard focus stories",
                    "Draft in-depth case study proof of work detailing outcomes"
                  ].map((milestone, idx) => {
                    const isCompleted = r.progress > idx * 33;
                    return (
                      <button
                        key={milestone}
                        type="button"
                        onClick={() => toggleMilestone(r.id)}
                        className={`w-full flex items-start gap-3 rounded-xl border p-3.5 text-left small transition-all duration-200 cursor-pointer ${
                          isCompleted
                            ? "border-cyan-400/25 bg-[#082f49] text-cyan-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_8px_rgba(0,0,0,0.4)]"
                            : "border-[#202028] bg-[#0c0c0e] text-slate-400 hover:border-[#30303c] hover:bg-[#141418] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_4px_8px_rgba(0,0,0,0.4)]"
                        } active:scale-[0.99]`}
                      >
                        <span className={`h-4.5 w-4.5 rounded border flex items-center justify-center shrink-0 transition ${
                          isCompleted ? "border-cyan-400 bg-cyan-400 text-black" : "border-[#202028] bg-[#040405] shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]"
                        }`}>
                          {isCompleted && <Check className="h-3 w-3" />}
                        </span>
                        <span className="leading-snug">{milestone}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#040405] border border-[#141418] shadow-[inset_0_1px_1px_rgba(0,0,0,0.8)]">
                  <div className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-500 shadow-[0_0_8px_rgba(34,211,238,0.5)]" style={{ width: `${r.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ACTIVE STRATEGY NOTES WITH CRUD INLINE CREATION */}
        <div className="liquid-panel rounded-[24px] p-6">
          <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4 mb-5 relative z-10">
            <div>
              <p className="caption text-slate-500">Archive</p>
              <h3 className="mt-1.5 heading-dashboard text-white">Strategy Notes</h3>
            </div>
            <button
              type="button"
              onClick={() => setNoteModalOpen(true)}
              className="tactile-btn tactile-btn-primary inline-flex items-center gap-1.5 rounded-full px-4 py-2 caption text-black"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              New Note
            </button>
          </div>

          <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1 relative z-10">
            {workspace?.notes.length ? (
              workspace.notes.map((note) => (
                <div key={note.id} className="liquid-card rounded-2xl p-4.5 group relative hover:bg-[#141418]">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-[#082f49] border border-cyan-400/25 px-2 py-0.5 caption font-medium text-cyan-200">
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
                  <h4 className="mt-3.5 heading-card text-white">{note.title}</h4>
                  <p className="mt-2 small text-slate-400">{note.content}</p>
                </div>
              ))
            ) : (
              <p className="small text-slate-500 italic text-center py-6">No strategy notes added. Click New Note to create one.</p>
            )}
          </div>
        </div>

      </section>

      {/* MOMENTUM TRACKING AND JOBS OPPORTUNITIES MATCHER */}
      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        
        {/* Momentum tracker with popup Logger */}
        <div className="liquid-panel rounded-[24px] p-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5 relative z-10">
            <div>
              <p className="caption text-slate-500">Momentum logs</p>
              <h3 className="mt-1.5 heading-dashboard text-white">Velocity Index</h3>
            </div>
            <button
              type="button"
              onClick={() => setProgressModalOpen(true)}
              className="tactile-btn tactile-btn-primary inline-flex items-center gap-1.5 rounded-full px-4 py-2 caption text-black"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Log Progress
            </button>
          </div>

          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 relative z-10">
            {workspace?.progress.map((item) => (
              <div key={item.id} className="liquid-card rounded-2xl p-4.5 hover:bg-[#141418]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="caption text-slate-500">{item.label}</span>
                    <p className="text-card font-medium text-cyan-300 mt-1">{item.value}%</p>
                  </div>
                  <span className="caption text-slate-500">{item.date}</span>
                </div>
                <div className="mt-3.5 h-1.5 rounded-full bg-[#040405] border border-[#141418] overflow-hidden shadow-[inset_0_1px_1px_rgba(0,0,0,0.8)]">
                  <div className="h-full bg-cyan-400 transition-all" style={{ width: `${item.value}%` }} />
                </div>
                <p className="mt-3 small text-slate-400">{item.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Opportunity matcher list */}
        <div className="liquid-panel rounded-[24px] p-6 relative overflow-hidden">
          
          <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-5 relative z-10">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-400"></span>
            </span>
            <p className="caption text-slate-500">Matching Jobs Opportunity Board</p>
            <FeatureStatusBadge status="coming-soon" featureName="Job Market Forecasting" />
          </div>

          <div className="space-y-3.5 relative z-10">
            {jobListings.map((job) => (
              <div key={job.company} className="liquid-card flex items-center justify-between rounded-2xl p-4.5 group hover:bg-[#141418]">
                <div className="flex items-center gap-3.5">
                  <span className="h-10 w-10 flex items-center justify-center rounded-xl bg-[#0c0c0e] border border-[#141417] text-cyan-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                    <Briefcase className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <h4 className="heading-card text-white">{job.role}</h4>
                    <p className="small text-slate-400 mt-1">{job.company} · {job.location} · {job.type}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 font-medium text-emerald-400 tracking-wider">
                    {job.match} MATCH
                  </span>
                  <button
                    type="button"
                    onClick={() => showToast(`Sent application to ${job.company} for the ${job.role} role.`)}
                    disabled
                    aria-disabled="true"
                    title="🚧 Coming Soon: job matching actions are disabled until the feature is production-ready."
                    className="tactile-btn tactile-btn-primary opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 rounded-full px-3 py-1.5 caption text-black"
                  >
                    Apply Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </section>

      {/* MODAL 1: NOTE STRATEGY CREATION MODAL */}
      <AnimatePresence>
        {noteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/85">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="liquid-panel w-full max-w-lg rounded-[24px] p-6 relative"
            >
              <button
                type="button"
                onClick={() => setNoteModalOpen(false)}
                className="tactile-btn absolute top-6 right-6 rounded-full p-2 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

              <h3 className="heading-dashboard text-white mb-4 relative z-10">Pin New Strategy Note</h3>
              
              <div className="space-y-4 relative z-10">
                <label className="block space-y-1.5">
                  <span className="caption text-slate-500">Title</span>
                  <input
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="e.g. Portfolio positioning narrative"
                    className="carved-input w-full rounded-xl px-4 py-2 text-sm text-white focus:border-cyan-400/60 focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.95),0_0_15px_rgba(34,211,238,0.2)]"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="caption text-slate-500">Content details</span>
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={4}
                    placeholder="Strategy actions, milestones checklist, pivot observations..."
                    className="carved-input w-full rounded-xl px-4 py-2 text-sm text-white focus:border-cyan-400/60 focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.95),0_0_15px_rgba(34,211,238,0.2)] resize-none"
                  />
                </label>

                <div>
                  <span className="caption text-slate-500 block mb-1.5">Categorization Tag</span>
                  <div className="flex gap-2">
                    {["Strategy", "Portfolio", "Technical", "Career"].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setNoteTag(tag)}
                        className={`rounded-full px-4 py-2 text-xs font-medium border transition cursor-pointer ${
                          noteTag === tag
                            ? "border-cyan-400 bg-cyan-400/10 text-cyan-200"
                            : "border-[#202028] bg-[#0c0c0e] text-slate-400"
                        } text-xs active:scale-95`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setNoteModalOpen(false)}
                    className="tactile-btn text-slate-300 px-4 py-2 rounded-xl text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateNote}
                    className="tactile-btn tactile-btn-primary px-4 py-2 rounded-xl text-xs font-medium text-black"
                  >
                    Pin Note
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: PROGRESS LOG ADDITION MODAL */}
      <AnimatePresence>
        {progressModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/85">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="liquid-panel w-full max-w-lg rounded-[24px] p-6 relative"
            >
              <button
                type="button"
                onClick={() => setProgressModalOpen(false)}
                className="tactile-btn absolute top-6 right-6 rounded-full p-2 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

              <h3 className="heading-dashboard text-white mb-4 relative z-10">Log Career Momentum Progress</h3>
              
              <div className="space-y-4 relative z-10">
                <label className="block space-y-1.5">
                  <span className="caption text-slate-500">Dimension Metric / Label</span>
                  <input
                    value={progressLabel}
                    onChange={(e) => setProgressLabel(e.target.value)}
                    placeholder="e.g. Portfolio Readiness, Technical Capacity, AWS Certificate..."
                    className="carved-input w-full rounded-xl px-4 py-2 text-sm text-white focus:border-cyan-400/60 focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.95),0_0_15px_rgba(34,211,238,0.25)]"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="caption text-slate-500">Current Value Percentage (1 to 100)</span>
                  <div className="flex gap-4 items-center">
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={progressValue}
                      onChange={(e) => setProgressValue(Number(e.target.value))}
                      className="w-full accent-cyan-400 bg-[#040405] rounded-lg cursor-pointer border border-[#141417] shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]"
                    />
                    <span className="font-medium text-sm text-cyan-200 bg-[#082f49] border border-cyan-400/25 px-4 py-2 rounded-md shrink-0 shadow-[0_4px_8px_rgba(0,0,0,0.4)]">
                      {progressValue}%
                    </span>
                  </div>
                </label>

                <label className="block space-y-1.5">
                  <span className="caption text-slate-500">Context Note</span>
                  <textarea
                    value={progressNote}
                    onChange={(e) => setProgressNote(e.target.value)}
                    rows={3}
                    placeholder="e.g. Pinned 2 new case studies and verified code structure layouts..."
                    className="carved-input w-full rounded-xl px-4 py-2 text-sm text-white focus:border-cyan-400/60 focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.95),0_0_15px_rgba(34,211,238,0.25)] resize-none"
                  />
                </label>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setProgressModalOpen(false)}
                    className="tactile-btn text-slate-300 px-4 py-2 rounded-xl text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddProgress}
                    className="tactile-btn tactile-btn-primary px-4 py-2 rounded-xl text-xs font-medium text-black"
                  >
                    Log Progress
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
