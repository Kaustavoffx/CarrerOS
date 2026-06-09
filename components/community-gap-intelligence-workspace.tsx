"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Download, Loader2, AlertTriangle, FileText } from "lucide-react";
import { useCommunitySupport } from "./community-support-context";

export function CommunityGapIntelligenceWorkspace() {
  const { criticalDeficiencies, handleDownloadGapReport } = useCommunitySupport();
  const [report, setReport] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  const fetchGapReport = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/community/heatmap");
      if (response.ok) {
        const data = await response.json();
        setReport(data.report || "");
      }
    } catch (err) {
      console.warn("Failed to retrieve gap intelligence report", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGapReport();
  }, [fetchGapReport]);

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/20 p-5 space-y-6">
      <div className="flex justify-between items-center border-b border-white/5 pb-2">
        <div>
          <h3 className="text-sm font-bold text-white">Help Gap & Resource Deficiencies</h3>
          <p className="text-[10px] text-slate-400">Tactical assessment of underserved regions and sectors</p>
        </div>
        <button
          onClick={handleDownloadGapReport}
          className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1.5 bg-cyan-950/30 border border-cyan-400/20 px-3 py-1.5 rounded-xl transition-all"
        >
          <Download className="h-3.5 w-3.5" />
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 p-4 bg-rose-950/10 border border-rose-500/10 rounded-xl space-y-2">
          <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider">
            <AlertTriangle className="h-4 w-4 text-rose-500 animate-pulse" />
            Active Critical Gaps
          </h4>
          <p className="text-[10px] text-slate-400 leading-normal">
            monitored sectors in districts with 0 active verified program listings
          </p>
          <div className="space-y-2 mt-3 max-h-[220px] overflow-y-auto pr-1">
            {criticalDeficiencies.map((gap) => (
              <div key={gap.key} className="text-[10px] bg-slate-950/40 border border-white/5 p-2 rounded-lg">
                <span className="font-bold text-white block">{gap.city}</span>
                <span className="text-[9px] text-rose-400 uppercase font-mono">lacks {gap.type}</span>
              </div>
            ))}
            {criticalDeficiencies.length === 0 && (
              <p className="text-[10px] text-slate-500 italic">No critical shortages.</p>
            )}
          </div>
        </div>

        <div className="md:col-span-2 bg-slate-950/40 border border-white/5 rounded-xl p-4.5 flex flex-col min-h-[300px]">
          <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-3">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-cyan-400" />
              Generated Impact Analysis
            </span>
            <span className="text-[9px] font-mono text-cyan-400/70">SYNC: 100% OK</span>
          </div>

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 text-cyan-400 animate-spin" />
              <p className="text-[10px] text-slate-400 animate-pulse">Generating gap intelligence report...</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto max-h-[350px] pr-1 font-mono text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap select-text">
              {report}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
