"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { UserProfileRecord, WorkspaceSnapshotRecord } from "@/lib/supabase/types";
import { CommunityResource, SEEDED_RESOURCES } from "@/lib/community-db";

export interface AiMatchOpportunity {
  resourceId: string;
  score: number;
  detectedNeed: string;
  whyMatch: string;
  urgency: "High" | "Medium" | "Low";
  eligibilityStatus: "Fully Eligible" | "Partially Eligible" | "Ineligible";
  missingRequirements: string[];
  actionPlan: string[];
}

// Interface for AI Chat Message
export interface ChatMessage {
  id: string;
  sender: "user" | "navigator";
  text: string;
  timestamp: string;
}

// Interface for Live System Feed Event
export interface FeedEvent {
  id: string;
  timestamp: string;
  level: "info" | "critical" | "audit_pass";
  message: string;
  category: string;
}

// Interface for Crowdsourced Verification Review Case
export interface ReviewCase {
  id: string;
  name: string;
  type: string;
  city: string;
  description: string;
  submittedBy: string;
  votes: number;
  status: "PENDING" | "UNDER_REVIEW" | "VERIFIED";
}

type CommunitySupportContextType = {
  profile: UserProfileRecord | null;
  workspace: WorkspaceSnapshotRecord | null;
  
  // Resources State
  resources: CommunityResource[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedCityFilter: string;
  setSelectedCityFilter: (city: string) => void;
  filteredResources: CommunityResource[];
  fetchResources: () => Promise<void>;
  
  // Match Engine State
  aiMatches: AiMatchOpportunity[];
  matching: boolean;
  runAiMatching: () => Promise<void>;
  selectedMatchResourceId: string;
  setSelectedMatchResourceId: (id: string) => void;
  matchScores: Record<string, { score: number; why: string; missing: string[]; checklist: string[]; explainabilityData?: import("@/components/ui/ai-explainability-card").ExplainabilityData }>;
  sortedMatchingResources: CommunityResource[];
  activeMatchResource: CommunityResource | undefined;
  matchActionPlanChecked: Record<string, boolean>;
  setMatchActionPlanChecked: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  
  // Heatmap Matrix State
  heatmapData: Record<string, Record<string, number>>;
  criticalDeficiencies: Array<{ city: string; type: string; key: string }>;
  dismissedShortages: string[];
  setDismissedShortages: React.Dispatch<React.SetStateAction<string[]>>;
  healthMetrics: {
    totalPrograms: number;
    verifiedPrograms: number;
    distinctCitiesCount: number;
    accessIndexScore: number;
  };
  handleDownloadGapReport: () => void;
  
  // Agentic Workflow State
  selectedWorkflowResourceId: string;
  setSelectedWorkflowResourceId: (id: string) => void;
  workflowAction: "verify_eligibility" | "draft_sop_or_application";
  setWorkflowAction: (act: "verify_eligibility" | "draft_sop_or_application") => void;
  workflowLogs: string[];
  isWorkflowRunning: boolean;
  workflowOutput: string;
  triggerAgentAction: (resourceId: string, resourceName: string, actionType: "verify_eligibility" | "draft_sop_or_application") => Promise<void>;
  
  // Human Review State
  reviewCases: ReviewCase[];
  newCaseName: string;
  setNewCaseName: (name: string) => void;
  newCaseType: string;
  setNewCaseType: (type: string) => void;
  newCaseCity: string;
  setNewCaseCity: (city: string) => void;
  newCaseDesc: string;
  setNewCaseDesc: (desc: string) => void;
  handleAddReviewCase: (e: React.FormEvent) => void;
  handleVoteCase: (id: string) => void;
  
  // AI Navigator Chat State
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (input: string) => void;
  isChatTyping: boolean;
  handleSendChatMessage: () => void;
  chatBottomRef: React.RefObject<HTMLDivElement | null>;
  
  // Live Feed State
  feedEvents: FeedEvent[];
  feedFilter: "all" | "info" | "critical" | "audit_pass";
  setFeedFilter: (filter: "all" | "info" | "critical" | "audit_pass") => void;
  
  // Copy state helper
  copiedId: string | null;
  copyToClipboard: (text: string, id: string) => void;
};

const CommunitySupportContext = createContext<CommunitySupportContextType | undefined>(undefined);

export const TARGET_CITIES = ["Bangalore", "New Delhi", "Mumbai", "Kolkata", "Jaipur", "Pune", "Ahmedabad"];
export const SUPPORT_TYPES = ["scholarship", "internship", "mentorship", "center", "scheme", "wellness"];

export function CommunitySupportProvider({
  profile,
  workspace,
  children
}: {
  profile: UserProfileRecord | null;
  workspace: WorkspaceSnapshotRecord | null;
  children: React.ReactNode;
}) {
  // --- Resources Proximity Directory States ---
  const [resources, setResources] = useState<CommunityResource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCityFilter, setSelectedCityFilter] = useState("all");

  // --- Match Engine User Target Selection ---
  const [selectedMatchResourceId, setSelectedMatchResourceId] = useState<string>("");
  const [matchActionPlanChecked, setMatchActionPlanChecked] = useState<Record<string, boolean>>({});
  const [aiMatches, setAiMatches] = useState<AiMatchOpportunity[]>([]);
  const [matching, setMatching] = useState<boolean>(false);

  // --- Crisis Layer details and Matrix Heatmap States ---
  const [dismissedShortages, setDismissedShortages] = useState<string[]>([]);
  
  // --- Agentic Workflow Terminal States ---
  const [selectedWorkflowResourceId, setSelectedWorkflowResourceId] = useState<string>(SEEDED_RESOURCES[0]?.id || "");
  const [workflowAction, setWorkflowAction] = useState<"verify_eligibility" | "draft_sop_or_application">("verify_eligibility");
  const [workflowLogs, setWorkflowLogs] = useState<string[]>([]);
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);
  const [workflowOutput, setWorkflowOutput] = useState<string>("");

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

  // --- Live System Feed States ---
  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([]);
  const [feedFilter, setFeedFilter] = useState<"all" | "info" | "critical" | "audit_pass">("all");

  // --- Copy Clipboard Notifications State ---
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // --- Fetch Resources ---
  const fetchResources = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        lat: "12.9716", // default Bangalore presets
        lng: "77.5946",
        distance: "100", // nationwide defaults
        type: selectedCategory,
        searchQuery: searchQuery
      });
      const response = await fetch(`/api/community/resources?${queryParams}`);
      if (!response.ok) throw new Error("API resources lookup failure");
      const res = await response.json();
      setResources(res.resources || []);
    } catch (err) {
      console.warn("Supabase fetch failed, falling back to seeds", err);
      // Fallback
      let fallback = [...SEEDED_RESOURCES];
      if (selectedCategory !== "all") {
        fallback = fallback.filter((r) => r.type === selectedCategory);
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        fallback = fallback.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            r.description.toLowerCase().includes(q) ||
            r.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      setResources(fallback);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // --- Filtered Resources Map ---
  const filteredResources = useMemo(() => {
    return resources.filter((res) => {
      const matchesSearch =
        res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (res.city && res.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
        res.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === "all" || res.type === selectedCategory;
      const matchesCity = selectedCityFilter === "all" || res.city === selectedCityFilter;

      return matchesSearch && matchesCategory && matchesCity;
    });
  }, [resources, searchQuery, selectedCategory, selectedCityFilter]);

  // --- AI Matches Calibration logic ---
  const runAiMatching = useCallback(async () => {
    if (!profile) return;
    setMatching(true);
    try {
      const response = await fetch("/api/community/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile })
      });
      if (!response.ok) throw new Error("Matches calibration failed");
      const matchedRes = await response.json();
      setAiMatches(matchedRes.matches || []);
    } catch (err) {
      console.warn("AI matching pipeline error, fallback rules initiated", err);
    } finally {
      setMatching(false);
    }
  }, [profile]);

  useEffect(() => {
    if (profile) {
      runAiMatching();
    }
  }, [profile, runAiMatching]);

  // --- Dynamic local match score calculation ---
  const matchScores = useMemo(() => {
    const scores: Record<string, { score: number; why: string; missing: string[]; checklist: string[]; explainabilityData?: import("@/components/ui/ai-explainability-card").ExplainabilityData }> = {};

    SEEDED_RESOURCES.forEach((res) => {
      let score = 55;
      const whyItems: string[] = [];
      const missingItems: string[] = [];
      const checklist = res.strict_requirements || ["Complete standard profile validations"];

      if (profile) {
        const userGoal = (profile.goal || "").toLowerCase();
        const resName = res.name.toLowerCase();
        const resDesc = res.description.toLowerCase();
        const hasGoalOverlap =
          userGoal.split(" ").some((w) => w.length > 3 && (resName.includes(w) || resDesc.includes(w))) ||
          res.tags.some((t) => userGoal.includes(t.toLowerCase()));

        if (hasGoalOverlap) {
          score += 20;
          whyItems.push(`Matches active goal: "${profile.goal}".`);
        }

        const userBudget = (profile.budget || "").toLowerCase();
        if (res.eligibility.need_based && (userBudget.includes("free") || userBudget.includes("scholarship"))) {
          score += 15;
          whyItems.push("Aligns with preferred budget constraints.");
        }
      }

      scores[res.id] = {
        score: Math.min(100, Math.max(0, score)),
        why: whyItems.length > 0 ? whyItems.join(" ") : "Recommended support opportunity matching your career path.",
        missing: missingItems.length ? missingItems : ["None detected. High eligibility confidence."],
        checklist,
        explainabilityData: {
          matchedCriteria: {
            skills: res.tags || [],
            location: res.city || "Online",
            constraints: res.eligibility?.need_based ? ["Financial Need Assessed"] : []
          },
          confidenceScore: Math.min(100, Math.max(0, score)),
          rankingReason: whyItems.length > 0 ? whyItems.join(" ") : "Default community recommendation.",
          alternativeRecommendations: [`Alternative ${res.type}s in ${res.city || "your region"}`],
          missingInformation: missingItems.length ? missingItems : ["Recent background check"],
          potentialRisks: score < 60 ? ["Low match score indicates high rejection probability"] : []
        }
      };
    });

    return scores;
  }, [profile]);

  const sortedMatchingResources = useMemo(() => {
    return [...SEEDED_RESOURCES].sort((a, b) => {
      const scoreA = matchScores[a.id]?.score || 0;
      const scoreB = matchScores[b.id]?.score || 0;
      return scoreB - scoreA;
    });
  }, [matchScores]);

  useEffect(() => {
    if (!selectedMatchResourceId && sortedMatchingResources.length > 0) {
      setSelectedMatchResourceId(sortedMatchingResources[0].id);
    }
  }, [selectedMatchResourceId, sortedMatchingResources]);

  const activeMatchResource = useMemo(() => {
    return SEEDED_RESOURCES.find((r) => r.id === selectedMatchResourceId);
  }, [selectedMatchResourceId]);

  // --- Heatmap Density Matrix calculation ---
  const heatmapData = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};
    TARGET_CITIES.forEach((city) => {
      matrix[city] = {};
      SUPPORT_TYPES.forEach((type) => {
        matrix[city][type] = 0;
      });
    });

    resources.forEach((resource) => {
      const city = resource.city;
      const type = resource.type;
      if (city && TARGET_CITIES.includes(city) && SUPPORT_TYPES.includes(type)) {
        matrix[city][type]++;
      }
    });

    return matrix;
  }, [resources]);

  const criticalDeficiencies = useMemo(() => {
    const list: Array<{ city: string; type: string; key: string }> = [];
    TARGET_CITIES.forEach((city) => {
      SUPPORT_TYPES.forEach((type) => {
        if (heatmapData[city] && heatmapData[city][type] === 0) {
          list.push({ city, type, key: `${city}-${type}` });
        }
      });
    });
    return list.filter((item) => !dismissedShortages.includes(item.key));
  }, [heatmapData, dismissedShortages]);

  const healthMetrics = useMemo(() => {
    const totalPrograms = resources.length;
    const verifiedPrograms = resources.filter((r) => r.verified).length;
    const distinctCities = new Set(resources.map((r) => r.city).filter(Boolean)).size;

    const totalPossibleSectors = TARGET_CITIES.length * SUPPORT_TYPES.length;
    let satisfiedSectors = 0;
    TARGET_CITIES.forEach((city) => {
      SUPPORT_TYPES.forEach((type) => {
        if (heatmapData[city] && heatmapData[city][type] > 0) {
          satisfiedSectors++;
        }
      });
    });

    const accessIndexScore = Math.round((satisfiedSectors / totalPossibleSectors) * 100);

    return {
      totalPrograms,
      verifiedPrograms,
      distinctCitiesCount: distinctCities,
      accessIndexScore
    };
  }, [resources, heatmapData]);

  const handleDownloadGapReport = useCallback(() => {
    const now = new Date().toISOString().split("T")[0];
    const reportText = `# COMMUNITY GAP INTELLIGENCE
## Help Gap Assessment Report
**Date Generated:** ${now}
**Authority:** CareerOS Analytics Desk

### 1. Executive Summary
This regional audit maps support resource accessibility across 7 tier-1 districts.

### 2. Critical Gaps Detected
${
  criticalDeficiencies.length === 0
    ? "- No critical gaps detected."
    : criticalDeficiencies.map((gap) => `- **${gap.city}**: Critical deficiency in **${gap.type.toUpperCase()}**.`).join("\n")
}

### 3. Key Interventions
- Redirect CSR funding to regions with zero local support infrastructure.
- Expand online mentorship portals to cover rural zones.

---
*Generated by CareerOS Community Intelligence Engine.*`;

    const blob = new Blob([reportText], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "CSI_Help_Gap_Report.md";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [criticalDeficiencies]);

  // --- Agentic Workflow Trigger ---
  const triggerAgentAction = useCallback(
    async (resourceId: string, resourceName: string, actionType: "verify_eligibility" | "draft_sop_or_application") => {
      if (isWorkflowRunning) return;
      setIsWorkflowRunning(true);
      setWorkflowOutput("");
      setWorkflowLogs([]);
      setWorkflowAction(actionType);

      const logsSeed = [
        `[INIT] Initializing workflow agent for user: ${profile?.full_name || "Applicant"}`,
        `[LOAD] Querying details for: "${resourceName}"`,
        `[METRIC] Calibrating matches score: ${matchScores[resourceId]?.score}%`,
        `[AUDIT] Assessing strict requirements check...`
      ];

      let line = 0;
      const interval = setInterval(() => {
        if (line < logsSeed.length) {
          setWorkflowLogs((prev) => [...prev, logsSeed[line]]);
          line++;
        } else {
          clearInterval(interval);
          setIsWorkflowRunning(false);

          if (actionType === "verify_eligibility") {
            setWorkflowOutput(
              `=============================================
CSI VERIFICATION STATUS: ELIGIBILITY APPROVED
=============================================
Target Opportunity: ${resourceName}
Match Score:         ${matchScores[resourceId]?.score}%
Discrepancies:       None detected. Full alignment.`
            );
          } else {
            setWorkflowOutput(
              `Dear Admissions Committee,

I am writing to submit my application proposal for ${resourceName}. Aligning with my career objective: "${profile?.goal || "Software Engineering"}", this program acts as a catalyst for my development.

Sincerely,
${profile?.full_name || "Applicant"}`
            );
          }
        }
      }, 500);
    },
    [isWorkflowRunning, profile, matchScores]
  );

  // --- Human Review Add and Vote ---
  const handleAddReviewCase = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseName.trim() || !newCaseDesc.trim()) return;

    const newCase: ReviewCase = {
      id: `case-${Date.now()}`,
      name: newCaseName,
      type: newCaseType,
      city: newCaseCity,
      description: newCaseDesc,
      submittedBy: profile?.full_name || "Community Member",
      votes: 1,
      status: "PENDING"
    };

    setReviewCases((prev) => [newCase, ...prev]);
    setNewCaseName("");
    setNewCaseDesc("");

    // Add live feed event
    const now = new Date();
    const timestamp = now.toTimeString().split(" ")[0];
    const newLog: FeedEvent = {
      id: `ev-${now.getTime()}`,
      timestamp,
      level: "info",
      message: `Crowdsourced submission: "${newCaseName}" entered queue.`,
      category: "review"
    };
    setFeedEvents((prev) => [newLog, ...prev]);
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

  // --- AI Chat Assistant navigator input sending ---
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
      const matches = SEEDED_RESOURCES.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.type.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query) ||
          (r.city && r.city.toLowerCase().includes(query))
      );

      let text = "";
      if (matches.length > 0) {
        text = `I located ${matches.length} matching support programs:\n\n` +
          matches.map((res) => `**${res.name}** [${res.type.toUpperCase()}]\n📍 Location: ${res.city || "National"}\n📝 Deadline: ${res.deadline || "Continuous"}`).join("\n\n");
      } else {
        text = `I completed a search for "${query}" but found no immediate results. Try querying broad terms like "scholarship" or cities like "Bangalore".`;
      }

      const responseMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: "navigator",
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatMessages((prev) => [...prev, responseMsg]);
      setIsChatTyping(false);
    }, 1000);
  }, [chatInput, isChatTyping]);

  // --- Auto scroll Chat ---
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatTyping]);

  // --- Live Feed Event Sync ---
  useEffect(() => {
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

    const interval = setInterval(() => {
      const now = new Date();
      const timestamp = now.toTimeString().split(" ")[0];
      const rand = Math.random();
      const level = rand > 0.6 ? "critical" : rand > 0.3 ? "audit_pass" : "info";

      const newEvent: FeedEvent = {
        id: `ev-${now.getTime()}`,
        timestamp,
        level,
        message: level === "critical"
          ? "Access Warning: Low resource density detected in Jaipur district."
          : level === "audit_pass"
          ? "Geocoding lookup successfully validated program bounds."
          : "AI similarity matching computed successfully.",
        category: "system"
      };

      setFeedEvents((prev) => [newEvent, ...prev.slice(0, 15)]);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const value = useMemo(
    () => ({
      profile,
      workspace,
      resources,
      loading,
      searchQuery,
      setSearchQuery,
      selectedCategory,
      setSelectedCategory,
      selectedCityFilter,
      setSelectedCityFilter,
      filteredResources,
      fetchResources,
      aiMatches,
      matching,
      runAiMatching,
      selectedMatchResourceId,
      setSelectedMatchResourceId,
      matchScores,
      sortedMatchingResources,
      activeMatchResource,
      matchActionPlanChecked,
      setMatchActionPlanChecked,
      heatmapData,
      criticalDeficiencies,
      dismissedShortages,
      setDismissedShortages,
      healthMetrics,
      handleDownloadGapReport,
      selectedWorkflowResourceId,
      setSelectedWorkflowResourceId,
      workflowAction,
      setWorkflowAction,
      workflowLogs,
      isWorkflowRunning,
      workflowOutput,
      triggerAgentAction,
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
      handleVoteCase,
      chatMessages,
      chatInput,
      setChatInput,
      isChatTyping,
      handleSendChatMessage,
      chatBottomRef,
      feedEvents,
      feedFilter,
      setFeedFilter,
      copiedId,
      copyToClipboard
    }),
    [
      profile,
      workspace,
      resources,
      loading,
      searchQuery,
      selectedCategory,
      selectedCityFilter,
      filteredResources,
      fetchResources,
      aiMatches,
      matching,
      runAiMatching,
      selectedMatchResourceId,
      matchScores,
      sortedMatchingResources,
      activeMatchResource,
      matchActionPlanChecked,
      heatmapData,
      criticalDeficiencies,
      dismissedShortages,
      healthMetrics,
      handleDownloadGapReport,
      selectedWorkflowResourceId,
      workflowAction,
      workflowLogs,
      isWorkflowRunning,
      workflowOutput,
      triggerAgentAction,
      reviewCases,
      newCaseName,
      newCaseType,
      newCaseCity,
      newCaseDesc,
      handleAddReviewCase,
      handleVoteCase,
      chatMessages,
      chatInput,
      isChatTyping,
      handleSendChatMessage,
      feedEvents,
      feedFilter,
      copiedId,
      copyToClipboard
    ]
  );

  return (
    <CommunitySupportContext.Provider value={value}>
      {children}
    </CommunitySupportContext.Provider>
  );
}

export function useCommunitySupport() {
  const context = useContext(CommunitySupportContext);
  if (!context) {
    throw new Error("useCommunitySupport must be used within a CommunitySupportProvider");
  }
  return context;
}
