"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { AiProviderStatusRecord, UserProfileRecord, WorkspaceSnapshotRecord, ExperienceLevel } from "@/lib/supabase/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { updateProfile } from "@/lib/app-data";
import { MagneticButton } from "./magnetic-button";
import {
  Download, Check, User, X, Sliders, AlertTriangle, ChevronDown, ChevronUp
} from "lucide-react";

type SettingsDashboardProps = {
  profile: UserProfileRecord | null;
  workspace: WorkspaceSnapshotRecord | null;
  initialProviders: AiProviderStatusRecord[];
  userEmail: string | null;
  userId: string;
};

function maskKey(key: string | null) {
  if (!key) return "••••••••••••";
  if (key.length <= 8) return "••••" + key.slice(-4);
  return key.slice(0, 3) + "••••" + key.slice(-4);
}

export function SettingsDashboard({ profile, initialProviders, userEmail, userId }: SettingsDashboardProps) {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [providers, setProviders] = useState<AiProviderStatusRecord[]>(initialProviders);

  
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [goal, setGoal] = useState(profile?.goal ?? "");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(profile?.experience_level ?? "Junior");
  const [timezone, setTimezone] = useState("Asia/Kolkata (GMT+5:30)");
  const [savingAccount, setSavingAccount] = useState(false);

  const [providerKeys, setProviderKeys] = useState<Record<string, string>>({ openai: "", gemini: "" });
  const [showKeyInputs, setShowKeyInputs] = useState<Record<string, boolean>>({ openai: false, gemini: false });

  // Preferences
  const [theme, setTheme] = useState("dark");
  const [compactMode, setCompactMode] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [milestoneAlerts, setMilestoneAlerts] = useState(true);
  const [roadmapUpdates, setRoadmapUpdates] = useState(true);

  // Danger zone drawer state
  const [isDangerZoneExpanded, setIsDangerZoneExpanded] = useState(false);
  const [dangerModalAction, setDangerModalAction] = useState<"reset" | "roadmaps" | "mentor" | "account" | null>(null);
  const [dangerConfirmText, setDangerConfirmText] = useState("");
  const [executingDanger, setExecutingDanger] = useState(false);

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
      setGoal(profile.goal ?? "");
      setExperienceLevel(profile.experience_level ?? "Junior");
    }
  }, [profile]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setTheme(localStorage.getItem("pref_theme") ?? "dark");
      setCompactMode(localStorage.getItem("pref_compact") === "true");
      setAnimationsEnabled(localStorage.getItem("pref_animations") !== "false");
      setTimezone(localStorage.getItem("profile_timezone") ?? "Asia/Kolkata (GMT+5:30)");
      setMilestoneAlerts(localStorage.getItem("pref_alert_milestones") !== "false");
      setRoadmapUpdates(localStorage.getItem("pref_alert_roadmaps") !== "false");
    }
  }, []);

  const saveAccountData = async () => {
    if (!supabase) {
      showToast("Database client connection not active.", "error");
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

      showToast("Account parameters saved successfully.");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error saving account.", "error");
    } finally {
      setSavingAccount(false);
    }
  };

  const saveProviderKey = async (provider: "openai" | "gemini") => {
    const keyVal = providerKeys[provider].trim();
    if (!keyVal) {
      showToast("Enter a valid API key.", "error");
      return;
    }

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
      showToast(`${provider.toUpperCase()} credentials connected.`);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error saving key.", "error");
    }
  };

  const removeProviderKey = async (provider: "openai" | "gemini") => {
    try {
      // Simulate API call disconnect
      setTimeout(() => {
        setProviders((prev) =>
          prev.map((p) =>
            p.provider === provider ? { ...p, connected: false, masked_key: null, updated_at: null } : p
          )
        );
        showToast(`${provider.toUpperCase()} credentials disconnected.`);
      }, 1000);
    } catch {
      showToast("Unable to disconnect key.", "error");
    }
  };

  const savePreferences = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("pref_theme", theme);
      localStorage.setItem("pref_compact", String(compactMode));
      localStorage.setItem("pref_animations", String(animationsEnabled));
      localStorage.setItem("pref_alert_milestones", String(milestoneAlerts));
      localStorage.setItem("pref_alert_roadmaps", String(roadmapUpdates));
    }
    showToast("Workspace preferences synchronized.");
  };

  const triggerExport = (msg: string) => {
    setTimeout(() => {
      setExportedFilename(msg);
      setExportSuccessOpen(true);
    }, 1500);
  };

  const executeDangerAction = () => {
    setExecutingDanger(true);
    setTimeout(() => {
      setExecutingDanger(false);
      setDangerModalAction(null);
      setDangerConfirmText("");

      if (dangerModalAction === "reset") {
        showToast("Workspace onboarding reset completed.");
      } else if (dangerModalAction === "roadmaps") {
        showToast("Roadmap structures deleted.");
      } else if (dangerModalAction === "mentor") {
        showToast("Mentor chat history cleared.");
      } else if (dangerModalAction === "account") {
        showToast("Operator profile terminated.");
        router.push("/signup");
      }
    }, 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Alert */}
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

      {/* Danger Confirmation Modal */}
      {dangerModalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0b0b0e] border border-rose-500/20 rounded-[20px] max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-500">
              <AlertTriangle className="h-6 w-6" />
              <h4 className="text-lg font-bold">Confirm Destructive Action</h4>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              This action is permanent. Please type <span className="font-mono text-white font-bold bg-white/5 px-1.5 py-0.5 rounded">CONFIRM</span> to proceed.
            </p>

            <input
              type="text"
              value={dangerConfirmText}
              onChange={(e) => setDangerConfirmText(e.target.value)}
              placeholder="Type CONFIRM"
              className="carved-input w-full text-xs rounded-xl px-3 py-2 text-white"
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
                className="tactile-btn bg-rose-600 hover:bg-rose-500 disabled:opacity-50 flex-1 min-h-[44px] rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2"
              >
                {executingDanger && <span className="loading-spinner text-[10px]" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SPOTLIGHT CARD 1: AI PROVIDER CARD ═══════════════════════════ */}
      <section className="card-spotlight rounded-[24px] p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-32 w-48 bg-cyan-400/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4 border-b border-cyan-400/20 pb-3">
            <Image src="/logo.png" alt="System" width={20} height={20} className="object-contain shrink-0" />
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">System Configuration</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {providers.map((p) => {
              const isManaging = showKeyInputs[p.provider];
              return (
                <div key={p.provider} className="bg-black/25 border border-white/5 hover:border-cyan-400/25 p-4 rounded-2xl transition">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {p.provider === "openai" ? "OpenAI Model Suite" : "Gemini Engine"}
                      </span>
                      <span className="text-xs text-white font-mono mt-1 block">
                        {maskKey(p.masked_key)}
                      </span>
                    </div>
                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border ${
                      p.connected ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25" : "bg-white/5 text-slate-400 border-white/5"
                    }`}>
                      {p.connected ? "Active" : "Disconnected"}
                    </span>
                  </div>

                  {isManaging && (
                    <div className="pt-2 flex gap-2 mb-3">
                      <input
                        type="password"
                        value={providerKeys[p.provider]}
                        onChange={e => setProviderKeys(prev => ({ ...prev, [p.provider]: e.target.value }))}
                        placeholder="Paste sk-..."
                        className="carved-input flex-1 text-xs rounded-xl px-2.5 py-1.5"
                      />
                      <button
                        onClick={() => saveProviderKey(p.provider)}
                        className="tactile-btn tactile-btn-primary px-3 py-1.5 text-[10px] rounded-xl font-bold"
                      >
                        Save
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4 pt-3 border-t border-white/5">
                    <button
                      onClick={() => setShowKeyInputs(prev => ({ ...prev, [p.provider]: !isManaging }))}
                      className="tactile-btn border border-white/5 bg-white/5 text-[10px] font-bold px-3 py-1.5 rounded-xl flex-1 text-white"
                    >
                      {p.connected ? "Update Key" : "Connect Key"}
                    </button>
                    {p.connected && (
                      <button
                        onClick={() => removeProviderKey(p.provider)}
                        className="tactile-btn border border-rose-500/10 bg-rose-500/[0.02] text-rose-300 text-[10px] font-bold px-3 py-1.5 rounded-xl flex-1"
                      >
                        Disconnect
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Central 2-Column Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Account settings */}
        <section className="card-data rounded-[24px] p-6">
          <div className="border-b border-white/5 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <User className="h-4.5 w-4.5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Account Specifications</h3>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <label className="block">
              <span className="text-slate-400 font-semibold block mb-1">Full Name</span>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="carved-input w-full px-3 py-2 rounded-xl"
              />
            </label>

            <label className="block">
              <span className="text-slate-400 font-semibold block mb-1">Auth Email Address</span>
              <input
                type="email"
                value={userEmail || "user@careeros.com"}
                disabled
                className="carved-input w-full px-3 py-2 rounded-xl opacity-50 cursor-not-allowed"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-slate-400 font-semibold block mb-1">Target Goal Target</span>
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
            </div>

            <label className="block">
              <span className="text-slate-400 font-semibold block mb-1">Operator Timezone</span>
              <input
                type="text"
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                className="carved-input w-full px-3 py-2 rounded-xl"
              />
            </label>

            <button
              onClick={saveAccountData}
              disabled={savingAccount}
              className="tactile-btn tactile-btn-primary w-full py-2.5 rounded-xl text-xs font-bold mt-2 flex items-center justify-center gap-1.5"
            >
              {savingAccount ? <span className="loading-spinner border-slate-900" /> : <Check className="h-4 w-4" />}
              Save Account Data
            </button>
          </div>
        </section>

        {/* Preferences Panel */}
        <section className="card-data rounded-[24px] p-6">
          <div className="border-b border-white/5 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Sliders className="h-4.5 w-4.5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Workspace Preferences</h3>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <label className="block">
              <span className="text-slate-400 font-semibold block mb-1">Theme Mode</span>
              <select
                value={theme}
                onChange={e => setTheme(e.target.value)}
                className="carved-input w-full px-2.5 py-2 rounded-xl"
              >
                <option value="dark">Dark Theme Premium (Default)</option>
                <option value="light">Light Slate Glass</option>
                <option value="system">System Synced</option>
              </select>
            </label>

            {/* Simple toggle controls */}
            <div className="space-y-3 pt-2 border-t border-white/5">
              <label className="flex items-center justify-between cursor-pointer p-1">
                <div>
                  <span className="text-xs font-bold text-white block">Compact Padding Layout</span>
                  <span className="text-[10px] text-slate-500">Reduce structural spacing dimensions</span>
                </div>
                <input
                  type="checkbox"
                  checked={compactMode}
                  onChange={e => setCompactMode(e.target.checked)}
                  className="w-8 h-4 bg-black border border-white/5 rounded-full appearance-none checked:bg-cyan-400 relative transition-colors cursor-pointer before:content-[''] before:absolute before:left-0.5 before:top-0.5 before:w-3 before:h-3 before:bg-white before:rounded-full checked:before:translate-x-4 before:transition-transform"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer p-1">
                <div>
                  <span className="text-xs font-bold text-white block">Micro-Animations</span>
                  <span className="text-[10px] text-slate-500">Enable smooth visual state shifts</span>
                </div>
                <input
                  type="checkbox"
                  checked={animationsEnabled}
                  onChange={e => setAnimationsEnabled(e.target.checked)}
                  className="w-8 h-4 bg-black border border-white/5 rounded-full appearance-none checked:bg-cyan-400 relative transition-colors cursor-pointer before:content-[''] before:absolute before:left-0.5 before:top-0.5 before:w-3 before:h-3 before:bg-white before:rounded-full checked:before:translate-x-4 before:transition-transform"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer p-1">
                <div>
                  <span className="text-xs font-bold text-white block">Milestone Completion Alerts</span>
                  <span className="text-[10px] text-slate-500">Alert triggers on sprint completions</span>
                </div>
                <input
                  type="checkbox"
                  checked={milestoneAlerts}
                  onChange={e => setMilestoneAlerts(e.target.checked)}
                  className="w-8 h-4 bg-black border border-white/5 rounded-full appearance-none checked:bg-cyan-400 relative transition-colors cursor-pointer before:content-[''] before:absolute before:left-0.5 before:top-0.5 before:w-3 before:h-3 before:bg-white before:rounded-full checked:before:translate-x-4 before:transition-transform"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer p-1">
                <div>
                  <span className="text-xs font-bold text-white block">AI Re-routing alerts</span>
                  <span className="text-[10px] text-slate-500">Proactive alternate track suggestions</span>
                </div>
                <input
                  type="checkbox"
                  checked={roadmapUpdates}
                  onChange={e => setRoadmapUpdates(e.target.checked)}
                  className="w-8 h-4 bg-black border border-white/5 rounded-full appearance-none checked:bg-cyan-400 relative transition-colors cursor-pointer before:content-[''] before:absolute before:left-0.5 before:top-0.5 before:w-3 before:h-3 before:bg-white before:rounded-full checked:before:translate-x-4 before:transition-transform"
                />
              </label>
            </div>

            <MagneticButton type="button" onClick={savePreferences} className="tactile-btn w-full py-2.5 rounded-xl text-xs font-bold mt-2">
              Save Workspace Preferences
            </MagneticButton>
          </div>
        </section>

      </div>

      {/* Exports & Backups */}
      <section className="card-data rounded-[24px] p-6">
        <div className="border-b border-white/5 pb-3 mb-4 flex items-center gap-2">
          <Download className="h-4.5 w-4.5 text-cyan-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Export & Portability Backups</h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 text-xs">
          <button
            onClick={() => triggerExport("Profile data packet exported.")}
            className="tactile-btn p-3 rounded-xl text-left text-white flex flex-col justify-between"
          >
            <span className="font-bold block">Export Identity Profile</span>
            <span className="text-[9px] text-slate-500 block mt-2 font-mono">14.2 KB</span>
          </button>
          <button
            onClick={() => triggerExport("Curriculum roadmaps package compiled.")}
            className="tactile-btn p-3 rounded-xl text-left text-white flex flex-col justify-between"
          >
            <span className="font-bold block">Export Active Roadmaps</span>
            <span className="text-[9px] text-slate-500 block mt-2 font-mono">450 KB</span>
          </button>
          <button
            onClick={() => triggerExport("Cloud backup synced successfully.")}
            className="tactile-btn p-3 rounded-xl text-left text-white flex flex-col justify-between"
          >
            <span className="font-bold block">Generate Database Backup</span>
            <span className="text-[9px] text-slate-500 block mt-2 font-mono">Complete Snapshot</span>
          </button>
        </div>
      </section>

      {/* ═══ COLLAPSED DANGER ZONE DRAWER (Bottom collapsed) ═══════════════ */}
      <section className="card-danger rounded-[24px] p-4 relative overflow-hidden transition-all duration-300">
        <button
          onClick={() => setIsDangerZoneExpanded(!isDangerZoneExpanded)}
          className="w-full flex items-center justify-between text-xs font-bold text-rose-400 py-1"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4.5 w-4.5 animate-pulse" />
            <span>Danger Zone Controls</span>
          </div>
          {isDangerZoneExpanded ? <ChevronUp className="h-4.5 w-4.5" /> : <ChevronDown className="h-4.5 w-4.5" />}
        </button>

        {isDangerZoneExpanded && (
          <div className="mt-4 pt-4 border-t border-rose-500/10 space-y-3.5 text-xs">
            <div className="flex justify-between items-center bg-rose-500/[0.01] border border-rose-500/10 p-3.5 rounded-xl">
              <div>
                <span className="font-bold text-white block">Reset Workspace Onboarding</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Wipe goals assessments to restart setup wizard.</span>
              </div>
              <button
                onClick={() => setDangerModalAction("reset")}
                className="tactile-btn border-rose-500/25 hover:bg-rose-500/10 text-rose-300 font-bold px-3 py-1.5 rounded-xl"
              >
                Reset Setup
              </button>
            </div>

            <div className="flex justify-between items-center bg-rose-500/[0.01] border border-rose-500/10 p-3.5 rounded-xl">
              <div>
                <span className="font-bold text-white block">Delete All Roadmaps</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Wipe all generated paths logs.</span>
              </div>
              <button
                onClick={() => setDangerModalAction("roadmaps")}
                className="tactile-btn border-rose-500/25 hover:bg-rose-500/10 text-rose-300 font-bold px-3 py-1.5 rounded-xl"
              >
                Delete Paths
              </button>
            </div>

            <div className="flex justify-between items-center bg-rose-500/[0.01] border border-rose-500/10 p-3.5 rounded-xl">
              <div>
                <span className="font-bold text-white block">Clear Mentor Strategy History</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Wipe chatbot conversation database logs.</span>
              </div>
              <button
                onClick={() => setDangerModalAction("mentor")}
                className="tactile-btn border-rose-500/25 hover:bg-rose-500/10 text-rose-300 font-bold px-3 py-1.5 rounded-xl"
              >
                Clear History
              </button>
            </div>

            <div className="flex justify-between items-center bg-rose-500/[0.01] border border-rose-500/10 p-3.5 rounded-xl">
              <div>
                <span className="font-bold text-rose-300 block">Terminate Operator Identity</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Permanently wipe profile account records.</span>
              </div>
              <button
                onClick={() => setDangerModalAction("account")}
                className="tactile-btn bg-rose-700 hover:bg-rose-600 text-white font-bold px-3 py-1.5 rounded-xl"
              >
                Terminate Profile
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Export Success Modal */}
      {exportSuccessOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/85 backdrop-blur-sm">
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
                  Your system configuration package has been compiled and downloaded.
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
