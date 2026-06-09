"use client";

import React from "react";
import { Search, MapPin, CheckCircle2, ArrowRight } from "lucide-react";
import { useCommunitySupport, TARGET_CITIES } from "./community-support-context";

export function ResourceDiscoveryWorkspace() {
  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedCityFilter,
    setSelectedCityFilter,
    filteredResources
  } = useCommunitySupport();

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/20 p-5 space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search resources, tags, or cities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Sectors</option>
            <option value="scholarship">Scholarships</option>
            <option value="internship">Internships</option>
            <option value="mentorship">Mentorships</option>
            <option value="scheme">Government Schemes</option>
            <option value="center">Learning Centers</option>
            <option value="wellness">Wellness Support</option>
          </select>
          <select
            value={selectedCityFilter}
            onChange={(e) => setSelectedCityFilter(e.target.value)}
            className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Cities</option>
            {TARGET_CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4 max-h-[440px] overflow-y-auto pr-1">
        {filteredResources.length === 0 ? (
          <div className="text-center py-10 bg-slate-950/20 rounded-xl border border-dashed border-white/5">
            <p className="text-xs text-slate-500">No support facilities found matching the filters.</p>
          </div>
        ) : (
          filteredResources.map((res) => (
            <div key={res.id} className="rounded-xl border border-white/5 bg-slate-950/45 p-4 space-y-3">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] bg-cyan-950 text-cyan-300 font-bold px-2 py-0.5 rounded-full border border-cyan-500/20 uppercase tracking-wider">
                      {res.type}
                    </span>
                    {res.verified && (
                      <span className="text-[9px] bg-emerald-950 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-wider flex items-center gap-0.5">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Verified
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white mt-1.5">{res.name}</h3>
                </div>
                {res.city && (
                  <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 shrink-0 bg-slate-900 border border-white/5 px-2 py-0.5 rounded-md">
                    <MapPin className="h-3 w-3 text-cyan-400" />
                    {res.city}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">{res.description}</p>

              {/* Strict eligibility requirements */}
              {res.strict_requirements && Array.isArray(res.strict_requirements) && res.strict_requirements.length > 0 && (
                <div className="bg-slate-900/30 border border-white/5 rounded-lg p-2.5 text-[10px] space-y-1">
                  <p className="text-slate-500 font-bold uppercase tracking-wider">Strict Eligibility Criteria</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {res.strict_requirements.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-white/5 gap-2 flex-wrap">
                <div className="text-[10px] font-mono text-rose-400 font-bold">
                  DEADLINE: {res.deadline || "Continuous Admission"}
                </div>
                <a
                  href={res.application_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 bg-cyan-950/20 border border-cyan-400/20 px-3 py-1 rounded"
                >
                  Apply Externally
                  <ArrowRight className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
