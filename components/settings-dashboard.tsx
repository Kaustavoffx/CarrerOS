"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AiProviderStatusRecord, UserProfileRecord, WorkspaceSnapshotRecord } from "@/lib/supabase/types";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { MagneticButton } from "./magnetic-button";
import {
  Sparkles,
  Shield,
  Clock3,
  CheckCircle2,
  AlertTriangle,
  Layers,
  RefreshCw,
  Database,
  Download,
  Bell,
  Palette,
  Activity,
  ShieldCheck,
  ChevronDown,
  Check,
  Eye,
  EyeOff,
  Lock,
  Terminal,
  Sliders
} from "lucide-react";

type SettingsDashboardProps = {
  profile: UserProfileRecord | null;
  workspace: WorkspaceSnapshotRecord | null;
  initialProviders: AiProviderStatusRecord[];
};

const providerLabels: Record<string, string> = {
  openai: "OpenAI API Key",
  gemini: "Gemini API Key"
};

const providerHints: Record<string, string> = {
  openai: "Priority provider for roadmap generation and complex reasoning.",
  gemini: "Default fallback or choice for high-speed, cost-efficient actions."
};

export function SettingsDashboard({ profile, workspace, initialProviders }: SettingsDashboardProps) {
  const router = useRouter();
  
  // Database Providers and input states
  const [providers, setProviders] = useState<AiProviderStatusRecord[]>(initialProviders);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({ openai: "", gemini: "" });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({ openai: false, gemini: false });
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  
  // Status and notification states
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);

  // SECTION 3: GENERATION PREFERENCES
  const [preferredProvider, setPreferredProvider] = useState<string>("openai");
  const [fallbackProvider, setFallbackProvider] = useState<string>("gemini");
  const [roadmapModel, setRoadmapModel] = useState<string>("gpt-4o");
  const [mentorModel, setMentorModel] = useState<string>("gemini-1.5-pro");
  const [responseLength, setResponseLength] = useState<string>("detailed");
  const [generationQuality, setGenerationQuality] = useState<string>("high");
  const [temperature, setTemperature] = useState<number>(0.7);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [topP, setTopP] = useState<number>(0.9);
  const [maxTokens, setMaxTokens] = useState<number>(4096);

  // SECTION 7: NOTIFICATIONS
  const [notifications, setNotifications] = useState({
    milestones: true,
    updates: true,
    mentor: false,
    weekly: true,
    monthly: false
  });

  // SECTION 8: APPEARANCE
  const [appearance, setAppearance] = useState({
    theme: "dark",
    compact: false,
    denseDashboard: false,
    animationIntensity: "normal",
    glassEffects: true,
    accessibility: "default"
  });

  // SECTION 9: SYSTEM DIAGNOSTICS LOGS
  const [diagnosticsLogs, setDiagnosticsLogs] = useState<string[]>([]);
  const [diagnosticsStatus, setDiagnosticsStatus] = useState<"idle" | "running" | "done">("idle");
  const [diagnosticsProgress, setDiagnosticsProgress] = useState(0);

  // SECTION 10: DANGER ZONE
  const [dangerConfirm, setDangerConfirm] = useState<Record<string, boolean>>({
    resetWorkspace: false,
    deleteMentor: false,
    deleteRoadmaps: false,
    deleteAccount: false
  });

  // Action status simulation state
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Dynamic visual layout options based on configuration selections
  useEffect(() => {
    // Sync preferred models depending on preferredProvider select triggers
    if (preferredProvider === "openai") {
      setRoadmapModel("gpt-4o");
    } else {
      setRoadmapModel("gemini-1.5-pro");
    }
  }, [preferredProvider]);

  // Flash toast messages helper
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Save specific API keys
  const saveProviderKey = async (provider: "openai" | "gemini") => {
    const keyVal = apiKeys[provider].trim();
    if (!keyVal) {
      showToast("Please enter a valid API key first.", "error");
      return;
    }

    setSavingProvider(provider);
    try {
      const supabase = getSupabaseBrowserClient();
      let session = null;
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        session = data.session;
      }

      if (!session) {
        router.push("/login");
        return;
      }

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

      setApiKeys((prev) => ({ ...prev, [provider]: "" }));
      showToast(`${providerLabels[provider]} saved and encrypted successfully!`);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error saving API key.", "error");
    } finally {
      setSavingProvider(null);
    }
  };

  // Mock workspace saving state
  const saveAllWorkspacePreferences = () => {
    setIsSavingAll(true);
    setTimeout(() => {
      setIsSavingAll(false);
      showToast("All workspace control preferences synchronized and saved!");
    }, 1200);
  };

  // Mock action trigger with active status animations
  const runDataAction = (actionName: string, message: string) => {
    setLoadingAction(actionName);
    setTimeout(() => {
      setLoadingAction(null);
      showToast(message);
    }, 1500);
  };

  // Mock run diagnostics logger
  const runDiagnostics = () => {
    setDiagnosticsStatus("running");
    setDiagnosticsProgress(0);
    setDiagnosticsLogs([]);

    const steps = [
      { prg: 20, log: "Initializing CareerOS API endpoint handshake... [OK]" },
      { prg: 45, log: "Checking Supabase database tables synchronization status... [Connected - Ping: 14ms]" },
      { prg: 70, log: `Checking Provider authorization signatures... [OpenAI: Connected, Gemini: Connected]` },
      { prg: 90, log: "Analyzing local storage state audit... [All records safe]" },
      { prg: 100, log: "Diagnostics output: System Status: Enterprise-Grade, Trust Score 98%" }
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setDiagnosticsProgress(step.prg);
        setDiagnosticsLogs((prev) => [...prev, step.log]);
        if (step.prg === 100) {
          setDiagnosticsStatus("done");
        }
      }, (idx + 1) * 600);
    });
  };

  // Danger actions mock triggers
  const executeDanger = (action: string, successMsg: string) => {
    runDataAction(action, successMsg);
    setDangerConfirm((prev) => ({ ...prev, [action]: false }));
  };

  const formattedDateTime = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toISOString().replace("T", " ").slice(0, 19);
  };

  return (
    <div className="relative min-h-screen text-slate-200">
      {/* Toast Alert Indicator */}
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

      {/* Workspace Settings header layout */}
      <div className="flex flex-col gap-1.5 mb-8">
        <div className="flex items-center gap-2 text-cyan-400">
          <Layers className="h-4 w-4" />
          <span className="caption tracking-[0.25em] text-xs">WORKSPACE CONTROL DECK</span>
        </div>
        <h1 className="heading-hero text-white font-medium tracking-tight">Settings</h1>
        <p className="body text-slate-400 max-w-2xl">
          Configure security credentials, visual configurations, intelligence routing models, backups, and systemic health parameters.
        </p>
      </div>

      {/* 3-Column / 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-28">
        
        {/* ================= COLUMN 1 ================= */}
        <div className="space-y-6">
          
          {/* SECTION 1: ACCOUNT OVERVIEW */}
          <section className="liquid-panel rounded-[24px] p-6">
            <div className="relative z-10">
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                <div>
                  <p className="caption text-cyan-300">Identity Overview</p>
                  <h3 className="heading-card text-white mt-1">Workspace Operator</h3>
                </div>
                <div className="bg-cyan-500/10 text-cyan-300 border border-cyan-400/20 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                  Active User
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center bg-black/20 rounded-xl px-4 py-3 border border-white/5">
                  <span className="text-xs text-slate-400 font-medium">Profile Name</span>
                  <span className="text-sm font-semibold text-white">{profile?.full_name ?? "Kaustav Chowdhury"}</span>
                </div>
                
                <div className="flex justify-between items-center bg-black/20 rounded-xl px-4 py-3 border border-white/5">
                  <span className="text-xs text-slate-400 font-medium">Current Goal</span>
                  <span className="text-sm font-semibold text-white">{profile?.goal ?? "SDE I"}</span>
                </div>

                <div className="flex justify-between items-center bg-black/20 rounded-xl px-4 py-3 border border-white/5">
                  <span className="text-xs text-slate-400 font-medium">Readiness Score</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-sm font-semibold text-cyan-300">{profile?.readiness_score ?? 100}%</span>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-black/20 rounded-xl px-4 py-3 border border-white/5">
                  <span className="text-xs text-slate-400 font-medium">Active Roadmap Version</span>
                  <span className="text-sm font-bold text-indigo-300">v{workspace?.roadmaps?.[0]?.roadmap_version ?? 1.2}</span>
                </div>

                <div className="flex justify-between items-center bg-black/20 rounded-xl px-4 py-3 border border-white/5">
                  <span className="text-xs text-slate-400 font-medium">Workspace Status</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    Healthy
                  </span>
                </div>

                <div className="flex justify-between items-center bg-black/20 rounded-xl px-4 py-3 border border-white/5">
                  <span className="text-xs text-slate-400 font-medium">AI Provider State</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-400/20">
                    Sync Active
                  </span>
                </div>

                <div className="flex justify-between items-center bg-black/20 rounded-xl px-4 py-3 border border-white/5">
                  <span className="text-xs text-slate-400 font-medium">Last Sync</span>
                  <span className="text-xs text-slate-400 flex items-center gap-1 font-semibold">
                    <Clock3 className="h-3.5 w-3.5 text-indigo-400" />
                    2 minutes ago
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: AI PROVIDERS */}
          <section className="liquid-panel rounded-[24px] p-6">
            <div className="relative z-10 space-y-6">
              <div className="border-b border-white/5 pb-4">
                <div className="flex items-center gap-2 text-cyan-300 mb-1">
                  <Sparkles className="h-4 w-4" />
                  <p className="caption">AI Stack Management</p>
                </div>
                <h3 className="heading-card text-white">Security Keys & Pipelines</h3>
                <p className="small text-slate-400 mt-1">
                  Connect third-party inference tokens safely. Encryption handles calculations on secure headers.
                </p>
              </div>

              {/* Dynamic Providers Loop */}
              <div className="space-y-4">
                {providers.map((p) => {
                  const isPrimary = preferredProvider === p.provider;
                  const isFallback = fallbackProvider === p.provider;
                  return (
                    <article key={p.provider} className="liquid-card rounded-2xl p-4 hover:translate-y-[-2px]">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase">
                            {p.provider === "openai" ? "OPENAI SUITE" : "GEMINI ENGINE"}
                          </span>
                          <h4 className="font-semibold text-white text-sm mt-1">{providerLabels[p.provider]}</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">{providerHints[p.provider]}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              p.connected ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" : "bg-white/5 text-slate-400"
                            }`}
                          >
                            {p.connected ? "Connected" : "Disconnected"}
                          </span>
                          {(isPrimary || isFallback) && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-semibold border border-cyan-400/25">
                              {isPrimary ? "Primary Routing" : "Fallback Routing"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 space-y-2 text-xs">
                        <div className="bg-black/35 rounded-xl border border-white/5 px-3 py-2 flex items-center justify-between">
                          <span className="text-slate-400">Masked Preview</span>
                          <span className="font-mono text-white tracking-wide">{p.masked_key ?? "sk-••••••••••••"}</span>
                        </div>
                        <div className="bg-black/35 rounded-xl border border-white/5 px-3 py-2 flex items-center justify-between">
                          <span className="text-slate-400">Sync Status</span>
                          <span className="text-indigo-300 flex items-center gap-1">
                            <Clock3 className="h-3 w-3" />
                            {p.updated_at ? formattedDateTime(p.updated_at) : "Never synchronized"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-2">
                        <div className="relative">
                          <input
                            type={showKeys[p.provider] ? "text" : "password"}
                            placeholder={`Enter API Key`}
                            value={apiKeys[p.provider]}
                            onChange={(e) => setApiKeys((prev) => ({ ...prev, [p.provider]: e.target.value }))}
                            className="carved-input w-full text-xs rounded-xl pl-3 pr-10 py-2 placeholder:text-slate-500 focus:glow-cyan"
                          />
                          <button
                            type="button"
                            onClick={() => setShowKeys((prev) => ({ ...prev, [p.provider]: !prev[p.provider] }))}
                            className="absolute right-3 top-2 text-slate-400 hover:text-white"
                          >
                            {showKeys[p.provider] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => saveProviderKey(p.provider)}
                          disabled={savingProvider === p.provider}
                          className="tactile-btn tactile-btn-primary py-1.5 text-xs rounded-xl flex items-center justify-center gap-1.5"
                        >
                          {savingProvider === p.provider ? (
                            <span className="loading-spinner border-slate-900 border-b-transparent" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          Save key
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Future Providers Card */}
              <div className="rounded-2xl border border-white/5 bg-black/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Available Extensions</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#2a2412] text-[#f59e0b] font-medium border border-[#f59e0b]/20">
                    Offline
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Integrations with external LLMs for redundancy scaling.
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {["Anthropic", "Groq", "OpenRouter"].map((future) => (
                    <div key={future} className="bg-white/5 border border-white/5 rounded-xl p-2 text-center">
                      <p className="text-xs font-bold text-slate-300">{future}</p>
                      <span className="text-[9px] text-slate-500 block mt-1">Configurable</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* VISUAL ROUTING DIAGRAM */}
              <div className="border-t border-white/5 pt-4 mt-6">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Live Active Routing Flow</p>
                <div className="relative flex flex-col items-center justify-between p-4 rounded-xl border border-white/5 bg-black/40 gap-4 overflow-hidden">
                  <div className="w-full flex items-center justify-between relative z-10 px-1">
                    
                    {/* Primary Node */}
                    <div className="flex flex-col items-center p-2 rounded-lg border border-cyan-400/40 bg-cyan-950/20 w-[28%] text-center transition-all">
                      <span className="text-[11px] font-bold text-white uppercase">{preferredProvider}</span>
                      <span className="text-[9px] mt-1 text-cyan-300 bg-cyan-400/10 px-1 py-0.2 rounded font-semibold">
                        Primary
                      </span>
                    </div>
                    
                    {/* Connecting Vector */}
                    <div className="flex-1 flex justify-center items-center px-1">
                      <div className="w-full flex flex-col items-center">
                        <span className="text-[8px] text-emerald-400 font-semibold mb-0.5 animate-pulse">98ms ping</span>
                        <svg className="w-full h-4" fill="none" viewBox="0 0 60 16">
                          <path d="M0,8 H60" stroke="#22d3ee" strokeDasharray="3 3" strokeWidth="2" className="animate-pulse" />
                          <polygon points="54,4 60,8 54,12" fill="#22d3ee" />
                        </svg>
                      </div>
                    </div>

                    {/* Fallback Node */}
                    <div className="flex flex-col items-center p-2 rounded-lg border border-white/10 bg-white/5 w-[28%] text-center transition-all">
                      <span className="text-[11px] font-bold text-slate-300 uppercase">{fallbackProvider}</span>
                      <span className="text-[9px] mt-1 text-indigo-300 bg-indigo-500/10 px-1 py-0.2 rounded font-semibold">
                        Fallback
                      </span>
                    </div>
                    
                    {/* Connecting Vector */}
                    <div className="flex-1 flex justify-center items-center px-1">
                      <div className="w-full flex flex-col items-center">
                        <span className="text-[8px] text-slate-500 font-semibold mb-0.5">Ready</span>
                        <svg className="w-full h-4" fill="none" viewBox="0 0 60 16">
                          <path d="M0,8 H60" stroke="#4f46e5" strokeDasharray="3 3" strokeWidth="1.5" />
                          <polygon points="54,5 60,8 54,11" fill="#4f46e5" />
                        </svg>
                      </div>
                    </div>

                    {/* Local offline Node */}
                    <div className="flex flex-col items-center p-2 rounded-lg border border-white/5 bg-black/60 w-[28%] text-center">
                      <span className="text-[11px] font-bold text-slate-500 uppercase">System</span>
                      <span className="text-[9px] mt-1 text-slate-500 bg-white/5 px-1 py-0.2 rounded font-semibold">
                        Default
                      </span>
                    </div>

                  </div>
                  <div className="w-full text-center border-t border-white/5 pt-2">
                    <p className="text-[10px] text-slate-400">
                      Decisions automatically downgrade to <span className="font-semibold text-white uppercase">{fallbackProvider}</span> if connection drops.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </section>

        </div>

        {/* ================= COLUMN 2 ================= */}
        <div className="space-y-6">

          {/* SECTION 3: GENERATION PREFERENCES */}
          <section className="liquid-panel rounded-[24px] p-6">
            <div className="relative z-10 space-y-4">
              <div className="border-b border-white/5 pb-3 flex items-center justify-between">
                <div>
                  <p className="caption text-cyan-300">Preferences</p>
                  <h3 className="heading-card text-white mt-1">Generation Preferences</h3>
                </div>
                <Sliders className="h-4 w-4 text-cyan-300" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs text-slate-400 font-semibold">Preferred Provider</span>
                  <select
                    value={preferredProvider}
                    onChange={(e) => setPreferredProvider(e.target.value)}
                    className="mt-1.5 carved-input w-full rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="openai">OpenAI Suite</option>
                    <option value="gemini">Gemini Engine</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs text-slate-400 font-semibold">Fallback Provider</span>
                  <select
                    value={fallbackProvider}
                    onChange={(e) => setFallbackProvider(e.target.value)}
                    className="mt-1.5 carved-input w-full rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="gemini">Gemini Engine</option>
                    <option value="openai">OpenAI Suite</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs text-slate-400 font-semibold">Roadmap Model</span>
                  <select
                    value={roadmapModel}
                    onChange={(e) => setRoadmapModel(e.target.value)}
                    className="mt-1.5 carved-input w-full rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="gpt-4o">GPT-4o (Strict)</option>
                    <option value="gpt-4o-mini">GPT-4o-Mini</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs text-slate-400 font-semibold">Mentor Model</span>
                  <select
                    value={mentorModel}
                    onChange={(e) => setMentorModel(e.target.value)}
                    className="mt-1.5 carved-input w-full rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o-Mini</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs text-slate-400 font-semibold">Response Length</span>
                  <select
                    value={responseLength}
                    onChange={(e) => setResponseLength(e.target.value)}
                    className="mt-1.5 carved-input w-full rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="concise">Concise summaries</option>
                    <option value="detailed">Detailed guidelines</option>
                    <option value="comprehensive">Comprehensive syllabus</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs text-slate-400 font-semibold">Generation Quality</span>
                  <select
                    value={generationQuality}
                    onChange={(e) => setGenerationQuality(e.target.value)}
                    className="mt-1.5 carved-input w-full rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="speed">Max Uptime / Speed</option>
                    <option value="balanced">Balanced performance</option>
                    <option value="high">High Reasoning / Quality</option>
                  </select>
                </label>
              </div>

              {/* Slider for Temperature Mode */}
              <div className="space-y-1 pt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold">Temperature Profile</span>
                  <span className="text-cyan-300 font-bold font-mono">{temperature} ({temperature < 0.5 ? "Precise" : "Creative"})</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full h-1 bg-black rounded-lg appearance-none cursor-pointer accent-cyan-400 mt-2"
                />
              </div>

              {/* Advanced Configurations Trigger Accordion */}
              <div className="border-t border-white/5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <span className="font-semibold">Advanced Generation Tokens</span>
                  <ChevronDown className={`h-4 w-4 transform transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                </button>

                {showAdvanced && (
                  <div className="mt-3 space-y-3 bg-black/40 border border-white/5 p-3 rounded-xl animate-fade-in">
                    <div>
                      <div className="flex justify-between items-center text-[11px] mb-1">
                        <span className="text-slate-400">Nucleus Top-P Threshold</span>
                        <span className="text-indigo-300 font-mono font-bold">{topP}</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={topP}
                        onChange={(e) => setTopP(parseFloat(e.target.value))}
                        className="w-full h-1 bg-black rounded-lg appearance-none cursor-pointer accent-indigo-400"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-[11px] mb-1">
                        <span className="text-slate-400">Max Generation Tokens limit</span>
                        <span className="text-indigo-300 font-mono font-bold">{maxTokens} tokens</span>
                      </div>
                      <select
                        value={maxTokens}
                        onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                        className="carved-input w-full rounded-xl px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="2048">2048 (Standard)</option>
                        <option value="4096">4096 (Extended)</option>
                        <option value="8192">8192 (Detailed)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* SECTION 4: SECURITY CENTER */}
          <section className="liquid-panel rounded-[24px] p-6">
            <div className="relative z-10 space-y-4">
              <div className="border-b border-white/5 pb-3 flex items-center justify-between">
                <div>
                  <p className="caption text-cyan-300">Security Center</p>
                  <h3 className="heading-card text-white mt-1">Encryption & Authentication</h3>
                </div>
                <Lock className="h-4 w-4 text-emerald-400 animate-pulse" />
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center bg-emerald-500/[0.03] border border-emerald-500/15 p-3 rounded-xl">
                  <div>
                    <p className="font-semibold text-white">Keys Encrypted (AES-256)</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Stored inside encrypted container columns on server</p>
                  </div>
                  <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                </div>

                <div className="flex justify-between items-center bg-emerald-500/[0.03] border border-emerald-500/15 p-3 rounded-xl">
                  <div>
                    <p className="font-semibold text-white">Server Storage Enabled</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Synchronized via protected schema constraints</p>
                  </div>
                  <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                </div>

                <div className="flex justify-between items-center bg-emerald-500/[0.03] border border-emerald-500/15 p-3 rounded-xl">
                  <div>
                    <p className="font-semibold text-white">Workspace Shield Status</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Guard protection algorithms active</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-300 font-bold rounded-full">
                    Protected
                  </span>
                </div>

                <div className="bg-black/20 rounded-xl border border-white/5 p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Last Session Login</span>
                    <span className="text-white font-medium">5 minutes ago</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Authentication Method</span>
                    <span className="text-cyan-300 font-semibold">Supabase Auth (OAuth/Email)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Workspace Trust Score</span>
                    <span className="text-emerald-400 font-bold">98/100</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Security Status</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Secure Deck
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 5: WORKSPACE STORAGE */}
          <section className="liquid-panel rounded-[24px] p-6">
            <div className="relative z-10 space-y-4">
              <div className="border-b border-white/5 pb-3 flex items-center justify-between">
                <div>
                  <p className="caption text-cyan-300">Workspace Storage</p>
                  <h3 className="heading-card text-white mt-1">Data Volumes & Capacity</h3>
                </div>
                <Database className="h-4 w-4 text-cyan-300" />
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center bg-black/20 border border-white/5 px-3 py-2.5 rounded-xl">
                  <span className="text-slate-400 font-medium">Active Roadmaps</span>
                  <span className="font-bold text-white">{workspace?.roadmaps?.length ?? 2} roadmaps</span>
                </div>

                <div className="flex justify-between items-center bg-black/20 border border-white/5 px-3 py-2.5 rounded-xl">
                  <span className="text-slate-400 font-medium">Historical Versions</span>
                  <span className="font-bold text-indigo-300">v{workspace?.roadmaps?.[0]?.roadmap_version ?? 1.2} Saved</span>
                </div>

                <div className="flex justify-between items-center bg-black/20 border border-white/5 px-3 py-2.5 rounded-xl">
                  <span className="text-slate-400 font-medium">Progress Logs</span>
                  <span className="font-bold text-white">{workspace?.progress?.length ?? 8} entries</span>
                </div>

                <div className="flex justify-between items-center bg-black/20 border border-white/5 px-3 py-2.5 rounded-xl">
                  <span className="text-slate-400 font-medium">Saved Profile Notes</span>
                  <span className="font-bold text-white">{workspace?.notes?.length ?? 4} notes</span>
                </div>

                <div className="flex justify-between items-center bg-black/20 border border-white/5 px-3 py-2.5 rounded-xl">
                  <span className="text-slate-400 font-medium">Mentor Conversations</span>
                  <span className="font-bold text-white">{workspace?.ai_chats?.length ?? 3} sessions</span>
                </div>

                <div className="flex justify-between items-center bg-black/20 border border-white/5 px-3 py-2.5 rounded-xl">
                  <span className="text-slate-400 font-medium">Career Twin Snapshots</span>
                  <span className="font-bold text-indigo-300">2 active snapshots</span>
                </div>

                <div className="flex justify-between items-center bg-black/20 border border-white/5 px-3 py-2.5 rounded-xl">
                  <span className="text-slate-400 font-medium">Database Node Uptime</span>
                  <span className="text-emerald-400 font-bold">100% Online</span>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* ================= COLUMN 3 ================= */}
        <div className="space-y-6">

          {/* SECTION 6: CAREER DATA CONTROLS */}
          <section className="liquid-panel rounded-[24px] p-6">
            <div className="relative z-10 space-y-4">
              <div className="border-b border-white/5 pb-3 flex items-center justify-between">
                <div>
                  <p className="caption text-cyan-300">Data Portability</p>
                  <h3 className="heading-card text-white mt-1">Career Data Controls</h3>
                </div>
                <Download className="h-4 w-4 text-cyan-300" />
              </div>

              <p className="text-xs text-slate-400">
                Generate static file snapshots and backups of all career paths, logs, conversations, and models.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => runDataAction("exportWorkspace", "Workspace data exported as JSON.")}
                  disabled={loadingAction !== null}
                  className="tactile-btn border border-white/5 bg-white/5 p-2 rounded-xl text-center hover:translate-y-[-1px] disabled:opacity-60 flex flex-col items-center gap-1.5"
                >
                  <Download className="h-4 w-4 text-cyan-300" />
                  <span className="text-[11px] font-bold text-slate-200">Export Workspace</span>
                  {loadingAction === "exportWorkspace" && <span className="loading-spinner text-[10px] text-cyan-300" />}
                </button>

                <button
                  type="button"
                  onClick={() => runDataAction("exportRoadmaps", "Roadmap history pack generated.")}
                  disabled={loadingAction !== null}
                  className="tactile-btn border border-white/5 bg-white/5 p-2 rounded-xl text-center hover:translate-y-[-1px] disabled:opacity-60 flex flex-col items-center gap-1.5"
                >
                  <Download className="h-4 w-4 text-cyan-300" />
                  <span className="text-[11px] font-bold text-slate-200">Export Roadmaps</span>
                  {loadingAction === "exportRoadmaps" && <span className="loading-spinner text-[10px] text-cyan-300" />}
                </button>

                <button
                  type="button"
                  onClick={() => runDataAction("exportMentor", "Mentor session records downloaded.")}
                  disabled={loadingAction !== null}
                  className="tactile-btn border border-white/5 bg-white/5 p-2 rounded-xl text-center hover:translate-y-[-1px] disabled:opacity-60 flex flex-col items-center gap-1.5"
                >
                  <Download className="h-4 w-4 text-indigo-400" />
                  <span className="text-[11px] font-bold text-slate-200">Export Mentor History</span>
                  {loadingAction === "exportMentor" && <span className="loading-spinner text-[10px] text-cyan-300" />}
                </button>

                <button
                  type="button"
                  onClick={() => runDataAction("downloadPdf", "PDF Bundle compiled & saved.")}
                  disabled={loadingAction !== null}
                  className="tactile-btn border border-white/5 bg-white/5 p-2 rounded-xl text-center hover:translate-y-[-1px] disabled:opacity-60 flex flex-col items-center gap-1.5"
                >
                  <Download className="h-4 w-4 text-indigo-400" />
                  <span className="text-[11px] font-bold text-slate-200">Download PDF Bundle</span>
                  {loadingAction === "downloadPdf" && <span className="loading-spinner text-[10px] text-cyan-300" />}
                </button>

                <button
                  type="button"
                  onClick={() => runDataAction("downloadTwin", "Career Twin Snapshot payload downloaded.")}
                  disabled={loadingAction !== null}
                  className="tactile-btn border border-white/5 bg-white/5 p-2 rounded-xl text-center hover:translate-y-[-1px] disabled:opacity-60 flex flex-col items-center gap-1.5"
                >
                  <Download className="h-4 w-4 text-emerald-400" />
                  <span className="text-[11px] font-bold text-slate-200">Download Career Twin</span>
                  {loadingAction === "downloadTwin" && <span className="loading-spinner text-[10px] text-cyan-300" />}
                </button>

                <button
                  type="button"
                  onClick={() => runDataAction("backup", "Full cloud database backup generated successfully.")}
                  disabled={loadingAction !== null}
                  className="tactile-btn border border-white/5 bg-white/5 p-2 rounded-xl text-center hover:translate-y-[-1px] disabled:opacity-60 flex flex-col items-center gap-1.5"
                >
                  <RefreshCw className="h-4 w-4 text-emerald-400" />
                  <span className="text-[11px] font-bold text-slate-200">Backup Data</span>
                  {loadingAction === "backup" && <span className="loading-spinner text-[10px] text-cyan-300" />}
                </button>
              </div>
            </div>
          </section>

          {/* SECTION 7: NOTIFICATIONS */}
          <section className="liquid-panel rounded-[24px] p-6">
            <div className="relative z-10 space-y-4">
              <div className="border-b border-white/5 pb-3 flex items-center justify-between">
                <div>
                  <p className="caption text-cyan-300">Alert Center</p>
                  <h3 className="heading-card text-white mt-1">Notifications & Logs</h3>
                </div>
                <Bell className="h-4 w-4 text-cyan-300" />
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer p-1">
                  <div>
                    <span className="text-xs font-semibold text-white block">Career Milestone Alerts</span>
                    <span className="text-[10px] text-slate-400">Receive flash updates when a milestone reaches 100%</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.milestones}
                    onChange={(e) => setNotifications((prev) => ({ ...prev, milestones: e.target.checked }))}
                    className="w-8 h-4 bg-black border border-white/5 rounded-full appearance-none checked:bg-cyan-400 relative transition-colors cursor-pointer before:content-[''] before:absolute before:left-0.5 before:top-0.5 before:w-3 before:h-3 before:bg-white before:rounded-full checked:before:translate-x-4 before:transition-transform"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1">
                  <div>
                    <span className="text-xs font-semibold text-white block">Roadmap Updates</span>
                    <span className="text-[10px] text-slate-400">Receive recommendations for roadmap pivots</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.updates}
                    onChange={(e) => setNotifications((prev) => ({ ...prev, updates: e.target.checked }))}
                    className="w-8 h-4 bg-black border border-white/5 rounded-full appearance-none checked:bg-cyan-400 relative transition-colors cursor-pointer before:content-[''] before:absolute before:left-0.5 before:top-0.5 before:w-3 before:h-3 before:bg-white before:rounded-full checked:before:translate-x-4 before:transition-transform"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1">
                  <div>
                    <span className="text-xs font-semibold text-white block">Mentor Notifications</span>
                    <span className="text-[10px] text-slate-400">Notify when the coach recommends new action triggers</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.mentor}
                    onChange={(e) => setNotifications((prev) => ({ ...prev, mentor: e.target.checked }))}
                    className="w-8 h-4 bg-black border border-white/5 rounded-full appearance-none checked:bg-cyan-400 relative transition-colors cursor-pointer before:content-[''] before:absolute before:left-0.5 before:top-0.5 before:w-3 before:h-3 before:bg-white before:rounded-full checked:before:translate-x-4 before:transition-transform"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1">
                  <div>
                    <span className="text-xs font-semibold text-white block">Weekly Review Summary</span>
                    <span className="text-[10px] text-slate-400">Email digest summarizing hours logged and milestones</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.weekly}
                    onChange={(e) => setNotifications((prev) => ({ ...prev, weekly: e.target.checked }))}
                    className="w-8 h-4 bg-black border border-white/5 rounded-full appearance-none checked:bg-cyan-400 relative transition-colors cursor-pointer before:content-[''] before:absolute before:left-0.5 before:top-0.5 before:w-3 before:h-3 before:bg-white before:rounded-full checked:before:translate-x-4 before:transition-transform"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1">
                  <div>
                    <span className="text-xs font-semibold text-white block">Monthly Career Report</span>
                    <span className="text-[10px] text-slate-400">Comprehensive audit of readiness improvements</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.monthly}
                    onChange={(e) => setNotifications((prev) => ({ ...prev, monthly: e.target.checked }))}
                    className="w-8 h-4 bg-black border border-white/5 rounded-full appearance-none checked:bg-cyan-400 relative transition-colors cursor-pointer before:content-[''] before:absolute before:left-0.5 before:top-0.5 before:w-3 before:h-3 before:bg-white before:rounded-full checked:before:translate-x-4 before:transition-transform"
                  />
                </label>
              </div>
            </div>
          </section>

          {/* SECTION 8: APPEARANCE */}
          <section className="liquid-panel rounded-[24px] p-6">
            <div className="relative z-10 space-y-4">
              <div className="border-b border-white/5 pb-3 flex items-center justify-between">
                <div>
                  <p className="caption text-cyan-300">Layout styling</p>
                  <h3 className="heading-card text-white mt-1">Appearance Engine</h3>
                </div>
                <Palette className="h-4 w-4 text-cyan-300" />
              </div>

              <div className="space-y-3">
                <label className="block">
                  <span className="text-xs text-slate-400 font-semibold">Active Theme</span>
                  <select
                    value={appearance.theme}
                    onChange={(e) => setAppearance((prev) => ({ ...prev, theme: e.target.value }))}
                    className="mt-1.5 carved-input w-full rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="dark">Dark Slate Premium (Default)</option>
                    <option value="light">Light Slate Glass</option>
                    <option value="system">System Synchronized</option>
                  </select>
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1">
                  <div>
                    <span className="text-xs font-semibold text-white block">Compact Mode</span>
                    <span className="text-[10px] text-slate-400">Reduce spacing gaps throughout interface views</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={appearance.compact}
                    onChange={(e) => setAppearance((prev) => ({ ...prev, compact: e.target.checked }))}
                    className="w-8 h-4 bg-black border border-white/5 rounded-full appearance-none checked:bg-cyan-400 relative transition-colors cursor-pointer before:content-[''] before:absolute before:left-0.5 before:top-0.5 before:w-3 before:h-3 before:bg-white before:rounded-full checked:before:translate-x-4 before:transition-transform"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1">
                  <div>
                    <span className="text-xs font-semibold text-white block">Dense Dashboard Layout</span>
                    <span className="text-[10px] text-slate-400">Increase density limit of target roadmap grids</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={appearance.denseDashboard}
                    onChange={(e) => setAppearance((prev) => ({ ...prev, denseDashboard: e.target.checked }))}
                    className="w-8 h-4 bg-black border border-white/5 rounded-full appearance-none checked:bg-cyan-400 relative transition-colors cursor-pointer before:content-[''] before:absolute before:left-0.5 before:top-0.5 before:w-3 before:h-3 before:bg-white before:rounded-full checked:before:translate-x-4 before:transition-transform"
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-slate-400 font-semibold">Animation Intensity</span>
                  <select
                    value={appearance.animationIntensity}
                    onChange={(e) => setAppearance((prev) => ({ ...prev, animationIntensity: e.target.value }))}
                    className="mt-1.5 carved-input w-full rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="none">Disabled animations</option>
                    <option value="normal">Normal intensity</option>
                    <option value="fast">Fast / Instant transitions</option>
                  </select>
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1">
                  <div>
                    <span className="text-xs font-semibold text-white block">Glassmorphism effects</span>
                    <span className="text-[10px] text-slate-400">Display styled overlays with backdrop filters</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={appearance.glassEffects}
                    onChange={(e) => setAppearance((prev) => ({ ...prev, glassEffects: e.target.checked }))}
                    className="w-8 h-4 bg-black border border-white/5 rounded-full appearance-none checked:bg-cyan-400 relative transition-colors cursor-pointer before:content-[''] before:absolute before:left-0.5 before:top-0.5 before:w-3 before:h-3 before:bg-white before:rounded-full checked:before:translate-x-4 before:transition-transform"
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-slate-400 font-semibold">Accessibility Settings</span>
                  <select
                    value={appearance.accessibility}
                    onChange={(e) => setAppearance((prev) => ({ ...prev, accessibility: e.target.value }))}
                    className="mt-1.5 carved-input w-full rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="default">Standard typography settings</option>
                    <option value="contrast">High Contrast Mode</option>
                    <option value="screenReader">Screen Reader Optimized</option>
                  </select>
                </label>
              </div>
            </div>
          </section>

          {/* SECTION 9: SYSTEM HEALTH */}
          <section className="liquid-panel rounded-[24px] p-6">
            <div className="relative z-10 space-y-4">
              <div className="border-b border-white/5 pb-3 flex items-center justify-between">
                <div>
                  <p className="caption text-cyan-300">Active diagnostics</p>
                  <h3 className="heading-card text-white mt-1">System Health Console</h3>
                </div>
                <Activity className="h-4 w-4 text-cyan-300" />
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center bg-black/20 px-3 py-2 border border-white/5 rounded-xl">
                  <span className="text-slate-400">API Health</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                    99.9% Online
                  </span>
                </div>

                <div className="flex justify-between items-center bg-black/20 px-3 py-2 border border-white/5 rounded-xl">
                  <span className="text-slate-400">Database Engine</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                    Healthy (12ms)
                  </span>
                </div>

                <div className="flex justify-between items-center bg-black/20 px-3 py-2 border border-white/5 rounded-xl">
                  <span className="text-slate-400">Sync Status</span>
                  <span className="text-cyan-300 font-bold">Synchronized</span>
                </div>

                <div className="flex justify-between items-center bg-black/20 px-3 py-2 border border-white/5 rounded-xl">
                  <span className="text-slate-400">Provider Health</span>
                  <span className="text-emerald-400 font-bold">Active</span>
                </div>

                <div className="flex justify-between items-center bg-black/20 px-3 py-2 border border-white/5 rounded-xl">
                  <span className="text-slate-400">Workspace Storage</span>
                  <span className="text-cyan-300 font-bold">100% Integrity</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={runDiagnostics}
                  disabled={diagnosticsStatus === "running"}
                  className="tactile-btn w-full bg-white/5 p-2 rounded-xl text-center text-xs font-bold text-slate-200 disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  <Terminal className="h-3.5 w-3.5 text-cyan-300" />
                  Run Diagnostics Check
                </button>

                {diagnosticsStatus !== "idle" && (
                  <div className="mt-4 p-3 bg-black/60 rounded-xl border border-white/5 text-xs font-mono space-y-2 animate-fade-in max-h-36 overflow-y-auto">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pb-1 border-b border-white/5">
                      <span>RUNNING DIAGNOSTIC SCRIPTS</span>
                      <span>{diagnosticsProgress}%</span>
                    </div>
                    {diagnosticsLogs.map((log, index) => (
                      <p key={index} className="text-[11px] text-slate-300 tracking-wide leading-relaxed">
                        {log}
                      </p>
                    ))}
                    {diagnosticsStatus === "running" && (
                      <div className="flex items-center gap-1.5 text-cyan-400 text-[11px]">
                        <span className="loading-spinner text-[10px]" />
                        <span>Scanning nodes...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* SECTION 10: DANGER ZONE */}
          <section className="liquid-panel border-rose-500/25 rounded-[24px] p-6 shadow-[0_0_20px_rgba(244,63,94,0.02)]">
            <div className="relative z-10 space-y-4">
              <div className="border-b border-rose-500/10 pb-3 flex items-center justify-between">
                <div>
                  <p className="caption text-rose-400">Danger Zone</p>
                  <h3 className="heading-card text-white mt-1">High-Risk Workspace Actions</h3>
                </div>
                <AlertTriangle className="h-4 w-4 text-rose-500 animate-pulse" />
              </div>

              <p className="text-xs text-slate-400">
                Proceed with caution. These actions permanently delete local files and database rows.
              </p>

              <div className="space-y-3 pt-1">
                {/* Action 1: Reset Workspace */}
                <div className="flex flex-col gap-2 p-2.5 rounded-xl border border-rose-500/10 bg-rose-500/[0.02]">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-semibold text-white block">Reset Workspace</span>
                      <span className="text-[10px] text-slate-400">Clears current paths and onboarding state</span>
                    </div>
                    {!dangerConfirm.resetWorkspace ? (
                      <button
                        type="button"
                        onClick={() => setDangerConfirm((prev) => ({ ...prev, resetWorkspace: true }))}
                        className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-3 py-1 rounded-lg border border-rose-500/20 bg-rose-500/5"
                      >
                        Reset
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => executeDanger("resetWorkspace", "Workspace has been reset successfully.")}
                          className="text-xs text-white bg-rose-600 hover:bg-rose-500 font-semibold px-2 py-1 rounded-lg"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setDangerConfirm((prev) => ({ ...prev, resetWorkspace: false }))}
                          className="text-xs text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action 2: Delete Mentor History */}
                <div className="flex flex-col gap-2 p-2.5 rounded-xl border border-rose-500/10 bg-rose-500/[0.02]">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-semibold text-white block">Delete Mentor History</span>
                      <span className="text-[10px] text-slate-400">Permanently logs off AI Chat strategy threads</span>
                    </div>
                    {!dangerConfirm.deleteMentor ? (
                      <button
                        type="button"
                        onClick={() => setDangerConfirm((prev) => ({ ...prev, deleteMentor: true }))}
                        className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-3 py-1 rounded-lg border border-rose-500/20 bg-rose-500/5"
                      >
                        Delete
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => executeDanger("deleteMentor", "Mentor conversation records deleted.")}
                          className="text-xs text-white bg-rose-600 hover:bg-rose-500 font-semibold px-2 py-1 rounded-lg"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setDangerConfirm((prev) => ({ ...prev, deleteMentor: false }))}
                          className="text-xs text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action 3: Delete Roadmaps */}
                <div className="flex flex-col gap-2 p-2.5 rounded-xl border border-rose-500/10 bg-rose-500/[0.02]">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-semibold text-white block">Delete Roadmaps</span>
                      <span className="text-[10px] text-slate-400">Wipes all stored milestones and projects</span>
                    </div>
                    {!dangerConfirm.deleteRoadmaps ? (
                      <button
                        type="button"
                        onClick={() => setDangerConfirm((prev) => ({ ...prev, deleteRoadmaps: true }))}
                        className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-3 py-1 rounded-lg border border-rose-500/20 bg-rose-500/5"
                      >
                        Delete
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => executeDanger("deleteRoadmaps", "All roadmaps deleted successfully.")}
                          className="text-xs text-white bg-rose-600 hover:bg-rose-500 font-semibold px-2 py-1 rounded-lg"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setDangerConfirm((prev) => ({ ...prev, deleteRoadmaps: false }))}
                          className="text-xs text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action 4: Delete Account */}
                <div className="flex flex-col gap-2 p-2.5 rounded-xl border border-rose-500/10 bg-rose-500/[0.02]">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-semibold text-rose-300 block">Delete Account</span>
                      <span className="text-[10px] text-slate-500">Deletes the login credential and all stored records</span>
                    </div>
                    {!dangerConfirm.deleteAccount ? (
                      <button
                        type="button"
                        onClick={() => setDangerConfirm((prev) => ({ ...prev, deleteAccount: true }))}
                        className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-3 py-1 rounded-lg border border-rose-500/20 bg-rose-500/5"
                      >
                        Terminate
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => executeDanger("deleteAccount", "Account deletion request sent.")}
                          className="text-xs text-white bg-rose-600 hover:bg-rose-500 font-semibold px-2 py-1 rounded-lg"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setDangerConfirm((prev) => ({ ...prev, deleteAccount: false }))}
                          className="text-xs text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>

      </div>

      {/* Sticky Save Bar / Footer Action Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#060608]/90 backdrop-blur-md border-t border-white/5 py-4 px-6 md:px-12 flex justify-between items-center shadow-[0_-12px_40px_rgba(0,0,0,0.6)]">
        <div className="hidden md:flex flex-col">
          <p className="text-xs text-slate-400">Workspace Control Config</p>
          <p className="text-sm font-semibold text-white">All configurations reside in localized container scopes.</p>
        </div>
        <div className="w-full md:w-auto flex items-center justify-end gap-4">
          <MagneticButton
            type="button"
            onClick={saveAllWorkspacePreferences}
            disabled={isSavingAll}
            className="tactile-btn tactile-btn-primary w-full md:w-auto px-6 py-2.5 rounded-full text-sm font-bold flex items-center justify-center gap-2"
          >
            {isSavingAll ? (
              <span className="loading-spinner border-slate-900 border-b-transparent" />
            ) : (
              <Shield className="h-4 w-4" />
            )}
            Save Workspace Configuration
          </MagneticButton>
        </div>
      </div>
    </div>
  );
}
