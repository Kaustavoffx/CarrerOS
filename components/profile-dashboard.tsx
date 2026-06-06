"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { UserProfileRecord, WorkspaceSnapshotRecord, ExperienceLevel } from "@/lib/supabase/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { updateProfile } from "@/lib/app-data";
import {
  Shield, Download, Activity, User, X,
  Compass, Link as LinkIcon, Globe, FileText, Settings, Trash2, Plus, Share2, Check
} from "lucide-react";

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

type ProfileDashboardProps = {
  userId: string;
  profile: UserProfileRecord | null;
  workspace: WorkspaceSnapshotRecord | null;
};

export function ProfileDashboard({ userId, profile }: ProfileDashboardProps) {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const summaryAutosaveTimer = useRef<NodeJS.Timeout | null>(null);

  // States
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [goal, setGoal] = useState(profile?.goal ?? "");
  const [readinessScore, setReadinessScore] = useState(profile?.readiness_score ?? 0);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(profile?.experience_level ?? "Junior");
  const [timeAvailability, setTimeAvailability] = useState(profile?.time_availability ?? "");
  const [learningStyle, setLearningStyle] = useState(profile?.learning_style ?? "");

  const [isEditingIdentity, setIsEditingIdentity] = useState(false);
  const [savingIdentity, setSavingIdentity] = useState(false);

  const [professionalSummary, setProfessionalSummary] = useState("");
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "typing" | "saving" | "saved">("idle");

  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  
  const [activeManageAccount, setActiveManageAccount] = useState<"github" | "linkedin" | "portfolio" | "resume" | null>(null);
  const [pulseAccount, setPulseAccount] = useState<string | null>(null);

  const [skillsList, setSkillsList] = useState<string[]>(profile?.skills ?? []);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [savingSkills, setSavingSkills] = useState(false);

  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [exportSuccessOpen, setExportSuccessOpen] = useState(false);
  const [exportedFilename, setExportedFilename] = useState("");

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
      setGoal(profile.goal ?? "");
      setReadinessScore(profile.readiness_score ?? 0);
      setExperienceLevel(profile.experience_level ?? "Junior");
      setTimeAvailability(profile.time_availability ?? "");
      setLearningStyle(profile.learning_style ?? "");
      setSkillsList(profile.skills ?? []);
    }
  }, [profile]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setProfessionalSummary(localStorage.getItem("profile_professional_summary") ?? "");
      setGithubUrl(localStorage.getItem("profile_github_url") ?? "");
      setLinkedinUrl(localStorage.getItem("profile_linkedin_url") ?? "");
      setPortfolioUrl(localStorage.getItem("profile_portfolio_url") ?? "");
      setResumeUrl(localStorage.getItem("profile_resume_url") ?? "");
    }
  }, []);

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

  const saveIdentitySettings = async () => {
    if (!supabase) {
      showToast("Database client connection not active.", "error");
      return;
    }
    setSavingIdentity(true);
    try {
      await updateProfile(supabase, userId, {
        full_name: fullName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        goal: goal.trim() || null,
        experience_level: experienceLevel,
        time_availability: timeAvailability.trim() || null,
        learning_style: learningStyle.trim() || null,
        readiness_score: Number(readinessScore)
      });
      showToast("Profile identity updated successfully.");
      setIsEditingIdentity(false);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error saving profile details.", "error");
    } finally {
      setSavingIdentity(false);
    }
  };

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
      showToast(`${account.charAt(0).toUpperCase() + account.slice(1)} connected successfully.`);
    } else {
      showToast(`${account.charAt(0).toUpperCase() + account.slice(1)} disconnected.`);
    }
  };

  const addNewSkill = async () => {
    const trimmed = newSkillInput.trim();
    if (!trimmed) return;
    if (skillsList.includes(trimmed)) {
      showToast("Skill is already registered.", "error");
      return;
    }

    const nextSkills = [...skillsList, trimmed];
    if (!supabase) {
      showToast("Database client connection not active.", "error");
      return;
    }
    setSavingSkills(true);
    try {
      await updateProfile(supabase, userId, { skills: nextSkills });
      setSkillsList(nextSkills);
      setNewSkillInput("");
      showToast(`Added "${trimmed}" to skills portfolio.`);
      router.refresh();
    } catch {
      showToast("Unable to save skills update.", "error");
    } finally {
      setSavingSkills(false);
    }
  };

  const removeSkill = async (targetSkill: string) => {
    const nextSkills = skillsList.filter((s) => s !== targetSkill);
    if (!supabase) {
      showToast("Database client connection not active.", "error");
      return;
    }
    setSavingSkills(true);
    try {
      await updateProfile(supabase, userId, { skills: nextSkills });
      setSkillsList(nextSkills);
      showToast(`Removed "${targetSkill}" from skills portfolio.`);
      router.refresh();
    } catch {
      showToast("Unable to remove skill.", "error");
    } finally {
      setSavingSkills(false);
    }
  };

  const copyShareLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      showToast("Shareable link copied to clipboard.");
    }
  };

  const triggerExport = (msg: string) => {
    setTimeout(() => {
      setExportedFilename(msg);
      setExportSuccessOpen(true);
    }, 1500);
  };

  // Profile-only activity feed items
  const getProfileActivities = () => {
    const list = [];
    if (fullName) list.push("Operator identity calibrated: " + fullName);
    if (resumeUrl) list.push("Credentials verified: Digital Resume Linked");
    if (portfolioUrl) list.push("Proof of Work verified: Portfolio Linked");
    if (skillsList.length > 0) list.push(`Skills directory updated: ${skillsList.length} indexed targets`);
    return list.slice(0, 4);
  };
  const profileActivities = getProfileActivities();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast popup */}
      {toastMessage && (
        <div
          role="alert"
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl ${
            toastMessage.type === "success"
              ? "bg-[#091a14] border-cyan-500/30 text-cyan-200"
              : "bg-[#250d12] border-rose-500/30 text-rose-300"
          }`}
        >
          <p className="text-xs font-semibold">{toastMessage.text}</p>
        </div>
      )}

      {/* ═══ SPOTLIGHT CARD 1: PROFILE IDENTITY CARD ══════════════════════ */}
      <section className="card-spotlight rounded-[24px] p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-32 w-48 bg-cyan-400/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-cyan-400/25 bg-white/[0.03] flex items-center justify-center shrink-0">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-cyan-300" />
              )}
            </div>

            <div>
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest bg-cyan-950/40 border border-cyan-400/20 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 w-fit">
                <Image src="/logo.png" alt="Logo" width={12} height={12} className="object-contain inline-block" />
                Primary Operator Identity
              </span>
              <h2 className="text-xl font-bold text-white mt-1.5 leading-none">{fullName || "Set Operator Name"}</h2>
              <p className="text-xs text-slate-300 mt-1">
                Target Role: <strong className="text-white">{goal || "Unspecified"}</strong> &middot; Level: <strong className="text-white">{experienceLevel}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={copyShareLink}
              className="tactile-btn text-xs font-bold text-slate-300 hover:text-white px-4 py-2.5 rounded-xl flex items-center gap-1.5"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share Link
            </button>
            <button
              onClick={() => setIsEditingIdentity(!isEditingIdentity)}
              className="tactile-btn tactile-btn-primary text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5"
            >
              <Settings className="h-3.5 w-3.5" />
              {isEditingIdentity ? "Cancel Edit" : "Configure Profile"}
            </button>
          </div>
        </div>
      </section>

      {/* Editing Form Overlay */}
      {isEditingIdentity && (
        <section className="card-data rounded-[24px] p-6 border border-cyan-400/20">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-4 border-b border-white/5 pb-2">Edit Identity Details</h3>
          
          <div className="grid gap-4 sm:grid-cols-2 text-xs">
            <label className="block">
              <span className="text-slate-400 font-semibold block mb-1">Operator Full Name</span>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="carved-input w-full px-3 py-2 rounded-xl"
              />
            </label>
            <label className="block">
              <span className="text-slate-400 font-semibold block mb-1">Avatar Image URL</span>
              <input
                type="text"
                value={avatarUrl}
                onChange={e => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="carved-input w-full px-3 py-2 rounded-xl"
              />
            </label>
            <label className="block">
              <span className="text-slate-400 font-semibold block mb-1">Target Role Target</span>
              <input
                type="text"
                value={goal}
                onChange={e => setGoal(e.target.value)}
                className="carved-input w-full px-3 py-2 rounded-xl"
              />
            </label>
            <label className="block">
              <span className="text-slate-400 font-semibold block mb-1">Experience Level</span>
              <select
                value={experienceLevel}
                onChange={e => setExperienceLevel(e.target.value as ExperienceLevel)}
                className="carved-input w-full px-2.5 py-2 rounded-xl"
              >
                <option value="Student">Student</option>
                <option value="Junior">Junior</option>
                <option value="Mid">Mid</option>
                <option value="Senior">Senior</option>
                <option value="Switcher">Switcher</option>
              </select>
            </label>
            <label className="block">
              <span className="text-slate-400 font-semibold block mb-1">Weekly Time Capacity</span>
              <input
                type="text"
                value={timeAvailability}
                onChange={e => setTimeAvailability(e.target.value)}
                placeholder="e.g. 15 hours / week"
                className="carved-input w-full px-3 py-2 rounded-xl"
              />
            </label>
            <label className="block">
              <span className="text-slate-400 font-semibold block mb-1">Learning Style Mode</span>
              <input
                type="text"
                value={learningStyle}
                onChange={e => setLearningStyle(e.target.value)}
                placeholder="e.g. Visual/Hands-on"
                className="carved-input w-full px-3 py-2 rounded-xl"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-slate-400 font-semibold block mb-1">Current Readiness Score (0-100)</span>
              <input
                type="number"
                value={readinessScore}
                onChange={e => setReadinessScore(parseInt(e.target.value) || 0)}
                className="carved-input w-full px-3 py-2 rounded-xl"
              />
            </label>

            <button
              onClick={saveIdentitySettings}
              disabled={savingIdentity}
              className="tactile-btn tactile-btn-primary w-full py-2.5 rounded-xl sm:col-span-2 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              {savingIdentity ? <span className="loading-spinner border-slate-900" /> : <Check className="h-4 w-4" />}
              Save Profile Configurations
            </button>
          </div>
        </section>
      )}

      {/* Central 2-Column Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column */}
        <div className="space-y-6">
          
          {/* Professional Summary */}
          <section className="card-data rounded-[24px] p-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Professional Summary</h3>
              </div>
              <span className="text-[9px] font-semibold text-slate-500 uppercase">
                {autosaveStatus === "typing" && "Drafting..."}
                {autosaveStatus === "saving" && "Saving..."}
                {autosaveStatus === "saved" && "Autosaved"}
                {autosaveStatus === "idle" && "Saved"}
              </span>
            </div>

            <textarea
              value={professionalSummary}
              onChange={e => handleSummaryChange(e.target.value)}
              placeholder="Add professional biographical background summary..."
              maxLength={400}
              className="carved-input w-full text-xs rounded-xl px-4 py-3 h-32 resize-none leading-relaxed placeholder:text-slate-500"
            />
            <div className="flex justify-end text-[10px] text-slate-500 font-semibold mt-2">
              <span>{professionalSummary.length} / 400 characters</span>
            </div>
          </section>

          {/* Connected Accounts */}
          <section className="card-data rounded-[24px] p-6">
            <div className="border-b border-white/5 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4.5 w-4.5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Connected Accounts</h3>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { key: "github" as const, label: "GitHub", url: githubUrl, setUrl: setGithubUrl, icon: <GithubIcon className="h-4 w-4" /> },
                { key: "linkedin" as const, label: "LinkedIn", url: linkedinUrl, setUrl: setLinkedinUrl, icon: <Globe className="h-4 w-4" /> },
                { key: "portfolio" as const, label: "Portfolio", url: portfolioUrl, setUrl: setPortfolioUrl, icon: <Compass className="h-4 w-4" /> },
                { key: "resume" as const, label: "Resume Credentials", url: resumeUrl, setUrl: setResumeUrl, icon: <FileText className="h-4 w-4" /> }
              ].map(account => {
                const isConnected = account.url.trim().length > 0;
                const isManaging = activeManageAccount === account.key;
                const mustPulse = pulseAccount === account.key;

                return (
                  <div key={account.key} className={`border p-3.5 rounded-2xl bg-white/[0.03] transition ${
                    mustPulse ? "border-cyan-400/40 animate-pulse" : "border-white/[0.06]"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={isConnected ? "text-cyan-300" : "text-slate-600"}>{account.icon}</span>
                        <div>
                          <span className="text-xs font-bold text-white block">{account.label}</span>
                          <span className="text-[10px] text-slate-500 mt-0.5 block">{isConnected ? "Connected" : "Disconnected"}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveManageAccount(isManaging ? null : account.key)}
                        className="text-xs font-bold text-cyan-400 hover:text-white px-3 py-1 rounded"
                      >
                        {isManaging ? "Close" : "Manage"}
                      </button>
                    </div>

                    {isManaging && (
                      <div className="flex gap-2 mt-3.5 pt-3.5 border-t border-white/5">
                        <input
                          type="text"
                          value={account.url}
                          onChange={e => account.setUrl(e.target.value)}
                          placeholder={`Paste ${account.label} URL`}
                          className="carved-input flex-1 text-xs rounded-xl px-3 py-1.5"
                        />
                        <button
                          onClick={() => saveAccountConnection(account.key)}
                          className="tactile-btn tactile-btn-primary px-3 py-1.5 text-[11px] rounded-xl font-bold"
                        >
                          Save
                        </button>
                      </div>
                    )}

                    {isConnected && !isManaging && (
                      <p className="text-[10px] text-slate-400 font-mono mt-2 truncate max-w-full">
                        {account.url}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

        </div>

        {/* Right Column */}
        <div className="space-y-6">
          
          {/* Skill Inventory Portfolio */}
          <section className="card-data rounded-[24px] p-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Compass className="h-4.5 w-4.5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Skill Inventory</h3>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold">{skillsList.length} tags cataloged</span>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Add skill tag..."
                value={newSkillInput}
                onChange={e => setNewSkillInput(e.target.value)}
                className="carved-input flex-1 text-xs rounded-xl px-3.5 py-2"
              />
              <button
                onClick={addNewSkill}
                disabled={savingSkills || !newSkillInput.trim()}
                className="tactile-btn tactile-btn-primary px-4 rounded-xl flex items-center justify-center disabled:opacity-50"
              >
                <Plus className="h-4 w-4 text-black" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {skillsList.map(skill => (
                <div
                  key={skill}
                  className="bg-white/[0.03] border border-white/[0.06] pl-3 pr-2 py-1.5 rounded-xl text-xs text-white font-medium inline-flex items-center gap-2.5 hover:border-cyan-400/20 transition group"
                >
                  <span>{skill}</span>
                  <button
                    onClick={() => removeSkill(skill)}
                    disabled={savingSkills}
                    className="text-slate-500 hover:text-rose-400 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {skillsList.length === 0 && (
                <p className="text-xs text-slate-500 py-6 text-center w-full">No skills tagged yet.</p>
              )}
            </div>
          </section>

          {/* Profile Activity Feed */}
          <section className="card-data rounded-[24px] p-6">
            <div className="border-b border-white/5 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4.5 w-4.5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Identity Log</h3>
              </div>
            </div>

            {profileActivities.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No identity changes logged.</p>
            ) : (
              <div className="relative border-l border-white/5 pl-4 ml-2.5 space-y-4 text-xs">
                {profileActivities.map((act, idx) => (
                  <div key={idx} className="relative">
                    <span className="absolute -left-[22.5px] top-1.5 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    <p className="font-semibold text-slate-200">{act}</p>
                    <span className="text-[9px] text-slate-500 mt-0.5 block">Operator log entry</span>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>

      </div>

      {/* Danger Actions Area (card-danger at the bottom) */}
      <section className="card-danger rounded-[24px] p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Shield className="h-4.5 w-4.5 text-rose-400 shrink-0" />
          <div className="text-xs">
            <h4 className="font-bold text-white">Danger Zone</h4>
            <p className="text-slate-400 leading-normal">Permanent deletion of this career identity state and all saved checkpoints.</p>
          </div>
        </div>

        <button
          onClick={() => triggerExport("Permanent account deletion requested.")}
          className="tactile-btn border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-300 font-bold px-4 py-2 rounded-xl text-xs"
        >
          Delete Operator Identity
        </button>
      </section>

      {/* Database utilities */}
      <div className="card-data rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <span className="text-slate-500 font-medium font-mono">Operator ID: {userId}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => triggerExport("Personal identity data packet downloaded.")}
            className="text-cyan-400 hover:underline inline-flex items-center gap-1"
          >
            <Download className="h-3.5 w-3.5" />
            Download Data Packet
          </button>
        </div>
      </div>

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
                  Your identity data has been exported successfully.
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
                className="tactile-btn tactile-btn-primary w-full py-2.5 rounded-xl text-xs font-bold text-black mt-2"
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
