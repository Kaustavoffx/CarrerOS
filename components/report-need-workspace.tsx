"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, AlertCircle, CheckCircle2, TrendingUp, Heart, Home, Briefcase, GraduationCap, Apple, HelpCircle } from "lucide-react";
import { useCommunitySupport, TARGET_CITIES } from "./community-support-context";
import type { NeedCategory, NeedUrgency, CommunityNeedReport } from "@/lib/supabase/types";
import { CardSurface, Skeleton, EmptyState } from "@/components/ui";
import { buttonStyle, inputStyle, BADGES } from "@/styles/careeros-design-system";

const NEED_CATEGORIES: Array<{ value: NeedCategory; label: string; icon: React.ComponentType<{ className?: string }>; colorKey: keyof typeof BADGES.variants }> = [
  { value: "career_mentorship", label: "Career Mentorship", icon: TrendingUp,   colorKey: "cyan" },
  { value: "mental_health",     label: "Mental Health",    icon: Heart,         colorKey: "rose" },
  { value: "housing",           label: "Housing Support",  icon: Home,          colorKey: "amber" },
  { value: "scholarship",       label: "Scholarship",      icon: GraduationCap, colorKey: "indigo" },
  { value: "internship",        label: "Internship",       icon: Briefcase,     colorKey: "green" },
  { value: "food",              label: "Food & Nutrition", icon: Apple,         colorKey: "amber" },
  { value: "other",             label: "Other Support",    icon: HelpCircle,    colorKey: "slate" },
];

const URGENCY_OPTIONS: Array<{ value: NeedUrgency; label: string }> = [
  { value: "low",      label: "Low — general need" },
  { value: "medium",   label: "Medium — moderate urgency" },
  { value: "high",     label: "High — needs help soon" },
  { value: "critical", label: "Critical — emergency" },
];

const CATEGORY_TEXT_COLOR: Record<keyof typeof BADGES.variants, string> = {
  cyan: "text-[#67E8F9]",
  rose: "text-[#FCA5A5]",
  amber: "text-[#FCD34D]",
  indigo: "text-[#93C5FD]",
  green: "text-[#6EE7B7]",
  slate: "text-[#94A3B8]",
};

// ─── Design Input Wrappers ───────────────────────────────────────────────────

function DesignInput({ className = "", style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const state = isFocused ? "focus" : isHovered ? "hover" : "base";
  return (
    <input
      {...props}
      style={{ ...inputStyle(state), ...style }}
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

function DesignSelect({ className = "", style, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const state = isFocused ? "focus" : isHovered ? "hover" : "base";
  return (
    <select
      {...props}
      style={{ ...inputStyle(state), ...style }}
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

function DesignTextarea({ className = "", style, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const state = isFocused ? "focus" : isHovered ? "hover" : "base";
  return (
    <textarea
      {...props}
      style={{ ...inputStyle(state), ...style }}
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
    <CardSurface variant="surface" className="p-5 space-y-6" noPadding>
      <div className="p-5 space-y-6">
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
            const badgeStyle = BADGES.variants[cat.colorKey];
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                style={active ? {
                  background: badgeStyle.background,
                  borderColor: badgeStyle.borderColor,
                  color: badgeStyle.color,
                } : {
                  background: "rgba(4,8,16,0.30)",
                  borderColor: "rgba(255,255,255,0.05)",
                  color: "#94A3B8",
                }}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-center transition-all text-[10px] font-semibold hover:text-slate-300"
              >
                <Icon className="h-4 w-4" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* ── Need Details Form ────────────────────────────── */}
        <CardSurface variant="glass" className="p-4 space-y-3" noPadding>
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Need Details — {selectedCatMeta?.label}
            </p>

            <DesignTextarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`Describe your ${selectedCatMeta?.label.toLowerCase()} need... (e.g. "I am a final-year student looking for a career mentor in software engineering")`}
              rows={3}
              className="w-full text-xs text-white placeholder-slate-600 resize-none"
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <DesignSelect
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as NeedUrgency)}
                className="text-slate-300 text-xs"
              >
                {URGENCY_OPTIONS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </DesignSelect>

              <DesignSelect
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="text-slate-300 text-xs"
              >
                {TARGET_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </DesignSelect>

              <DesignInput
                type="text"
                placeholder="District (optional)"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="text-white text-xs"
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
              style={{
                ...buttonStyle("primary"),
                opacity: (submitting || !description.trim()) ? 0.4 : 1,
                cursor: (submitting || !description.trim()) ? "not-allowed" : "pointer",
              }}
              className="w-full flex items-center justify-center gap-2"
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
        </CardSurface>

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
            <Skeleton variant="list" className="py-2" />
          ) : recentReports.length === 0 ? (
            <EmptyState
              title="No Need Reports"
              description="Be the first to surface a community need or verify regional listings."
            />
          ) : (
            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {recentReports.map((r) => {
                const catMeta = NEED_CATEGORIES.find((c) => c.value === r.category);
                const CatIcon = catMeta?.icon ?? HelpCircle;

                // Status badge
                const statusStyle = r.status === "resolved" ? BADGES.variants.green
                  : r.status === "in_progress" ? BADGES.variants.indigo
                  : BADGES.variants.amber;

                // Urgency badge
                const urgencyStyle = r.urgency === "critical" ? BADGES.variants.rose
                  : r.urgency === "high" ? BADGES.variants.amber
                  : BADGES.variants.slate;

                return (
                  <CardSurface key={r.id} variant="glass" className="p-3 space-y-1.5" noPadding>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CatIcon className={`h-3.5 w-3.5 shrink-0 ${catMeta ? CATEGORY_TEXT_COLOR[catMeta.colorKey] : "text-slate-400"}`} />
                        <span className="text-[10px] font-bold text-white capitalize">
                          {r.category.replace(/_/g, " ")}
                        </span>
                        {r.city && (
                          <span className="text-[9px] text-slate-500">· {r.city}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span style={{ ...BADGES.base, ...statusStyle }}>
                          {r.status.replace(/_/g, " ")}
                        </span>
                        <span style={{ ...BADGES.base, ...urgencyStyle }}>
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
                  </CardSurface>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </CardSurface>
  );
}
