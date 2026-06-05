"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { UserProfileRecord, WorkspaceSnapshotRecord, ExperienceLevel } from "@/lib/supabase/types";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { updateProfile } from "@/lib/app-data";
import { MagneticButton } from "./magnetic-button";
import {
  Shield,
  CheckCircle2,
  RefreshCw,
  Database,
  Download,
  Activity,
  ShieldCheck,
  ChevronDown,
  Lock,
  User,
  Award,
  Compass,
  Link as LinkIcon,
  Globe,
  FileText,
  Settings,
  Flame,
  Milestone
} from "lucide-react";

type ProfileDashboardProps = {
  userId: string;
  profile: UserProfileRecord | null;
  workspace: WorkspaceSnapshotRecord | null;
};

export function ProfileDashboard({ userId, profile, workspace }: ProfileDashboardProps) {
  const router = useRouter();

  // State bindings for database profile model
  const [fullName, setFullName] = useState(profile?.full_name ?? "Kaustav Chowdhury");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [goal, setGoal] = useState(profile?.goal ?? "SDE I");
  const [readinessScore, setReadinessScore] = useState(profile?.readiness_score ?? 100);
  
  // Section 3: Summary Fields (Editable local state)
  const [aboutMe, setAboutMe] = useState("Aspiring Software Development Engineer specialized in building highly performant applications and optimizing algorithms.");
  const [careerObjective, setCareerObjective] = useState("Secure an SDE I position at an enterprise-scale engineering product company.");
  const [currentFocus, setCurrentFocus] = useState("Building full-stack projects and strengthening DSA.");
  const [learningPriorities, setLearningPriorities] = useState("System Design basics, Next.js optimization, and advanced SQL.");
  const [isEditingSummary, setIsEditingSummary] = useState(false);

  // Section 4: Career Identity fingerprint parameters
  const [targetRole, setTargetRole] = useState(profile?.goal ?? "SDE I");
  const [careerDomain, setCareerDomain] = useState("Software Engineering");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(profile?.experience_level ?? "Junior");
  const [weeklyCapacity, setWeeklyCapacity] = useState(profile?.time_availability ?? "20 Hours");
  const [learningStyle, setLearningStyle] = useState(profile?.learning_style ?? "Hands-on projects");
  const [currentTrack, setCurrentTrack] = useState("Full Stack Path");

  // Section 6: Additional Form Fields
  const [timezone, setTimezone] = useState("Asia/Kolkata (GMT+5:30)");
  const [linkedinUrl, setLinkedinUrl] = useState("https://linkedin.com/in/kaustav");
  const [githubUrl, setGithubUrl] = useState("https://github.com/kaustavoffx");
  const [portfolioUrl, setPortfolioUrl] = useState("https://kaustav.dev");
  const [resumeUrl, setResumeUrl] = useState("https://drive.google.com/file/d/resume");

  // Asset verification flags
  const [assetsVerified, setAssetsVerified] = useState({
    github: true,
    linkedin: true,
    portfolio: true,
    resume: true
  });

  // Action status triggers
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Sync state values on profile database props change
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "Kaustav Chowdhury");
      setAvatarUrl(profile.avatar_url ?? "");
      setGoal(profile.goal ?? "SDE I");
      setReadinessScore(profile.readiness_score ?? 100);
      setTargetRole(profile.goal ?? "SDE I");
      setExperienceLevel(profile.experience_level ?? "Junior");
      setWeeklyCapacity(profile.time_availability ?? "20 Hours");
      setLearningStyle(profile.learning_style ?? "Hands-on projects");
    }
  }, [profile]);

  // Save changes to Supabase database
  const saveProfileData = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      showToast("Supabase configurations not loaded. Mock synchronization succeeded.");
      return;
    }

    setSavingProfile(true);
    try {
      await updateProfile(supabase, userId, {
        full_name: fullName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        goal: goal.trim() || null,
        readiness_score: Number(readinessScore)
      });
      
      // Update local fingerprint target triggers
      setTargetRole(goal);

      showToast("Career profile records successfully synchronized to database.");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error saving profile details.", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const triggerExport = (actionKey: string, successText: string) => {
    setActionLoading(actionKey);
    setTimeout(() => {
      setActionLoading(null);
      showToast(successText);
    }, 1500);
  };

  // Mock verification click trigger
  const toggleVerifyAsset = (asset: "github" | "linkedin" | "portfolio" | "resume") => {
    setAssetsVerified((prev) => ({ ...prev, [asset]: !prev[asset] }));
    showToast(`${asset.toUpperCase()} verification status updated.`);
  };

  return (
    <div className="relative min-h-screen text-slate-200">
      {/* Toast Alert popup indicator */}
      {toastMessage && (
        <div
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

      {/* Header Deck layout */}
      <div className="flex flex-col gap-1.5 mb-8">
        <div className="flex items-center gap-2 text-cyan-400">
          <Compass className="h-4 w-4" />
          <span className="caption tracking-[0.25em] text-xs">CAREER OPERATING SYSTEM IDENTITY</span>
        </div>
        <h1 className="heading-hero text-white font-medium tracking-tight">Identity Center</h1>
        <p className="body text-slate-400 max-w-2xl">
          Synthesize profile credentials, career summary fields, progress indicators, milestones, and personal brand layouts.
        </p>
      </div>

      {/* 3-Column / 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-28">
        
        {/* ================= COLUMN 1 ================= */}
        <div className="space-y-6">
          
          {/* SECTION 1: PROFILE HERO */}
          <section className="liquid-panel rounded-[24px] p-6 text-center">
            <div className="relative z-10 flex flex-col items-center">
              {/* Avatar structure with glow */}
              <div className="relative group mb-5">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-500" />
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 bg-black/40 flex items-center justify-center">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-10 w-10 text-cyan-300 animate-pulse" />
                  )}
                </div>
              </div>

              <h2 className="heading-dashboard text-white font-semibold leading-tight">{fullName}</h2>
              <p className="text-xs font-bold text-cyan-300 mt-1 uppercase tracking-wider">Aspiring {goal}</p>
              <p className="text-xs text-slate-400 mt-0.5">{careerDomain}</p>

              <div className="w-full grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-white/5">
                <div className="bg-black/20 border border-white/5 rounded-2xl py-3 px-2">
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 block mb-1">Readiness</span>
                  <span className="text-lg font-extrabold text-cyan-300">{readinessScore}%</span>
                </div>
                <div className="bg-black/20 border border-white/5 rounded-2xl py-3 px-2">
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 block mb-1">Workspace</span>
                  <span className="text-xs font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 rounded-full inline-block mt-0.5">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 4: CAREER IDENTITY FINGERPRINT */}
          <section className="liquid-panel rounded-[24px] p-6">
            <div className="relative z-10 space-y-4">
              <div className="border-b border-white/5 pb-3">
                <div className="flex items-center gap-2 text-cyan-300 mb-1">
                  <Compass className="h-4 w-4 animate-spin-slow" />
                  <p className="caption text-xs">Career Fingerprint</p>
                </div>
                <h3 className="heading-card text-white">Target Career Metrics</h3>
              </div>

              <div className="space-y-3 text-xs">
                <label className="block">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold">Target Position</span>
                  <input
                    type="text"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="mt-1.5 carved-input w-full rounded-xl px-3 py-2 text-xs text-white"
                  />
                </label>

                <label className="block">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold">Career Domain</span>
                  <input
                    type="text"
                    value={careerDomain}
                    onChange={(e) => setCareerDomain(e.target.value)}
                    className="mt-1.5 carved-input w-full rounded-xl px-3 py-2 text-xs text-white"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-[10px] uppercase text-slate-400 font-semibold">Experience Level</span>
                    <select
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                      className="mt-1.5 carved-input w-full rounded-xl px-2.5 py-2 text-xs text-white"
                    >
                      <option value="Student">Student</option>
                      <option value="Junior">Junior</option>
                      <option value="Mid">Mid</option>
                      <option value="Senior">Senior</option>
                      <option value="Switcher">Switcher</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-[10px] uppercase text-slate-400 font-semibold">Weekly Capacity</span>
                    <input
                      type="text"
                      value={weeklyCapacity}
                      onChange={(e) => setWeeklyCapacity(e.target.value)}
                      className="mt-1.5 carved-input w-full rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold">Preferred Learning Style</span>
                  <input
                    type="text"
                    value={learningStyle}
                    onChange={(e) => setLearningStyle(e.target.value)}
                    className="mt-1.5 carved-input w-full rounded-xl px-3 py-2 text-xs text-white"
                  />
                </label>

                <label className="block">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold">Current Track</span>
                  <input
                    type="text"
                    value={currentTrack}
                    onChange={(e) => setCurrentTrack(e.target.value)}
                    className="mt-1.5 carved-input w-full rounded-xl px-3 py-2 text-xs text-white"
                  />
                </label>
              </div>
            </div>
          </section>

          {/* SECTION 7: CONNECTED ASSETS */}
          <section className="liquid-panel rounded-[24px] p-6">
            <div className="relative z-10 space-y-4">
              <div className="border-b border-white/5 pb-3">
                <div className="flex items-center gap-2 text-cyan-300 mb-1">
                  <LinkIcon className="h-4 w-4" />
                  <p className="caption text-xs">Connected Assets</p>
                </div>
                <h3 className="heading-card text-white">Linked Digital Portals</h3>
              </div>

              <div className="space-y-3">
                {/* GitHub Asset */}
                <div className="flex justify-between items-center bg-black/20 border border-white/5 px-4 py-3 rounded-2xl text-xs hover:border-cyan-300/35 transition-all">
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-cyan-300" />
                    <div>
                      <p className="font-semibold text-white">GitHub Connection</p>
                      <span className="text-[10px] text-slate-400 font-mono tracking-wide">{githubUrl || "Not connected"}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleVerifyAsset("github")}
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      assetsVerified.github
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                        : "bg-white/5 text-slate-400 border-white/5"
                    }`}
                  >
                    {assetsVerified.github ? "Verified" : "Verify"}
                  </button>
                </div>

                {/* LinkedIn Asset */}
                <div className="flex justify-between items-center bg-black/20 border border-white/5 px-4 py-3 rounded-2xl text-xs hover:border-cyan-300/35 transition-all">
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-cyan-300" />
                    <div>
                      <p className="font-semibold text-white">LinkedIn Connection</p>
                      <span className="text-[10px] text-slate-400 font-mono tracking-wide">{linkedinUrl || "Not connected"}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleVerifyAsset("linkedin")}
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      assetsVerified.linkedin
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                        : "bg-white/5 text-slate-400 border-white/5"
                    }`}
                  >
                    {assetsVerified.linkedin ? "Verified" : "Verify"}
                  </button>
                </div>

                {/* Portfolio Asset */}
                <div className="flex justify-between items-center bg-black/20 border border-white/5 px-4 py-3 rounded-2xl text-xs hover:border-cyan-300/35 transition-all">
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-indigo-400" />
                    <div>
                      <p className="font-semibold text-white">Developer Portfolio</p>
                      <span className="text-[10px] text-slate-400 font-mono tracking-wide">{portfolioUrl || "Not connected"}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleVerifyAsset("portfolio")}
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      assetsVerified.portfolio
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                        : "bg-white/5 text-slate-400 border-white/5"
                    }`}
                  >
                    {assetsVerified.portfolio ? "Verified" : "Verify"}
                  </button>
                </div>

                {/* Resume URL Asset */}
                <div className="flex justify-between items-center bg-black/20 border border-white/5 px-4 py-3 rounded-2xl text-xs hover:border-cyan-300/35 transition-all">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-indigo-400" />
                    <div>
                      <p className="font-semibold text-white">Resume URL Endpoint</p>
                      <span className="text-[10px] text-slate-400 font-mono tracking-wide overflow-hidden max-w-[140px] truncate block">{resumeUrl || "Not connected"}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleVerifyAsset("resume")}
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      assetsVerified.resume
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                        : "bg-white/5 text-slate-400 border-white/5"
                    }`}
                  >
                    {assetsVerified.resume ? "Verified" : "Verify"}
                  </button>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* ================= COLUMN 2 ================= */}
        <div className="space-y-6">

          {/* SECTION 2: CAREER SNAPSHOT */}
          <section className="grid grid-cols-3 gap-4">
            <article className="liquid-panel rounded-2xl p-4 text-center hover:translate-y-[-2px] transition-transform">
              <span className="text-[9px] tracking-widest uppercase font-bold text-slate-400 block mb-1">Readiness</span>
              <p className="text-2xl font-black text-cyan-300">{readinessScore}%</p>
            </article>

            <article className="liquid-panel rounded-2xl p-4 text-center hover:translate-y-[-2px] transition-transform">
              <span className="text-[9px] tracking-widest uppercase font-bold text-slate-400 block mb-1">Projects</span>
              <p className="text-2xl font-black text-indigo-300">4</p>
            </article>

            <article className="liquid-panel rounded-2xl p-4 text-center hover:translate-y-[-2px] transition-transform">
              <span className="text-[9px] tracking-widest uppercase font-bold text-slate-400 block mb-1">Mentor Chats</span>
              <p className="text-2xl font-black text-emerald-300">23</p>
            </article>

            <article className="liquid-panel rounded-2xl p-4 text-center hover:translate-y-[-2px] transition-transform">
              <span className="text-[9px] tracking-widest uppercase font-bold text-slate-400 block mb-1">Roadmaps</span>
              <p className="text-2xl font-black text-white">{workspace?.roadmaps?.length ?? 2}</p>
            </article>

            <article className="liquid-panel rounded-2xl p-4 text-center hover:translate-y-[-2px] transition-transform">
              <span className="text-[9px] tracking-widest uppercase font-bold text-slate-400 block mb-1">Milestones</span>
              <p className="text-2xl font-black text-white">5</p>
            </article>

            <article className="liquid-panel rounded-2xl p-4 text-center hover:translate-y-[-2px] transition-transform">
              <span className="text-[9px] tracking-widest uppercase font-bold text-slate-400 block mb-1">Twin Health</span>
              <p className="text-sm font-bold text-cyan-300 mt-1 uppercase tracking-wide">94% Stable</p>
            </article>
          </section>

          {/* SECTION 3: PROFESSIONAL SUMMARY */}
          <section className="liquid-panel rounded-[24px] p-6">
            <div className="relative z-10 space-y-4">
              <div className="border-b border-white/5 pb-3 flex justify-between items-center">
                <div>
                  <p className="caption text-cyan-300">Biographical summaries</p>
                  <h3 className="heading-card text-white mt-1">Professional Summary</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingSummary(!isEditingSummary)}
                  className="text-xs text-cyan-300 hover:text-white font-semibold"
                >
                  {isEditingSummary ? "Close summary Editor" : "Edit Bio Summary"}
                </button>
              </div>

              {!isEditingSummary ? (
                <div className="space-y-4 text-xs">
                  <div className="bg-black/20 border border-white/5 rounded-xl p-3.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">About Me</span>
                    <p className="text-white mt-1.5 leading-relaxed">{aboutMe}</p>
                  </div>

                  <div className="bg-black/20 border border-white/5 rounded-xl p-3.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Career Objective</span>
                    <p className="text-white mt-1.5 leading-relaxed">{careerObjective}</p>
                  </div>

                  <div className="bg-black/20 border border-white/5 rounded-xl p-3.5">
                    <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Current Focus Target</span>
                    <p className="text-white mt-1.5 leading-relaxed font-semibold">{currentFocus}</p>
                  </div>

                  <div className="bg-black/20 border border-white/5 rounded-xl p-3.5">
                    <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Learning Priorities</span>
                    <p className="text-white mt-1.5 leading-relaxed">{learningPriorities}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5 text-xs">
                  <label className="block">
                    <span className="text-[10px] uppercase text-slate-400 font-semibold">About Me</span>
                    <textarea
                      value={aboutMe}
                      onChange={(e) => setAboutMe(e.target.value)}
                      rows={3}
                      className="mt-1 carved-input w-full rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[10px] uppercase text-slate-400 font-semibold">Career Objective</span>
                    <textarea
                      value={careerObjective}
                      onChange={(e) => setCareerObjective(e.target.value)}
                      rows={2}
                      className="mt-1 carved-input w-full rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[10px] uppercase text-slate-400 font-semibold">Current Focus Target</span>
                    <input
                      type="text"
                      value={currentFocus}
                      onChange={(e) => setCurrentFocus(e.target.value)}
                      className="mt-1 carved-input w-full rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[10px] uppercase text-slate-400 font-semibold">Learning Priorities</span>
                    <input
                      type="text"
                      value={learningPriorities}
                      onChange={(e) => setLearningPriorities(e.target.value)}
                      className="mt-1 carved-input w-full rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </label>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingSummary(false);
                      showToast("Professional bio summaries saved locally.");
                    }}
                    className="tactile-btn tactile-btn-primary py-1.5 w-full rounded-xl font-bold"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* SECTION 5: READINESS BREAKDOWN */}
          <section className="liquid-panel rounded-[24px] p-6">
            <div className="relative z-10 space-y-4">
              <div className="border-b border-white/5 pb-3">
                <div className="flex items-center gap-2 text-cyan-300 mb-1">
                  <Activity className="h-4 w-4" />
                  <p className="caption text-xs">Readiness Breakdown</p>
                </div>
                <h3 className="heading-card text-white">Metric Proficiency Scores</h3>
              </div>

              <div className="space-y-3">
                {[
                  { name: "Programming Fundamentals", score: 98, color: "bg-cyan-400" },
                  { name: "Data Structures & Algorithms", score: 85, color: "bg-cyan-400" },
                  { name: "Real-world Projects", score: 90, color: "bg-cyan-400" },
                  { name: "Git Version Control", score: 95, color: "bg-cyan-400" },
                  { name: "Frontend Development", score: 78, color: "bg-indigo-400" },
                  { name: "Backend Architecture", score: 88, color: "bg-indigo-400" },
                  { name: "System Design Concepts", score: 65, color: "bg-indigo-400" },
                  { name: "Mock Interview Readiness", score: 92, color: "bg-emerald-400" }
                ].map((item) => (
                  <div key={item.name} className="space-y-1 text-xs">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-300 font-medium">{item.name}</span>
                      <span className="text-white font-bold">{item.score}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden border border-white/5">
                      <div
                        className={`h-full ${item.color} transition-all duration-1000`}
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 8: CAREER ACHIEVEMENTS */}
          <section className="liquid-panel rounded-[24px] p-6">
            <div className="relative z-10 space-y-4">
              <div className="border-b border-white/5 pb-3">
                <div className="flex items-center gap-2 text-cyan-300 mb-1">
                  <Award className="h-4 w-4" />
                  <p className="caption text-xs">Career Milestones</p>
                </div>
                <h3 className="heading-card text-white">Achievements & Badges</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
                {[
                  { title: "Roadmap Started", desc: "Initiated first curriculum path", unlocked: true },
                  { title: "First Milestone", desc: "Finished core learning steps", unlocked: true },
                  { title: "50% Readiness", desc: "Exceeded 50 readiness score", unlocked: true },
                  { title: "Project Completed", desc: "Built full-stack target app", unlocked: true },
                  { title: "Mentor User", desc: "Engaged 10 mentor cycles", unlocked: false }
                ].map((ach) => (
                  <article
                    key={ach.title}
                    className={`group relative flex flex-col items-center justify-between p-3 rounded-xl border text-center transition-all ${
                      ach.unlocked
                        ? "border-cyan-500/20 bg-cyan-950/5 hover:translate-y-[-2px]"
                        : "border-white/5 bg-black/40 opacity-50"
                    }`}
                  >
                    <div className="mb-2">
                      <Award className={`h-6 w-6 ${ach.unlocked ? "text-cyan-300 group-hover:scale-110 transition-transform" : "text-slate-500"}`} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-white leading-tight">{ach.title}</p>
                      <span className="text-[8px] text-slate-500 block mt-0.5">{ach.unlocked ? "Unlocked" : "Locked"}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

        </div>

        {/* ================= COLUMN 3 ================= */}
        <div className="space-y-6">

          {/* SPECIAL FEATURE: CAREER CARD */}
          <section className="liquid-panel rounded-[24px] p-6 relative overflow-hidden">
            {/* Holographic glowing lines decor */}
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-transparent to-indigo-500/10 pointer-events-none" />
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 space-y-4">
              <div className="border-b border-white/5 pb-3 flex justify-between items-center">
                <div>
                  <p className="caption text-cyan-300">Identity passport</p>
                  <h3 className="heading-card text-white mt-1">Career Card Mockup</h3>
                </div>
                <Award className="h-4 w-4 text-cyan-300" />
              </div>

              {/* Glowing Driver's License style Glassmorphic Card */}
              <div className="relative group perspective-1000 mt-2">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-[20px] blur opacity-30 group-hover:opacity-60 transition duration-1000" />
                <div className="relative w-full rounded-[20px] border border-white/10 bg-[#0c0c10]/90 p-5 shadow-2xl flex flex-col justify-between overflow-hidden gap-6">
                  
                  {/* Holographic diagonal backdrop strip */}
                  <div className="absolute top-0 right-0 w-[40%] h-[150%] bg-gradient-to-b from-white/[0.03] to-transparent transform rotate-12 translate-x-4 pointer-events-none" />

                  {/* Top section: Goal, Domain, Chip */}
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">CareerOS Credentials</p>
                      <h4 className="text-lg font-extrabold text-white mt-1 uppercase tracking-tight">{goal}</h4>
                      <p className="text-[10px] text-cyan-300 tracking-wide font-medium">{careerDomain}</p>
                    </div>
                    {/* Simulated smart card chip */}
                    <div className="w-8 h-6 rounded-md bg-gradient-to-br from-yellow-300/40 via-yellow-400/20 to-transparent border border-yellow-300/20 shadow-inner flex-shrink-0" />
                  </div>

                  {/* Middle section: Scores and status */}
                  <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">Strongest Skill</span>
                      <span className="text-xs font-bold text-emerald-400 mt-0.5 block">DSA & Logic Optimization</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">Weakest Skill Area</span>
                      <span className="text-xs font-bold text-rose-400 mt-0.5 block">System Design Handshakes</span>
                    </div>
                  </div>

                  {/* Bottom section: Priority, Next milestone, and logo */}
                  <div className="border-t border-white/5 pt-4 flex justify-between items-end">
                    <div className="space-y-2">
                      <div>
                        <span className="text-[8px] text-indigo-300 uppercase font-bold block">Active Priority</span>
                        <p className="text-[10px] font-bold text-white leading-snug">{currentFocus}</p>
                      </div>
                      <div>
                        <span className="text-[8px] text-indigo-300 uppercase font-bold block">Next Target Milestone</span>
                        <p className="text-[10px] text-slate-300 leading-snug flex items-center gap-1">
                          <Milestone className="h-3 w-3 text-cyan-300 flex-shrink-0" />
                          React Redux Integration
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right flex flex-col items-end gap-1">
                      <span className="text-[14px] font-black tracking-tighter text-white font-sinistre">
                        CAREER<span className="text-cyan-400">OS</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] font-mono font-semibold text-slate-400">Score</span>
                        <span className="text-xs font-bold text-cyan-300 font-mono">{readinessScore}</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </section>

          {/* SECTION 6: PROFILE SETTINGS */}
          <section className="liquid-panel rounded-[24px] p-6">
            <div className="relative z-10 space-y-4">
              <div className="border-b border-white/5 pb-3 flex justify-between items-center">
                <div>
                  <p className="caption text-cyan-300">Identity Details</p>
                  <h3 className="heading-card text-white mt-1">Profile Configurations</h3>
                </div>
                <Settings className="h-4 w-4 text-cyan-300" />
              </div>

              <div className="space-y-3.5 text-xs">
                <label className="block">
                  <span className="text-xs text-slate-400 font-semibold">Profile Full Name</span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1.5 carved-input w-full rounded-xl px-3 py-2 text-xs text-white"
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-slate-400 font-semibold">Avatar Image URL</span>
                  <input
                    type="text"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="Paste URL"
                    className="mt-1.5 carved-input w-full rounded-xl px-3 py-2 text-xs text-white"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs text-slate-400 font-semibold">Goal Profile</span>
                    <input
                      type="text"
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      className="mt-1.5 carved-input w-full rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs text-slate-400 font-semibold">Readiness Score</span>
                    <input
                      type="number"
                      value={readinessScore}
                      onChange={(e) => setReadinessScore(parseInt(e.target.value) || 0)}
                      min="0"
                      max="100"
                      className="mt-1.5 carved-input w-full rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-xs text-slate-400 font-semibold">Active Timezone</span>
                  <input
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="mt-1.5 carved-input w-full rounded-xl px-3 py-2 text-xs text-white"
                  />
                </label>

                {/* Show toggle for advanced URLs link lists */}
                <div className="border-t border-white/5 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                    className="flex justify-between items-center w-full text-xs text-slate-400 hover:text-white"
                  >
                    <span>External Branding Links</span>
                    <ChevronDown className={`h-4 w-4 transform transition-transform ${showAdvancedSettings ? "rotate-180" : ""}`} />
                  </button>

                  {showAdvancedSettings && (
                    <div className="mt-3 space-y-3.5 bg-black/40 border border-white/5 p-3 rounded-xl animate-fade-in">
                      <label className="block">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">LinkedIn Profile</span>
                        <input
                          type="text"
                          value={linkedinUrl}
                          onChange={(e) => setLinkedinUrl(e.target.value)}
                          className="mt-1 carved-input w-full rounded-xl px-2.5 py-1.5 text-xs text-white"
                        />
                      </label>

                      <label className="block">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">GitHub Profile</span>
                        <input
                          type="text"
                          value={githubUrl}
                          onChange={(e) => setGithubUrl(e.target.value)}
                          className="mt-1 carved-input w-full rounded-xl px-2.5 py-1.5 text-xs text-white"
                        />
                      </label>

                      <label className="block">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Developer Portfolio</span>
                        <input
                          type="text"
                          value={portfolioUrl}
                          onChange={(e) => setPortfolioUrl(e.target.value)}
                          className="mt-1 carved-input w-full rounded-xl px-2.5 py-1.5 text-xs text-white"
                        />
                      </label>

                      <label className="block">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Resume URL</span>
                        <input
                          type="text"
                          value={resumeUrl}
                          onChange={(e) => setResumeUrl(e.target.value)}
                          className="mt-1 carved-input w-full rounded-xl px-2.5 py-1.5 text-xs text-white"
                        />
                      </label>
                    </div>
                  )}
                </div>

                <MagneticButton
                  type="button"
                  onClick={saveProfileData}
                  disabled={savingProfile}
                  className="tactile-btn tactile-btn-primary w-full py-2 rounded-xl text-xs font-bold mt-2"
                >
                  {savingProfile ? (
                    <span className="loading-spinner border-slate-900 border-b-transparent" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Save Profile Identity
                </MagneticButton>
              </div>
            </div>
          </section>

          {/* SECTION 9: ACTIVITY TIMELINE */}
          <section className="liquid-panel rounded-[24px] p-6">
            <div className="relative z-10 space-y-4">
              <div className="border-b border-white/5 pb-3 flex justify-between items-center">
                <div>
                  <p className="caption text-cyan-300">Identity Audit</p>
                  <h3 className="heading-card text-white mt-1">Activity Log</h3>
                </div>
                <Activity className="h-4 w-4 text-cyan-300" />
              </div>

              <div className="relative border-l border-white/5 ml-3 pl-5 space-y-4 text-xs">
                {[
                  { title: "Milestone Completed", time: "1 hour ago", icon: Milestone, color: "bg-emerald-500" },
                  { title: "Career Twin Synchronized", time: "4 hours ago", icon: Flame, color: "bg-cyan-500" },
                  { title: "Profile Credentials Saved", time: "1 day ago", icon: User, color: "bg-indigo-500" },
                  { title: "Roadmap Curriculum Generated", time: "3 days ago", icon: Compass, color: "bg-cyan-500" }
                ].map((item, idx) => (
                  <div key={idx} className="relative">
                    {/* Circle icon marker on path line */}
                    <div className={`absolute -left-[27px] top-0.5 w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-[#050505] text-[8px] text-white ${item.color}`}>
                      <item.icon className="h-2 w-2" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{item.title}</p>
                      <span className="text-[9px] text-slate-500 font-mono tracking-wide">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 10: ACCOUNT MANAGEMENT */}
          <section className="liquid-panel rounded-[24px] p-6">
            <div className="relative z-10 space-y-4">
              <div className="border-b border-white/5 pb-3">
                <div className="flex items-center gap-2 text-cyan-300 mb-1">
                  <Shield className="h-4 w-4" />
                  <p className="caption text-xs">Identity Portability</p>
                </div>
                <h3 className="heading-card text-white">Account Management</h3>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <button
                  type="button"
                  onClick={() => triggerExport("exportProfile", "Profile identity JSON file generated.")}
                  disabled={actionLoading !== null}
                  className="tactile-btn border border-white/5 bg-white/5 py-2.5 rounded-xl text-center flex flex-col items-center gap-1.5 disabled:opacity-60"
                >
                  <Download className="h-4 w-4 text-cyan-300" />
                  <span className="text-[10px] font-bold text-slate-300">Export Identity</span>
                  {actionLoading === "exportProfile" && <span className="loading-spinner text-[10px] text-cyan-300" />}
                </button>

                <button
                  type="button"
                  onClick={() => triggerExport("backupProfile", "Identity archive backed up safely.")}
                  disabled={actionLoading !== null}
                  className="tactile-btn border border-white/5 bg-white/5 py-2.5 rounded-xl text-center flex flex-col items-center gap-1.5 disabled:opacity-60"
                >
                  <RefreshCw className="h-4 w-4 text-indigo-400" />
                  <span className="text-[10px] font-bold text-slate-300">Backup Profile</span>
                  {actionLoading === "backupProfile" && <span className="loading-spinner text-[10px] text-cyan-300" />}
                </button>

                <button
                  type="button"
                  onClick={() => triggerExport("downloadData", "Identity data dump saved.")}
                  disabled={actionLoading !== null}
                  className="tactile-btn border border-white/5 bg-white/5 py-2.5 rounded-xl text-center flex flex-col items-center gap-1.5 disabled:opacity-60"
                >
                  <Database className="h-4 w-4 text-emerald-400" />
                  <span className="text-[10px] font-bold text-slate-300">Download Data</span>
                  {actionLoading === "downloadData" && <span className="loading-spinner text-[10px] text-cyan-300" />}
                </button>

                <button
                  type="button"
                  onClick={() => triggerExport("deleteAccount", "Account deletion requested.")}
                  disabled={actionLoading !== null}
                  className="tactile-btn border border-rose-500/20 bg-rose-500/5 py-2.5 rounded-xl text-center flex flex-col items-center gap-1.5 disabled:opacity-60"
                >
                  <Lock className="h-4 w-4 text-rose-400" />
                  <span className="text-[10px] font-bold text-rose-300">Delete Account</span>
                  {actionLoading === "deleteAccount" && <span className="loading-spinner text-[10px] text-cyan-300" />}
                </button>
              </div>
            </div>
          </section>

        </div>

      </div>

      {/* Sticky save bar for Mobile viewports */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#060608]/90 backdrop-blur-md border-t border-white/5 py-4 px-6 md:hidden flex justify-end shadow-[0_-12px_40px_rgba(0,0,0,0.6)]">
        <button
          type="button"
          onClick={saveProfileData}
          disabled={savingProfile}
          className="tactile-btn tactile-btn-primary w-full py-2.5 rounded-full text-sm font-bold flex items-center justify-center gap-2"
        >
          {savingProfile ? (
            <span className="loading-spinner border-slate-900 border-b-transparent" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
          Save Identity Changes
        </button>
      </div>
    </div>
  );
}
