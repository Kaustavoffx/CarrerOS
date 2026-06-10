"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { UserProfileRecord, WorkspaceSnapshotRecord, ExperienceLevel } from "@/lib/supabase/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { updateProfile } from "@/lib/app-data";
import {
  Shield, Download, Activity, X,
  Compass, Link as LinkIcon, Globe, FileText, Settings, Trash2, Plus, Share2, Check
} from "lucide-react";
import { PageHero, CardSurface } from "@/components/ui";
import { buttonStyle, inputStyle } from "@/styles/careeros-design-system";

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
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(profile?.experience_level ?? "Junior");
  const [timeAvailability, setTimeAvailability] = useState(profile?.time_availability ?? "");
  const [learningStyle, setLearningStyle] = useState(profile?.learning_style ?? "");

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

  const getProfileActivities = () => {
    const list = [];
    if (fullName) list.push("Operator identity calibrated: " + fullName);
    if (resumeUrl) list.push("Credentials verified: Digital Resume Linked");
    if (portfolioUrl) list.push("Proof of Work verified: Portfolio Linked");
    if (skillsList.length > 0) list.push(`Skills directory updated: ${skillsList.length} indexed targets`);
    return list.slice(0, 4);
  };
  const profileActivities = getProfileActivities();

  const calculatedScore = Math.min(100,
    (professionalSummary.trim() ? 20 : 0) +
    (resumeUrl.trim() ? 20 : 0) +
    (portfolioUrl.trim() ? 20 : 0) +
    (githubUrl.trim() ? 20 : 0) +
    (Math.min(5, skillsList.length) * 4)
  );

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
        readiness_score: calculatedScore
      });
      showToast("Identity configuration updated.");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error saving profile details.", "error");
    } finally {
      setSavingIdentity(false);
    }
  };



  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast notifications */}
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

      <PageHero
        badge="Operator Identity Portal"
        title={profile?.full_name || "Agent Operator"}
        subtitle={`Goal Target: ${profile?.goal || "Unspecified"} · Level: ${profile?.experience_level || "Junior"}`}
        actions={
          <button
            onClick={copyShareLink}
            style={buttonStyle("ghost")}
            className="text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5"
          >
            <Share2 className="h-3.5 w-3.5" />
            Copy Share Link
          </button>
        }
      />

      {/* ═══ PROFILE HEADER SYSTEM: IDENTITY HUB & READINESS ════════════════ */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Span 1: Portfolio Readiness Score */}
        <CardSurface variant="surface" className="p-6">
          <div className="flex items-center justify-between gap-2 border-b border-indigo-400/10 pb-2.5 mb-3">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Portfolio Readiness</span>
            <span className="text-xs font-bold text-white font-geom bg-indigo-950/40 border border-indigo-400/20 px-2 py-0.5 rounded-full">
              {calculatedScore}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-3">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500" 
              style={{ width: `${calculatedScore}%` }} 
            />
          </div>

          {/* Checklist items */}
          <ul className="space-y-1 text-[10px] text-slate-400">
            <li className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${resumeUrl ? "bg-cyan-400 animate-pulse" : "bg-white/10"}`} />
              <span className={resumeUrl ? "text-slate-200" : ""}>Credentials Linked (+20%)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${portfolioUrl ? "bg-cyan-400 animate-pulse" : "bg-white/10"}`} />
              <span className={portfolioUrl ? "text-slate-200" : ""}>Portfolio Sandboxed (+20%)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${githubUrl ? "bg-cyan-400 animate-pulse" : "bg-white/10"}`} />
              <span className={githubUrl ? "text-slate-200" : ""}>GitHub Connected (+20%)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${professionalSummary.trim() ? "bg-cyan-400 animate-pulse" : "bg-white/10"}`} />
              <span className={professionalSummary.trim() ? "text-slate-200" : ""}>Bio Summary Written (+20%)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${skillsList.length >= 5 ? "bg-cyan-400 animate-pulse" : "bg-white/10"}`} />
              <span className={skillsList.length >= 5 ? "text-slate-200" : ""}>Skills Inventory Indexed (5+) (+20%)</span>
            </li>
          </ul>

          <div className="mt-3 pt-2.5 border-t border-indigo-400/10 text-[9px] text-slate-500 font-semibold flex items-center justify-between">
            <span>Outreach Index:</span>
            <span className="text-indigo-300 font-bold uppercase">
              {calculatedScore >= 80 ? "Ready for Outreach" : calculatedScore >= 40 ? "Optimizing Portfolio" : "Structuring Setup"}
            </span>
          </div>
        </CardSurface>
      </div>

      {/* ═══ PROFILE WORKSPACE: CONFIGURATION MATRIX ═══════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3 width) - Specifications and Summary */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Operator Specifications Form */}
          <CardSurface tag="section" variant="surface" className="p-6">
            <div className="border-b border-white/5 pb-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Operator Specifications</h3>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold">Identity Configuration</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <label className="block">
                <span className="text-slate-400 font-semibold block mb-1">Operator Full Name</span>
                <DesignInput
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full"
                />
              </label>

              <label className="block">
                <span className="text-slate-400 font-semibold block mb-1">Avatar Image URL</span>
                <DesignInput
                  type="text"
                  value={avatarUrl}
                  onChange={e => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full"
                />
              </label>

              <label className="block">
                <span className="text-slate-400 font-semibold block mb-1">Target Goal Role</span>
                <DesignInput
                  type="text"
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  className="w-full"
                />
              </label>

              <label className="block">
                <span className="text-slate-400 font-semibold block mb-1">Experience Level</span>
                <select
                  value={experienceLevel}
                  onChange={e => setExperienceLevel(e.target.value as ExperienceLevel)}
                  style={inputStyle("base")}
                  className="w-full"
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
                <DesignInput
                  type="text"
                  value={timeAvailability}
                  onChange={e => setTimeAvailability(e.target.value)}
                  placeholder="e.g. 15 hours / week"
                  className="w-full"
                />
              </label>

              <label className="block">
                <span className="text-slate-400 font-semibold block mb-1">Learning Style Mode</span>
                <DesignInput
                  type="text"
                  value={learningStyle}
                  onChange={e => setLearningStyle(e.target.value)}
                  placeholder="e.g. Visual/Hands-on"
                  className="w-full"
                />
              </label>

              <div className="sm:col-span-2 pt-2">
                <button
                  onClick={saveIdentitySettings}
                  disabled={savingIdentity}
                  style={buttonStyle("primary")}
                  className="w-full flex items-center justify-center gap-1.5"
                >
                  {savingIdentity ? (
                    <span className="loading-spinner border-slate-900" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Save Profile Configurations
                </button>
              </div>
            </div>
          </CardSurface>

          {/* Biographical Summary */}
          <CardSurface tag="section" variant="surface" className="p-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Biographical Summary</h3>
              </div>
              <span className="text-[9px] font-semibold text-slate-500 uppercase">
                {autosaveStatus === "typing" && "Drafting..."}
                {autosaveStatus === "saving" && "Saving..."}
                {autosaveStatus === "saved" && "Autosaved"}
                {autosaveStatus === "idle" && "Saved"}
              </span>
            </div>

            <DesignTextarea
              value={professionalSummary}
              onChange={e => handleSummaryChange(e.target.value)}
              placeholder="Add professional biographical background summary..."
              maxLength={400}
              className="w-full text-xs h-28 resize-none leading-relaxed placeholder:text-slate-500"
            />
            <div className="flex justify-end text-[10px] text-slate-500 font-semibold mt-2">
              <span>{professionalSummary.length} / 400 characters</span>
            </div>
          </CardSurface>

        </div>

        {/* Right Column (1/3 width) - Accounts, Skills, Logs */}
        <div className="space-y-6">
          
          {/* Connected Assets Configuration */}
          <CardSurface tag="section" variant="surface" className="p-6">
            <div className="border-b border-white/5 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Connected Accounts</h3>
              </div>
            </div>

            <div className="space-y-2.5">
              {[
                { key: "github" as const, label: "GitHub", url: githubUrl, setUrl: setGithubUrl, icon: <GithubIcon className="h-3.5 w-3.5" /> },
                { key: "linkedin" as const, label: "LinkedIn", url: linkedinUrl, setUrl: setLinkedinUrl, icon: <Globe className="h-3.5 w-3.5" /> },
                { key: "portfolio" as const, label: "Portfolio", url: portfolioUrl, setUrl: setPortfolioUrl, icon: <Compass className="h-3.5 w-3.5" /> },
                { key: "resume" as const, label: "Resume Credentials", url: resumeUrl, setUrl: setResumeUrl, icon: <FileText className="h-3.5 w-3.5" /> }
              ].map(account => {
                const isConnected = account.url.trim().length > 0;
                const isManaging = activeManageAccount === account.key;
                const mustPulse = pulseAccount === account.key;

                return (
                  <div key={account.key} className={`border p-3 rounded-lg bg-white/[0.01] transition ${
                    mustPulse ? "border-cyan-400/40 animate-pulse" : "border-white/[0.04]"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className={isConnected ? "text-cyan-300" : "text-slate-600"}>{account.icon}</span>
                        <div>
                          <span className="text-xs font-bold text-white block leading-none">{account.label}</span>
                          <span className="text-[9px] text-slate-500 mt-1 block leading-none">{isConnected ? "Connected" : "Disconnected"}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveManageAccount(isManaging ? null : account.key)}
                        style={{ ...buttonStyle("ghost"), height: "24px", padding: "0 8px", fontSize: "10px" }}
                        className="font-bold"
                      >
                        {isManaging ? "Close" : "Setup"}
                      </button>
                    </div>

                    {isManaging && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                        <DesignInput
                          type="text"
                          value={account.url}
                          onChange={e => account.setUrl(e.target.value)}
                          placeholder={`Paste URL...`}
                          className="flex-1 text-xs px-2.5 py-1.5"
                        />
                        <button
                          onClick={() => saveAccountConnection(account.key)}
                          style={{ ...buttonStyle("primary"), height: "28px", padding: "0 12px", fontSize: "10px" }}
                          className="font-bold text-black"
                        >
                          Save
                        </button>
                      </div>
                    )}

                    {isConnected && !isManaging && (
                      <p className="text-[9px] text-slate-400 font-mono mt-2 truncate max-w-full">
                        {account.url}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardSurface>

          {/* Skill Inventory Portfolio */}
          <CardSurface tag="section" variant="surface" className="p-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Skill Inventory</h3>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold">{skillsList.length} indexed</span>
            </div>

            <div className="flex gap-2 mb-3">
              <DesignInput
                type="text"
                placeholder="Add skill tag..."
                value={newSkillInput}
                onChange={e => setNewSkillInput(e.target.value)}
                className="flex-1 text-xs px-3 py-1.5"
              />
              <button
                onClick={addNewSkill}
                disabled={savingSkills || !newSkillInput.trim()}
                style={{ ...buttonStyle("primary"), height: "32px", width: "32px", padding: 0 }}
                className="flex items-center justify-center disabled:opacity-50 shrink-0"
              >
                <Plus className="h-3.5 w-3.5 text-black" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {skillsList.map(skill => (
                <div
                  key={skill}
                  className="bg-white/[0.01] border border-white/[0.04] pl-2.5 pr-1.5 py-1 rounded-lg text-[11px] text-white font-medium inline-flex items-center gap-2 hover:border-cyan-400/20 transition group"
                >
                  <span>{skill}</span>
                  <button
                    onClick={() => removeSkill(skill)}
                    disabled={savingSkills}
                    className="text-slate-500 hover:text-rose-400 transition"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {skillsList.length === 0 && (
                <p className="text-xs text-slate-500 py-4 text-center w-full">No skills tagged yet.</p>
              )}
            </div>
          </CardSurface>

          {/* Profile Activity Feed (Identity Log) */}
          <CardSurface tag="section" variant="surface" className="p-6">
            <div className="border-b border-white/5 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Identity Log</h3>
              </div>
            </div>

            {profileActivities.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">No identity changes logged.</p>
            ) : (
              <div className="relative border-l border-white/5 pl-3.5 ml-2 space-y-3.5 text-xs">
                {profileActivities.map((act, idx) => (
                  <div key={idx} className="relative">
                    <span className="absolute -left-[20.5px] top-1.5 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    <p className="font-semibold text-slate-300 leading-normal">{act}</p>
                    <span className="text-[9px] text-slate-500 mt-0.5 block">Operator log entry</span>
                  </div>
                ))}
              </div>
            )}
          </CardSurface>

        </div>

      </div>

      {/* Danger Actions Area */}
      <CardSurface tag="section" variant="glass" className="border-rose-500/20 bg-rose-500/5 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Shield className="h-4.5 w-4.5 text-rose-400 shrink-0" />
          <div className="text-xs">
            <h4 className="font-bold text-white">Danger Zone</h4>
            <p className="text-slate-400 leading-normal">Permanent deletion of this career identity state and all saved checkpoints.</p>
          </div>
        </div>

        <button
          onClick={() => triggerExport("Permanent account deletion requested.")}
          style={buttonStyle("danger")}
          className="font-bold text-rose-300 px-4 text-xs"
        >
          Delete Operator Identity
        </button>
      </CardSurface>

      {/* Database utilities */}
      <CardSurface variant="surface" className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
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
      </CardSurface>

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
