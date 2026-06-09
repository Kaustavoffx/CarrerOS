"use client";

import React, { useState, useEffect } from "react";
import {
  MapPin, Compass, Search, Award, BookOpen, Heart,
  AlertCircle, Users, CheckCircle2, Loader2, Sparkles,
  Brain, Copy, FileText, Check, ExternalLink, Sliders, ArrowRight, Clock, HelpCircle, ShieldAlert
} from "lucide-react";
import type { UserProfileRecord, WorkspaceSnapshotRecord } from "@/lib/supabase/types";
import { CommunityResource, AgentAction, SEEDED_RESOURCES } from "@/lib/community-db";

type CommunityIntelligenceProps = {
  profile: UserProfileRecord | null;
  workspace: WorkspaceSnapshotRecord | null;
};

type MatchReport = {
  resourceId: string;
  score: number;
  detectedNeed: string;
  whyMatch: string;
  urgency: "High" | "Medium" | "Low";
  eligibilityStatus: "Fully Eligible" | "Partially Eligible" | "Ineligible";
  missingRequirements: string[];
  actionPlan: string[];
};

// Category details
const CATEGORY_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  scholarship: { label: "Scholarship", color: "text-amber-400", bg: "bg-amber-950/20", border: "border-amber-500/10" },
  mentorship: { label: "Mentorship", color: "text-indigo-400", bg: "bg-indigo-950/20", border: "border-indigo-500/10" },
  internship: { label: "Internship", color: "text-cyan-400", bg: "bg-cyan-950/20", border: "border-cyan-500/10" },
  scheme: { label: "Govt Scheme", color: "text-emerald-400", bg: "bg-emerald-950/20", border: "border-emerald-500/10" },
  certification: { label: "Free Certification", color: "text-purple-400", bg: "bg-purple-950/20", border: "border-purple-500/10" },
  center: { label: "Learning Center", color: "text-rose-400", bg: "bg-rose-950/20", border: "border-rose-500/10" },
  ngo: { label: "NGO Opportunity", color: "text-pink-400", bg: "bg-pink-950/20", border: "border-pink-500/10" },
  job_fair: { label: "Job Fair", color: "text-orange-400", bg: "bg-orange-950/20", border: "border-orange-500/10" },
  event: { label: "Career Event", color: "text-blue-400", bg: "bg-blue-950/20", border: "border-blue-500/10" },
  wellness: { label: "Wellness Support", color: "text-red-400", bg: "bg-red-950/20", border: "border-red-500/10" },
  student_service: { label: "Student Service", color: "text-teal-400", bg: "bg-teal-950/20", border: "border-teal-500/10" }
};

export function CommunityIntelligence({ profile, workspace }: CommunityIntelligenceProps) {
  // Coordinates & Filter States
  const [lat, setLat] = useState<number>(12.9716); // default Bangalore
  const [lng, setLng] = useState<number>(77.5946);
  const [distance, setDistance] = useState<number>(25);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Resources state
  const [resources, setResources] = useState<CommunityResource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Profile AI Matching & Help Visibility report state
  const [aiMatches, setAiMatches] = useState<MatchReport[]>([]);
  const [matching, setMatching] = useState<boolean>(false);
  const [selectedReport, setSelectedReport] = useState<{ opportunity: CommunityResource; match: MatchReport } | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});

  // Agent Console States
  const [agentActive, setAgentActive] = useState<boolean>(false);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [agentOutput, setAgentOutput] = useState<any>(null);
  const [agentActionType, setAgentActionType] = useState<string>("");
  const [selectedResourceName, setSelectedResourceName] = useState<string>("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Location presets
  const presets = [
    { label: "Bangalore Hub", lat: 12.9716, lng: 77.5946 },
    { label: "New Delhi Center", lat: 28.6139, lng: 77.2090 },
    { label: "Mumbai Metro", lat: 19.0760, lng: 72.8777 },
    { label: "Kolkata East", lat: 22.5726, lng: 88.3639 }
  ];

  const handleShareLocation = () => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude);
          setLng(position.coords.longitude);
          showToast("Location updated successfully.");
        },
        (error) => {
          console.error("Location error:", error);
          showToast("Unable to acquire location. Using default preset.");
        }
      );
    } else {
      showToast("Geolocation is not supported by your browser.");
    }
  };

  // Fetch resources
  const fetchResources = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
        distance: distance.toString(),
        type: activeCategory,
        searchQuery: searchQuery
      });
      const response = await fetch(`/api/community/resources?${queryParams}`);
      if (!response.ok) throw new Error("API failed");
      const data = await response.json();
      setResources(data.resources || []);
    } catch (err) {
      console.error(err);
      showToast("Error retrieving community resources.");
    } finally {
      setLoading(false);
    }
  };

  // Run AI matching
  const runAiMatching = async () => {
    if (!profile) return;
    setMatching(true);
    try {
      const response = await fetch("/api/community/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile })
      });
      if (!response.ok) throw new Error("Match call failed");
      const data = await response.json();
      setAiMatches(data.matches || []);
      showToast("Visibility matches calibrated.");
    } catch (err) {
      console.error(err);
      showToast("AI Matching service unavailable. Calibrating offline rules.");
    } finally {
      setMatching(false);
    }
  };

  // Trigger detailed visibility report view
  const openVisibilityReport = (oppId: string) => {
    const opportunity = resources.find(r => r.id === oppId) || SEEDED_RESOURCES.find(r => r.id === oppId);
    if (!opportunity) return;

    // Check if match report exists
    let match = aiMatches.find(m => m.resourceId === oppId);

    // If not calculated, generate a local rule-based match report on the fly
    if (!match) {
      let score = 60;
      const reasons = [];
      const missing = [];
      let status: "Fully Eligible" | "Partially Eligible" | "Ineligible" = "Fully Eligible";

      const goal = (profile?.goal || "").toLowerCase();
      if (goal && opportunity.tags.some(t => goal.includes(t.toLowerCase()))) {
        score += 20;
        reasons.push("Aligns directly with your listed target goals.");
      }
      
      const budget = (profile?.budget || "").toLowerCase();
      if (budget.includes("free") && opportunity.description.toLowerCase().includes("free")) {
        score += 15;
        reasons.push("Compatible with your budget limits.");
      }

      if (opportunity.eligibility?.need_based) {
        status = "Partially Eligible";
        missing.push("Requires official need-based financial verification document proof.");
      }

      match = {
        resourceId: oppId,
        score: Math.min(98, score),
        detectedNeed: opportunity.type === "wellness" ? "Wellness Support" : "Development Assistance",
        whyMatch: reasons.length > 0 ? reasons.join(" ") : "Recommended support opportunity matching your experience background.",
        urgency: opportunity.deadline?.includes("2026") ? "High" : "Low",
        eligibilityStatus: status,
        missingRequirements: missing,
        actionPlan: opportunity.application_steps || [
          "Verify detailed registration constraints",
          "Assemble eligibility documents",
          "Submit application letter"
        ]
      };
    }

    setSelectedReport({ opportunity, match });
    document.getElementById("visibility-report-drawer")?.scrollIntoView({ behavior: "smooth" });
  };

  // Run Agent workflow
  const triggerAgentAction = async (resourceId: string, resourceName: string, actionType: "verify_eligibility" | "draft_sop_or_application") => {
    if (!profile) return;
    setAgentActive(true);
    setAgentLogs([]);
    setAgentOutput(null);
    setAgentActionType(actionType);
    setSelectedResourceName(resourceName);

    // Scroll to console immediately
    document.getElementById("agent-console-section")?.scrollIntoView({ behavior: "smooth" });

    try {
      const response = await fetch("/api/community/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType, resourceId, profile })
      });
      if (!response.ok) throw new Error("Agent trigger failed");
      const data = await response.json();

      const rawLogs = data.logs || [];
      for (let i = 0; i < rawLogs.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setAgentLogs(prev => [...prev, rawLogs[i]]);
      }

      setAgentOutput(data.payload);
      showToast("Agent execution completed.");
    } catch (err) {
      console.error(err);
      setAgentLogs(prev => [...prev, "[ERROR] Agent execution encountered a network issue."]);
      showToast("Agent failed to complete task.");
    } finally {
      setAgentActive(false);
    }
  };

  const toggleChecklistStep = (key: string) => {
    setCheckedSteps(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    fetchResources();
  }, [lat, lng, distance, activeCategory, searchQuery]);

  useEffect(() => {
    if (profile) {
      runAiMatching();
    }
  }, [profile]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast notifications */}
      <div
        className={`toast-base fixed bottom-6 right-6 z-50 rounded-xl border border-cyan-400/25 bg-[#0a0a0c] px-4 py-3 text-xs font-semibold text-cyan-200 shadow-[0_4px_16px_rgba(0,0,0,0.8)] ${toastMessage ? "toast-enter" : "toast-exit"}`}
        aria-live="polite"
      >
        {toastMessage}
      </div>

      {/* CSI Welcome Header Banner */}
      <section className="card-data rounded-[24px] p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.07),transparent_50%)] pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest bg-cyan-950/40 border border-cyan-400/20 px-2 py-0.5 rounded-full">
              Help Visibility Engine
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
              Community Support Intelligence (CSI)
            </h1>
            <p className="text-xs text-slate-400 max-w-xl">
              Answer &ldquo;What help exists around me right now?&rdquo; Filter support resources by proximity, analyze eligibility requirements, check urgency timelines, and draft step-by-step applications.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleShareLocation}
              className="tactile-btn border border-white/5 hover:border-cyan-400/20 px-4 py-2 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5"
            >
              <Compass className="h-4.5 w-4.5 text-cyan-300" />
              Use Current Location
            </button>
            <button
              onClick={runAiMatching}
              disabled={matching}
              className="tactile-btn tactile-btn-primary px-4 py-2 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 text-black"
            >
              <Brain className="h-4.5 w-4.5" />
              {matching ? "Calibrating..." : "Calibrate Matches"}
            </button>
          </div>
        </div>
      </section>

      {/* Geolocation Controls & Matching Panels */}
      <section className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Proximity Controller Panel */}
        <div className="card-data p-5 rounded-xl space-y-4 lg:col-span-1">
          <div className="flex items-center gap-1.5 border-b border-white/5 pb-2">
            <Sliders className="h-4 w-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Geolocation Bounds</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={lat}
                onChange={e => setLat(parseFloat(e.target.value) || 0)}
                className="carved-input w-full px-3 py-2 text-xs rounded-lg text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={lng}
                onChange={e => setLng(parseFloat(e.target.value) || 0)}
                className="carved-input w-full px-3 py-2 text-xs rounded-lg text-white"
              />
            </div>
          </div>

          {/* Distance Proximity Slider */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400">
              <span>Proximity Radius</span>
              <span className="text-cyan-400">{distance} km</span>
            </div>
            <input
              type="range"
              min="5"
              max="150"
              step="5"
              value={distance}
              onChange={e => setDistance(parseInt(e.target.value))}
              className="w-full accent-cyan-400 bg-slate-800 rounded-lg appearance-none h-1.5 cursor-pointer"
            />
            <span className="text-[9px] text-slate-500 block leading-normal">
              Answers the question: &ldquo;What help exists around me right now?&rdquo; within {distance} kilometers.
            </span>
          </div>

          {/* Presets */}
          <div className="pt-2 border-t border-white/5">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Location Presets</span>
            <div className="grid grid-cols-2 gap-1.5">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setLat(preset.lat);
                    setLng(preset.lng);
                    showToast(`Coordinates set to ${preset.label}`);
                  }}
                  className={`text-[10px] font-medium p-1.5 rounded-lg border text-left truncate transition duration-150 ${
                    Math.abs(lat - preset.lat) < 0.01 && Math.abs(lng - preset.lng) < 0.01
                      ? "border-cyan-400/30 bg-cyan-950/15 text-cyan-300"
                      : "border-white/5 bg-white/[0.01] text-slate-400 hover:bg-white/[0.03]"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* AI explainable matches results */}
        <div className="lg:col-span-3 space-y-6">
          <div className="card-purple p-5 rounded-xl">
            <div className="flex items-center justify-between border-b border-indigo-400/10 pb-2 mb-4">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Help Visibility Matches (AI Ranked & Decoded)</h3>
              </div>
              <span className="text-[9px] text-indigo-300 font-bold bg-indigo-950/50 border border-indigo-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Explainable System Active
              </span>
            </div>

            {matching ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
                <p className="text-xs text-slate-400 font-medium">Re-calculating custom matches against target goal: {profile?.goal}...</p>
              </div>
            ) : aiMatches.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-slate-500">No active profile matches computed. Click "Calibrate Matches" to evaluate.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {aiMatches.map((match) => {
                  const opportunity = SEEDED_RESOURCES.find(r => r.id === match.resourceId) || resources.find(r => r.id === match.resourceId);
                  if (!opportunity) return null;
                  return (
                    <div key={match.resourceId} className="border border-indigo-500/10 bg-indigo-950/[0.03] hover:border-indigo-400/20 p-4 rounded-xl transition flex flex-col justify-between group">
                      <div>
                        {/* Header Badges */}
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <span className="text-[9px] text-indigo-300 font-bold bg-indigo-950/45 px-2 py-0.5 rounded border border-indigo-500/10 uppercase tracking-wider truncate max-w-[150px]">
                            {match.detectedNeed}
                          </span>
                          <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-extrabold px-1.5 py-0.5 rounded shrink-0">
                            {match.score}% Confidence
                          </span>
                        </div>

                        {/* Name and Match Description */}
                        <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition line-clamp-1">
                          {opportunity.name}
                        </h4>
                        
                        {/* Explainable Reasoning Block */}
                        <p className="text-[10px] text-slate-300 mt-2 leading-relaxed italic bg-white/[0.01] border border-white/5 p-2 rounded-lg">
                          <strong>Why Match:</strong> {match.whyMatch}
                        </p>

                        {/* Urgency and Eligibility status check */}
                        <div className="flex flex-wrap items-center gap-2 mt-3 text-[9px]">
                          <span className={`px-1.5 py-0.5 rounded font-bold uppercase inline-flex items-center gap-0.5 ${
                            match.urgency === "High" ? "bg-red-950/20 text-red-400 border border-red-500/10" : "bg-slate-800 text-slate-400"
                          }`}>
                            <Clock className="h-3 w-3" />
                            {match.urgency} Urgency
                          </span>
                          <span className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                            match.eligibilityStatus === "Fully Eligible" ? "bg-emerald-950/20 text-emerald-400 border border-emerald-500/10" : "bg-amber-950/20 text-amber-400 border border-amber-500/10"
                          }`}>
                            {match.eligibilityStatus}
                          </span>
                        </div>
                      </div>

                      {/* View intelligence details */}
                      <div className="mt-4 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] font-bold">
                        <span className="text-slate-500 uppercase tracking-widest text-[8px]">{opportunity.type}</span>
                        <button
                          onClick={() => openVisibilityReport(opportunity.id)}
                          className="text-cyan-400 hover:underline inline-flex items-center gap-0.5 hover:scale-[1.02] transition"
                        >
                          View Visibility Report
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Selected Opportunity Visibility Intelligence Report (Drawer Layout) */}
      {selectedReport && (
        <section id="visibility-report-drawer" className="scroll-mt-6 border border-cyan-400/20 bg-[#09090b]/90 backdrop-blur-md rounded-2xl p-6 space-y-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.03),transparent_50%)] pointer-events-none" />
          
          {/* Header Close info */}
          <div className="flex justify-between items-start gap-4 relative z-10">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase text-slate-500">
                <span className="text-cyan-400">Visibility Intelligence Report</span>
                <span>&bull;</span>
                <span>Resource ID: {selectedReport.opportunity.id}</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1 leading-snug">{selectedReport.opportunity.name}</h2>
              <p className="text-xs text-slate-400 leading-normal mt-0.5">{selectedReport.opportunity.description}</p>
            </div>
            
            <button
              onClick={() => setSelectedReport(null)}
              className="text-slate-500 hover:text-white border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] px-2.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0"
            >
              Close Report
            </button>
          </div>

          {/* 10 Visibility parameters grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
            
            {/* Left Col (Matches metrics - 4 cols) */}
            <div className="lg:col-span-4 space-y-4 bg-white/[0.01] border border-white/5 p-4 rounded-xl">
              
              {/* Confidence score */}
              <div>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">1. Confidence Score</span>
                <div className="flex items-center gap-3 mt-2">
                  <div className="h-12 w-12 rounded-full border-3 border-cyan-400/20 flex items-center justify-center text-cyan-300 font-extrabold text-sm relative">
                    {selectedReport.match.score}%
                  </div>
                  <div>
                    <span className="text-xs text-white font-bold block">Excellent Match Calibration</span>
                    <span className="text-[9px] text-slate-400 block">Calibrated on profile goal: {profile?.goal}</span>
                  </div>
                </div>
              </div>

              {/* Detected Need */}
              <div>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">2. Detected User Need</span>
                <span className="text-xs font-bold text-indigo-300 bg-indigo-950/20 border border-indigo-500/10 px-2.5 py-1 rounded-lg block mt-1.5 text-center">
                  {selectedReport.match.detectedNeed}
                </span>
              </div>

              {/* Urgency timeline */}
              <div>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">3. Deadlines & Urgency</span>
                <div className="flex items-center gap-2.5 mt-2 bg-red-950/10 border border-red-500/10 p-2.5 rounded-lg">
                  <Clock className={`h-4 w-4 text-red-400 ${selectedReport.match.urgency === "High" ? "animate-pulse" : ""}`} />
                  <div>
                    <span className="text-xs font-bold text-white block">Deadline: {selectedReport.opportunity.deadline || "None"}</span>
                    <span className="text-[9px] text-slate-400 block">Urgency Priority: {selectedReport.match.urgency}</span>
                  </div>
                </div>
              </div>

              {/* Proximity / Distance */}
              <div>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">4. Proximity Mapping</span>
                <span className="text-xs font-bold text-white mt-1 block inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-cyan-300" />
                  {selectedReport.opportunity.distance_km === 0 || selectedReport.opportunity.distance_km === undefined 
                    ? "Online Access / Global Coverage" 
                    : `${selectedReport.opportunity.distance_km} kilometers from center`}
                </span>
              </div>
            </div>

            {/* Middle Col (Why it matches & Eligibility status - 4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              
              {/* Explainable Match explanation */}
              <div className="border border-indigo-500/15 bg-indigo-950/10 p-4 rounded-xl">
                <div className="flex items-center gap-1 mb-2">
                  <Brain className="h-4.5 w-4.5 text-indigo-400" />
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">5. Explainable Recommendation</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {selectedReport.match.whyMatch}
                </p>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-2.5 block border-t border-white/5 pt-1.5">
                  Recommendation matches your obstacle profile.
                </span>
              </div>

              {/* Eligibility Check list */}
              <div className="border border-white/5 bg-white/[0.01] p-4 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">6. Eligibility Criteria Checklist</span>
                  <span className="text-[9px] text-emerald-400 font-bold">{selectedReport.match.eligibilityStatus}</span>
                </div>

                <div className="space-y-1.5">
                  {selectedReport.opportunity.strict_requirements?.map((req, i) => (
                    <div key={i} className="flex gap-1.5 items-start text-[10px] text-slate-300">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{req}</span>
                    </div>
                  ))}
                  {(!selectedReport.opportunity.strict_requirements || selectedReport.opportunity.strict_requirements.length === 0) && (
                    <p className="text-[10px] text-slate-500 italic">No restrictive criteria listed.</p>
                  )}
                </div>
              </div>

              {/* Missing Requirements checks */}
              <div className="border border-white/5 bg-white/[0.01] p-4 rounded-xl space-y-2">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block border-b border-white/5 pb-1">7. Identified Discrepancies / Gaps</span>
                
                {selectedReport.match.missingRequirements && selectedReport.match.missingRequirements.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedReport.match.missingRequirements.map((mis, i) => (
                      <div key={i} className="flex gap-1.5 items-start text-[10px] text-rose-300 bg-rose-950/10 border border-rose-500/10 p-2 rounded-lg">
                        <ShieldAlert className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <span>{mis}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-1.5 items-center text-[10px] text-emerald-400 bg-emerald-950/10 border border-emerald-500/10 p-2 rounded-lg">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>Profile satisfies all initial criteria constraints!</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Col (Interactive Application Action Plan - 4 cols) */}
            <div className="lg:col-span-4 border border-white/5 bg-white/[0.01] p-4 rounded-xl flex flex-col justify-between">
              <div className="space-y-3.5">
                <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">8. Application Action Plan</span>
                  <span className="text-[9px] text-cyan-400 font-bold">Checkable Checklist</span>
                </div>

                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {selectedReport.match.actionPlan.map((step, idx) => {
                    const stepKey = `${selectedReport.opportunity.id}::step::${idx}`;
                    const checked = checkedSteps[stepKey] ?? false;
                    return (
                      <button
                        key={idx}
                        onClick={() => toggleChecklistStep(stepKey)}
                        className={`w-full flex items-start gap-2 p-2 rounded-lg border text-left text-[11px] transition ${
                          checked
                            ? "border-cyan-500/10 bg-cyan-950/5 text-slate-500"
                            : "border-white/5 bg-white/[0.01] text-slate-300 hover:bg-white/[0.02] hover:border-white/10"
                        }`}
                      >
                        <span className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition ${
                          checked ? "border-cyan-400 bg-cyan-400 text-black" : "border-slate-700"
                        }`}>
                          {checked && <Check className="h-2 w-2 stroke-[3]" />}
                        </span>
                        <span className={checked ? "line-through opacity-60" : ""}>{step}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Progress counter & Agent shortcuts */}
              <div className="pt-4 border-t border-white/5 space-y-2 mt-4">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold mb-1">
                  <span>Action Plan Progress</span>
                  <span className="text-cyan-400">
                    {selectedReport.match.actionPlan.filter((_, i) => checkedSteps[`${selectedReport.opportunity.id}::step::${i}`]).length} / {selectedReport.match.actionPlan.length} completed
                  </span>
                </div>
                <div className="h-1 w-full bg-white/[0.02] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-300"
                    style={{
                      width: `${(selectedReport.match.actionPlan.filter((_, i) => checkedSteps[`${selectedReport.opportunity.id}::step::${i}`]).length / selectedReport.match.actionPlan.length) * 100}%`
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2.5">
                  <button
                    onClick={() => triggerAgentAction(selectedReport.opportunity.id, selectedReport.opportunity.name, "verify_eligibility")}
                    className="tactile-btn border border-[#202028] bg-white/[0.02] hover:bg-white/[0.04] py-2 rounded-xl text-[10px] font-bold text-white text-center"
                  >
                    Verify Eligibility
                  </button>
                  <button
                    onClick={() => triggerAgentAction(selectedReport.opportunity.id, selectedReport.opportunity.name, "draft_sop_or_application")}
                    className="tactile-btn border border-[#202028] bg-white/[0.02] hover:bg-white/[0.04] py-2 rounded-xl text-[10px] font-bold text-white text-center"
                  >
                    Draft Application SOP
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Directory Grid Proximity List */}
      <section className="space-y-4">
        
        {/* Support Categories Navigation Filter */}
        <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-2">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-cyan-400 animate-pulse" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Help Opportunities Proximity Directory</h2>
          </div>
          <span className="text-[11px] text-slate-500 font-semibold">{resources.length} support opportunities found</span>
        </div>

        {/* Filter bar scroll */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveCategory("all")}
            className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition ${
              activeCategory === "all"
                ? "border-cyan-400/30 bg-cyan-950/20 text-cyan-300"
                : "border-white/5 bg-white/[0.01] text-slate-400 hover:bg-white/[0.03]"
            }`}
          >
            All Support
          </button>
          {Object.keys(CATEGORY_MAP).map((catKey) => {
            const cat = CATEGORY_MAP[catKey];
            return (
              <button
                key={catKey}
                onClick={() => setActiveCategory(catKey)}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition ${
                  activeCategory === catKey
                    ? `border-cyan-400/30 bg-cyan-950/20 ${cat.color}`
                    : "border-white/5 bg-white/[0.01] text-slate-400 hover:bg-white/[0.03]"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search input field */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search resources by name, tags, or description keywords..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="carved-input w-full pl-9 pr-4 py-2 text-xs rounded-xl"
          />
        </div>

        {/* Proximity opportunities list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest animate-pulse">Running proximity search queries...</p>
          </div>
        ) : resources.length === 0 ? (
          <div className="card-data p-12 text-center rounded-xl border border-dashed border-white/5 bg-white/[0.01]">
            <Compass className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-400">No support opportunities in bounds</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No matching resources were found within {distance} km of coordinates ({lat.toFixed(4)}, {lng.toFixed(4)}). Try expanding the search radius slider.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((item) => {
              const meta = CATEGORY_MAP[item.type] || { label: "Support", color: "text-slate-400", bg: "bg-slate-950/20", border: "border-slate-500/10" };
              return (
                <div key={item.id} className="card-data p-5 rounded-xl flex flex-col justify-between relative overflow-hidden group">
                  <div className="space-y-3">
                    {/* Header badge & Distance */}
                    <div className="flex justify-between items-center gap-2">
                      <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded border ${meta.bg} ${meta.border} ${meta.color}`}>
                        {meta.label}
                      </span>
                      <span className="text-[10px] text-cyan-300 font-semibold inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {item.distance_km === 0 || item.distance_km === undefined ? "Online/Global" : `${item.distance_km} km`}
                      </span>
                    </div>

                    {/* Opportunity title & details */}
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-white leading-snug group-hover:text-cyan-300 transition duration-150">
                        {item.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 leading-relaxed mt-1 line-clamp-3">
                        {item.description}
                      </p>
                    </div>

                    {/* Deadline block short */}
                    {item.deadline && (
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-white/[0.01] border border-white/5 px-2 py-1 rounded-md w-fit">
                        <Clock className="h-3 w-3 text-slate-500" />
                        <span>Deadline: {item.deadline}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Grid */}
                  <div className="mt-5 pt-3.5 border-t border-white/5 space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {item.tags.slice(0, 3).map(t => (
                        <span key={t} className="text-[8px] font-bold text-slate-500 bg-white/[0.02] border border-white/5 px-1.5 py-0.5 rounded">
                          #{t}
                        </span>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1.5">
                      <button
                        onClick={() => openVisibilityReport(item.id)}
                        className="tactile-btn border border-white/5 hover:border-cyan-400/20 py-1.5 rounded-lg text-[10px] font-bold text-slate-300 hover:text-white text-center"
                      >
                        Visibility Report
                      </button>
                      <button
                        onClick={() => triggerAgentAction(item.id, item.name, "draft_sop_or_application")}
                        className="tactile-btn border border-white/5 hover:border-cyan-400/20 py-1.5 rounded-lg text-[10px] font-bold text-slate-300 hover:text-white text-center"
                      >
                        Draft SOP
                      </button>
                    </div>

                    <a
                      href={item.application_link}
                      target="_blank"
                      rel="noreferrer"
                      className="tactile-btn tactile-btn-primary py-1.5 rounded-lg text-[10px] font-bold text-black flex items-center justify-center gap-1"
                    >
                      Apply Directly
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* AI Agent Console Section */}
      <section id="agent-console-section" className="scroll-mt-6 space-y-4">
        <div className="flex items-center gap-2">
          <Compass className={`h-4 w-4 text-cyan-400 ${agentActive ? "animate-spin" : ""}`} />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">AI Agent Execution Console</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Agent Action Running CLI logs */}
          <div className="lg:col-span-1 border border-white/5 bg-black/60 p-4 rounded-xl flex flex-col justify-between h-[360px]">
            <div>
              <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2 text-[10px] uppercase font-bold text-slate-400">
                <span>Terminal Session Log</span>
                {agentActive && (
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                    Executing...
                  </span>
                )}
              </div>

              <div className="space-y-1.5 font-mono text-[9px] text-emerald-400/90 overflow-y-auto max-h-[280px] leading-relaxed">
                {agentLogs.map((log, index) => (
                  <div key={index}>{log}</div>
                ))}
                {agentLogs.length === 0 && (
                  <p className="text-slate-500 italic">Initiate verification checks or drafts in cards to trigger logs...</p>
                )}
              </div>
            </div>

            <div className="text-[8px] font-mono text-slate-500 border-t border-white/5 pt-2">
              CareerOS Agent Engine v1.0.0 &bull; Local sync: ACTIVE
            </div>
          </div>

          {/* Action Results Workspace (2/3 width) */}
          <div className="lg:col-span-2 card-data p-5 rounded-xl h-[360px] flex flex-col justify-between">
            <div className="h-full overflow-y-auto">
              <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                  Workspace output: {selectedResourceName || "Empty"}
                </span>
                {agentActionType && (
                  <span className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded font-bold uppercase">
                    {agentActionType.replace(/_/g, " ")}
                  </span>
                )}
              </div>

              {!agentOutput && !agentActive && (
                <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500 space-y-2">
                  <FileText className="h-10 w-10 text-slate-700" />
                  <p className="text-xs">Select "Verify Rules" or "Draft SOP" in directory cards to evaluate qualifications.</p>
                </div>
              )}

              {agentActive && !agentOutput && (
                <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 space-y-3">
                  <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
                  <p className="text-xs font-semibold uppercase tracking-wider animate-pulse">Running comparative evaluation loops...</p>
                </div>
              )}

              {agentOutput && (
                <div className="space-y-4">
                  {/* Eligibility Verify Panel */}
                  {agentActionType === "verify_eligibility" && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${agentOutput.eligible ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                          {agentOutput.eligible ? <CheckCircle2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">Eligibility Check Completed</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">Matching accuracy index: {agentOutput.matchPercentage}%</p>
                        </div>
                      </div>

                      <div className="bg-white/[0.01] border border-white/5 p-3 rounded-lg">
                        <p className="text-xs text-slate-300 leading-relaxed font-medium">
                          {agentOutput.notes}
                        </p>
                      </div>

                      {agentOutput.mismatches && agentOutput.mismatches.length > 0 && (
                        <div>
                          <span className="text-[9px] text-rose-400 font-bold uppercase tracking-wider block mb-1">Identified Discrepancies</span>
                          <ul className="space-y-1 text-[10px] text-rose-300 bg-rose-950/10 border border-rose-500/10 p-2.5 rounded-lg list-disc list-inside">
                            {agentOutput.mismatches.map((m: string, i: number) => (
                              <li key={i}>{m}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SOP Draft workspace document */}
                  {agentActionType === "draft_sop_or_application" && agentOutput.document && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Generated Application Letter / SOP</span>
                        <button
                          onClick={() => copyToClipboard(agentOutput.document, "sop-doc")}
                          className="text-cyan-400 hover:text-cyan-300 text-[10px] font-bold inline-flex items-center gap-1 bg-cyan-950/20 border border-cyan-400/20 px-2 py-1 rounded"
                        >
                          {copiedId === "sop-doc" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          Copy Draft
                        </button>
                      </div>

                      <pre className="p-3 bg-black/40 border border-white/5 rounded-lg text-[10px] font-mono text-slate-300 whitespace-pre-wrap max-h-[220px] overflow-y-auto leading-relaxed">
                        {agentOutput.document}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-white/5 pt-2 text-right">
              {agentOutput && agentActionType === "verify_eligibility" && (
                <button
                  onClick={() => triggerAgentAction(resources.find(r => r.name === selectedResourceName)?.id || "", selectedResourceName, "draft_sop_or_application")}
                  className="tactile-btn tactile-btn-primary px-3 py-1.5 rounded-lg text-[10px] font-bold text-black"
                >
                  Proceed to SOP Draft &rarr;
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
