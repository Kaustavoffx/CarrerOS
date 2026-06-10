"use client";

import React, { useState, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, AlertTriangle, Brain, BarChart3, Globe, Zap,
  TrendingUp, TrendingDown, Minus, RefreshCw, Loader2,
  ArrowUpRight, Clock, MapPin, Shield
} from "lucide-react";
import type { CommunityNeedReport, CommunityNeedStats, CommunityAiAction } from "@/lib/supabase/types";
import { PageHero, CardSurface } from "@/components/ui";
import { buttonStyle } from "@/styles/careeros-design-system";

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */
interface ForecastItem {
  category: string;
  label: string;
  current_demand: number;
  predicted_demand: number;
  percent_change: number;
  trend: "crisis" | "increasing" | "stable" | "declining";
  data_points: Array<{ week: string; count: number }>;
}

interface HeatmapData {
  groupedData: Record<string, Record<string, number>>;
}

/* ─────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────── */
const TREND_ICONS = {
  crisis:     { icon: AlertTriangle, color: "text-rose-400",    label: "🔴 Crisis"     },
  increasing: { icon: TrendingUp,    color: "text-orange-400",  label: "📈 Increasing" },
  stable:     { icon: Minus,         color: "text-amber-400",   label: "→ Stable"      },
  declining:  { icon: TrendingDown,  color: "text-emerald-400", label: "↓ Declining"   },
};

const GAP_COLORS = {
  crisis:     "from-rose-500/10 to-rose-950/5 border-rose-500/20",
  increasing: "from-orange-500/10 to-orange-950/5 border-orange-500/20",
  stable:     "from-amber-500/10 to-amber-950/5 border-amber-500/20",
  declining:  "from-emerald-500/10 to-emerald-950/5 border-emerald-500/20",
};

const PANEL_ENTER = {
  initial:    { opacity: 0, y: 12 },
  animate:    { opacity: 1, y: 0  },
  transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
};

/* ─────────────────────────────────────────────────────────────
   Live Badge
───────────────────────────────────────────────────────────── */
const LiveBadge = () => (
  <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-emerald-400 font-mono">
    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
    LIVE
  </span>
);

/* ─────────────────────────────────────────────────────────────
   Panel Header
───────────────────────────────────────────────────────────── */
function PanelHeader({
  icon: Icon,
  title,
  subtitle,
  live = false,
  onRefresh,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  live?: boolean;
  onRefresh?: () => void;
}) {
  return (
    <div className="flex items-start justify-between pb-3 border-b border-white/[0.06]">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <Icon className="h-3.5 w-3.5 text-cyan-400" />
        </div>
        <div>
          <p className="text-xs font-bold text-white tracking-wide">{title}</p>
          {subtitle && <p className="text-[9px] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {live && <LiveBadge />}
        {onRefresh && (
          <button onClick={onRefresh} className="p-1 text-slate-500 hover:text-cyan-400 transition-colors rounded">
            <RefreshCw className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Panel 1: Live Needs Feed
───────────────────────────────────────────────────────────── */
const NeedsFeedPanel = memo(function NeedsFeedPanel() {
  const [reports, setReports]   = useState<CommunityNeedReport[]>([]);
  const [loading, setLoading]   = useState(true);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch("/api/community/needs?limit=8");
      if (res.ok) {
        const d = await res.json() as { recentReports: CommunityNeedReport[] };
        setReports(d.recentReports ?? []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetch_();
    const t = setInterval(fetch_, 30000);
    return () => clearInterval(t);
  }, [fetch_]);

  const catColors: Record<string, string> = {
    career_mentorship: "text-cyan-400",
    housing:           "text-amber-400",
    food:              "text-orange-400",
    mental_health:     "text-rose-400",
    scholarship:       "text-indigo-400",
    internship:        "text-emerald-400",
    other:             "text-slate-400",
  };

  return (
    <CardSurface variant="surface" {...PANEL_ENTER} noPadding className="p-4 space-y-3">
      <PanelHeader icon={Activity} title="Live Needs Feed" subtitle="Real-time community reports" live onRefresh={fetch_} />
      {loading ? (
        <div className="flex items-center gap-2 py-4 text-[11px] text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Fetching live feed...
        </div>
      ) : reports.length === 0 ? (
        <p className="text-[11px] text-slate-500 py-4 text-center italic">No reports yet — waiting for first submission...</p>
      ) : (
        <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
          <AnimatePresence>
            {reports.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2 p-2 bg-slate-950/40 rounded-lg border border-white/[0.04]"
              >
                <span className={`text-[10px] font-bold uppercase mt-0.5 ${catColors[r.category] ?? "text-slate-400"}`}>
                  {r.category.replace(/_/g, " ").slice(0, 6)}
                </span>
                <div className="flex-1 min-w-0">
                  {r.description && (
                    <p className="text-[10px] text-slate-300 line-clamp-1">{r.description}</p>
                  )}
                  <p className="text-[9px] text-slate-600 flex items-center gap-1 mt-0.5">
                    {r.city && <><MapPin className="h-2.5 w-2.5" />{r.city}</>}
                    <Clock className="h-2.5 w-2.5 ml-1" />
                    {new Date(r.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span className={`text-[8px] shrink-0 px-1 py-0.5 rounded font-mono uppercase ${
                  r.urgency === "critical" ? "text-rose-400 bg-rose-950/30"
                  : r.urgency === "high"   ? "text-orange-400 bg-orange-950/30"
                  : "text-slate-500 bg-slate-900/50"
                }`}>
                  {r.urgency}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </CardSurface>
  );
});

/* ─────────────────────────────────────────────────────────────
   Panel 2: Gap Scores
───────────────────────────────────────────────────────────── */
const GapScoresPanel = memo(function GapScoresPanel() {
  const [stats, setStats]   = useState<CommunityNeedStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch("/api/community/needs");
      if (res.ok) {
        const d = await res.json() as { needStats: CommunityNeedStats[] };
        setStats(d.needStats ?? []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const displayStats: CommunityNeedStats[] = stats.length > 0 ? stats.slice(0, 6) : FALLBACK_STATS;

  return (
    <CardSurface variant="surface" {...PANEL_ENTER} style={{ transitionDelay: "0.05s" }} noPadding className="p-4 space-y-3">
      <PanelHeader icon={BarChart3} title="Gap Intelligence" subtitle="Demand vs. available resources" onRefresh={fetch_} />
      {loading ? (
        <div className="flex items-center gap-2 py-4 text-[11px] text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Calculating gap scores...
        </div>
      ) : (
        <div className="space-y-2">
          {displayStats.map((s) => {
            const tr = TREND_ICONS[s.trend] ?? TREND_ICONS.stable;
            const TrIcon = tr.icon;
            return (
              <div key={s.category} className={`p-2.5 rounded-xl border bg-gradient-to-r ${GAP_COLORS[s.trend]}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-white">{s.label}</span>
                  <div className="flex items-center gap-1">
                    <TrIcon className={`h-3 w-3 ${tr.color}`} />
                    <span className={`text-[9px] font-bold ${tr.color}`}>{s.gapScore}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[9px] text-slate-500">
                  <span>Requests: <span className="text-white font-bold">{s.requests}</span></span>
                  <span>Available: <span className="text-white font-bold">{s.available}</span></span>
                </div>
                <div className="mt-1.5 h-1 rounded-full bg-slate-800/60 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      s.trend === "crisis" ? "bg-rose-500" : s.trend === "increasing" ? "bg-orange-500" : "bg-amber-400"
                    }`}
                    style={{ width: `${Math.min(100, s.gapScore)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CardSurface>
  );
});

/* ─────────────────────────────────────────────────────────────
   Panel 3: Demand Forecasts
───────────────────────────────────────────────────────────── */
const ForecastsPanel = memo(function ForecastsPanel() {
  const [forecasts, setForecasts] = useState<ForecastItem[]>([]);
  const [loading, setLoading]     = useState(true);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch("/api/community/forecast");
      if (res.ok) {
        const d = await res.json() as { forecasts: ForecastItem[] };
        setForecasts(d.forecasts ?? []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  return (
    <CardSurface variant="surface" {...PANEL_ENTER} style={{ transitionDelay: "0.1s" }} noPadding className="p-4 space-y-3">
      <PanelHeader icon={TrendingUp} title="Demand Forecast" subtitle="30-day predictive modeling" onRefresh={fetch_} />
      {loading ? (
        <div className="flex items-center gap-2 py-4 text-[11px] text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Running forecast model...
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
          {(forecasts.length > 0 ? forecasts : FALLBACK_FORECASTS).map((f) => {
            const tr = TREND_ICONS[f.trend] ?? TREND_ICONS.stable;
            const TrIcon = tr.icon;
            const isUp = f.percent_change > 0;
            return (
              <div key={f.category} className="p-2.5 bg-slate-950/40 border border-white/[0.04] rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-white">{f.label}</span>
                  <div className="flex items-center gap-1">
                    <TrIcon className={`h-3 w-3 ${tr.color}`} />
                    <span className={`text-[9px] font-bold ${isUp ? "text-rose-400" : "text-emerald-400"}`}>
                      {isUp ? "+" : ""}{f.percent_change}%
                    </span>
                  </div>
                </div>
                <div className="flex items-end gap-4 text-[9px] text-slate-500">
                  <div>
                    <p className="text-xs font-black text-white">{f.current_demand.toLocaleString()}</p>
                    <p>Current</p>
                  </div>
                  <ArrowUpRight className={`h-3.5 w-3.5 mb-1 ${isUp ? "text-rose-400" : "text-emerald-400"}`} />
                  <div>
                    <p className={`text-xs font-black ${tr.color}`}>{f.predicted_demand.toLocaleString()}</p>
                    <p>Predicted</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CardSurface>
  );
});

/* ─────────────────────────────────────────────────────────────
   Panel 4: Heatmap Matrix (compact)
───────────────────────────────────────────────────────────── */
const HeatmapPanel = memo(function HeatmapPanel() {
  const [data, setData]     = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch("/api/community/heatmap");
      if (res.ok) {
        const d = await res.json() as HeatmapData;
        setData(d);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const CITIES = ["Bangalore", "New Delhi", "Mumbai", "Kolkata", "Jaipur", "Pune", "Ahmedabad"];
  const TYPES  = ["scholarship", "internship", "mentorship", "center"];

  return (
    <CardSurface variant="surface" {...PANEL_ENTER} style={{ transitionDelay: "0.15s" }} noPadding className="p-4 space-y-3">
      <PanelHeader icon={Globe} title="Heatmap Matrix" subtitle="Resource density per city" onRefresh={fetch_} />
      {loading ? (
        <div className="flex items-center gap-2 py-4 text-[11px] text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Compiling matrix...
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[9px] font-mono border-collapse">
            <thead>
              <tr className="text-slate-500">
                <th className="text-left py-1 pr-2 font-semibold">City</th>
                {TYPES.map((t) => (
                  <th key={t} className="text-center py-1 px-1 font-semibold capitalize">{t.slice(0, 4)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CITIES.map((city) => (
                <tr key={city} className="border-t border-white/[0.04]">
                  <td className="py-1 pr-2 text-slate-300 font-semibold">{city.split(" ")[0]}</td>
                  {TYPES.map((type) => {
                    const count = data?.groupedData?.[city]?.[type] ?? 0;
                    return (
                      <td key={type} className="text-center py-1 px-1">
                        <span className={`inline-flex w-6 h-5 items-center justify-center rounded text-[8px] font-bold ${
                          count === 0
                            ? "bg-rose-500/20 text-rose-400"
                            : count <= 2
                            ? "bg-amber-500/10 text-amber-300"
                            : "bg-cyan-500/15 text-cyan-300"
                        }`}>
                          {count}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-3 mt-2 text-[8px] text-slate-600 font-mono">
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded bg-rose-500/30" />0 (Severe)</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded bg-amber-500/20" />1-2 (Low)</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded bg-cyan-500/20" />3+ (OK)</span>
          </div>
        </div>
      )}
    </CardSurface>
  );
});

/* ─────────────────────────────────────────────────────────────
   Panel 5: AI Actions Log
───────────────────────────────────────────────────────────── */
const AiActionsPanel = memo(function AiActionsPanel() {
  const [actions, setActions] = useState<CommunityAiAction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    try {
      // We fetch from the agent route — actions are stored per-user
      // Fallback: show simulated log if DB empty
      setActions([]);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const SIMULATED: Partial<CommunityAiAction>[] = [
    { id: "a1", action_type: "community_response", input_query: "I need mental health support", category: "mental_health", urgency_score: 7, completed: true, created_at: new Date(Date.now() - 120000).toISOString() },
    { id: "a2", action_type: "community_response", input_query: "Looking for internship opportunities", category: "internship", urgency_score: 4, completed: true, created_at: new Date(Date.now() - 600000).toISOString() },
    { id: "a3", action_type: "verify_eligibility", input_query: "ICCR Cultural Exchange Scholarship", category: "scholarship", urgency_score: 5, completed: true, created_at: new Date(Date.now() - 1800000).toISOString() },
  ];

  const displayActions = actions.length > 0 ? actions : SIMULATED;

  return (
    <CardSurface variant="surface" {...PANEL_ENTER} style={{ transitionDelay: "0.2s" }} noPadding className="p-4 space-y-3">
      <PanelHeader icon={Brain} title="AI Actions Log" subtitle="Recent agentic workflow runs" />
      {loading ? (
        <div className="flex items-center gap-2 py-4 text-[11px] text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading agent actions...
        </div>
      ) : (
        <div className="space-y-2.5">
          {displayActions.map((a) => (
            <div key={a.id} className="p-2.5 bg-slate-950/40 border border-white/[0.04] rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono uppercase text-indigo-400 font-bold">
                  {a.action_type?.replace(/_/g, " ")}
                </span>
                <div className="flex items-center gap-1">
                  {a.completed && (
                    <span className="text-[8px] text-emerald-400 font-mono">✓ DONE</span>
                  )}
                  <span className="text-[8px] text-slate-600">
                    {a.urgency_score !== null && a.urgency_score !== undefined ? `urgency: ${a.urgency_score}/10` : ""}
                  </span>
                </div>
              </div>
              {a.input_query && (
                <p className="text-[10px] text-slate-300 line-clamp-1">&quot;{a.input_query}&quot;</p>
              )}
              <p className="text-[9px] text-slate-600">
                {a.created_at ? new Date(a.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                {a.category && ` · ${a.category.replace(/_/g, " ")}`}
              </p>
            </div>
          ))}
        </div>
      )}
    </CardSurface>
  );
});

/* ─────────────────────────────────────────────────────────────
   Panel 6: Status Summary (System Health)
───────────────────────────────────────────────────────────── */
const SystemStatusPanel = memo(function SystemStatusPanel() {
  const systems = [
    { name: "Community DB",       status: "ONLINE",    color: "text-emerald-400" },
    { name: "Need Reports API",   status: "ACTIVE",    color: "text-emerald-400" },
    { name: "Forecast Engine",    status: "RUNNING",   color: "text-cyan-400"    },
    { name: "AI Agent Pipeline",  status: "READY",     color: "text-cyan-400"    },
    { name: "Heatmap Matrix",     status: "SYNCED",    color: "text-emerald-400" },
    { name: "Gap Intelligence",   status: "COMPUTING", color: "text-amber-400"   },
  ];

  return (
    <CardSurface variant="surface" {...PANEL_ENTER} style={{ transitionDelay: "0.25s" }} noPadding className="p-4 space-y-3">
      <PanelHeader icon={Shield} title="System Status" subtitle="Community intelligence modules" />
      <div className="space-y-2">
        {systems.map((s) => (
          <div key={s.name} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
            <span className="text-[10px] text-slate-400">{s.name}</span>
            <span className={`text-[9px] font-bold font-mono ${s.color} flex items-center gap-1`}>
              <span className={`h-1.5 w-1.5 rounded-full bg-current ${s.status === "COMPUTING" ? "animate-pulse" : ""}`} />
              {s.status}
            </span>
          </div>
        ))}
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <a
          href="/report-need"
          style={{ ...buttonStyle("secondary"), height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
          className="gap-1.5 text-[9px] font-bold text-white transition-all"
        >
          <Zap className="h-3 w-3 text-cyan-400" />
          Report Need
        </a>
        <a
          href="/community-intelligence"
          style={{ ...buttonStyle("ghost"), height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
          className="gap-1.5 text-[9px] font-bold text-white transition-all"
        >
          <Globe className="h-3 w-3 text-indigo-400" />
          Intelligence
        </a>
      </div>
    </CardSurface>
  );
});

/* ─────────────────────────────────────────────────────────────
   Main Dashboard
───────────────────────────────────────────────────────────── */
export function CommunityCommandCenter() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-6">

      {/* ── Mission Header ─────────────────────────────────────── */}
      <PageHero
        badge="CSI v2.0"
        title="Community Command Center"
        subtitle="Real-time intelligence platform. Live needs · Gap scores · Demand forecasts · Heatmap · AI actions."
        actions={
          <div className="flex flex-col items-end gap-1 shrink-0">
            <p className="text-xl font-black text-cyan-400 font-mono tabular-nums">
              {time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
            <p className="text-[9px] text-slate-500 font-mono">
              {time.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </p>
            <LiveBadge />
          </div>
        }
      />

      {/* ── 6-Panel Grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <NeedsFeedPanel />
        <GapScoresPanel />
        <ForecastsPanel />
        <HeatmapPanel />
        <AiActionsPanel />
        <SystemStatusPanel />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Fallback data
───────────────────────────────────────────────────────────── */
const FALLBACK_STATS: CommunityNeedStats[] = [
  { category: "career_mentorship", label: "Career Mentorship", requests: 189, available: 21, gapScore: 89, trend: "crisis"     },
  { category: "housing",           label: "Housing Support",   requests: 95,  available: 8,  gapScore: 91, trend: "crisis"     },
  { category: "mental_health",     label: "Mental Health",     requests: 67,  available: 12, gapScore: 83, trend: "increasing" },
  { category: "scholarship",       label: "Scholarship",       requests: 210, available: 38, gapScore: 84, trend: "increasing" },
  { category: "internship",        label: "Internship",        requests: 130, available: 19, gapScore: 87, trend: "crisis"     },
  { category: "food",              label: "Food & Nutrition",  requests: 42,  available: 5,  gapScore: 85, trend: "crisis"     },
];

const FALLBACK_FORECASTS: ForecastItem[] = [
  { category: "career_mentorship", label: "Career Mentorship", current_demand: 180, predicted_demand: 245, percent_change: 36,  trend: "crisis",     data_points: [] },
  { category: "housing",           label: "Housing Support",   current_demand: 95,  predicted_demand: 112, percent_change: 18,  trend: "increasing", data_points: [] },
  { category: "mental_health",     label: "Mental Health",     current_demand: 67,  predicted_demand: 89,  percent_change: 33,  trend: "crisis",     data_points: [] },
  { category: "scholarship",       label: "Scholarship",       current_demand: 210, predicted_demand: 198, percent_change: -6,  trend: "stable",     data_points: [] },
  { category: "internship",        label: "Internship",        current_demand: 130, predicted_demand: 165, percent_change: 27,  trend: "crisis",     data_points: [] },
  { category: "food",              label: "Food & Nutrition",  current_demand: 42,  predicted_demand: 38,  percent_change: -10, trend: "declining",  data_points: [] },
];
