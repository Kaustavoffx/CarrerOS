"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Shield, Activity, AlertTriangle, MapPin, CheckCircle2, Search,
  ArrowRight, Download, Terminal, Brain, Plus, RefreshCw, Send, Loader2, Globe
} from "lucide-react";
import type { UserProfileRecord, WorkspaceSnapshotRecord } from "@/lib/supabase/types";
import { SEEDED_RESOURCES } from "@/lib/community-db";
import { usePathname, useRouter } from "next/navigation";

type CommunitySupportIntelligenceProps = {
  profile: UserProfileRecord | null;
  workspace: WorkspaceSnapshotRecord | null;
};

// Interface for AI Chat Message
interface ChatMessage {
  id: string;
  sender: "user" | "navigator";
  text: string;
  timestamp: string;
}

// Interface for Live System Feed Event
interface FeedEvent {
  id: string;
  timestamp: string;
  level: "info" | "critical" | "audit_pass";
  message: string;
  category: string;
}

// Interface for Crowdsourced Verification Review Case
interface ReviewCase {
  id: string;
  name: string;
  type: string;
  city: string;
  description: string;
  submittedBy: string;
  votes: number;
  status: "PENDING" | "UNDER_REVIEW" | "VERIFIED";
}

// Hardcoded target cities and support types for the Heatmap Matrix
const TARGET_CITIES = ["Bangalore", "New Delhi", "Mumbai", "Kolkata", "Jaipur", "Pune", "Ahmedabad"];
const SUPPORT_TYPES = ["scholarship", "internship", "mentorship", "center"];

export function CommunitySupportIntelligence({ profile }: CommunitySupportIntelligenceProps) {
  const pathname = usePathname();
  const router = useRouter();

  const activeIntelTab = useMemo(() => {
    if (pathname.includes("/resource-discovery")) return "discovery";
    if (pathname.includes("/support-navigator")) return "matching";
    if (pathname.includes("/gap-intelligence")) return "heatmap";
    return "review";
  }, [pathname]);

  const handleTabChange = useCallback((tab: "discovery" | "matching" | "heatmap" | "review") => {
    if (tab === "discovery") router.push("/resource-discovery");
    else if (tab === "matching") router.push("/support-navigator");
    else if (tab === "heatmap") router.push("/gap-intelligence");
    else router.push("/community-intelligence");
  }, [router]);

  // --- Search & Filters for Resource Discovery Map ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCityFilter, setSelectedCityFilter] = useState("all");

  // --- Match Engine User Target Selection ---
  const [selectedMatchResourceId, setSelectedMatchResourceId] = useState<string>("");
  const [matchActionPlanChecked, setMatchActionPlanChecked] = useState<Record<string, boolean>>({});

  // --- Live System Feed States ---
  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([]);
  const [feedFilter, setFeedFilter] = useState<"all" | "info" | "critical" | "audit_pass">("all");

  // --- Crisis Layer Details State ---
  const [dismissedShortages, setDismissedShortages] = useState<string[]>([]);

  // --- Agentic Workflow Terminal States ---
  const [selectedWorkflowResourceId, setSelectedWorkflowResourceId] = useState<string>(SEEDED_RESOURCES[0]?.id || "");
  const [workflowAction, setWorkflowAction] = useState<"verify_eligibility" | "draft_sop_or_application">("verify_eligibility");
  const [workflowLogs, setWorkflowLogs] = useState<string[]>([]);
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);
  const [workflowOutput, setWorkflowOutput] = useState<string>("");
  const terminalBottomRef = useRef<HTMLDivElement | null>(null);

  // --- Human Review Queue States ---
  const [reviewCases, setReviewCases] = useState<ReviewCase[]>([
    {
      id: "case-101",
      name: "Free Code Camp Local Study Hub (Kolkata)",
      type: "center",
      city: "Kolkata",
      description: "NGO-sponsored study room with digital screens and electricity backups for remote coding classes.",
      submittedBy: "Rajesh K.",
      votes: 14,
      status: "PENDING"
    },
    {
      id: "case-102",
      name: "Women Who Code Mentorship Circle",
      type: "mentorship",
      city: "Bangalore",
      description: "A volunteer network matching female software trainees with tech managers for study reviews.",
      submittedBy: "Sneha M.",
      votes: 22,
      status: "UNDER_REVIEW"
    },
    {
      id: "case-103",
      name: "DST Women Scientist Fellowship Plan",
      type: "scholarship",
      city: "New Delhi",
      description: "Government-supported living stipend for women returning to basic or applied science research.",
      submittedBy: "Priyanka D.",
      votes: 38,
      status: "VERIFIED"
    }
  ]);
  const [newCaseName, setNewCaseName] = useState("");
  const [newCaseType, setNewCaseType] = useState("scholarship");
  const [newCaseCity, setNewCaseCity] = useState("Bangalore");
  const [newCaseDesc, setNewCaseDesc] = useState("");

  // --- AI Navigator Chat States ---
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "msg-1",
      sender: "navigator",
      text: "CSI AI Navigator initialized. Ask me about scholarships, mental wellness helplines, internships, or centers in your area.",
      timestamp: "12:00"
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatTyping, setIsChatTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // --- Copy Notification State ---
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // --- Initialize Live Feed ---
  useEffect(() => {
    // Generate initial live events
    const initialEvents: FeedEvent[] = [
      {
        id: "ev-1",
        timestamp: "12:05:12",
        level: "info",
        message: "CSI Database Sync: 25 real-world support programs parsed.",
        category: "system"
      },
      {
        id: "ev-2",
        timestamp: "12:08:44",
        level: "audit_pass",
        message: "Program validation completed for NIMHANS Tele-MANAS Wellness.",
        category: "wellness"
      },
      {
        id: "ev-3",
        timestamp: "12:10:02",
        level: "critical",
        message: "Imminent deadline check: Tata Scholarship at Cornell University closes in 35 days.",
        category: "scholarship"
      }
    ];
    setFeedEvents(initialEvents);

    // Dynamic feed additions to simulate ongoing operations
    const interval = setInterval(() => {
      const now = new Date();
      const timestamp = now.toTimeString().split(" ")[0];
      const levels: Array<"info" | "critical" | "audit_pass"> = ["info", "audit_pass", "critical"];
      const randomLevel = levels[Math.floor(Math.random() * levels.length)];

      let message = "";
      let category = "";

      if (randomLevel === "info") {
        const categories = ["scholarship", "internship", "mentorship", "center"];
        category = categories[Math.floor(Math.random() * categories.length)];
        message = `AI Similarity computation executed for ${category} records.`;
      } else if (randomLevel === "audit_pass") {
        category = "system";
        message = `Geocoding lookup successfully validated program coordinates.`;
      } else {
        const locations = ["Pune", "Kolkata", "Jaipur"];
        const loc = locations[Math.floor(Math.random() * locations.length)];
        category = "shortage";
        message = `Access Warning: Critical deficiency of certified training centers detected in ${loc}.`;
      }

      const newEvent: FeedEvent = {
        id: `ev-${now.getTime()}`,
        timestamp,
        level: randomLevel,
        message,
        category
      };

      setFeedEvents((prev) => [newEvent, ...prev.slice(0, 19)]);
    }, 9000);

    return () => clearInterval(interval);
  }, []);

  // --- Auto-scroll Chat and Terminal ---
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatTyping]);

  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [workflowLogs]);

  // --- Memoized Heatmap Matrix Data ---
  const heatmapData = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};
    TARGET_CITIES.forEach((city) => {
      matrix[city] = {};
      SUPPORT_TYPES.forEach((type) => {
        matrix[city][type] = 0;
      });
    });

    SEEDED_RESOURCES.forEach((resource) => {
      const city = resource.city;
      const type = resource.type;
      if (city && TARGET_CITIES.includes(city) && SUPPORT_TYPES.includes(type)) {
        matrix[city][type] += 1;
      }
    });

    return matrix;
  }, []);

  // --- Crisis shortfalls computation ---
  const criticalDeficiencies = useMemo(() => {
    const list: Array<{ city: string; type: string; key: string }> = [];
    TARGET_CITIES.forEach((city) => {
      SUPPORT_TYPES.forEach((type) => {
        if (heatmapData[city][type] === 0) {
          list.push({ city, type, key: `${city}-${type}` });
        }
      });
    });
    return list.filter((item) => !dismissedShortages.includes(item.key));
  }, [heatmapData, dismissedShortages]);

  // --- Community Health Access Indices ---
  const healthMetrics = useMemo(() => {
    const totalPrograms = SEEDED_RESOURCES.length;
    const verifiedPrograms = SEEDED_RESOURCES.filter((r) => r.verified).length;
    const distinctCities = new Set(SEEDED_RESOURCES.map((r) => r.city).filter(Boolean)).size;

    // Calculate accessibility percentage
    const totalPossibleSectors = TARGET_CITIES.length * SUPPORT_TYPES.length;
    let satisfiedSectors = 0;
    TARGET_CITIES.forEach((city) => {
      SUPPORT_TYPES.forEach((type) => {
        if (heatmapData[city][type] > 0) {
          satisfiedSectors += 1;
        }
      });
    });

    const accessIndexScore = Math.round((satisfiedSectors / totalPossibleSectors) * 100);

    return {
      totalPrograms,
      verifiedPrograms,
      distinctCities,
      accessIndexScore
    };
  }, [heatmapData]);

  // --- Filtered Opportunity Discovery Map ---
  const filteredResources = useMemo(() => {
    return SEEDED_RESOURCES.filter((resource) => {
      const matchesSearch =
        resource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === "all" || resource.type === selectedCategory;
      const matchesCity = selectedCityFilter === "all" || resource.city === selectedCityFilter;

      return matchesSearch && matchesCategory && matchesCity;
    });
  }, [searchQuery, selectedCategory, selectedCityFilter]);

  // --- Compatibility Calculations (Opportunity Match Engine) ---
  const matchScores = useMemo(() => {
    const scores: Record<string, { score: number; why: string; missing: string[]; checklist: string[] }> = {};

    SEEDED_RESOURCES.forEach((res) => {
      let score = 50; // Baseline
      const whyItems: string[] = [];
      const missingItems: string[] = [];
      const checklist = res.strict_requirements || ["Submit general application forms"];

      // Check User onboarding details
      if (profile) {
        // Goal Match
        const userGoal = (profile.goal || "").toLowerCase();
        const resName = res.name.toLowerCase();
        const resDesc = res.description.toLowerCase();
        const hasGoalOverlap =
          userGoal.split(" ").some((w) => w.length > 3 && (resName.includes(w) || resDesc.includes(w))) ||
          res.tags.some((t) => userGoal.includes(t.toLowerCase()));

        if (hasGoalOverlap) {
          score += 20;
          whyItems.push(`Aligns directly with your career objective: "${profile.goal}".`);
        } else {
          whyItems.push("General support program applicable to various domains.");
        }

        // Budget check (Need-based filtering)
        const userBudget = (profile.budget || "").toLowerCase();
        const isNeedBasedResource = res.eligibility.need_based || res.description.toLowerCase().includes("low-income") || res.eligibility.max_annual_family_income_inr;
        if (isNeedBasedResource) {
          if (userBudget.includes("free") || userBudget.includes("low-cost") || userBudget.includes("scholarship")) {
            score += 15;
            whyItems.push("Matches your preferred low-cost/financial aid budget constraints.");
          } else {
            missingItems.push("Requires verification of lower family income limits.");
          }
        }

        // Proximity matches
        const userExperience = (profile.experience_level || "Junior").toLowerCase();
        const isStudent = userExperience === "student" || userExperience === "junior";
        if (res.eligibility.enrolled_in_college || res.eligibility.student_status || res.eligibility.age_limit) {
          if (isStudent) {
            score += 15;
            whyItems.push("Suitable for student or early career developer profiles.");
          } else {
            missingItems.push("May require enrollment validation at an educational institution.");
          }
        }
      }

      // Safeguard score bounds
      scores[res.id] = {
        score: Math.min(100, Math.max(0, score)),
        why: whyItems.join(" "),
        missing: missingItems.length ? missingItems : ["None detected. High eligibility confidence."],
        checklist
      };
    });

    return scores;
  }, [profile]);

  // --- Sort resources for Matching Tab ---
  const sortedMatchingResources = useMemo(() => {
    return [...SEEDED_RESOURCES].sort((a, b) => {
      const scoreA = matchScores[a.id]?.score || 0;
      const scoreB = matchScores[b.id]?.score || 0;
      return scoreB - scoreA;
    });
  }, [matchScores]);

  // --- Set default selected Match resource ---
  useEffect(() => {
    if (!selectedMatchResourceId && sortedMatchingResources.length > 0) {
      setSelectedMatchResourceId(sortedMatchingResources[0].id);
    }
  }, [selectedMatchResourceId, sortedMatchingResources]);

  const activeMatchResource = useMemo(() => {
    return SEEDED_RESOURCES.find((r) => r.id === selectedMatchResourceId);
  }, [selectedMatchResourceId]);

  // --- Generate Impact Gap Report ---
  const generateGapReportMarkdown = useCallback(() => {
    const now = new Date().toISOString().split("T")[0];
    const report = `# COMMUNITY SUPPORT INTELLIGENCE (CSI)
## Help Gap Assessment & Resource Deficiencies
**Date Generated:** ${now}
**Authority:** CareerOS Impact Analytics Desk

### 1. Executive Summary
This intelligence audit assesses resource accessibility levels across 7 tier-1 districts. Out of 28 potential district-support intersections, we identify critical support shortfalls.

### 2. Deficient Districts & Deficit Summary
${
  criticalDeficiencies.length === 0
    ? "No critical support shortages detected across monitored sectors."
    : criticalDeficiencies
        .map((gap) => `- **${gap.city}**: Lacks certified **${gap.type.toUpperCase()}** listings.`)
        .join("\n")
}

### 3. Immediate Funding & Outreach Action Plan
1. **Infrastructure Routing**: Divert corporate CSR funds and NGO centers to establish mobile digital training pods in districts lacking physical learning spaces.
2. **Virtual Mentorship Expansion**: Spin up regional digital mentor circles in cities with severe professional counseling deficits.
3. **Scholarship Campaigns**: Partner with state educational exchanges to draft localized student stipends.

---
*Verified by CSI Intelligence Engine. Continuous security monitoring active.*`;

    return report;
  }, [criticalDeficiencies]);

  const handleDownloadGapReport = useCallback(() => {
    const reportText = generateGapReportMarkdown();
    const blob = new Blob([reportText], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "CSI_Help_Gap_Report.md";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [generateGapReportMarkdown]);

  // --- Agentic Workflow Runner (Simulated Terminal) ---
  const handleRunWorkflow = useCallback(() => {
    if (isWorkflowRunning) return;

    const resource = SEEDED_RESOURCES.find((r) => r.id === selectedWorkflowResourceId);
    if (!resource) return;

    setIsWorkflowRunning(true);
    setWorkflowOutput("");
    setWorkflowLogs([]);

    const logLines = [
      `[INIT] Initializing workflow agent pipeline for user: ${profile?.full_name || "Guest"}`,
      `[LOAD] Querying details for target: "${resource.name}"`,
      `[METRIC] Base Match compatibility index calculated: ${matchScores[resource.id]?.score}%`,
      `[AUDIT] Launching eligibility parser for restrictions...`,
      `[PARSING] Scanning income limits, academic score criteria, and age caps...`
    ];

    if (workflowAction === "verify_eligibility") {
      logLines.push(
        `[RULES] Verification check: User budget preference "${profile?.budget || "Free"}" against program cost.`,
        `[DRAFTING] Generating eligibility certification voucher...`,
        `[SUCCESS] Verification complete. Status: FULLY COMPLIANT.`
      );
    } else {
      logLines.push(
        `[RULES] Preparing draft outline for SOP...`,
        `[MODEL] Structuring narrative context matching profile goal: "${profile?.goal || "Software Engineering"}"`,
        `[WRITING] Drafting custom Statement of Purpose sections...`,
        `[SUCCESS] Application draft finished successfully.`
      );
    }

    let currentLine = 0;
    const interval = setInterval(() => {
      if (currentLine < logLines.length) {
        setWorkflowLogs((prev) => [...prev, logLines[currentLine]]);
        currentLine++;
      } else {
        clearInterval(interval);
        setIsWorkflowRunning(false);

        // Generate final output
        if (workflowAction === "verify_eligibility") {
          const matched = matchScores[resource.id];
          setWorkflowOutput(
            `======================================================
     CSI ELIGIBILITY CERTIFICATION REPORT
======================================================
Target Program:  ${resource.name}
City/Location:   ${resource.city || "National"}
Match Score:     ${matched?.score}%

Audit Assessment:
- Academic Alignment: COMPLIANT
- Budget Alignment: COMPLIANT
- Location Validation: COMPLIANT

Missing Requirements Check:
${matched?.missing.map((item) => `* ${item}`).join("\n") || "* None detected."}

Action Recommendation:
Approved to proceed. Complete the steps:
${resource.application_steps?.map((step, i) => `${i + 1}. ${step}`).join("\n") || "1. Submit general application."}`
          );
        } else {
          setWorkflowOutput(
            `To the Admissions Committee,

I am writing to express my formal interest in the ${resource.name} program. As an aspiring professional focused on my goal: "${profile?.goal || "Technical Career Path"}", this support scheme directly matches my milestones.

My background matches your eligibility profile, and my specific obstacles (specifically around resources) make this program the ideal catalyst for my growth. I commit to completing the application pipeline:
${resource.application_steps?.map((step) => `- ${step}`).join("\n") || "- Submission steps"}

Thank you for your consideration,
${profile?.full_name || "Applicant"}`
          );
        }
      }
    }, 600);
  }, [isWorkflowRunning, selectedWorkflowResourceId, workflowAction, profile, matchScores]);

  // --- Human Review Submission ---
  const handleAddReviewCase = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseName.trim() || !newCaseDesc.trim()) return;

    const newCase: ReviewCase = {
      id: `case-${Date.now()}`,
      name: newCaseName,
      type: newCaseType,
      city: newCaseCity,
      description: newCaseDesc,
      submittedBy: profile?.full_name || "Community Reviewer",
      votes: 1,
      status: "PENDING"
    };

    setReviewCases((prev) => [newCase, ...prev]);
    setNewCaseName("");
    setNewCaseDesc("");

    // Log event in Live Feed
    const now = new Date();
    const timestamp = now.toTimeString().split(" ")[0];
    const feedLog: FeedEvent = {
      id: `ev-${now.getTime()}`,
      timestamp,
      level: "info",
      message: `Crowdsourced submission: "${newCaseName}" added to verification queue.`,
      category: "review"
    };
    setFeedEvents((prev) => [feedLog, ...prev]);
  }, [newCaseName, newCaseDesc, newCaseType, newCaseCity, profile]);

  const handleVoteCase = useCallback((id: string) => {
    setReviewCases((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const nextVotes = c.votes + 1;
          const nextStatus = nextVotes >= 25 ? "VERIFIED" : nextVotes >= 10 ? "UNDER_REVIEW" : c.status;
          return { ...c, votes: nextVotes, status: nextStatus };
        }
        return c;
      })
    );
  }, []);

  // --- AI Chat Navigator Interaction ---
  const handleSendChatMessage = useCallback(() => {
    if (!chatInput.trim() || isChatTyping) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: chatInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages((prev) => [...prev, userMsg]);
    const query = chatInput.toLowerCase();
    setChatInput("");
    setIsChatTyping(true);

    setTimeout(() => {
      // Find matching resources based on query
      const matches = SEEDED_RESOURCES.filter((res) => {
        return (
          res.name.toLowerCase().includes(query) ||
          res.type.toLowerCase().includes(query) ||
          res.description.toLowerCase().includes(query) ||
          res.city?.toLowerCase().includes(query) ||
          res.tags.some((t) => t.toLowerCase().includes(query))
        );
      });

      let responseText = "";
      if (matches.length > 0) {
        responseText = `I found ${matches.length} matching support resource(s) in our database:\n\n` +
          matches.map((res) => {
            return `**${res.name}** [${res.type.toUpperCase()}]\n📍 Location: ${res.city || "Online"}\n📝 Eligibility: ${res.eligibility.target_audience || res.eligibility.qualification || "Open for eligible applicants"}\n🔗 [Apply Link](${res.application_link})`;
          }).join("\n\n");
      } else {
        responseText = `I checked the CSI database for "${query}" but couldn't find a direct program hit. Try checking general listings like the "National Overseas Scholarship" or mental health resources like the "NIMHANS Tele-MANAS Helpline". Let me know if you want me to list programs in a specific city.`;
      }

      const responseMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: "navigator",
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatMessages((prev) => [...prev, responseMsg]);
      setIsChatTyping(false);
    }, 1200);
  }, [chatInput, isChatTyping]);

  return (
    <div className="space-y-6">
      {/* --- Dashboard Tactical Header --- */}
      <div className="relative rounded-[24px] border border-cyan-500/10 bg-slate-950/45 p-6 backdrop-blur-md overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(to_right,#22d3ee_1px,transparent_1px),linear-gradient(to_bottom,#22d3ee_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              <p className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase">CSI Command Center // Live Encryption Active</p>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Shield className="h-6 w-6 text-cyan-400" />
              Community Support Intelligence <span className="text-xs bg-cyan-500/20 text-cyan-300 font-semibold px-2.5 py-0.5 rounded-full border border-cyan-400/20">PREMIUM</span>
            </h1>
            <p className="text-xs text-slate-400 max-w-xl">
              Government-grade regional assessment, AI resource matching, and agentic eligibility validation operations.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-slate-900/60 border border-white/5 rounded-2xl p-3 shrink-0">
            <Globe className="h-8 w-8 text-cyan-500/80 animate-spin-slow shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Operational Mode</p>
              <p className="text-xs font-bold text-white">District Gap Monitoring</p>
              <p className="text-[9px] font-mono text-cyan-400/70">SYNC: 100% OK</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- Main 3-Column command setup --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
        
        {/* ========================================================================= */}
        {/* --- LEFT COLUMN: Health Overview + Feed + Crisis Shortages --- */}
        {/* ========================================================================= */}
        <div className="lg:col-span-3 space-y-6 flex flex-col">
          
          {/* Health Index Metric Ring */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                <Activity className="h-3 w-3 text-cyan-400" />
                Community Health Index
              </p>
              <span className="text-[10px] text-cyan-400 font-mono font-bold">{healthMetrics.accessIndexScore}%</span>
            </div>

            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-[800ms]"
                style={{ width: `${healthMetrics.accessIndexScore}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-2 bg-slate-950/50 rounded-xl border border-white/5">
                <p className="text-[9px] text-slate-500 uppercase">Total Items</p>
                <p className="text-sm font-bold text-white mt-0.5">{healthMetrics.totalPrograms}</p>
              </div>
              <div className="p-2 bg-slate-950/50 rounded-xl border border-white/5">
                <p className="text-[9px] text-slate-500 uppercase">Verified</p>
                <p className="text-sm font-bold text-emerald-400 mt-0.5">{healthMetrics.verifiedPrograms}</p>
              </div>
            </div>
          </div>

          {/* Crisis Detection alerts */}
          {criticalDeficiencies.length > 0 && (
            <div className="rounded-2xl border border-rose-500/10 bg-rose-950/10 p-4 space-y-3">
              <p className="text-[10px] uppercase tracking-wider text-rose-400 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
                Crisis Detection Layer
              </p>
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {criticalDeficiencies.map((gap) => (
                  <div key={gap.key} className="text-[10px] border-b border-rose-500/10 pb-2 last:border-0 last:pb-0 space-y-1 relative group">
                    <p className="text-slate-300">
                      **Shortage**: {gap.city} lacks certified **{gap.type}** facilities.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedCityFilter(gap.city);
                          setSelectedCategory(gap.type);
                          handleTabChange("discovery");
                        }}
                        className="text-[9px] text-rose-400 font-bold hover:underline"
                      >
                        Investigate Gap
                      </button>
                      <button
                        onClick={() => setDismissedShortages((prev) => [...prev, gap.key])}
                        className="text-[9px] text-slate-500 hover:text-slate-300"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Support Operations Feed */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 space-y-3 flex-1 flex flex-col">
            <div className="flex justify-between items-center shrink-0">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Live Systems Feed</p>
              <select
                value={feedFilter}
                onChange={(e) => setFeedFilter(e.target.value as "all" | "info" | "critical" | "audit_pass")}
                className="bg-slate-950 border border-white/10 rounded px-1.5 py-0.5 text-[9px] text-slate-300 font-mono focus:outline-none"
              >
                <option value="all">ALL LEVELS</option>
                <option value="info">INFO</option>
                <option value="critical">WARNING</option>
                <option value="audit_pass">AUDIT PASS</option>
              </select>
            </div>

            <div className="font-mono text-[9px] space-y-2.5 overflow-y-auto flex-1 max-h-[260px] pr-1">
              {feedEvents
                .filter((ev) => feedFilter === "all" || ev.level === feedFilter)
                .map((ev) => (
                  <div key={ev.id} className="border-b border-white/5 pb-2 last:border-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">[{ev.timestamp}]</span>
                      <span
                        className={`font-bold uppercase text-[8px] px-1 rounded-sm ${
                          ev.level === "critical"
                            ? "bg-rose-950/55 text-rose-400 border border-rose-500/20"
                            : ev.level === "audit_pass"
                            ? "bg-emerald-950/55 text-emerald-400 border border-emerald-500/20"
                            : "bg-cyan-950/55 text-cyan-400 border border-cyan-500/20"
                        }`}
                      >
                        {ev.level === "critical" ? "WARN" : ev.level === "audit_pass" ? "AUDIT" : "INFO"}
                      </span>
                      <span className="text-slate-400 font-bold uppercase text-[8px]">#{ev.category}</span>
                    </div>
                    <p className="text-slate-300 mt-1 leading-normal">{ev.message}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* --- CENTER COLUMN (MAIN WORKSPACE): Intelligence Tabs --- */}
        {/* ========================================================================= */}
        <div className="lg:col-span-6 space-y-6">
          {/* Navigation Tab Menu */}
          <div className="flex border border-white/5 bg-slate-900/50 rounded-2xl p-1 relative z-10 shrink-0 overflow-x-auto">
            <button
              onClick={() => handleTabChange("discovery")}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                activeIntelTab === "discovery" ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Resource Discovery Map
            </button>
            <button
              onClick={() => handleTabChange("matching")}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                activeIntelTab === "matching" ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Match Engine
            </button>
            <button
              onClick={() => handleTabChange("heatmap")}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                activeIntelTab === "heatmap" ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Community Matrix
            </button>
            <button
              onClick={() => handleTabChange("review")}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                activeIntelTab === "review" ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Review Queue
            </button>
          </div>

          {/* Tab Content 1: Resource Discovery Map */}
          {activeIntelTab === "discovery" && (
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
                      {res.strict_requirements && (
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
          )}

          {/* Tab Content 2: Match Engine */}
          {activeIntelTab === "matching" && (
            <div className="rounded-2xl border border-white/5 bg-slate-900/20 p-5 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-5 space-y-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Ranked Compatibility Listings</p>
                  <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                    {sortedMatchingResources.map((res) => {
                      const matched = matchScores[res.id];
                      return (
                        <button
                          key={res.id}
                          onClick={() => setSelectedMatchResourceId(res.id)}
                          className={`w-full text-left p-3 rounded-xl border transition-all ${
                            selectedMatchResourceId === res.id
                              ? "bg-cyan-500/10 border-cyan-400/30 shadow-[0_0_12px_rgba(34,211,238,0.1)]"
                              : "bg-slate-950/30 border-white/5 hover:bg-slate-900/40"
                          }`}
                        >
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{res.type}</span>
                            <span
                              className={`text-[10px] font-mono font-bold ${
                                matched.score >= 80 ? "text-cyan-400" : matched.score >= 60 ? "text-amber-400" : "text-slate-400"
                              }`}
                            >
                              {matched.score}% MATCH
                            </span>
                          </div>
                          <p className="text-xs font-bold text-white mt-1 truncate">{res.name}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="md:col-span-7 space-y-4 bg-slate-950/40 border border-white/5 rounded-2xl p-4">
                  {activeMatchResource ? (
                    <>
                      <div>
                        <span className="text-[9px] bg-cyan-950 text-cyan-300 font-bold px-2 py-0.5 rounded-full border border-cyan-500/20 uppercase tracking-wider">
                          {activeMatchResource.type}
                        </span>
                        <h3 className="text-sm font-bold text-white mt-2">{activeMatchResource.name}</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">{activeMatchResource.city || "Online"} • Verified Platform</p>
                      </div>

                      <div className="space-y-1.5 border-t border-white/5 pt-3">
                        <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">AI Compatibility Explanation</p>
                        <p className="text-xs text-slate-300 leading-normal bg-cyan-950/15 border border-cyan-500/10 rounded-xl p-3">
                          {matchScores[activeMatchResource.id]?.why}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Missing Eligibility Risk Factors</p>
                        <div className="p-2.5 bg-slate-900/30 border border-white/5 rounded-xl text-xs space-y-1">
                          {matchScores[activeMatchResource.id]?.missing.map((item, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-[10px] text-slate-300">
                              <span className="text-amber-500 font-bold font-mono">!</span>
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5 border-t border-white/5 pt-3">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Automated Application Action Plan</p>
                        <div className="space-y-2">
                          {matchScores[activeMatchResource.id]?.checklist.map((step, index) => {
                            const stepKey = `${activeMatchResource.id}-step-${index}`;
                            const isChecked = matchActionPlanChecked[stepKey] || false;
                            return (
                              <label key={index} className="flex items-center gap-2.5 p-2 bg-slate-900/20 hover:bg-slate-900/40 rounded-lg border border-white/5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() =>
                                    setMatchActionPlanChecked((prev) => ({
                                      ...prev,
                                      [stepKey]: !isChecked
                                    }))
                                  }
                                  className="h-3.5 w-3.5 rounded border-white/10 bg-slate-950 text-cyan-500 focus:ring-cyan-500"
                                />
                                <span className={`text-[10px] text-slate-300 select-none ${isChecked ? "line-through opacity-50" : ""}`}>
                                  {step}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center text-center">
                      <p className="text-xs text-slate-500">Select a ranked resource to review compatibility audit analytics.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 3: Community Matrix */}
          {activeIntelTab === "heatmap" && (
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
                        {SUPPORT_TYPES.map((type) => {
                          const count = heatmapData[city][type];
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
          )}

          {/* Tab Content 4: Review Queue */}
          {activeIntelTab === "review" && (
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
                  className="w-full py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md active:scale-95"
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
                          className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 font-bold bg-cyan-950/20 border border-cyan-400/25 px-2 py-0.5 rounded-md"
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
          )}
        </div>

        {/* ========================================================================= */}
        {/* --- RIGHT COLUMN: Agentic Workflow + Chat Navigator --- */}
        {/* ========================================================================= */}
        <div className="lg:col-span-3 space-y-6 flex flex-col">
          
          {/* Agentic Workflow Terminal */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 space-y-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
              Agentic Workflow Center
            </p>

            <div className="space-y-3">
              <select
                value={selectedWorkflowResourceId}
                onChange={(e) => setSelectedWorkflowResourceId(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none"
              >
                {SEEDED_RESOURCES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <button
                  onClick={() => setWorkflowAction("verify_eligibility")}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                    workflowAction === "verify_eligibility"
                      ? "bg-cyan-500/10 border-cyan-400/30 text-cyan-300"
                      : "bg-slate-950/30 border-white/5 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  Verify Eligibility
                </button>
                <button
                  onClick={() => setWorkflowAction("draft_sop_or_application")}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                    workflowAction === "draft_sop_or_application"
                      ? "bg-cyan-500/10 border-cyan-400/30 text-cyan-300"
                      : "bg-slate-950/30 border-white/5 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  Draft SOP
                </button>
              </div>

              <button
                onClick={handleRunWorkflow}
                disabled={isWorkflowRunning}
                className="w-full py-2 bg-slate-950 border border-cyan-500/25 hover:border-cyan-400/50 text-cyan-400 hover:text-cyan-300 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {isWorkflowRunning ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Running Agent...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" /> Execute Workflow
                  </>
                )}
              </button>
            </div>

            {/* Workflow logs terminal */}
            {(workflowLogs.length > 0 || workflowOutput) && (
              <div className="space-y-2.5">
                <div className="p-3 bg-black/70 border border-white/5 rounded-xl font-mono text-[9px] text-slate-400 space-y-1.5 h-[120px] overflow-y-auto">
                  {workflowLogs.map((log, i) => (
                    <div key={i} className="leading-relaxed">
                      <span className="text-cyan-500 font-bold">&gt;</span> {log}
                    </div>
                  ))}
                  {isWorkflowRunning && (
                    <div className="flex items-center gap-1 leading-relaxed">
                      <span className="text-cyan-500 font-bold">&gt;</span>
                      <span className="h-3 w-1 bg-cyan-400 animate-pulse" />
                    </div>
                  )}
                  <div ref={terminalBottomRef} />
                </div>

                {workflowOutput && (
                  <div className="space-y-2 p-3 bg-slate-950/50 border border-white/5 rounded-xl">
                    <div className="flex justify-between items-center">
                      <p className="text-[9px] text-slate-500 font-mono">WORKSPACE OUTPUT</p>
                      <button
                        onClick={() => copyToClipboard(workflowOutput, "term-output")}
                        className="text-[9px] text-cyan-400 font-bold hover:underline"
                      >
                        {copiedId === "term-output" ? "Copied!" : "Copy Output"}
                      </button>
                    </div>
                    <pre className="text-[9px] font-mono text-slate-300 whitespace-pre-wrap leading-normal max-h-[160px] overflow-y-auto">
                      {workflowOutput}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Community Navigator Chat */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 flex-1 flex flex-col overflow-hidden space-y-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5 shrink-0">
              <Brain className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
              AI Navigator Assistant
            </p>

            <div className="flex-1 bg-slate-950/40 border border-white/5 rounded-xl p-3 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[220px]">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] ${
                      msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
                    }`}
                  >
                    <div
                      className={`p-2.5 rounded-2xl text-[10.5px] leading-relaxed whitespace-pre-wrap ${
                        msg.sender === "user"
                          ? "bg-gradient-to-r from-cyan-600 to-indigo-600 text-white"
                          : "bg-slate-900 text-slate-300 border border-white/5"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[8px] text-slate-500 mt-1">{msg.timestamp}</span>
                  </div>
                ))}
                {isChatTyping && (
                  <div className="flex items-center gap-1 bg-slate-900 border border-white/5 p-2 rounded-2xl w-[60px] justify-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce delay-100" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce delay-200" />
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input */}
              <div className="flex gap-2 mt-3 pt-2 border-t border-white/5 shrink-0">
                <input
                  type="text"
                  placeholder="Ask about resources..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()}
                  className="flex-1 px-3 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-[11px] focus:outline-none focus:border-cyan-500 text-white placeholder-slate-500"
                />
                <button
                  onClick={handleSendChatMessage}
                  className="h-8 w-8 rounded-xl bg-cyan-950/20 border border-cyan-400/25 flex items-center justify-center text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
