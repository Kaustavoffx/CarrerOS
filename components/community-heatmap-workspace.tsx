"use client";

import React from "react";
import { Download } from "lucide-react";
import { useCommunitySupport, TARGET_CITIES, SUPPORT_TYPES } from "./community-support-context";

export function CommunityHeatmapWorkspace() {
  const { heatmapData, handleDownloadGapReport } = useCommunitySupport();

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/20 p-5 space-y-6">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h3 className="text-sm font-bold text-white">District Accessibility Matrix</h3>
          <p className="text-[10px] text-slate-400">Tactical mapping of support listings per target city</p>
        </div>
        <button
          onClick={handleDownloadGapReport}
          className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1.5 bg-cyan-950/30 border border-cyan-400/20 px-3 py-1.5 rounded-xl transition-all"
        >
          <Download className="h-3.5 w-3.5" />
          Impact Gap Report
        </button>
      </div>

      {/* Heatmap Grid Matrix */}
      <div className="overflow-x-auto border border-white/5 rounded-xl">
        <table className="w-full font-mono text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950 text-slate-400 border-b border-white/5">
              <th className="p-3 text-left font-semibold">City/District</th>
              <th className="p-3 text-center font-semibold">Scholarship</th>
              <th className="p-3 text-center font-semibold">Internship</th>
              <th className="p-3 text-center font-semibold">Mentorship</th>
              <th className="p-3 text-center font-semibold">Center</th>
            </tr>
          </thead>
          <tbody>
            {TARGET_CITIES.map((city) => (
              <tr key={city} className="border-b border-white/5 last:border-0 hover:bg-white/[0.01]">
                <td className="p-3 font-semibold text-slate-300 text-left">{city}</td>
                {SUPPORT_TYPES.slice(0, 4).map((type) => {
                  const count = (heatmapData[city] && heatmapData[city][type]) || 0;
                  return (
                    <td key={type} className="p-2 text-center">
                      <span
                        title={`${city} - ${type}: ${count} verified listings`}
                        className={`inline-block w-8 py-1 rounded text-[10px] font-bold transition-all ${
                          count === 0
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse"
                            : count <= 2
                            ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                            : "bg-cyan-500/15 text-cyan-300 border border-cyan-500/25"
                        }`}
                      >
                        {count}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend & Details */}
      <div className="flex gap-4 items-center text-[10px] text-slate-500 uppercase tracking-wider font-mono justify-center">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded bg-rose-500/30 border border-rose-500/40" /> Severe Shortage (0)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded bg-amber-500/10 border border-amber-500/20" /> Low Density (1-2)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded bg-cyan-500/15 border border-cyan-500/25" /> Optimal Access (3+)
        </span>
      </div>
    </div>
  );
}
