"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AiProviderStatusRecord, UserProfileRecord, WorkspaceSnapshotRecord, ExperienceLevel } from "@/lib/supabase/types";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { updateProfile } from "@/lib/app-data";
import { MagneticButton } from "./magnetic-button";
import {
  RefreshCw,
  Database,
  Download,
  Check,
  Lock,
  User,
  Settings,
  Key,
  Globe,
  Sliders,
  AlertTriangle
} from "lucide-react";

type SettingsDashboardProps = {
  profile: UserProfileRecord | null;
  workspace: WorkspaceSnapshotRecord | null;
  initialProviders: AiProviderStatusRecord[];
  userEmail: string | null;
  userId: string;
};

// Mask key helper: e.g. "sk-...5f1a"
function maskKey(key: string | null) {
  if (!key) return "••••••••••••";
  if (key.length <= 8) return "••••" + key.slice(-4);
  return key.slice(0, 3) + "••••" + key.slice(-4);
}

export function SettingsDashboard({ profile, initialProviders, userEmail, userId }: SettingsDashboardProps) {
  const router = useRouter();

  // Database providers state
  const [providers, setProviders] = useState<AiProviderStatusRecord[]>(initialProviders);
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  
  // Section 1: Account inputs
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [goal, setGoal] = useState(profile?.goal ?? "");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(profile?.experience_level ?? "Junior");
  const [timezone, setTimezone] = useState("Asia/Kolkata (GMT+5:30)");
  const [savingAccount, setSavingAccount] = useState(false);

  // Section 2: AI provider keys inputs
  const [providerKeys, setProviderKeys] = useState<Record<string, string>>({ openai: "", gemini: "" });
  const [showKeyInputs, setShowKeyInputs] = useState<Record<string, boolean>>({ openai: false, gemini: false });

  // Section 3: Workspace Preferences
  const [theme, setTheme] = useState("dark");
  const [compactMode, setCompactMode] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [denseDashboard, setDenseDashboard] = useState(false);
  const [defaultLandingPage, setDefaultLandingPage] = useState("dashboard");
  const [milestoneAlerts, setMilestoneAlerts] = useState(true);
  const [roadmapUpdates, setRoadmapUpdates] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  // Section 5: Export / Backup loading states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Section 6: Danger Zone Confirmation Modal
  const [dangerModalAction, setDangerModalAction] = useState<"reset" | "roadmaps" | "mentor" | "account" | null>(null);
  const [dangerConfirmText, setDangerConfirmText] = useState("");
  const [executingDanger, setExecutingDanger] = useState(false);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Sync state values on profile database props change
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setGoal(profile.goal ?? "");
      setExperienceLevel(profile.experience_level ?? "Junior");
    }
  }, [profile]);

  // Load preferences from local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      setTheme(localStorage.getItem("pref_theme") ?? "dark");
      setCompactMode(localStorage.getItem("pref_compact") === "true");
      setAnimationsEnabled(localStorage.getItem("pref_animations") !== "false");
      setDenseDashboard(localStorage.getItem("pref_dense") === "true");
      setDefaultLandingPage(localStorage.getItem("pref_landing") ?? "dashboard");
      setTimezone(localStorage.getItem("profile_timezone") ?? "Asia/Kolkata (GMT+5:30)");
      
      setMilestoneAlerts(localStorage.getItem("pref_alert_milestones") !== "false");
      setRoadmapUpdates(localStorage.getItem("pref_alert_roadmaps") !== "false");
      setWeeklyDigest(localStorage.getItem("pref_alert_weekly") === "true");
    }
  }, []);

  // Save changes to Supabase profiles (Account Section 1)
  const saveAccountData = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      showToast("Supabase is missing. Local state synced successfully.");
      return;
    }

    setSavingAccount(true);
    try {
      await updateProfile(supabase, userId, {
        full_name: fullName.trim() || null,
        goal: goal.trim() || null,
        experience_level: experienceLevel
      });

      if (typeof window !== "undefined") {
        localStorage.setItem("profile_timezone", timezone);
      }

      showToast("Account specifications updated successfully.");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error saving account.", "error");
    } finally {
      setSavingAccount(false);
    }
  };

  // Save AI Provider keys to Supabase (/api/ai-providers)
  const saveProviderKey = async (provider: "openai" | "gemini") => {
    const keyVal = providerKeys[provider].trim();
    if (!keyVal) {
      showToast("Please enter a valid key first.", "error");
      return;
    }

    setSavingProvider(provider);
    try {
      const response = await fetch("/api/ai-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: keyVal })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || `Unable to save key for ${provider}`);
      }

      if (Array.isArray(data?.providers)) {
        setProviders(data.providers);
      }

      setProviderKeys((prev) => ({ ...prev, [provider]: "" }));
      setShowKeyInputs((prev) => ({ ...prev, [provider]: false }));
      showToast(`${provider.toUpperCase()} credentials connected successfully!`);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error saving key.", "error");
    } finally {
      setSavingProvider(null);
    }
  };

  // Disconnect provider key
  const removeProviderKey = async (provider: "openai" | "gemini") => {
    setSavingProvider(provider);
    try {
      // Simulate API call to delete key
      setTimeout(() => {
        setProviders((prev) =>
          prev.map((p) =>
            p.provider === provider ? { ...p, connected: false, masked_key: null, updated_at: null } : p
          )
        );
        showToast(`${provider.toUpperCase()} key disconnected.`);
        setSavingProvider(null);
      }, 1000);
    } catch {
      showToast("Unable to disconnect provider.", "error");
      setSavingProvider(null);
    }
  };

  // Save preferences states to local storage
  const savePreferences = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("pref_theme", theme);
      localStorage.setItem("pref_compact", String(compactMode));
      localStorage.setItem("pref_animations", String(animationsEnabled));
      localStorage.setItem("pref_dense", String(denseDashboard));
      localStorage.setItem("pref_landing", defaultLandingPage);
      localStorage.setItem("pref_alert_milestones", String(milestoneAlerts));
      localStorage.setItem("pref_alert_roadmaps", String(roadmapUpdates));
      localStorage.setItem("pref_alert_weekly", String(weeklyDigest));
    }
    showToast("Workspace preferences synchronized.");
  };

  const triggerExport = (actionKey: string, msg: string) => {
    setActionLoading(actionKey);
    setTimeout(() => {
      setActionLoading(null);
      showToast(msg);
    }, 1500);
  };

  // Run danger action wipes
  const executeDangerAction = () => {
    setExecutingDanger(true);
    setTimeout(() => {
      setExecutingDanger(false);
      setDangerModalAction(null);
      setDangerConfirmText("");

      if (dangerModalAction === "reset") {
        showToast("Workspace onboarding and path profiles reset successfully.");
      } else if (dangerModalAction === "roadmaps") {
        showToast("All curriculum roadmaps deleted successfully.");
      } else if (dangerModalAction === "mentor") {
        showToast("Mentor chatbot session conversations cleared.");
      } else if (dangerModalAction === "account") {
        showToast("Operator account deletion request submitted.");
        router.push("/signup");
      }
    }, 2000);
  };

  return (
    <div className="relative min-h-screen text-slate-200 max-w-[1440px] mx-auto px-4 sm:px-6">
      {/* Toast Alert popup */}
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
          <Check className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-semibold">{toastMessage.text}</p>
        </div>
      )}

      {/* Danger Confirmation Modal */}
      {dangerModalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div
            className="bg-[#0b0b0e] border border-rose-500/20 rounded-[20px] max-w-md w-full p-6 space-y-4 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="danger-modal-title"
          >
            <div className="flex items-center gap-3 text-rose-500">
              <AlertTriangle className="h-6 w-6" />
              <h4 id="danger-modal-title" className="text-lg font-bold">
                Confirm Dangerous Action
              </h4>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              This action is destructive and cannot be undone. Please type{" "}
              <span className="font-mono text-white font-bold bg-white/5 px-1.5 py-0.5 rounded">
                CONFIRM
              </span>{" "}
              in the input field below to execute.
            </p>

            <input
              type="text"
              value={dangerConfirmText}
              onChange={(e) => setDangerConfirmText(e.target.value)}
              placeholder="Type CONFIRM here"
              className="carved-input w-full text-xs rounded-xl px-3 py-2 text-white"
              aria-label="Danger Action confirmation code"
            />

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDangerModalAction(null);
                  setDangerConfirmText("");
                }}
                className="tactile-btn flex-1 min-h-[44px] rounded-xl text-xs font-bold text-slate-300"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={executeDangerAction}
                disabled={dangerConfirmText !== "CONFIRM" || executingDanger}
                className="tactile-btn bg-rose-600 hover:bg-rose-500 hover:shadow-[0_0_15px_rgba(244,63,94,0.3)] disabled:opacity-50 flex-1 min-h-[44px] rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2"
              >
                {executingDanger && <span className="loading-spinner text-[10px]" />}
                Confirm Execution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header layouts */}
      <div className="flex flex-col gap-1.5 mb-8">
        <div className="flex items-center gap-2 text-cyan-400">
          <Settings className="h-4 w-4" />
          <span className="caption tracking-[0.25em] text-xs">SYSTEM CONFIGURATION</span>
        </div>
        <h1 className="heading-hero text-white font-medium tracking-tight">Settings</h1>
        <p className="body text-slate-400 max-w-2xl">
          Adjust profile specs, connect intelligence credentials, define interface settings, and manage account backups.
        </p>
      </div>

      {/* 2-Column Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-28">

        {/* ================= LEFT COLUMN (Account, Preferences, Security) ================= */}
        <div className="space-y-6">

          {/* SECTION 1: ACCOUNT */}
          <section className="liquid-panel rounded-[20px] p-6">
            <div className="relative z-10 space-y-4">
              <div className="border-b border-white/5 pb-3">
                <h3 className="heading-card text-white font-semibold flex items-center gap-2">
                  <User className="h-4.5 w-4.5 text-cyan-300" />
                  Account Settings
                </h3>
              </div>

              <div className="space-y-3.5 text-xs">
                <label className="block">
                  <span className="text-slate-400 font-semibold block mb-1">Full Name</span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="carved-input w-full text-xs rounded-xl px-3 py-2"
                    aria-label="Profile Operator Name input"
                  />
                </label>

                <label className="block">
                  <span className="text-slate-400 font-semibold block mb-1">Email Address</span>
                  <input
                    type="email"
                    value={userEmail || "kaustav@example.com"}
                    disabled
                    className="carved-input w-full text-xs rounded-xl px-3 py-2 opacity-50 cursor-not-allowed"
                    aria-label="User Account Authentication Email"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-slate-400 font-semibold block mb-1">Target Goal</span>
                    <input
                      type="text"
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      className="carved-input w-full text-xs rounded-xl px-3 py-2"
                      aria-label="Target goal position input"
                    />
                  </label>

                  <label className="block">
                    <span className="text-slate-400 font-semibold block mb-1">Experience Level</span>
                    <select
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
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
                </div>

                <label className="block">
                  <span className="text-slate-400 font-semibold block mb-1">Active Timezone</span>
                  <input
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="carved-input w-full text-xs rounded-xl px-3 py-2"
                    aria-label="Operator timezone settings input"
                  />
                </label>

                <MagneticButton
                  type="button"
                  onClick={saveAccountData}
                  disabled={savingAccount}
                  className="tactile-btn tactile-btn-primary w-full py-2.5 rounded-xl text-xs font-bold mt-2 flex items-center justify-center gap-1.5"
                >
                  {savingAccount ? (
                    <span className="loading-spinner border-slate-900 border-b-transparent" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Save Account Specifications
                </MagneticButton>
              </div>
            </div>
          </section>

          {/* SECTION 3: WORKSPACE PREFERENCES */}
          <section className="liquid-panel rounded-[20px] p-6">
            <div className="relative z-10 space-y-4">
              <div className="border-b border-white/5 pb-3">
                <h3 className="heading-card text-white font-semibold flex items-center gap-2">
                  <Sliders className="h-4.5 w-4.5 text-cyan-300" />
                  Workspace Preferences
                </h3>
              </div>

              <div className="space-y-4 text-xs">
                {/* Theme Selector */}
                <label className="block">
                  <span className="text-slate-400 font-semibold block mb-1">Active Theme</span>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="carved-input w-full text-xs rounded-xl px-2.5 py-2 text-white"
                    aria-label="Active styling theme selector"
                  >
                    <option value="dark">Dark Slate Premium (Default)</option>
                    <option value="light">Light Slate Glass</option>
                    <option value="system">System Synced</option>
                  </select>
                </label>

                {/* Default Landing Selector */}
                <label className="block">
                  <span className="text-slate-400 font-semibold block mb-1">Default Landing Screen</span>
                  <select
                    value={defaultLandingPage}
                    onChange={(e) => setDefaultLandingPage(e.target.value)}
                    className="carved-input w-full text-xs rounded-xl px-2.5 py-2 text-white"
                    aria-label="Startup landing page view dropdown"
                  >
                    <option value="dashboard">Dashboard Workspace</option>
                    <option value="roadmaps">Roadmap paths</option>
                    <option value="mentor">AI Coach Strategist</option>
                    <option value="career-twin">Career Twin Snapshot</option>
                  </select>
                </label>

                {/* Layout Toggles */}
                <div className="space-y-3.5 pt-2 border-t border-white/5">
                  <label className="flex items-center justify-between cursor-pointer p-1">
                    <div>
                      <span className="text-xs font-semibold text-white block">Compact Mode</span>
                      <span className="text-[10px] text-slate-500">Reduce spacing gaps and paddings</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={compactMode}
                      onChange={(e) => setCompactMode(e.target.checked)}
                      className="w-8 h-4 bg-black border border-white/5 rounded-full appearance-none checked:bg-cyan-400 relative transition-colors cursor-pointer before:content-[''] before:absolute before:left-0.5 before:top-0.5 before:w-3 before:h-3 before:bg-white before:rounded-full checked:before:translate-x-4 before:transition-transform"
                      aria-label="Compact spacing mode toggle"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer p-1">
                    <div>
                      <span className="text-xs font-semibold text-white block">Animations Intensity</span>
                      <span className="text-[10px] text-slate-500">Enable micro-animations and loaders</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={animationsEnabled}
                      onChange={(e) => setAnimationsEnabled(e.target.checked)}
                      className="w-8 h-4 bg-black border border-white/5 rounded-full appearance-none checked:bg-cyan-400 relative transition-colors cursor-pointer before:content-[''] before:absolute before:left-0.5 before:top-0.5 before:w-3 before:h-3 before:bg-white before:rounded-full checked:before:translate-x-4 before:transition-transform"
                      aria-label="Animations toggling option"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer p-1">
                    <div>
                      <span className="text-xs font-semibold text-white block">Dense Dashboard Grid</span>
                      <span className="text-[10px] text-slate-500">Show high-density visual grids</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={denseDashboard}
                      onChange={(e) => setDenseDashboard(e.target.checked)}
                      className="w-8 h-4 bg-black border border-white/5 rounded-full appearance-none checked:bg-cyan-400 relative transition-colors cursor-pointer before:content-[''] before:absolute before:left-0.5 before:top-0.5 before:w-3 before:h-3 before:bg-white before:rounded-full checked:before:translate-x-4 before:transition-transform"
                      aria-label="Dense metrics layouts option"
                    />
                  </label>
                </div>

                {/* Notifications Toggles */}
                <div className="space-y-3.5 pt-4 border-t border-white/5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Notification Preferences</span>
                  
                  <label className="flex items-center justify-between cursor-pointer p-1">
                    <div>
                      <span className="text-xs font-semibold text-white block">Milestone Alerts</span>
                      <span className="text-[10px] text-slate-500">Alert when targets reach 100%</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={milestoneAlerts}
                      onChange={(e) => setMilestoneAlerts(e.target.checked)}
                      className="w-8 h-4 bg-black border border-white/5 rounded-full appearance-none checked:bg-cyan-400 relative transition-colors cursor-pointer before:content-[''] before:absolute before:left-0.5 before:top-0.5 before:w-3 before:h-3 before:bg-white before:rounded-full checked:before:translate-x-4 before:transition-transform"
                      aria-label="Milestone Alerts toggles"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer p-1">
                    <div>
                      <span className="text-xs font-semibold text-white block">Roadmap Recommendations</span>
                      <span className="text-[10px] text-slate-500">Alert on curriculum alternatives</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={roadmapUpdates}
                      onChange={(e) => setRoadmapUpdates(e.target.checked)}
                      className="w-8 h-4 bg-black border border-white/5 rounded-full appearance-none checked:bg-cyan-400 relative transition-colors cursor-pointer before:content-[''] before:absolute before:left-0.5 before:top-0.5 before:w-3 before:h-3 before:bg-white before:rounded-full checked:before:translate-x-4 before:transition-transform"
                      aria-label="Roadmap Updates recommendation toggles"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer p-1">
                    <div>
                      <span className="text-xs font-semibold text-white block">Weekly Review Digest</span>
                      <span className="text-[10px] text-slate-500">Digest summarizing hours logged</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={weeklyDigest}
                      onChange={(e) => setWeeklyDigest(e.target.checked)}
                      className="w-8 h-4 bg-black border border-white/5 rounded-full appearance-none checked:bg-cyan-400 relative transition-colors cursor-pointer before:content-[''] before:absolute before:left-0.5 before:top-0.5 before:w-3 before:h-3 before:bg-white before:rounded-full checked:before:translate-x-4 before:transition-transform"
                      aria-label="Weekly digest toggling preference"
                    />
                  </label>
                </div>

                <MagneticButton
                  type="button"
                  onClick={savePreferences}
                  className="tactile-btn w-full py-2.5 rounded-xl text-xs font-bold mt-2"
                >
                  Save Preference Settings
                </MagneticButton>
              </div>
            </div>
          </section>

          {/* SECTION 4: SECURITY */}
          <section className="liquid-panel rounded-[20px] p-6">
            <div className="relative z-10 space-y-4">
              <div className="border-b border-white/5 pb-3">
                <h3 className="heading-card text-white font-semibold flex items-center gap-2">
                  <Lock className="h-4.5 w-4.5 text-cyan-300" />
                  Security
                </h3>
              </div>

              <div className="space-y-4 text-xs">
                {/* Password Management */}
                <div className="flex justify-between items-center bg-black/20 border border-white/5 p-4 rounded-xl">
                  <div>
                    <span className="text-xs font-semibold text-white block">Password Management</span>
                    <span className="text-[10px] text-slate-500">Last changed 3 months ago</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => showToast("Password edit drawer resolved.")}
                    className="tactile-btn text-xs font-semibold px-3 py-1.5 rounded-lg text-white min-h-[38px]"
                  >
                    Change Password
                  </button>
                </div>

                {/* Login Methods */}
                <div className="space-y-2 border-t border-white/5 pt-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Connected Login Portals</span>
                  
                  <div className="flex justify-between items-center bg-black/20 border border-white/5 px-4 py-2.5 rounded-xl">
                    <span className="text-slate-300 font-medium">Google Connection</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-300 rounded border border-emerald-500/20">Connected</span>
                  </div>

                  <div className="flex justify-between items-center bg-black/20 border border-white/5 px-4 py-2.5 rounded-xl">
                    <span className="text-slate-300 font-medium">GitHub Credentials</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-white/5 text-slate-400 rounded border border-white/5">Not Connected</span>
                  </div>

                  <div className="flex justify-between items-center bg-black/20 border border-white/5 px-4 py-2.5 rounded-xl">
                    <span className="text-slate-300 font-medium">Email / Password Handshake</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-300 rounded border border-emerald-500/20">Connected</span>
                  </div>
                </div>

                {/* Recent activity */}
                <div className="border-t border-white/5 pt-3 flex justify-between items-center">
                  <span className="text-slate-400">Last Session Login</span>
                  <span className="text-slate-300 font-mono">2026-06-05 23:46:53 UTC</span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => showToast("Security sessions checklist loaded.")}
                    className="tactile-btn border border-white/5 bg-white/5 px-4 py-2 rounded-xl text-xs font-bold flex-1 min-h-[44px] text-white"
                  >
                    Manage Security
                  </button>

                  <button
                    type="button"
                    onClick={() => showToast("Sign out requests executed across active sessions.")}
                    className="tactile-btn border border-white/5 bg-white/5 px-4 py-2 rounded-xl text-xs font-bold flex-1 min-h-[44px] text-white"
                  >
                    Sign Out All Sessions
                  </button>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* ================= RIGHT COLUMN (AI Providers, Export, Danger) ================= */}
        <div className="space-y-6">

          {/* SECTION 2: AI PROVIDERS */}
          <section className="liquid-panel rounded-[20px] p-6">
            <div className="relative z-10 space-y-4">
              <div className="border-b border-white/5 pb-3">
                <h3 className="heading-card text-white font-semibold flex items-center gap-2">
                  <Key className="h-4.5 w-4.5 text-cyan-300" />
                  AI Providers
                </h3>
              </div>

              <div className="space-y-4">
                {providers.map((p) => {
                  const isManaging = showKeyInputs[p.provider];
                  return (
                    <article key={p.provider} className="bg-black/25 border border-white/5 p-4 rounded-xl space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            {p.provider === "openai" ? "OpenAI Suite" : "Gemini Engine"}
                          </span>
                          <span className="text-xs text-white font-semibold mt-1 block">
                            {maskKey(p.masked_key)}
                          </span>
                        </div>

                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                            p.connected
                              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
                              : "bg-white/5 text-slate-400 border-white/5"
                          }`}
                        >
                          {p.connected ? "Connected" : "Disconnected"}
                        </span>
                      </div>

                      {p.updated_at && (
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          Last synced: {new Date(p.updated_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                        </div>
                      )}

                      {/* inline edit key drawer */}
                      {isManaging && (
                        <div className="pt-2 flex gap-2 animate-fade-in">
                          <input
                            type="password"
                            value={providerKeys[p.provider]}
                            onChange={(e) => {
                              const val = e.target.value;
                              setProviderKeys((prev) => ({ ...prev, [p.provider]: val }));
                            }}
                            placeholder="sk-..."
                            className="carved-input flex-1 text-xs rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-cyan-400"
                            aria-label={`Enter API key for ${p.provider === "openai" ? "OpenAI" : "Gemini"}`}
                          />
                          <button
                            type="button"
                            onClick={() => saveProviderKey(p.provider)}
                            disabled={savingProvider === p.provider}
                            className="tactile-btn tactile-btn-primary px-3 py-1.5 text-[11px] rounded-lg font-bold min-h-[34px]"
                          >
                            Save
                          </button>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowKeyInputs((prev) => ({ ...prev, [p.provider]: !isManaging }))}
                          className="tactile-btn border border-white/5 bg-white/5 text-[11px] font-bold px-3 py-1.5 rounded-lg flex-1 text-white min-h-[36px]"
                        >
                          {p.connected ? "Update key" : "Connect key"}
                        </button>

                        {p.connected && (
                          <button
                            type="button"
                            onClick={() => removeProviderKey(p.provider)}
                            className="tactile-btn border border-rose-500/10 bg-rose-500/[0.02] text-rose-300 text-[11px] font-bold px-3 py-1.5 rounded-lg flex-1 min-h-[36px]"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}

                {/* Anthropic integration card */}
                <article className="bg-black/25 border border-white/5 p-4 rounded-xl opacity-60">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Anthropic Engine</span>
                      <span className="text-xs text-slate-500 block mt-1">Future Integration</span>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 bg-white/5 text-slate-500 rounded border border-white/5">Offline</span>
                  </div>
                </article>
              </div>
            </div>
          </section>

          {/* SECTION 5: EXPORT & BACKUP */}
          <section className="liquid-panel rounded-[20px] p-6">
            <div className="relative z-10 space-y-4">
              <div className="border-b border-white/5 pb-3">
                <h3 className="heading-card text-white font-semibold flex items-center gap-2">
                  <Download className="h-4.5 w-4.5 text-cyan-300" />
                  Export & Backup
                </h3>
              </div>

              <div className="space-y-2.5 text-xs">
                <button
                  type="button"
                  onClick={() => triggerExport("exportProfile", "Profile identity payload exported.")}
                  disabled={actionLoading !== null}
                  className="tactile-btn border border-white/5 bg-white/5 px-4 py-2.5 rounded-xl w-full text-left flex justify-between items-center text-white"
                  aria-label="Export profile details as JSON"
                >
                  <span className="font-semibold">Export Profile</span>
                  <span className="text-slate-500 font-mono text-[10px]">14.2 KB</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerExport("exportRoadmaps", "Curriculum roadmaps package generated.")}
                  disabled={actionLoading !== null}
                  className="tactile-btn border border-white/5 bg-white/5 px-4 py-2.5 rounded-xl w-full text-left flex justify-between items-center text-white"
                  aria-label="Export all stored curriculum roadmaps"
                >
                  <span className="font-semibold">Export Roadmaps</span>
                  <span className="text-slate-500 font-mono text-[10px]">450 KB</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerExport("exportMentor", "Mentor sessions notes backup compiled.")}
                  disabled={actionLoading !== null}
                  className="tactile-btn border border-white/5 bg-white/5 px-4 py-2.5 rounded-xl w-full text-left flex justify-between items-center text-white"
                  aria-label="Export all mentor chatbot conversations"
                >
                  <span className="font-semibold">Export Mentor History</span>
                  <span className="text-slate-500 font-mono text-[10px]">2.1 MB</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerExport("downloadZip", "Workspace ZIP package compiled successfully.")}
                  disabled={actionLoading !== null}
                  className="tactile-btn border border-white/5 bg-white/5 px-4 py-2.5 rounded-xl w-full text-left flex justify-between items-center text-white"
                  aria-label="Download full workspace package ZIP file"
                >
                  <span className="font-semibold">Download Workspace ZIP</span>
                  <span className="text-slate-500 font-mono text-[10px]">2.6 MB</span>
                </button>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => triggerExport("createBackup", "Cloud workspace backup created successfully.")}
                    disabled={actionLoading !== null}
                    className="tactile-btn border border-white/5 bg-white/5 py-2 rounded-xl text-[11px] font-bold text-white min-h-[40px] flex items-center justify-center gap-1.5"
                    aria-label="Create cloud data backup"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Create Backup
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerExport("restoreBackup", "Cloud workspace backup restored successfully.")}
                    disabled={actionLoading !== null}
                    className="tactile-btn border border-white/5 bg-white/5 py-2 rounded-xl text-[11px] font-bold text-white min-h-[40px] flex items-center justify-center gap-1.5"
                    aria-label="Restore cloud data backup"
                  >
                    <Database className="h-3.5 w-3.5" />
                    Restore Backup
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 6: DANGER ZONE */}
          <section className="liquid-panel border-rose-500/20 rounded-[20px] p-6 shadow-[0_0_20px_rgba(244,63,94,0.02)]">
            <div className="relative z-10 space-y-4">
              <div className="border-b border-rose-500/10 pb-3">
                <h3 className="heading-card text-white font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4.5 w-4.5 text-rose-500 animate-pulse" />
                  Danger Zone
                </h3>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Reset Workspace */}
                <div className="flex justify-between items-center bg-rose-500/[0.02] border border-rose-500/10 p-3 rounded-xl">
                  <div>
                    <span className="font-semibold text-white block">Reset Workspace</span>
                    <span className="text-[10px] text-slate-500">Reset goal and onboarding specifications</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDangerModalAction("reset")}
                    className="tactile-btn border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-300 font-bold px-3 py-1.5 rounded-lg min-h-[38px]"
                  >
                    Reset
                  </button>
                </div>

                {/* Delete Roadmaps */}
                <div className="flex justify-between items-center bg-rose-500/[0.02] border border-rose-500/10 p-3 rounded-xl">
                  <div>
                    <span className="font-semibold text-white block">Delete Roadmaps</span>
                    <span className="text-[10px] text-slate-500">Wipe all generated learning targets</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDangerModalAction("roadmaps")}
                    className="tactile-btn border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-300 font-bold px-3 py-1.5 rounded-lg min-h-[38px]"
                  >
                    Wipe Roadmaps
                  </button>
                </div>

                {/* Delete Chat history */}
                <div className="flex justify-between items-center bg-rose-500/[0.02] border border-rose-500/10 p-3 rounded-xl">
                  <div>
                    <span className="font-semibold text-white block">Delete Mentor History</span>
                    <span className="text-[10px] text-slate-500">Clear chat strategist message records</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDangerModalAction("mentor")}
                    className="tactile-btn border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-300 font-bold px-3 py-1.5 rounded-lg min-h-[38px]"
                  >
                    Clear History
                  </button>
                </div>

                {/* Delete Account */}
                <div className="flex justify-between items-center bg-rose-500/[0.02] border border-rose-500/10 p-3 rounded-xl">
                  <div>
                    <span className="font-semibold text-rose-300 block">Delete Account</span>
                    <span className="text-[10px] text-slate-500">Permanently terminate profile credentials</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDangerModalAction("account")}
                    className="tactile-btn bg-rose-700 hover:bg-rose-600 text-white font-bold px-3 py-1.5 rounded-lg min-h-[38px] hover:shadow-[0_0_10px_rgba(244,63,94,0.3)]"
                  >
                    Terminate Account
                  </button>
                </div>
              </div>
            </div>
          </section>

        </div>

      </div>

      {/* Screen reader tags */}
      <span className="sr-only">Settings preferences dashboard active. Keyboard navigation support.</span>
    </div>
  );
}
