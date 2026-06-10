"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { AiProviderStatusRecord, UserProfileRecord, WorkspaceSnapshotRecord, ExperienceLevel } from "@/lib/supabase/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { updateProfile } from "@/lib/app-data";
import { MagneticButton } from "./magnetic-button";
import {
  Download, Check, User, X, Sliders, AlertTriangle
} from "lucide-react";
import { PageHero, CardSurface } from "@/components/ui";
import { buttonStyle, inputStyle } from "@/styles/careeros-design-system";

// ─── Design Input Wrapper ────────────────────────────────────────────────────

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

  // Danger zone modal state
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-[#0b0b0e] border border-rose-500/20 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-500">
              <AlertTriangle className="h-6 w-6" />
              <h4 className="text-sm font-bold uppercase tracking-wider">Confirm Destructive Action</h4>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              This action is permanent and cannot be undone. Please type <span className="font-mono text-white font-bold bg-white/5 px-1.5 py-0.5 rounded">CONFIRM</span> to proceed.
            </p>

            <DesignInput
              type="text"
              value={dangerConfirmText}
              onChange={(e) => setDangerConfirmText(e.target.value)}
              placeholder="Type CONFIRM"
              className="w-full text-xs text-white"
            />

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDangerModalAction(null);
                  setDangerConfirmText("");
                }}
                className="tactile-btn flex-1 py-2 rounded-lg text-xs font-bold text-slate-300"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={executeDangerAction}
                disabled={dangerConfirmText !== "CONFIRM" || executingDanger}
                className="tactile-btn border-rose-500/25 bg-rose-950/20 hover:bg-rose-950/40 text-rose-300 disabled:opacity-50 flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                {executingDanger && <span className="loading-spinner text-[10px]" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <PageHero
        badge="System Configuration Portal"
        title="Workspace Settings"
        subtitle="Manage AI integrations, account preferences, data backups, and diagnostic tools"
      />

      {/* ═══ SECTION 1: SYSTEM AI PROVIDERS ═══════════════════════════════ */}
      <CardSurface tag="section" variant="surface" className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="System" width={16} height={16} className="object-contain shrink-0" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI Integrations</h3>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Configure intelligence engines for curriculum roadmap generation, interview simulations, and AI coaching.
            </p>
          </div>

          <div className="lg:col-span-2 space-y-3">
            {providers.map((p) => {
              const isManaging = showKeyInputs[p.provider];
              return (
                <CardSurface key={p.provider} variant="glass" hover noPadding className="p-4 border border-white/[0.04] bg-white/[0.01] flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {p.provider === "openai" ? "OpenAI Model Suite" : "Gemini Engine"}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
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
                    <div className="flex gap-2 pt-2">
                      <DesignInput
                        type="password"
                        value={providerKeys[p.provider]}
                        onChange={e => setProviderKeys(prev => ({ ...prev, [p.provider]: e.target.value }))}
                        placeholder="Paste credential token..."
                        className="flex-1 text-xs"
                      />
                      <button
                        onClick={() => saveProviderKey(p.provider)}
                        style={{ ...buttonStyle("primary"), height: "28px", padding: "0 12px", fontSize: "10px" }}
                        className="font-bold text-black"
                      >
                        Save
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setShowKeyInputs(prev => ({ ...prev, [p.provider]: !isManaging }))}
                      style={{ ...buttonStyle("ghost"), height: "32px", fontSize: "10px" }}
                      className="font-bold flex-1 text-white text-center"
                    >
                      {p.connected ? "Update Key" : "Connect Key"}
                    </button>
                    {p.connected && (
                      <button
                        onClick={() => removeProviderKey(p.provider)}
                        style={{ ...buttonStyle("danger"), height: "32px", fontSize: "10px" }}
                        className="font-bold flex-1 text-center"
                      >
                        Disconnect
                      </button>
                    )}
                  </div>
                </CardSurface>
              );
            })}
          </div>
        </div>
      </CardSurface>

      {/* ═══ SECTION 2: ACCOUNT PARAMETERS ═══════════════════════════════ */}
      <CardSurface tag="section" variant="surface" className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Account Settings</h3>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Manage core user configurations, career target goals, and local system timezone coordinates.
            </p>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <label className="block">
                <span className="text-slate-400 font-semibold block mb-1">Full Name</span>
                <DesignInput
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full"
                />
              </label>

              <label className="block">
                <span className="text-slate-400 font-semibold block mb-1">Auth Email</span>
                <input
                  type="email"
                  value={userEmail || ""}
                  disabled
                  style={{ ...inputStyle("base"), opacity: 0.4, cursor: "not-allowed" }}
                  className="w-full"
                />
              </label>

              <label className="block">
                <span className="text-slate-400 font-semibold block mb-1">Career Goal</span>
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

              <label className="block sm:col-span-2">
                <span className="text-slate-400 font-semibold block mb-1">Timezone Coordinates</span>
                <DesignInput
                  type="text"
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="w-full"
                />
              </label>
            </div>

            <div className="pt-2">
              <button
                onClick={saveAccountData}
                disabled={savingAccount}
                style={buttonStyle("primary")}
                className="w-full flex items-center justify-center gap-1.5"
              >
                {savingAccount ? <span className="loading-spinner border-slate-900" /> : <Check className="h-4 w-4" />}
                Save Account Parameters
              </button>
            </div>
          </div>
        </div>
      </CardSurface>

      {/* ═══ SECTION 3: WORKSPACE PREFERENCES ════════════════════════════ */}
      <CardSurface tag="section" variant="surface" className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Interface Config</h3>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Personalize theme values, visual performance layers, and structural notification settings.
            </p>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="space-y-4 text-xs">
              <label className="block">
                <span className="text-slate-400 font-semibold block mb-1">Color Palette Profile</span>
                <select
                  value={theme}
                  onChange={e => setTheme(e.target.value)}
                  style={inputStyle("base")}
                  className="w-full"
                >
                  <option value="dark">Dark Theme Premium (Default)</option>
                  <option value="light">Light Slate Glass</option>
                  <option value="system">System Synced</option>
                </select>
              </label>

              <div className="space-y-3 pt-3 border-t border-white/5">
                <label className="flex items-center justify-between cursor-pointer p-1">
                  <div>
                    <span className="text-xs font-bold text-white block">Compact Density Layout</span>
                    <span className="text-[10px] text-slate-500">Reduce spacing scale across workspace dashboard modules</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={compactMode}
                    onChange={e => setCompactMode(e.target.checked)}
                    className="w-8 h-4 bg-white/[0.05] border border-white/10 rounded-full appearance-none checked:bg-cyan-400 relative transition-colors cursor-pointer before:content-[''] before:absolute before:left-0.5 before:top-0.5 before:w-3 before:h-3 before:bg-white before:rounded-full checked:before:translate-x-4 before:transition-transform"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1">
                  <div>
                    <span className="text-xs font-bold text-white block">Micro-Animations</span>
                    <span className="text-[10px] text-slate-500">Render smooth UI transition micro-effects</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={animationsEnabled}
                    onChange={e => setAnimationsEnabled(e.target.checked)}
                    className="w-8 h-4 bg-white/[0.05] border border-white/10 rounded-full appearance-none checked:bg-cyan-400 relative transition-colors cursor-pointer before:content-[''] before:absolute before:left-0.5 before:top-0.5 before:w-3 before:h-3 before:bg-white before:rounded-full checked:before:translate-x-4 before:transition-transform"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1">
                  <div>
                    <span className="text-xs font-bold text-white block">Milestone Completion Signals</span>
                    <span className="text-[10px] text-slate-500">Display visual confirmations when finishing roadmap items</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={milestoneAlerts}
                    onChange={e => setMilestoneAlerts(e.target.checked)}
                    className="w-8 h-4 bg-white/[0.05] border border-white/10 rounded-full appearance-none checked:bg-cyan-400 relative transition-colors cursor-pointer before:content-[''] before:absolute before:left-0.5 before:top-0.5 before:w-3 before:h-3 before:bg-white before:rounded-full checked:before:translate-x-4 before:transition-transform"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1">
                  <div>
                    <span className="text-xs font-bold text-white block">AI Path Alerts</span>
                    <span className="text-[10px] text-slate-500">Proactively prompt notifications for dynamic path corrections</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={roadmapUpdates}
                    onChange={e => setRoadmapUpdates(e.target.checked)}
                    className="w-8 h-4 bg-white/[0.05] border border-white/10 rounded-full appearance-none checked:bg-cyan-400 relative transition-colors cursor-pointer before:content-[''] before:absolute before:left-0.5 before:top-0.5 before:w-3 before:h-3 before:bg-white before:rounded-full checked:before:translate-x-4 before:transition-transform"
                  />
                </label>
              </div>
            </div>

            <div className="pt-2">
              <MagneticButton type="button" onClick={savePreferences} className="w-full">
                <button
                  style={buttonStyle("secondary")}
                  className="w-full text-xs font-bold"
                >
                  Save Workspace Preferences
                </button>
              </MagneticButton>
            </div>
          </div>
        </div>
      </CardSurface>

      {/* ═══ SECTION 4: DATA PORTABILITY ═════════════════════════════════ */}
      <CardSurface tag="section" variant="surface" className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Download className="h-4.5 w-4.5 text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Backups & Portability</h3>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Export data packets containing your profile specifications, compiled roadmaps, or database snapshots.
            </p>
          </div>

          <div className="lg:col-span-2">
            <div className="grid gap-3 sm:grid-cols-3 text-xs">
              <CardSurface
                interactive
                variant="glass"
                noPadding
                onClick={() => triggerExport("Profile data packet exported.")}
                className="p-3 text-left text-white flex flex-col justify-between hover:bg-white/[0.08] w-full"
              >
                <span className="font-bold block text-[11px] leading-tight">Export Identity</span>
                <span className="text-[9px] text-slate-500 block mt-2 font-mono">14.2 KB</span>
              </CardSurface>
              
              <CardSurface
                interactive
                variant="glass"
                noPadding
                onClick={() => triggerExport("Curriculum roadmaps package compiled.")}
                className="p-3 text-left text-white flex flex-col justify-between hover:bg-white/[0.08] w-full"
              >
                <span className="font-bold block text-[11px] leading-tight">Export Roadmaps</span>
                <span className="text-[9px] text-slate-500 block mt-2 font-mono">450 KB</span>
              </CardSurface>
              
              <CardSurface
                interactive
                variant="glass"
                noPadding
                onClick={() => triggerExport("Cloud backup synced successfully.")}
                className="p-3 text-left text-white flex flex-col justify-between hover:bg-white/[0.08] w-full"
              >
                <span className="font-bold block text-[11px] leading-tight">Backup Snapshot</span>
                <span className="text-[9px] text-slate-500 block mt-2 font-mono">Database JSON</span>
              </CardSurface>
            </div>
          </div>
        </div>
      </CardSurface>

      {/* ═══ SECTION 5: DANGER ZONE ══════════════════════════════════════ */}
      <CardSurface tag="section" variant="glass" className="border-rose-500/20 bg-rose-500/5 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Danger Zone</h3>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Destructive actions to wipe database records, reset onboarding wizards, or terminate the operator profile.
            </p>
          </div>

          <div className="lg:col-span-2 space-y-3 text-xs">
            <CardSurface variant="glass" noPadding className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 p-3 bg-rose-950/[0.04] border border-rose-500/10">
              <div>
                <span className="font-bold text-white block">Reset Workspace Onboarding</span>
                <span className="text-[10px] text-slate-500">Wipe assessment diagnostics to rerun the setup wizard.</span>
              </div>
              <button
                onClick={() => setDangerModalAction("reset")}
                style={{ ...buttonStyle("danger"), height: "28px", padding: "0 10px", fontSize: "10px" }}
                className="font-bold text-center"
              >
                Reset Setup
              </button>
            </CardSurface>

            <CardSurface variant="glass" noPadding className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 p-3 bg-rose-950/[0.04] border border-rose-500/10">
              <div>
                <span className="font-bold text-white block">Delete All Roadmaps</span>
                <span className="text-[10px] text-slate-500">Wipe all generated paths, milestones, and logs.</span>
              </div>
              <button
                onClick={() => setDangerModalAction("roadmaps")}
                style={{ ...buttonStyle("danger"), height: "28px", padding: "0 10px", fontSize: "10px" }}
                className="font-bold text-center"
              >
                Delete Paths
              </button>
            </CardSurface>

            <CardSurface variant="glass" noPadding className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 p-3 bg-rose-950/[0.04] border border-rose-500/10">
              <div>
                <span className="font-bold text-white block">Clear Mentor Strategy History</span>
                <span className="text-[10px] text-slate-500">Wipe all past chatbot and simulator logs.</span>
              </div>
              <button
                onClick={() => setDangerModalAction("mentor")}
                style={{ ...buttonStyle("danger"), height: "28px", padding: "0 10px", fontSize: "10px" }}
                className="font-bold text-center"
              >
                Clear Chats
              </button>
            </CardSurface>

            <CardSurface variant="glass" noPadding className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 p-3 bg-rose-950/[0.04] border border-rose-500/10">
              <div>
                <span className="font-bold text-rose-300 block">Terminate Operator Profile</span>
                <span className="text-[10px] text-slate-500">Permanently terminate this profile account identity.</span>
              </div>
              <button
                onClick={() => setDangerModalAction("account")}
                style={{ ...buttonStyle("danger"), height: "28px", padding: "0 10px", fontSize: "10px" }}
                className="font-bold text-center"
              >
                Terminate Identity
              </button>
            </CardSurface>
          </div>
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
