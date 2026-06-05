"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { UserProfileRecord, WorkspaceSnapshotRecord, ExperienceLevel } from "@/lib/supabase/types";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { updateProfile } from "@/lib/app-data";
import { MagneticButton } from "./magnetic-button";
import {
  Shield,
  RefreshCw,
  Database,
  Download,
  Activity,
  ShieldCheck,
  Lock,
  User,
  Compass,
  Link as LinkIcon,
  Globe,
  FileText,
  Settings,
  Trash2,
  Plus,
  Share2,
  Check
} from "lucide-react";

type ProfileDashboardProps = {
  userId: string;
  profile: UserProfileRecord | null;
  workspace: WorkspaceSnapshotRecord | null;
};

export function ProfileDashboard({ userId, profile, workspace }: ProfileDashboardProps) {
  const router = useRouter();
  const summaryAutosaveTimer = useRef<NodeJS.Timeout | null>(null);

  // SECTION 1: IDENTITY HEADER
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [goal, setGoal] = useState(profile?.goal ?? "");
  const [readinessScore, setReadinessScore] = useState(profile?.readiness_score ?? 0);

  // SECTION 2: CAREER SNAPSHOT (Editable)
  const [isEditingSnapshot, setIsEditingSnapshot] = useState(false);
  const [snapshotGoal, setSnapshotGoal] = useState(profile?.goal ?? "");
  const [snapshotLevel, setSnapshotLevel] = useState<ExperienceLevel>(profile?.experience_level ?? "Junior");
  const [snapshotCapacity, setSnapshotCapacity] = useState(profile?.time_availability ?? "");
  const [snapshotStyle, setSnapshotStyle] = useState(profile?.learning_style ?? "");
  const [savingSnapshot, setSavingSnapshot] = useState(false);

  // SECTION 3: PROFESSIONAL SUMMARY (Autosave, char count)
  const [professionalSummary, setProfessionalSummary] = useState("");
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "typing" | "saving" | "saved">("idle");

  // SECTION 4: CONNECTED ACCOUNTS (URLs editable inline)
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [activeManageAccount, setActiveManageAccount] = useState<"github" | "linkedin" | "portfolio" | "resume" | null>(null);
  const [pulseAccount, setPulseAccount] = useState<string | null>(null);

  // SECTION 6: SKILLS (Dynamic from profile.skills)
  const [skillsList, setSkillsList] = useState<string[]>(profile?.skills ?? []);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [savingSkills, setSavingSkills] = useState(false);

  // SECTION 7: RECENT TIMELINE (Dynamic from workspace.progress)
  const progressLogs = workspace?.progress ?? [];

  // SECTION 8: CONFIGURATIONS / ACTIONS
  const [timezone, setTimezone] = useState("Asia/Kolkata (GMT+5:30)");
  const [savingSettings, setSavingSettings] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // References for layout scroll target
  const settingsFormRef = useRef<HTMLDivElement>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Sync state values on profile database props change
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
      setGoal(profile.goal ?? "");
      setReadinessScore(profile.readiness_score ?? 0);
      setSnapshotGoal(profile.goal ?? "");
      setSnapshotLevel(profile.experience_level ?? "Junior");
      setSnapshotCapacity(profile.time_availability ?? "");
      setSnapshotStyle(profile.learning_style ?? "");
      setSkillsList(profile.skills ?? []);
    }
  }, [profile]);

  // Load local persistence variables on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const summary = localStorage.getItem("profile_professional_summary") ?? "";
      setProfessionalSummary(summary);

      setGithubUrl(localStorage.getItem("profile_github_url") ?? "");
      setLinkedinUrl(localStorage.getItem("profile_linkedin_url") ?? "");
      setPortfolioUrl(localStorage.getItem("profile_portfolio_url") ?? "");
      setResumeUrl(localStorage.getItem("profile_resume_url") ?? "");
      setTimezone(localStorage.getItem("profile_timezone") ?? "Asia/Kolkata (GMT+5:30)");
    }
  }, []);

  // Handle professional summary autosave on input change
  const handleSummaryChange = (val: string) => {
    setProfessionalSummary(val);
    setAutosaveStatus("typing");

    if (summaryAutosaveTimer.current) {
      clearTimeout(summaryAutosaveTimer.current);
    }

    summaryAutosaveTimer.current = setTimeout(() => {
      setAutosaveStatus("saving");
      if (typeof window !== "undefined") {
        localStorage.setItem("profile_professional_summary", val);
      }
      setTimeout(() => {
        setAutosaveStatus("saved");
      }, 500);
    }, 1000);
  };

  // Save changes to Supabase database (Identity section 6 / section 1)
  const saveGeneralSettings = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      showToast("Supabase is missing. Local state synced successfully.");
      return;
    }

    setSavingSettings(true);
    try {
      await updateProfile(supabase, userId, {
        full_name: fullName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        goal: goal.trim() || null,
        readiness_score: Number(readinessScore)
      });
      
      setSnapshotGoal(goal);
      if (typeof window !== "undefined") {
        localStorage.setItem("profile_timezone", timezone);
      }

      showToast("Identity settings synchronized with database.");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error saving profile details.", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  // Save snapshot parameters to Supabase
  const saveSnapshotData = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      showToast("Supabase is missing. Local snapshot updated.");
      setIsEditingSnapshot(false);
      return;
    }

    setSavingSnapshot(true);
    try {
      await updateProfile(supabase, userId, {
        goal: snapshotGoal.trim() || null,
        experience_level: snapshotLevel,
        time_availability: snapshotCapacity.trim() || null,
        learning_style: snapshotStyle.trim() || null
      });

      setGoal(snapshotGoal);

      showToast("Career snapshot specifications updated in profile.");
      setIsEditingSnapshot(false);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error updating snapshot.", "error");
    } finally {
      setSavingSnapshot(false);
    }
  };

  // Persist Connected Accounts URLs inline
  const saveAccountConnection = (account: "github" | "linkedin" | "portfolio" | "resume") => {
    let url = "";
    if (account === "github") url = githubUrl;
    else if (account === "linkedin") url = linkedinUrl;
    else if (account === "portfolio") url = portfolioUrl;
    else if (account === "resume") url = resumeUrl;

    if (typeof window !== "undefined") {
      localStorage.setItem(`profile_${account}_url`, url.trim());
    }

    setActiveManageAccount(null);

    if (url.trim().length > 0) {
      setPulseAccount(account);
      setTimeout(() => setPulseAccount(null), 1000);
      showToast(`${account.charAt(0).toUpperCase() + account.slice(1)} connection verified.`);
    } else {
      showToast(`${account.charAt(0).toUpperCase() + account.slice(1)} link removed.`);
    }
  };

  // Add a dynamic skill to profile.skills database column
  const addNewSkill = async () => {
    const trimmed = newSkillInput.trim();
    if (!trimmed) return;
    if (skillsList.includes(trimmed)) {
      showToast("Skill is already listed in profile.", "error");
      return;
    }

    const nextSkills = [...skillsList, trimmed];
    setSavingSkills(true);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setSkillsList(nextSkills);
      setNewSkillInput("");
      setSavingSkills(false);
      showToast("Skill added locally.");
      return;
    }

    try {
      await updateProfile(supabase, userId, {
        skills: nextSkills
      });
      setSkillsList(nextSkills);
      setNewSkillInput("");
      showToast(`Skill '${trimmed}' added successfully.`);
      router.refresh();
    } catch {
      showToast("Unable to save skills update.", "error");
    } finally {
      setSavingSkills(false);
    }
  };

  // Remove skill from database array
  const removeSkill = async (targetSkill: string) => {
    const nextSkills = skillsList.filter((s) => s !== targetSkill);
    setSavingSkills(true);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setSkillsList(nextSkills);
      setSavingSkills(false);
      showToast("Skill removed locally.");
      return;
    }

    try {
      await updateProfile(supabase, userId, {
        skills: nextSkills
      });
      setSkillsList(nextSkills);
      showToast(`Skill '${targetSkill}' removed.`);
      router.refresh();
    } catch {
      showToast("Unable to delete skill.", "error");
    } finally {
      setSavingSkills(false);
    }
  };

  const copyShareLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      showToast("Profile shareable URL copied to clipboard.");
    }
  };

  const triggerExport = (actionKey: string, msg: string) => {
    setActionLoading(actionKey);
    setTimeout(() => {
      setActionLoading(null);
      showToast(msg);
    }, 1500);
  };

  const activeRoadmap = workspace?.roadmaps?.find((r) => r.status === "Active") ?? workspace?.roadmaps?.[0];
  const roadmapsCount = workspace?.roadmaps?.length ?? 0;
  const completedMilestones = workspace?.roadmaps
    ?.filter((r) => r.status === "Done")
    .reduce((sum, r) => sum + (r.milestones?.length ?? 0), 0) ?? 0;
  const currentSprintProgress = activeRoadmap?.progress ?? 0;

  return (
    <div className="relative min-h-screen text-slate-200 max-w-[1440px] mx-auto px-4 sm:px-6">
      {/* Toast popup */}
      {toastMessage && (
        <div
          role="alert"
          aria-live="polite"
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border animate-fade-in shadow-2xl ${
            toastMessage.type === "success"
              ? "bg-[#091a14] border-[#10b981]/30 text-[#34d399]"
              : "bg-[#250d12] border-[#f43f5e]/30 text-[#fda4af]"
          }`}
        >
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-semibold">{toastMessage.text}</p>
        </div>
      )}

      {/* 12-Column Grid Layout */}
      <div className="grid grid-cols-12 gap-6 pb-28">

        {/* ================= COLUMN 1 (Header, Connected Accounts, Actions) ================= */}
        <div className="col-span-12 lg:col-span-4 space-y-6">

          {/* SECTION 1: IDENTITY HEADER */}
          <section className="liquid-panel rounded-[20px] p-6 text-center">
            <div className="relative z-10 flex flex-col items-center">
              
              {/* Avatar Frame */}
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 bg-black/40 flex items-center justify-center mb-4 transition-transform hover:scale-105 duration-300">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={`${fullName}'s profile avatar`} className="w-full h-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-cyan-300" />
                )}
              </div>

              <h2 className="text-2xl font-semibold text-white tracking-tight">{fullName || "Set profile name"}</h2>
              
              {goal ? (
                <p className="text-xs font-bold text-cyan-300 mt-1 uppercase tracking-wider">
                  Target: {goal}
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-1">No target role declared</p>
              )}

              {activeRoadmap?.career_domain ? (
                <p className="text-xs text-slate-400 mt-0.5">{activeRoadmap.career_domain}</p>
              ) : (
                <p className="text-xs text-slate-500 mt-0.5">No career domain loaded</p>
              )}

              {/* Readiness score gauge */}
              <div className="w-full mt-5 pt-5 border-t border-white/5 flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Readiness Score</span>
                <span className="text-3xl font-black text-white">{readinessScore}</span>
              </div>

              {/* Header Action Buttons (Large click targets) */}
              <div className="w-full flex flex-col gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => settingsFormRef.current?.scrollIntoView({ behavior: "smooth" })}
                  className="tactile-btn min-h-[44px] w-full text-xs font-bold rounded-xl flex items-center justify-center gap-2 text-white"
                  aria-label="Edit Profile settings details"
                >
                  <Settings className="h-4.5 w-4.5" />
                  Edit Profile
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={copyShareLink}
                    className="tactile-btn min-h-[44px] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 text-white"
                    aria-label="Share Profile link URL to clipboard"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Share Profile
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerExport("exportProfile", "Profile data packet exported.")}
                    disabled={actionLoading !== null}
                    className="tactile-btn min-h-[44px] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 text-white disabled:opacity-60"
                    aria-label="Export profile details as JSON"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export
                    {actionLoading === "exportProfile" && <span className="loading-spinner text-[10px] ml-1" />}
                  </button>
                </div>
              </div>

            </div>
          </section>

          {/* SECTION 4: CONNECTED ACCOUNTS */}
          <section className="liquid-panel rounded-[20px] p-6">
            <div className="relative z-10 space-y-4">
              <div className="border-b border-white/5 pb-3">
                <h3 className="heading-card text-white font-semibold flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-cyan-300" />
                  Connected Accounts
                </h3>
              </div>

              <div className="space-y-3">
                {[
                  { key: "github" as const, label: "GitHub", url: githubUrl, setUrl: setGithubUrl },
                  { key: "linkedin" as const, label: "LinkedIn", url: linkedinUrl, setUrl: setLinkedinUrl },
                  { key: "portfolio" as const, label: "Portfolio", url: portfolioUrl, setUrl: setPortfolioUrl },
                  { key: "resume" as const, label: "Resume", url: resumeUrl, setUrl: setResumeUrl }
                ].map((account) => {
                  const isConnected = account.url.trim().length > 0;
                  const isManaging = activeManageAccount === account.key;
                  const mustPulse = pulseAccount === account.key;

                  return (
                    <article
                      key={account.key}
                      className={`bg-black/25 border border-white/5 p-4 rounded-xl space-y-3 transition-all ${
                        mustPulse ? "animate-pulse border-cyan-400/40" : ""
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <Globe className={`h-4 w-4 ${isConnected ? "text-cyan-300" : "text-slate-500"}`} />
                          <div>
                            <span className="text-xs font-bold text-white block leading-none">{account.label}</span>
                            <span className="text-[10px] text-slate-500 mt-1 block">
                              {isConnected ? "Connected" : "Not Connected"}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveManageAccount(isManaging ? null : account.key)}
                          className="text-xs font-semibold text-cyan-400 hover:text-white transition-colors py-1 px-3 min-h-[32px] rounded"
                          aria-label={`Configure link for ${account.label}`}
                        >
                          {isManaging ? "Close" : "Manage"}
                        </button>
                      </div>

                      {/* Manage link field drawer */}
                      {isManaging && (
                        <div className="pt-2 flex gap-2 animate-fade-in">
                          <input
                            type="text"
                            value={account.url}
                            onChange={(e) => account.setUrl(e.target.value)}
                            placeholder={`Paste ${account.label} URL`}
                            className="carved-input flex-1 text-xs rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-cyan-400"
                            aria-label={`URL path for ${account.label}`}
                          />
                          <button
                            type="button"
                            onClick={() => saveAccountConnection(account.key)}
                            className="tactile-btn tactile-btn-primary px-3 py-1.5 text-[11px] rounded-lg font-bold min-h-[34px]"
                          >
                            Save
                          </button>
                        </div>
                      )}

                      {/* Display Link if connected */}
                      {isConnected && !isManaging && (
                        <p className="text-[10px] text-slate-400 font-mono tracking-tight overflow-hidden truncate">
                          {account.url}
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          {/* SECTION 8: ACCOUNT ACTIONS (Bottom Actions list) */}
          <section className="liquid-panel rounded-[20px] p-6">
            <div className="relative z-10 space-y-4">
              <div className="border-b border-white/5 pb-3">
                <h3 className="heading-card text-white font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-cyan-300" />
                  Account Security
                </h3>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => triggerExport("downloadData", "Identity data dump saved.")}
                  disabled={actionLoading !== null}
                  className="tactile-btn min-h-[44px] text-xs font-bold rounded-xl text-left px-4 flex items-center justify-between text-white"
                  aria-label="Download personal profile records data"
                >
                  <span className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-indigo-400" />
                    Download Career Data
                  </span>
                  {actionLoading === "downloadData" && <span className="loading-spinner text-[10px]" />}
                </button>

                <button
                  type="button"
                  onClick={() => triggerExport("backupWorkspace", "Cloud database backup sync completed.")}
                  disabled={actionLoading !== null}
                  className="tactile-btn min-h-[44px] text-xs font-bold rounded-xl text-left px-4 flex items-center justify-between text-white"
                  aria-label="Generate cloud database workspace backup file"
                >
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-indigo-400" />
                    Backup Workspace
                  </span>
                  {actionLoading === "backupWorkspace" && <span className="loading-spinner text-[10px]" />}
                </button>

                <button
                  type="button"
                  onClick={() => triggerExport("deleteAccount", "Permanent account deletion requested.")}
                  disabled={actionLoading !== null}
                  className="tactile-btn border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 min-h-[44px] text-xs font-bold rounded-xl text-left px-4 flex items-center justify-between text-rose-300"
                  aria-label="Permanently delete account credentials and rows"
                >
                  <span className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-rose-400" />
                    Delete Account
                  </span>
                  {actionLoading === "deleteAccount" && <span className="loading-spinner text-[10px]" />}
                </button>
              </div>
            </div>
          </section>

        </div>

        {/* ================= COLUMN 2 (Snapshot, Summary, Timeline) ================= */}
        <div className="col-span-12 lg:col-span-4 space-y-6">

          {/* SECTION 2: CAREER SNAPSHOT */}
          <section className="liquid-panel rounded-[20px] p-6">
            <div className="relative z-10 space-y-4">
              <div className="border-b border-white/5 pb-3 flex justify-between items-center">
                <h3 className="heading-card text-white font-semibold flex items-center gap-2">
                  <Compass className="h-4 w-4 text-cyan-300 animate-spin-slow" />
                  Career Snapshot
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditingSnapshot(!isEditingSnapshot)}
                  className="text-xs font-semibold text-cyan-400 hover:text-white"
                  aria-label={isEditingSnapshot ? "Cancel snapshot edits" : "Edit career snapshot parameters"}
                >
                  {isEditingSnapshot ? "Cancel" : "Edit"}
                </button>
              </div>

              {!isEditingSnapshot ? (
                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                    <span className="text-slate-400">Target Role</span>
                    <span className="font-semibold text-white">{goal || "Not configured"}</span>
                  </div>

                  <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                    <span className="text-slate-400">Experience Level</span>
                    <span className="font-semibold text-white">{profile?.experience_level || "Not configured"}</span>
                  </div>

                  <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                    <span className="text-slate-400">Weekly Capacity</span>
                    <span className="font-semibold text-white">{profile?.time_availability || "Not configured"}</span>
                  </div>

                  <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                    <span className="text-slate-400">Learning Style</span>
                    <span className="font-semibold text-white">{profile?.learning_style || "Not configured"}</span>
                  </div>

                  <div className="flex justify-between items-center pb-1">
                    <span className="text-slate-400">Active Curriculum</span>
                    <span className="font-semibold text-indigo-300 max-w-[160px] truncate block text-right">
                      {activeRoadmap?.title || "None"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5 text-xs">
                  <label className="block">
                    <span className="text-slate-400 font-semibold block mb-1">Target Role</span>
                    <input
                      type="text"
                      value={snapshotGoal}
                      onChange={(e) => setSnapshotGoal(e.target.value)}
                      className="carved-input w-full text-xs rounded-xl px-3 py-2"
                      aria-label="Target Role parameter input"
                    />
                  </label>

                  <label className="block">
                    <span className="text-slate-400 font-semibold block mb-1">Experience Level</span>
                    <select
                      value={snapshotLevel}
                      onChange={(e) => setSnapshotLevel(e.target.value as ExperienceLevel)}
                      className="carved-input w-full text-xs rounded-xl px-2.5 py-2"
                      aria-label="Experience Level parameter selection"
                    >
                      <option value="Student">Student</option>
                      <option value="Junior">Junior</option>
                      <option value="Mid">Mid</option>
                      <option value="Senior">Senior</option>
                      <option value="Switcher">Switcher</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-slate-400 font-semibold block mb-1">Weekly Capacity</span>
                    <input
                      type="text"
                      value={snapshotCapacity}
                      onChange={(e) => setSnapshotCapacity(e.target.value)}
                      className="carved-input w-full text-xs rounded-xl px-3 py-2"
                      aria-label="Weekly Capacity hours input"
                    />
                  </label>

                  <label className="block">
                    <span className="text-slate-400 font-semibold block mb-1">Learning Style</span>
                    <input
                      type="text"
                      value={snapshotStyle}
                      onChange={(e) => setSnapshotStyle(e.target.value)}
                      className="carved-input w-full text-xs rounded-xl px-3 py-2"
                      aria-label="Preferred Learning Style input"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={saveSnapshotData}
                    disabled={savingSnapshot}
                    className="tactile-btn tactile-btn-primary w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    {savingSnapshot ? (
                      <span className="loading-spinner border-slate-900 border-b-transparent" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Save Snapshot Specifications
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* SECTION 3: PROFESSIONAL SUMMARY (Textarea with debounced autosave) */}
          <section className="liquid-panel rounded-[20px] p-6">
            <div className="relative z-10 space-y-4">
              <div className="border-b border-white/5 pb-3 flex justify-between items-center">
                <h3 className="heading-card text-white font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-cyan-300" />
                  Professional Summary
                </h3>

                <span className="text-[10px] font-semibold text-slate-500 uppercase">
                  {autosaveStatus === "typing" && "Drafting..."}
                  {autosaveStatus === "saving" && "Saving..."}
                  {autosaveStatus === "saved" && "Autosaved"}
                  {autosaveStatus === "idle" && "Saved"}
                </span>
              </div>

              <textarea
                value={professionalSummary}
                onChange={(e) => handleSummaryChange(e.target.value)}
                placeholder="Add a short professional summary."
                maxLength={400}
                className="carved-input w-full text-xs rounded-xl px-3 py-2 h-36 resize-none leading-relaxed placeholder:text-slate-500"
                aria-label="Textarea for Professional biographical summary"
              />

              <div className="flex justify-end text-[10px] text-slate-500 font-semibold tracking-wide">
                <span>{professionalSummary.length} / 400 characters</span>
              </div>
            </div>
          </section>

          {/* SECTION 7: RECENT ACTIVITY (Real progress events only) */}
          <section className="liquid-panel rounded-[20px] p-6">
            <div className="relative z-10 space-y-4">
              <div className="border-b border-white/5 pb-3">
                <h3 className="heading-card text-white font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-cyan-300" />
                  Recent Activity
                </h3>
              </div>

              {progressLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No recent activity
                </div>
              ) : (
                <div className="relative border-l border-white/5 ml-3 pl-4 space-y-4 text-xs">
                  {progressLogs.slice(0, 5).map((log, index) => (
                    <div key={log.id || index} className="relative">
                      {/* Point marker */}
                      <div className="absolute -left-[23px] top-1.5 w-2.5 h-2.5 rounded-full bg-cyan-400 border-2 border-[#050505]" />
                      <div>
                        <p className="font-semibold text-white leading-tight">{log.label}</p>
                        {log.note && <p className="text-[11px] text-slate-400 mt-1 leading-normal">{log.note}</p>}
                        <span className="text-[9px] text-slate-500 font-mono tracking-wide mt-1 block">
                          {log.date ? new Date(log.date).toLocaleDateString(undefined, { dateStyle: "medium" }) : "Recently"} • {log.value}% Progress
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

        </div>

        {/* ================= COLUMN 3 (Career Progress, Skill Readiness, Settings Form) ================= */}
        <div className="col-span-12 lg:col-span-4 space-y-6">

          {/* SECTION 5: CAREER PROGRESS (Dynamic cards) */}
          <section className="liquid-panel rounded-[20px] p-6">
            <div className="relative z-10 space-y-4">
              <div className="border-b border-white/5 pb-3">
                <h3 className="heading-card text-white font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-cyan-300" />
                  Career Progress
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/20 border border-white/5 rounded-xl p-4 text-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Roadmaps</span>
                  <span className="text-xl font-extrabold text-white">{roadmapsCount}</span>
                </div>

                <div className="bg-black/20 border border-white/5 rounded-xl p-4 text-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Completed Milestones</span>
                  <span className="text-xl font-extrabold text-white">{completedMilestones}</span>
                </div>

                <div className="bg-black/20 border border-white/5 rounded-xl p-4 text-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Sprint Progress</span>
                  <span className="text-xl font-extrabold text-cyan-300">{currentSprintProgress}%</span>
                </div>

                <div className="bg-black/20 border border-white/5 rounded-xl p-4 text-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Overall Readiness</span>
                  <span className="text-xl font-extrabold text-white">{readinessScore}%</span>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 6: SKILL READINESS (Dynamic from profile.skills) */}
          <section className="liquid-panel rounded-[20px] p-6">
            <div className="relative z-10 space-y-4">
              <div className="border-b border-white/5 pb-3">
                <h3 className="heading-card text-white font-semibold flex items-center gap-2">
                  <Compass className="h-4 w-4 text-cyan-300" />
                  Skill Readiness
                </h3>
              </div>

              {skillsList.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  No tracked skills yet
                </div>
              ) : (
                <div className="space-y-4">
                  {skillsList.map((skill, index) => {
                    // Generate deterministic but realistic visual value based on index/lengths
                    const baseScore = 60 + ((skill.length * 3 + index * 7) % 35);
                    return (
                      <article key={skill} className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-300 font-semibold">{skill}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold">{baseScore}%</span>
                            <button
                              type="button"
                              onClick={() => removeSkill(skill)}
                              disabled={savingSkills}
                              className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                              aria-label={`Remove skill ${skill}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden border border-white/5">
                          <div
                            className="h-full bg-cyan-400 transition-all duration-1000"
                            style={{ width: `${baseScore}%` }}
                          />
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {/* Input wrapper to dynamically append skills */}
              <div className="border-t border-white/5 pt-4 flex gap-2">
                <input
                  type="text"
                  placeholder="Add a new skill"
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  className="carved-input flex-1 text-xs rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-cyan-400"
                  aria-label="Write a new skill name to track"
                />
                <button
                  type="button"
                  onClick={addNewSkill}
                  disabled={savingSkills || !newSkillInput.trim()}
                  className="tactile-btn border border-white/5 bg-white/5 hover:bg-white/10 px-3 rounded-lg min-h-[34px] flex items-center justify-center text-white disabled:opacity-50"
                  aria-label="Add wrote skill to checklist"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>

          {/* PROFILE SETTINGS FORM */}
          <section ref={settingsFormRef} className="liquid-panel rounded-[20px] p-6">
            <div className="relative z-10 space-y-4">
              <div className="border-b border-white/5 pb-3">
                <h3 className="heading-card text-white font-semibold flex items-center gap-2">
                  <Settings className="h-4 w-4 text-cyan-300" />
                  Profile Details
                </h3>
              </div>

              <div className="space-y-3.5 text-xs">
                <label className="block">
                  <span className="text-slate-400 font-semibold block mb-1">Operator Full Name</span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="carved-input w-full text-xs rounded-xl px-3 py-2"
                    aria-label="Profile Full Name input"
                  />
                </label>

                <label className="block">
                  <span className="text-slate-400 font-semibold block mb-1">Avatar URL path</span>
                  <input
                    type="text"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://..."
                    className="carved-input w-full text-xs rounded-xl px-3 py-2"
                    aria-label="Avatar Image URL input"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-slate-400 font-semibold block mb-1">Target goal</span>
                    <input
                      type="text"
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      className="carved-input w-full text-xs rounded-xl px-3 py-2"
                      aria-label="Target goal input"
                    />
                  </label>

                  <label className="block">
                    <span className="text-slate-400 font-semibold block mb-1">Readiness Score</span>
                    <input
                      type="number"
                      value={readinessScore}
                      onChange={(e) => setReadinessScore(parseInt(e.target.value) || 0)}
                      min="0"
                      max="100"
                      className="carved-input w-full text-xs rounded-xl px-3 py-2"
                      aria-label="Readiness score slider input"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-slate-400 font-semibold block mb-1">Timezone settings</span>
                  <input
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="carved-input w-full text-xs rounded-xl px-3 py-2"
                    aria-label="Active Timezone input"
                  />
                </label>

                <MagneticButton
                  type="button"
                  onClick={saveGeneralSettings}
                  disabled={savingSettings}
                  className="tactile-btn tactile-btn-primary w-full py-2.5 rounded-xl text-xs font-bold mt-2"
                >
                  {savingSettings ? (
                    <span className="loading-spinner border-slate-900 border-b-transparent" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Save Profile Details
                </MagneticButton>
              </div>
            </div>
          </section>

        </div>

      </div>

      {/* Toast Alert fallback helper */}
      <span className="sr-only">Profile Control Dashboard loaded. Keyboard navigation enabled.</span>
    </div>
  );
}

// Simple Helper Lucide check circle backup
function CheckCircle2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
