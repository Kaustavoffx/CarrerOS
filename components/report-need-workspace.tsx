"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, AlertCircle, CheckCircle2, TrendingUp, Heart, Home, Briefcase, GraduationCap, Apple, HelpCircle } from "lucide-react";
import { useCommunitySupport, TARGET_CITIES } from "./community-support-context";
import type { NeedCategory, NeedUrgency, CommunityNeedReport } from "@/lib/supabase/types";

const NEED_CATEGORIES: Array<{ value: NeedCategory; label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = [
  { value: "career_mentorship", label: "Career Mentorship", icon: TrendingUp,   color: "text-cyan-400   border-cyan-500/20   bg-cyan-950/20"   },
  { value: "mental_health",     label: "Mental Health",    icon: Heart,         color: "text-rose-400   border-rose-500/20   bg-rose-950/20"   },
  { value: "housing",           label: "Housing Support",  icon: Home,          color: "text-amber-400  border-amber-500/20  bg-amber-950/20"  },
  { value: "scholarship",       label: "Scholarship",      icon: GraduationCap, color: "text-indigo-400 border-indigo-500/20 bg-indigo-950/20" },
  { value: "internship",        label: "Internship",       icon: Briefcase,     color: "text-emerald-400 border-emerald-500/20 bg-emerald-950/20"},
  { value: "food",              label: "Food & Nutrition", icon: Apple,         color: "text-orange-400 border-orange-500/20 bg-orange-950/20" },
  { value: "other",             label: "Other Support",    icon: HelpCircle,    color: "text-slate-400  border-slate-500/20  bg-slate-900/40"  },
];

const URGENCY_OPTIONS: Array<{ value: NeedUrgency; label: string; color: string }> = [
  { value: "low",      label: "Low — general need",         color: "text-slate-400" },
  { value: "medium",   label: "Medium — moderate urgency",  color: "text-amber-400"  },
  { value: "high",     label: "High — needs help soon",     color: "text-orange-400" },
  { value: "critical", label: "Critical — emergency",       color: "text-rose-400"  },
];

const STATUS_BADGE: Record<string, string> = {
  open:        "bg-amber-950/20 text-amber-400 border-amber-500/20",
  in_progress: "bg-indigo-950/20 text-indigo-400 border-indigo-500/20",
  resolved:    "bg-emerald-950/20 text-emerald-400 border-emerald-500/20",
};

export function ReportNeedWorkspace() {
  const { profile } = useCommunitySupport();

  // Form state
  const [category, setCategory]     = useState<NeedCategory>("career_mentorship");
  const [urgency, setUrgency]       = useState<NeedUrgency>("medium");
  const [description, setDescription] = useState("");
  const [city, setCity]             = useState(TARGET_CITIES[0]);
  const [district, setDistrict]     = useState("");

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Live reports from DB
  const [recentReports, setRecentReports]   = useState<CommunityNeedReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const fetchRecentReports = useCallback(async () => {
    try {
      const res = await fetch("/api/community/needs?limit=15");
      if (res.ok) {
        const data = await res.json() as { recentReports: CommunityNeedReport[] };
        setRecentReports(data.recentReports ?? []);
      }
    } catch {
      // silent — no UI break
    } finally {
      setLoadingReports(false);
    }
  }, []);

  useEffect(() => { fetchRecentReports(); }, [fetchRecentReports]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/community/needs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, urgency, description, city, district, state: "", country: "India" }),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "Submission failed");
      }

      setSubmitted(true);
      setDescription("");
      setDistrict("");
      setTimeout(() => setSubmitted(false), 4000);

      // Refresh reports
      await fetchRecentReports();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit need report");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCatMeta = NEED_CATEGORIES.find((c) => c.value === category);

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/20 p-5 space-y-6">

      {/* ── Form Header ─────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-bold text-white">Report a Community Need</h3>
        <p className="text-[10px] text-slate-400 mt-0.5">
          Your report is stored securely and anonymously aggregates to improve community gap intelligence.
        </p>
      </div>

      {/* ── Category Selector ────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {NEED_CATEGORIES.map((cat) => {
          const Icon    = cat.icon;
          const active  = category === cat.value;
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-center transition-all text-[10px] font-semibold ${
                active
                  ? `${cat.color} ring-1 ring-inset ring-current/20`
                  : "border-white/5 bg-slate-950/30 text-slate-500 hover:border-white/10 hover:text-slate-300"
              }`}
            >
              <Icon className="h-4 w-4" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* ── Need Details Form ────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-slate-950/40 border border-white/5 rounded-xl">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
          Need Details — {selectedCatMeta?.label}
        </p>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={`Describe your ${selectedCatMeta?.label.toLowerCase()} need... (e.g. "I am a final-year student looking for a career mentor in software engineering")`}
          rows={3}
          className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-cyan-500 text-white placeholder-slate-600 resize-none"
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value as NeedUrgency)}
            className="px-3 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-cyan-500 text-slate-300"
          >
            {URGENCY_OPTIONS.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>

          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-cyan-500 text-slate-300"
          >
            {TARGET_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <input
            type="text"
            placeholder="District (optional)"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-cyan-500 text-white"
          />
        </div>

        {/* Success / Error */}
        {submitted && (
          <div className="flex items-center gap-2 p-2 bg-emerald-950/20 border border-emerald-500/20 rounded-lg text-[11px] text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Need report submitted. Community gap intelligence updated.
          </div>
        )}
        {submitError && (
          <div className="flex items-center gap-2 p-2 bg-rose-950/20 border border-rose-500/20 rounded-lg text-[11px] text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {submitError}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !description.trim()}
          className="w-full py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...</>
          ) : (
            <><Plus className="h-3.5 w-3.5" /> Submit Community Need Report</>
          )}
        </button>

        <p className="text-[9px] text-slate-600 text-center">
          Reported as: {profile?.full_name ?? "Anonymous"} · City: {city} · All data is aggregated anonymously.
        </p>
      </form>

      {/* ── Recent Community Reports Feed ────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
            Recent Community Need Reports
          </p>
          <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        </div>

        {loadingReports ? (
          <div className="flex items-center gap-2 text-[11px] text-slate-500 py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading community reports...
          </div>
        ) : recentReports.length === 0 ? (
          <div className="p-4 bg-slate-950/30 border border-white/5 rounded-xl text-[11px] text-slate-500 italic text-center">
            No reports yet. Be the first to surface a community need.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
            {recentReports.map((r) => {
              const catMeta = NEED_CATEGORIES.find((c) => c.value === r.category);
              const CatIcon = catMeta?.icon ?? HelpCircle;
              return (
                <div key={r.id} className="p-3 bg-slate-950/30 border border-white/5 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CatIcon className={`h-3.5 w-3.5 shrink-0 ${catMeta?.color.split(" ")[0] ?? "text-slate-400"}`} />
                      <span className="text-[10px] font-bold text-white capitalize">
                        {r.category.replace(/_/g, " ")}
                      </span>
                      {r.city && (
                        <span className="text-[9px] text-slate-500">· {r.city}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase ${STATUS_BADGE[r.status] ?? STATUS_BADGE.open}`}>
                        {r.status.replace(/_/g, " ")}
                      </span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                        r.urgency === "critical" ? "bg-rose-950/20 text-rose-400 border-rose-500/20"
                        : r.urgency === "high"   ? "bg-orange-950/20 text-orange-400 border-orange-500/20"
                        : "bg-slate-900 text-slate-500 border-white/5"
                      }`}>
                        {r.urgency}
                      </span>
                    </div>
                  </div>
                  {r.description && (
                    <p className="text-[11px] text-slate-400 leading-normal line-clamp-2">{r.description}</p>
                  )}
                  <p className="text-[9px] text-slate-600">
                    {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
