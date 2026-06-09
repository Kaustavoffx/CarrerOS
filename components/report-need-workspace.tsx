"use client";

import React from "react";
import { Plus } from "lucide-react";
import { useCommunitySupport, TARGET_CITIES } from "./community-support-context";

export function ReportNeedWorkspace() {
  const {
    reviewCases,
    newCaseName,
    setNewCaseName,
    newCaseType,
    setNewCaseType,
    newCaseCity,
    setNewCaseCity,
    newCaseDesc,
    setNewCaseDesc,
    handleAddReviewCase,
    handleVoteCase
  } = useCommunitySupport();

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/20 p-5 space-y-6">
      <form onSubmit={handleAddReviewCase} className="space-y-3 p-4 bg-slate-950/40 border border-white/5 rounded-xl">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Submit Support Entry for Verification</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Facility/Program Name"
            value={newCaseName}
            onChange={(e) => setNewCaseName(e.target.value)}
            className="sm:col-span-2 px-3 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-cyan-500 text-white"
          />
          <select
            value={newCaseType}
            onChange={(e) => setNewCaseType(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-cyan-500 text-slate-300"
          >
            <option value="scholarship">Scholarship</option>
            <option value="internship">Internship</option>
            <option value="mentorship">Mentorship</option>
            <option value="center">Learning Center</option>
            <option value="wellness">Wellness Support</option>
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={newCaseCity}
            onChange={(e) => setNewCaseCity(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-cyan-500 text-slate-300"
          >
            {TARGET_CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Short description & contact/link details"
            value={newCaseDesc}
            onChange={(e) => setNewCaseDesc(e.target.value)}
            className="sm:col-span-2 px-3 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-cyan-500 text-white"
          />
        </div>
        <button
          type="submit"
          className="w-full py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md active:scale-95 text-center"
        >
          Submit verification proposal
        </button>
      </form>

      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Active Crowdsourced Queue</p>
        <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
          {reviewCases.map((c) => (
            <div key={c.id} className="p-3 bg-slate-950/30 border border-white/5 rounded-xl space-y-2">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">{c.type}</span>
                    <span className="text-[9px] text-slate-500">• {c.city}</span>
                    <span
                      className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                        c.status === "VERIFIED"
                          ? "bg-emerald-950/20 text-emerald-400 border-emerald-500/20"
                          : c.status === "UNDER_REVIEW"
                          ? "bg-amber-950/20 text-amber-400 border-amber-500/20"
                          : "bg-slate-900 text-slate-400 border-white/10"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white mt-1">{c.name}</h4>
                </div>
                <button
                  onClick={() => handleVoteCase(c.id)}
                  className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 font-bold bg-cyan-950/20 border border-cyan-400/25 px-2 py-0.5 rounded-md shrink-0"
                >
                  <Plus className="h-3 w-3" /> Approve ({c.votes})
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">{c.description}</p>
              <p className="text-[9px] text-slate-600">Proposed by: {c.submittedBy}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
