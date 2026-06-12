"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { PageHero, CardSurface, ErrorState } from "@/components/ui";
import { Brain, Users, Compass, BookOpen, GraduationCap, MapPin, Loader2, Sparkles, AlertTriangle } from "lucide-react";
import type { CommunityNeedMetrics } from "@/app/api/community/globe/route";

// Dynamically import the 3D Globe to avoid SSR issues with Three.js
const CommunityGlobe = dynamic(
  () => import("@/components/ui/community-globe").then((mod) => mod.CommunityGlobe),
  { ssr: false, loading: () => <div className="w-full h-full flex items-center justify-center bg-slate-950/50 rounded-xl border border-white/5 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]"><Loader2 className="w-6 h-6 text-cyan-400 animate-spin" /></div> }
);

function MetricCard({ title, value, icon: Icon, color }: { title: string, value: number, icon: React.ElementType<{ className?: string }>, color: string }) {
  return (
    <CardSurface variant="glass" hover noPadding className="p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-slate-950 border border-white/10 shrink-0`} style={{ color }}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h4 className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{title}</h4>
        <p className="text-xl font-bold text-white leading-tight mt-0.5">{value}</p>
      </div>
    </CardSurface>
  );
}

export function CommunityNeedDashboard() {
  const [data, setData] = useState<CommunityNeedMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/community/globe")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load community intelligence");
        return res.json();
      })
      .then((d) => setData(d))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHero
        badge="Live Geographic Intelligence"
        title="Community Need Intelligence"
        subtitle="Real-time visualization mapping support, scholarship, mentorship, and learning demands across regional districts based on active user reports."
      />

      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-xs text-slate-400 uppercase tracking-widest animate-pulse font-mono">Calibrating Geographic Nodes...</p>
        </div>
      ) : error ? (
        <ErrorState title="Geographic Sync Error" description={error} onRetry={() => window.location.reload()} />
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Panel: Metrics & Insights (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            <section>
              <div className="flex items-center gap-2 border-b border-white/10 pb-2 mb-4">
                <Users className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Demand Aggregation</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard title="Support" value={data.supportDemand} icon={Users} color="#ec4899" />
                <MetricCard title="Scholarship" value={data.scholarshipDemand} icon={GraduationCap} color="#f59e0b" />
                <MetricCard title="Mentorship" value={data.mentorshipDemand} icon={Compass} color="#6366f1" />
                <MetricCard title="Career Guidance" value={data.careerGuidanceDemand} icon={MapPin} color="#06b6d4" />
                <div className="col-span-2">
                  <MetricCard title="Learning Support" value={data.learningSupportDemand} icon={BookOpen} color="#10b981" />
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 border-b border-white/10 pb-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Underserved Communities</h3>
              </div>
              <CardSurface variant="glass" noPadding className="p-4 border-rose-500/20 bg-rose-950/10">
                {data.underservedCommunities.length > 0 ? (
                  <ul className="space-y-3">
                    {data.underservedCommunities.map((city, idx) => (
                      <li key={city} className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold shrink-0">{idx + 1}</span>
                        <div>
                          <p className="text-xs font-bold text-white">{city}</p>
                          <p className="text-[10px] text-slate-400 leading-snug">Severe local resource gap detected.</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No significantly underserved regions detected based on current active metrics.</p>
                )}
              </CardSurface>
            </section>

            <section className="flex-1 flex flex-col">
              <div className="flex items-center gap-2 border-b border-indigo-500/30 pb-2 mb-4">
                <Brain className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">AI Intelligence Insights</h3>
              </div>
              <div className="space-y-3 flex-1">
                {data.aiInsights.map((insight, idx) => (
                  <CardSurface key={idx} variant="glass" noPadding className="p-4 border-indigo-500/20 bg-indigo-950/10 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50 group-hover:bg-indigo-400 transition-colors" />
                    <Sparkles className="absolute top-2 right-2 w-3 h-3 text-indigo-400/30" />
                    <p className="text-[11px] text-slate-300 leading-relaxed font-medium">&quot;{insight}&quot;</p>
                  </CardSurface>
                ))}
                {data.aiInsights.length === 0 && (
                  <p className="text-[11px] text-slate-500 italic">Compiling data for next intelligence cycle...</p>
                )}
              </div>
            </section>

          </div>

          {/* Right Panel: Spatial Map (7 cols) */}
          <div className="lg:col-span-7 flex flex-col h-[600px] lg:h-auto min-h-[600px]">
             <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Geographic Demand Matrix</h3>
                </div>
                <div className="flex items-center gap-3 text-[9px] uppercase font-mono tracking-wider">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#ec4899]" /> Support</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#f59e0b]" /> Scholarship</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#6366f1]" /> Mentorship</span>
                </div>
             </div>
             <div className="flex-1 relative rounded-xl overflow-hidden shadow-2xl">
                <CommunityGlobe data={data.globeData} />
             </div>
          </div>

        </div>
      ) : null}
    </div>
  );
}
