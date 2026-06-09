"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import {
  Shield,
  Activity,
  TrendingUp,
  AlertTriangle,
  Brain,
  Compass,
  MapPin,
  CheckCircle2,
  RefreshCw,
  ArrowUpRight,
  Database,
  Eye,
  Settings
} from "lucide-react";
import Link from "next/link";
import type { UserProfileRecord, WorkspaceSnapshotRecord } from "@/lib/supabase/types";

type CommunityIntelligenceWorkspaceProps = {
  profile: UserProfileRecord | null;
  workspace: WorkspaceSnapshotRecord | null;
};

type DashboardData = {
  healthOverview: {
    totalResources: number;
    verifiedResources: number;
    distinctCitiesCount: number;
    coverageIndexScore: number;
  };
  categoryDistribution: Record<string, number>;
  demandIntelligence: {
    totalDevelopers: number;
    averageReadinessScore: number;
    popularGoals: Record<string, number>;
  };
  trends: {
    agentActionsTotal: number;
    agentActionsCompleted: number;
    agentActionsSuccessRate: number;
    actionsByType: Record<string, number>;
  };
  underservedAreas: Array<{
    city: string;
    resourceType: string;
    gapLevel: "critical" | "warning";
  }>;
  aiInsights: Array<{
    type: string;
    title: string;
    description: string;
    confidence: number;
    impact: string;
  }>;
  recommendedActions: Array<{
    id: string;
    title: string;
    category: string;
    description: string;
    difficulty: string;
    impact: string;
    status: string;
  }>;
};

// Memoized Helper Components for Performance
const HealthMetricCard = React.memo(function HealthMetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  colorClass
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 flex items-center justify-between gap-4 transition-all hover:border-white/10 hover:bg-slate-900/60">
      <div className="space-y-1.5 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{title}</p>
        <p className={`text-xl font-bold tracking-tight ${colorClass}`}>{value}</p>
        <p className="text-[10px] text-slate-400 truncate">{subtitle}</p>
      </div>
      <div className={`h-10 w-10 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-center shrink-0`}>
        <Icon className={`h-5 w-5 ${colorClass}`} />
      </div>
    </div>
  );
});

const AIInsightCard = React.memo(function AIInsightCard({
  type,
  title,
  description,
  confidence,
  impact
}: {
  type: string;
  title: string;
  description: string;
  confidence: number;
  impact: string;
}) {
  return (
    <div className="rounded-2xl border border-indigo-500/10 bg-indigo-950/[0.02] p-4.5 space-y-3 relative overflow-hidden transition-all hover:border-indigo-500/20 hover:bg-indigo-950/[0.04]">
      <div className="absolute top-0 right-0 bg-indigo-500/10 border-l border-b border-indigo-500/20 px-2.5 py-0.5 rounded-bl-xl text-[9px] font-bold text-indigo-400">
        {confidence}% CONFIDENCE
      </div>
      <div className="space-y-1">
        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-950/45 px-2 py-0.5 rounded border border-indigo-500/15">
          {type}
        </span>
        <h4 className="text-xs font-bold text-white mt-2.5">{title}</h4>
      </div>
      <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-950/45 border border-white/5 p-2.5 rounded-xl">
        {description}
      </p>
      <div className="flex justify-between items-center text-[9px] text-slate-500 border-t border-white/5 pt-2 font-mono">
        <span>IMPACT: <strong className={impact === "High" ? "text-cyan-400" : "text-amber-400"}>{impact}</strong></span>
        <span>ENGINE // LIVE DEPLOYMENT</span>
      </div>
    </div>
  );
});

const ActionRowItem = React.memo(function ActionRowItem({
  action,
  onToggle
}: {
  action: {
    id: string;
    title: string;
    category: string;
    description: string;
    difficulty: string;
    impact: string;
    status: string;
  };
  onToggle: (id: string) => void;
}) {
  const isDone = action.status === "completed";

  return (
    <div className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 justify-between ${
      isDone ? "border-emerald-500/10 bg-emerald-950/[0.01]" : "border-white/5 bg-slate-950/30 hover:border-white/10"
    }`}>
      <button 
        onClick={() => onToggle(action.id)}
        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-700 hover:border-cyan-400 transition"
      >
        {isDone && <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />}
      </button>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{action.category}</span>
          <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase ${
            action.difficulty === "High" ? "bg-rose-950/20 text-rose-400" : action.difficulty === "Medium" ? "bg-amber-950/20 text-amber-400" : "bg-cyan-950/20 text-cyan-400"
          }`}>
            {action.difficulty}
          </span>
        </div>
        <p className={`text-xs font-bold text-white leading-snug ${isDone ? "line-through opacity-50" : ""}`}>
          {action.title}
        </p>
        <p className="text-[10px] text-slate-400 leading-normal">
          {action.description}
        </p>
      </div>
    </div>
  );
});

export function CommunityIntelligenceWorkspace({ profile }: CommunityIntelligenceWorkspaceProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch metrics dynamically
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/community/dashboard-stats");
      if (!response.ok) {
        throw new Error("Failed to load intelligence statistics.");
      }
      const resData = await response.json();
      setData(resData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Data fetch error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle recommendation action progress toggles
  const handleToggleAction = useCallback((id: string) => {
    setData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        recommendedActions: prev.recommendedActions.map((act) => {
          if (act.id === id) {
            return {
              ...act,
              status: act.status === "completed" ? "pending" : "completed"
            };
          }
          return act;
        })
      };
    });
  }, []);

  // Compute maximum category count for SVG chart scaling
  const maxCategoryCount = useMemo(() => {
    if (!data?.categoryDistribution) return 1;
    const values = Object.values(data.categoryDistribution);
    return values.length > 0 ? Math.max(...values) : 1;
  }, [data]);

  // Compute max goal count for scaling
  const maxGoalCount = useMemo(() => {
    if (!data?.demandIntelligence?.popularGoals) return 1;
    const values = Object.values(data.demandIntelligence.popularGoals);
    return values.length > 0 ? Math.max(...values) : 1;
  }, [data]);

  const categoryChartColors: Record<string, string> = {
    scholarship: "#f59e0b",
    mentorship: "#6366f1",
    internship: "#06b6d4",
    scheme: "#10b981",
    certification: "#a855f7",
    center: "#f43f5e",
    ngo: "#ec4899",
    job_fair: "#f97316",
    event: "#3b82f6",
    wellness: "#ef4444",
    student_service: "#14b8a6"
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 relative">
      


      {/* --- Dashboard Header --- */}
      <div className="relative rounded-[24px] border border-cyan-500/10 bg-slate-950/45 p-6 backdrop-blur-md overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(to_right,#22d3ee_1px,transparent_1px),linear-gradient(to_bottom,#22d3ee_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              <p className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase">CSI Dashboard // Live Analytics Engine</p>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Shield className="h-6 w-6 text-cyan-400" />
              Community Support Intelligence
            </h1>
            <p className="text-xs text-slate-400 max-w-xl">
              Cross-referencing real-time regional support directories, active student career milestones, and agentic workflows for {profile?.full_name || "our developers"}.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
            <button
              onClick={loadDashboardData}
              disabled={loading}
              className="h-9 w-9 rounded-xl bg-slate-900 border border-white/5 hover:border-cyan-500/30 flex items-center justify-center text-slate-400 hover:text-white transition shrink-0"
              title="Reload Statistics"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-3">
          <LoaderSpinner />
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest animate-pulse">
            Retrieving real-time community variables...
          </p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 border border-red-500/10 bg-red-950/10 rounded-2xl p-6 max-w-md mx-auto">
          <AlertTriangle className="h-8 w-8 text-red-500 animate-bounce" />
          <p className="text-xs text-red-200 font-bold uppercase tracking-wider text-center">{error}</p>
          <button 
            onClick={loadDashboardData}
            className="px-4 py-1.5 bg-red-900/40 hover:bg-red-900/60 border border-red-500/20 text-xs font-semibold rounded-lg text-white transition"
          >
            Retry Sync
          </button>
        </div>
      ) : !data ? (
        <div className="text-center py-20 text-slate-500 text-xs">No metrics data loaded.</div>
      ) : (
        <Suspense fallback={<div>Loading component bundle...</div>}>
          
          {/* --- Section 1: Community Health Overview (Visual Analytics) --- */}
          <section className="space-y-4">
            <div className="flex items-center gap-1.5 border-b border-white/5 pb-2">
              <Activity className="h-4.5 w-4.5 text-cyan-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">1. Community Health Overview</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <HealthMetricCard
                title="Total Resources"
                value={data.healthOverview.totalResources}
                subtitle="Active schemes, scholarships, centers"
                icon={Database}
                colorClass="text-cyan-400"
              />
              <HealthMetricCard
                title="Verified Programs"
                value={`${Math.round((data.healthOverview.verifiedResources / data.healthOverview.totalResources) * 100)}%`}
                subtitle={`${data.healthOverview.verifiedResources} fully verified listings`}
                icon={CheckCircle2}
                colorClass="text-emerald-400"
              />
              <HealthMetricCard
                title="Geographical Coverage"
                value={data.healthOverview.distinctCitiesCount}
                subtitle="Monitored urban target cities"
                icon={MapPin}
                colorClass="text-indigo-400"
              />
              <HealthMetricCard
                title="Accessibility Index"
                value={`${data.healthOverview.coverageIndexScore} / 100`}
                subtitle="Proportional matrix coverage factor"
                icon={TrendingUp}
                colorClass="text-purple-400"
              />
            </div>

            {/* Custom SVG Distribution Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
              <div className="lg:col-span-8 bg-slate-900/20 border border-white/5 p-5 rounded-2xl flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Resource Allocation Spectrum</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Distribution breakdown by support classification category</p>
                </div>
                
                {/* SVG Chart Core */}
                <div className="h-44 w-full mt-4 flex items-end justify-around border-b border-white/10 pb-1 select-none">
                  {Object.entries(data.categoryDistribution).map(([catKey, count]) => {
                    const pct = (count / maxCategoryCount) * 85; // cap at 85% height to leave spacing
                    const color = categoryChartColors[catKey] || "#ffffff";
                    return (
                      <div key={catKey} className="flex flex-col items-center flex-1 max-w-[40px] group relative">
                        {/* Hover card */}
                        <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950 border border-white/10 p-1.5 rounded-lg text-[9px] font-bold text-white pointer-events-none z-10 whitespace-nowrap">
                          {catKey.toUpperCase()}: {count}
                        </div>
                        {/* Bar */}
                        <div 
                          className="w-5 rounded-t-sm transition-all duration-500 hover:brightness-125"
                          style={{
                            height: `${Math.max(8, pct)}px`,
                            backgroundColor: color,
                            boxShadow: `0 0 8px ${color}20`
                          }}
                        />
                        <span className="text-[8px] text-slate-500 font-mono mt-1.5 uppercase truncate w-full text-center">
                          {catKey.slice(0, 4)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* District Health Indexes details */}
              <div className="lg:col-span-4 bg-slate-900/20 border border-white/5 p-5 rounded-2xl flex flex-col justify-between">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Proximity Density</h3>
                  <p className="text-[10px] text-slate-400">Total programs located outside online directories</p>
                </div>
                <div className="space-y-3.5 mt-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Urban Coverage Quality</span>
                    <span className="text-emerald-400 font-semibold">Optimal</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full bg-emerald-400 w-[78%] rounded-full" />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 leading-normal">
                    <span>Verified Cities: 7</span>
                    <span>Offline Database: Seeded</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* --- Section 2 & 3: Demand Intelligence & Trends --- */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Demand Intelligence Panel */}
            <div className="bg-slate-900/20 border border-white/5 p-5 rounded-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <div className="flex items-center gap-1.5">
                  <Eye className="h-4.5 w-4.5 text-cyan-400" />
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider">2. Demand Intelligence</h2>
                </div>
                <span className="text-[9px] text-cyan-300 font-bold bg-cyan-950/40 border border-cyan-400/20 px-2.5 py-0.5 rounded-full uppercase">
                  Community Demand
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950/40 border border-white/5 rounded-xl text-center">
                  <p className="text-[9px] text-slate-500 uppercase">Total User Profiles</p>
                  <p className="text-lg font-bold text-white mt-1">{data.demandIntelligence.totalDevelopers}</p>
                </div>
                <div className="p-3 bg-slate-950/40 border border-white/5 rounded-xl text-center">
                  <p className="text-[9px] text-slate-500 uppercase">Avg Readiness Score</p>
                  <p className="text-lg font-bold text-cyan-300 mt-1">{data.demandIntelligence.averageReadinessScore}%</p>
                </div>
              </div>

              {/* Demand breakdown list */}
              <div className="space-y-2.5">
                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Concentration of Student Goals</p>
                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {Object.entries(data.demandIntelligence.popularGoals).map(([goalName, count]) => {
                    const percentage = data.demandIntelligence.totalDevelopers > 0 ? (count / maxGoalCount) * 100 : 0;
                    return (
                      <div key={goalName} className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-semibold text-slate-300">
                          <span className="truncate mr-3">{goalName}</span>
                          <span className="text-slate-500 shrink-0 font-mono">{count} target</span>
                        </div>
                        <div className="h-1 w-full bg-slate-950 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-400 transition-all duration-300" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Community Trends & Workflow Metrics */}
            <div className="bg-slate-900/20 border border-white/5 p-5 rounded-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-4.5 w-4.5 text-cyan-400" />
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider">3. Community Trends</h2>
                </div>
                <span className="text-[9px] text-cyan-300 font-bold bg-cyan-950/40 border border-cyan-400/20 px-2.5 py-0.5 rounded-full uppercase">
                  Agent Pipelines
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 bg-slate-950/40 border border-white/5 rounded-xl text-center">
                  <p className="text-[8px] text-slate-500 uppercase">Agent Runs</p>
                  <p className="text-base font-bold text-white mt-1">{data.trends.agentActionsTotal}</p>
                </div>
                <div className="p-2.5 bg-slate-950/40 border border-white/5 rounded-xl text-center">
                  <p className="text-[8px] text-slate-500 uppercase">Success Rate</p>
                  <p className="text-base font-bold text-emerald-400 mt-1">{data.trends.agentActionsSuccessRate}%</p>
                </div>
                <div className="p-2.5 bg-slate-950/40 border border-white/5 rounded-xl text-center">
                  <p className="text-[8px] text-slate-500 uppercase">SOP Drafts</p>
                  <p className="text-base font-bold text-purple-400 mt-1">{data.trends.actionsByType.draft_sop_or_application}</p>
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-950/30 p-3 flex justify-between items-center gap-4">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold">AUTOMATED CHECKS RATIO</p>
                  <p className="text-[9px] text-slate-500 mt-1">Cross-validation checks vs drafts: {data.trends.actionsByType.verify_eligibility} validated</p>
                </div>
                <div className="shrink-0 flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/20 border border-emerald-500/10 px-2 py-0.5 rounded-md">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Normal Execution
                </div>
              </div>
            </div>
          </section>

          {/* --- Section 4: Underserved Areas (Gap Mapping) --- */}
          <section className="bg-slate-900/20 border border-white/5 p-5 rounded-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-4.5 w-4.5 text-rose-500" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">4. Underserved Areas & Deficiencies</h2>
              </div>
              <span className="text-[9px] text-rose-400 font-bold bg-rose-950/40 border border-rose-400/20 px-2.5 py-0.5 rounded-full uppercase animate-pulse">
                Action Required
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-[160px] overflow-y-auto pr-1">
              {data.underservedAreas.map((gap, i) => (
                <div key={i} className={`p-3 rounded-xl border flex flex-col justify-between gap-2 transition ${
                  gap.gapLevel === "critical" 
                    ? "border-rose-500/20 bg-rose-950/[0.02] hover:border-rose-500/30" 
                    : "border-amber-500/20 bg-amber-950/[0.02] hover:border-amber-500/30"
                }`}>
                  <div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      <span className="text-[10px] font-bold text-white">{gap.city}</span>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1 uppercase">LACKS: {gap.resourceType}</p>
                  </div>
                  <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase self-start ${
                    gap.gapLevel === "critical" 
                      ? "bg-rose-950 text-rose-400" 
                      : "bg-amber-950 text-amber-400"
                  }`}>
                    {gap.gapLevel === "critical" ? "Critical (0)" : "Low Density (1)"}
                  </span>
                </div>
              ))}
              {data.underservedAreas.length === 0 && (
                <div className="col-span-full py-6 text-center text-[10px] text-slate-500 border border-dashed border-white/5 rounded-xl">
                  No underserved gaps identified in monitored regions.
                </div>
              )}
            </div>
          </section>

          {/* --- Section 5: AI Insights (Pattern Detection & Predictive Modeling) --- */}
          <section className="space-y-4">
            <div className="flex items-center gap-1.5 border-b border-white/5 pb-2">
              <Brain className="h-4.5 w-4.5 text-indigo-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">5. AI Intelligence Insights</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {data.aiInsights.map((insight, idx) => (
                <AIInsightCard
                  key={idx}
                  type={insight.type}
                  title={insight.title}
                  description={insight.description}
                  confidence={insight.confidence}
                  impact={insight.impact}
                />
              ))}
            </div>
          </section>

          {/* --- Section 6: Recommended Actions (Strategic Tasks) --- */}
          <section className="bg-slate-900/20 border border-white/5 p-5 rounded-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <div className="flex items-center gap-1.5">
                <Settings className="h-4.5 w-4.5 text-cyan-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">6. Recommended Actions & Interventions</h2>
              </div>
              <span className="text-[9px] text-cyan-300 font-bold bg-cyan-950/40 border border-cyan-400/20 px-2.5 py-0.5 rounded-full uppercase">
                {data.recommendedActions.filter(a => a.status === "completed").length} / {data.recommendedActions.length} Done
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.recommendedActions.map((action) => (
                <ActionRowItem
                  key={action.id}
                  action={action}
                  onToggle={handleToggleAction}
                />
              ))}
            </div>
          </section>

        </Suspense>
      )}

      {/* --- Tactical Sub-Route Shortcuts Footer --- */}
      <section className="border-t border-white/5 pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
        <Link
          href="/support-navigator"
          prefetch={true}
          className="p-4 rounded-xl bg-slate-950/30 border border-white/5 hover:border-cyan-500/20 text-left transition group"
        >
          <div className="flex justify-between items-start">
            <Compass className="h-5 w-5 text-cyan-400" />
            <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-white transition" />
          </div>
          <h4 className="text-xs font-bold text-white mt-2.5">Open Match Engine</h4>
          <p className="text-[10px] text-slate-500 mt-1">Calibrate proximity eligibility & custom plans.</p>
        </Link>

        <Link
          href="/resource-discovery"
          prefetch={true}
          className="p-4 rounded-xl bg-slate-950/30 border border-white/5 hover:border-cyan-500/20 text-left transition group"
        >
          <div className="flex justify-between items-start">
            <MapPin className="h-5 w-5 text-cyan-400" />
            <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-white transition" />
          </div>
          <h4 className="text-xs font-bold text-white mt-2.5">Explore Proximity Map</h4>
          <p className="text-[10px] text-slate-500 mt-1">Directly query regional databases.</p>
        </Link>

        <Link
          href="/community-gaps"
          prefetch={true}
          className="p-4 rounded-xl bg-slate-950/30 border border-white/5 hover:border-cyan-500/20 text-left transition group"
        >
          <div className="flex justify-between items-start">
            <Activity className="h-5 w-5 text-cyan-400" />
            <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-white transition" />
          </div>
          <h4 className="text-xs font-bold text-white mt-2.5">Community Matrix</h4>
          <p className="text-[10px] text-slate-500 mt-1">Audit density gaps per city district.</p>
        </Link>
      </section>

    </div>
  );
}

function LoaderSpinner() {
  return (
    <div className="relative h-10 w-10">
      <div className="absolute inset-0 rounded-full border-2 border-cyan-500/10" />
      <div className="absolute inset-0 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
    </div>
  );
}
