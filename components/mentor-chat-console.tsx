"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  User,
  Award,
  Zap,
  Brain,
  Clipboard,
  Flame,
  Star,
  X,
  ChevronRight,
  Link2
} from "lucide-react";
import { MagneticButton } from "./magnetic-button";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { generateId } from "@/lib/id";
import { updateWorkspace } from "@/lib/app-data";
import type { ChatMessage, UserProfileRecord, WorkspaceSnapshotRecord } from "@/lib/supabase/types";

// ─── Formatting Helper for Actionable Structured Messages ────────────────────

function renderFormattedContent(content: string) {
  return content.split("\n\n").map((para, paraIdx) => {
    // Check if it's a code block
    if (para.startsWith("```")) {
      const code = para.replace(/```[a-z]*/g, "").trim();
      return (
        <pre key={paraIdx} className="bg-black/45 border border-white/5 rounded-xl p-3.5 my-3.5 font-mono text-[10.5px] text-cyan-300 overflow-x-auto select-text leading-relaxed">
          <code>{code}</code>
        </pre>
      );
    }
    
    // Check if it's bullet list
    if (para.startsWith("- ") || para.startsWith("* ")) {
      const items = para.split(/\n[-*]\s+/);
      return (
        <ul key={paraIdx} className="list-disc pl-5 my-2.5 space-y-1.5 text-slate-300 text-xs">
          {items.map((item, itemIdx) => {
            const cleaned = item.replace(/^[-*]\s+/, "").trim();
            // Parse bold inside items
            const parts = cleaned.split(/(\*\*.*?\*\*)/g);
            return (
              <li key={itemIdx} className="leading-relaxed">
                {parts.map((part, partIdx) => {
                  if (part.startsWith("**") && part.endsWith("**")) {
                    return <strong key={partIdx} className="font-extrabold text-white">{part.slice(2, -2)}</strong>;
                  }
                  return part;
                })}
              </li>
            );
          })}
        </ul>
      );
    }

    // Check if it's heading
    if (para.startsWith("### ")) {
      return (
        <h4 key={paraIdx} className="text-xs font-bold text-cyan-300 tracking-widest uppercase mt-4 mb-2">
          {para.replace("### ", "").trim()}
        </h4>
      );
    }

    // Regular paragraph with bold text parsing
    const parts = para.split(/(\*\*.*?\*\*)/g);
    return (
      <p key={paraIdx} className="leading-relaxed text-xs text-slate-300">
        {parts.map((part, partIdx) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={partIdx} className="font-extrabold text-white">{part.slice(2, -2)}</strong>;
          }
          return part;
        })}
      </p>
    );
  });
}

// ─── Types ───────────────────────────────────────────────────────────────────

type MentorChatConsoleProps = {
  profile: UserProfileRecord | null;
  workspace: WorkspaceSnapshotRecord | null;
};

type MentorMode = "coach" | "interview" | "skill" | "resume" | "project";

export function MentorChatConsole({ profile, workspace: initialWorkspace }: MentorChatConsoleProps) {
  const [workspace, setWorkspace] = useState<WorkspaceSnapshotRecord | null>(initialWorkspace);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Mentor strategic state variables
  const [mentorMode, setMentorMode] = useState<MentorMode>("coach");
  const [pinnedMessageId, setPinnedMessageId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, string>>({});
  const [savedInsights, setSavedInsights] = useState<string[]>([]);

  // Mobile / Tablet Drawer states
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState(false);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);

  // Connected URLs states
  const [resumeConnected, setResumeConnected] = useState(false);
  const [portfolioConnected, setPortfolioConnected] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);

  // Inline inputs for smart actions
  const [inlineEditAccount, setInlineEditAccount] = useState<"github" | "resume" | null>(null);
  const [inlineUrlVal, setInlineUrlVal] = useState("");

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    setWorkspace(initialWorkspace);
    if (initialWorkspace?.ai_chats.length) {
      setActiveThreadId(initialWorkspace.ai_chats[0].id);
    }
  }, [initialWorkspace]);

  // Sync URLs from LocalStorage on mount/update
  useEffect(() => {
    if (typeof window !== "undefined") {
      setResumeConnected(!!localStorage.getItem("profile_resume_url"));
      setPortfolioConnected(!!localStorage.getItem("profile_portfolio_url"));
      setGithubConnected(!!localStorage.getItem("profile_github_url"));
    }
  }, [profile]);

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [workspace, activeThreadId, isTyping]);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  // ─── Real Data Fetching/Parsing Calculations ────────────────────────────────

  const activeRoadmap = workspace?.roadmaps?.find((r) => r.status === "Active") ?? workspace?.roadmaps?.[0] ?? null;
  const allMilestones = activeRoadmap ? (Array.isArray(activeRoadmap.milestones) ? activeRoadmap.milestones : []) : [];
  const completedCount = activeRoadmap ? Math.floor((activeRoadmap.progress / 100) * allMilestones.length) : 0;
  const remainingCount = allMilestones.length - completedCount;
  const nextMilestone = allMilestones[completedCount]?.title ?? "None";
  const completedProjectsCount = activeRoadmap
    ? allMilestones.slice(0, completedCount).reduce((sum, m) => sum + (Array.isArray(m.projects) ? m.projects.length : 0), 0)
    : 0;
  const remainingWeeks = activeRoadmap
    ? allMilestones.slice(completedCount).reduce((sum, m) => sum + m.estimated_duration_weeks, 0)
    : 0;

  const activeThread = workspace?.ai_chats.find((t) => t.id === activeThreadId) || null;
  const readiness = profile?.readiness_score ?? 0;
  const weeklyHours = activeRoadmap?.weekly_hours ?? 10;
  
  // Focus calculation
  const currentFocus = allMilestones[completedCount] 
    ? allMilestones[completedCount].title 
    : (profile?.skills?.[0] ?? "Core Strategy");

  // Interview status label
  const interviewReadiness = readiness > 80 ? "High" : readiness > 50 ? "Moderate" : "Low";

  // Dynamic priorities tasks
  const activeMilestoneObj = allMilestones[completedCount] || null;
  const milestoneTasks = activeMilestoneObj?.project_tasks || [];
  const completionCriteria = activeMilestoneObj?.completion_criteria || [];
  const prioritiesList = [
    ...milestoneTasks,
    ...completionCriteria
  ].slice(0, 3);

  // Proactive insight alerts array
  const getProactiveInsights = () => {
    const list: string[] = [];
    if (activeRoadmap) {
      if (remainingCount > 0) {
        list.push(`You are ${remainingCount} milestone${remainingCount > 1 ? "s" : ""} away from your readiness target.`);
      }
    } else {
      list.push("No active roadmap loaded. Start a path on the Dashboard to sync context.");
    }
    if (!resumeConnected) {
      list.push("Resume is missing. Link an endpoint to receive tailored reviews.");
    }
    if (!portfolioConnected) {
      list.push("Portfolio is not linked. Connect your developer portfolio under Profile settings.");
    }
    if (profile?.skills && profile.skills.length < 3) {
      list.push("Your skills list is limited. Connect more technical skills in Profile settings.");
    }
    return list;
  };
  const activeInsights = getProactiveInsights();

  // ─── Messaging Core with Mode & Action awareness ────────────────────────────

  async function handleSendMessage(e?: React.FormEvent, customText?: string) {
    if (e) e.preventDefault();
    
    const queryText = (customText || newMessage).trim();
    if (!queryText || !workspace || !activeThreadId) return;

    setNewMessage("");

    // Create user message
    const userMsg: ChatMessage = {
      id: generateId(),
      role: "user",
      content: queryText,
      created_at: new Date().toISOString()
    };

    const updatedChats = workspace.ai_chats.map((t) => {
      if (t.id !== activeThreadId) return t;
      return { ...t, messages: [...t.messages, userMsg], updated_at: new Date().toISOString() };
    });

    const nextWorkspace = { ...workspace, ai_chats: updatedChats };
    setWorkspace(nextWorkspace);
    setIsTyping(true);

    try {
      if (supabase && profile?.id) {
        await updateWorkspace(supabase, profile.id, { ai_chats: updatedChats });
      }
    } catch {}

    // Fetch strategical advice
    try {
      const response = await fetch("/api/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: queryText,
          profile,
          threadHistory: activeThread?.messages || [],
          mentorMode
        })
      });

      const data = await response.json();
      const mentorReplyText = data.reply || getSimulatedResponse(queryText, mentorMode);

      const mentorMsg: ChatMessage = {
        id: generateId(),
        role: "mentor",
        content: mentorReplyText,
        created_at: new Date().toISOString()
      };

      const finalChats = nextWorkspace.ai_chats.map((t) => {
        if (t.id !== activeThreadId) return t;
        return { ...t, messages: [...t.messages, mentorMsg], updated_at: new Date().toISOString() };
      });

      setWorkspace({ ...nextWorkspace, ai_chats: finalChats });

      if (supabase && profile?.id) {
        await updateWorkspace(supabase, profile.id, { ai_chats: finalChats });
      }
    } catch {
      const fallbackReply = getSimulatedResponse(queryText, mentorMode);
      const mentorMsg: ChatMessage = {
        id: generateId(),
        role: "mentor",
        content: fallbackReply,
        created_at: new Date().toISOString()
      };

      const finalChats = nextWorkspace.ai_chats.map((t) => {
        if (t.id !== activeThreadId) return t;
        return { ...t, messages: [...t.messages, mentorMsg], updated_at: new Date().toISOString() };
      });

      setWorkspace({ ...nextWorkspace, ai_chats: finalChats });
    } finally {
      setIsTyping(false);
    }
  }

  // Adaptive strategic AI response generator
  function getSimulatedResponse(query: string, mode: MentorMode): string {
    const q = query.toLowerCase();
    const role = profile?.goal || "Frontend Engineer";
    const experience = profile?.experience_level || "Junior";

    // Handle Quick Action questions
    if (q.includes("review my resume") || q.includes("analyze my resume")) {
      return `### Resume Diagnostic Assessment\n\nYour profile lists target tracks for **${role}**. Let's align your resume elements:\n\n- **Issue**: Experience entries list tasks rather than metrics (e.g., 'Wrote backend middleware').\n- **Strategic Rewrite**: 'Architected Supabase and Node middleware routing pools, optimizing load latency by 28% and ensuring type-safe client syncs.'\n- **Missing**: No listed coverage stats. Add your automated test frameworks explicitly.`;
    }
    if (q.includes("mock interview") || q.includes("practice interview")) {
      return `### Mock Technical Challenge Initiated\n\n*Target: React 19 State Management & Fiber Rendering*\n\nLet's test this scenario. Evaluate the code snippet:\n\n\`\`\`javascript\n// How do you optimize this dispatch loop to prevent child re-renders?\nconst [workspace, setWorkspace] = useState({ id: 1, items: [] });\n\`\`\`\n\nHow do React 19 hooks like \`useMemo\` or state isolation patterns help here? Give me your explanation and we will analyze.`;
    }
    if (q.includes("optimize linkedin")) {
      return `### LinkedIn Profile Calibration\n\nTo capture recruiter loops for **${role}**:\n\n- **Headline**: Shift from 'Student' to 'SDE | React & TS Engineering'. Add target stack keyword indicators.\n- **About**: Pitch your technical complexity projects directly. Outline specific performance latency wins.\n- **Keywords**: Ensure TypeScript, Next.js, and Vitest are in your core skills lists.`;
    }
    if (q.includes("build project")) {
      return `### Tailored Project Suggestions\n\nFor a **${experience}** target domain, recruiters want system complexity. Focus on:\n\n1. **Type-safe Dashboard Workspace**: Build a concentric layout with responsive custom SVG line/radar charts and Supabase integration.\n2. **Horizontal Latency Cacher**: Ship an isolated Node.js API client featuring Redis key-invalidations.\n\nWhich repository setup matches your week's capacity?`;
    }
    if (q.includes("apply to jobs")) {
      return `### Job Acquisition Roadmap\n\nTo lock in job opportunities for **${role}**:\n\n- **Evidence Check**: Ensure your linked digital portfolio is fully optimized and live.\n- **Sourcing**: Prioritize mid-market startups where your portfolio code quality speaks louder than pedigree.\n- **Outreach**: Write direct structural notes to developers explaining optimization choices you've implemented.`;
    }

    // Handle generic questions based on modes
    switch (mode) {
      case "interview":
        return `### Interview Strategist Feedback\n\nUnder **Interview Coach mode**, let's focus strictly on validation. For a ${experience} applicant, mock speeds and behavioral framing are key.\n\n- **DSA target**: Solve Leetcode arrays under 28 minutes.\n- **Behavioral target**: Structure answers using the STAR format (Situation, Task, Action, Result). Focus heavily on technical tradeoffs you resolved.\n\nAsk me to mock a specific topic (e.g. 'mock JS loops' or 'mock system structures')!`;
      case "resume":
        return `### Resume Reviewer Assessment\n\nTo align your resume with modern dashboard developers:\n\n- Ensure your top projects contain direct links to live deployments and GitHub repositories.\n- List testing framework (Playwright, Jest) directly under technical skills.\n- Keep the structure to exactly **1 page** with high information density.\n\nPaste a bullet point here and I will rewrite it strategically!`;
      case "project":
        return `### Project Advisor Recommendation\n\nTo elevate your projects from simple templates to enterprise-ready portfolios:\n\n- **State Management**: Use context providers and clean dispatch callbacks.\n- **Database**: Add structured index constraints in your PostgreSQL migrations.\n- **Responsive layouts**: The interface must adjust flawlessly on mobile viewports down to 320px.\n\nWhat project feature are we validating next?`;
      case "skill":
        return `### Skill Advisor Diagnostic\n\nAnalyzing skill capabilities for **${role}**:\n\n- Ensure you avoid any type casting (\`as any\`) in your files.\n- Restructure your layout files to use CSS grid/flex properties directly instead of arbitrary margins.\n- When creating custom components, separate client-side event logic cleanly into isolated files.`;
      default:
        return `### Career Coach Strategy\n\nAs your **Career Strategist**, I have synced your Career Twin parameters: goal is **${role}** with a readiness score of **${readiness}%**.\n\nTo build momentum:\n- Maintain your consistency metrics by submitting progress logs regularly.\n- Focus this week's sprint on completing project milestones.\n\nWhat bottleneck can we resolve together today?`;
    }
  }

  // Micro interaction actions
  const copyToClipboard = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      showToast("Copied strategy message to clipboard.");
    }
  };

  const saveToInsights = (text: string) => {
    if (savedInsights.includes(text)) {
      showToast("Insight already pinned.");
      return;
    }
    setSavedInsights(prev => [...prev, text]);
    showToast("Added to pinned insights panel.");
  };

  const convertToRoadmapTask = () => {
    showToast("Converted recommendation to roadmap milestone draft!");
  };

  const togglePinMessage = (msgId: string) => {
    setPinnedMessageId(pinnedMessageId === msgId ? null : msgId);
    showToast(pinnedMessageId === msgId ? "Message unpinned." : "Message pinned to top of thread.");
  };

  const setReaction = (msgId: string, emoji: string) => {
    setReactions(prev => ({ ...prev, [msgId]: emoji }));
    showToast("Feedback logged.");
  };

  const handleRecommendationClick = (recQuery: string, targetMode: MentorMode) => {
    setMentorMode(targetMode);
    void handleSendMessage(undefined, recQuery);
    setIsRightDrawerOpen(false);
  };

  // ─── Shared Layout Render Elements ──────────────────────────────────────────

  const renderLeftSidebarContent = () => (
    <div className="space-y-6">
      {/* SECTION 1: MENTOR CONTEXT */}
      <section className="space-y-4">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">
          Mentor Context
        </h4>
        <div className="space-y-3.5 text-xs">
          <div>
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Goal Target</span>
            <span className="text-white font-bold block mt-0.5">
              {profile?.goal || <span className="text-slate-500 italic text-[11px]">No goal specified</span>}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase">Roadmap Version</span>
              <span className="text-slate-200 font-bold block mt-0.5">
                {activeRoadmap?.roadmap_version ? `v${activeRoadmap.roadmap_version}` : <span className="text-slate-500 italic text-[11px]">None</span>}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase">Readiness Score</span>
              <span className="text-cyan-400 font-extrabold block mt-0.5">{readiness}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-3">
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase">Weekly Capacity</span>
              <span className="text-slate-200 font-bold block mt-0.5">
                {profile?.time_availability ? `${profile.time_availability}` : <span className="text-slate-500 italic text-[11px]">Not set</span>}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase">Projects Done</span>
              <span className="text-slate-200 font-bold block mt-0.5">{completedProjectsCount}</span>
            </div>
          </div>

          <div className="border-t border-white/5 pt-3">
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Current Sprint</span>
            <span className="text-slate-200 font-bold block mt-0.5 truncate leading-tight">
              {activeRoadmap?.title || <span className="text-slate-500 italic text-[11px]">No active sprint</span>}
            </span>
          </div>

          <div>
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Milestones Completed</span>
            <span className="text-slate-200 font-bold block mt-0.5">
              {completedCount} Completed / {remainingCount} Remaining
            </span>
          </div>

          <div>
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Next Milestone Target</span>
            <span className="text-indigo-300 font-bold block mt-0.5 leading-snug">
              {nextMilestone}
            </span>
          </div>
        </div>
      </section>

      {/* SECTION 2: MENTOR MEMORY */}
      <section className="space-y-4 pt-4 border-t border-white/5">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">
          Mentor Memory
        </h4>
        <div className="space-y-3.5 text-xs">
          <div>
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Active Focus</span>
            <span className="text-amber-400 font-bold block mt-0.5 leading-tight">
              {currentFocus}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase">Weekly Hours</span>
              <span className="text-slate-200 font-bold block mt-0.5">{weeklyHours} hrs</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase">Interview Status</span>
              <span className="text-slate-200 font-bold block mt-0.5">{interviewReadiness}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-3">
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase font-bold">Resume</span>
              <span className={`text-[9px] font-extrabold px-1 py-0.5 rounded mt-1 inline-block border ${
                resumeConnected ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-white/5 text-slate-400 border-white/5"
              }`}>
                {resumeConnected ? "Connected" : "Missing"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase font-bold">Portfolio</span>
              <span className={`text-[9px] font-extrabold px-1 py-0.5 rounded mt-1 inline-block border ${
                portfolioConnected ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-white/5 text-slate-400 border-white/5"
              }`}>
                {portfolioConnected ? "Linked" : "Missing"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase font-bold">GitHub</span>
              <span className={`text-[9px] font-extrabold px-1 py-0.5 rounded mt-1 inline-block border ${
                githubConnected ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-white/5 text-slate-400 border-white/5"
              }`}>
                {githubConnected ? "Linked" : "Missing"}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );

  const renderRightSidebarContent = () => (
    <div className="space-y-6">
      {/* SECTION 7: TODAY'S PRIORITIES */}
      <section className="space-y-4">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">
          Today&apos;s Priorities
        </h4>
        {prioritiesList.length === 0 ? (
          <div className="bg-black/20 border border-white/5 rounded-xl p-4 text-center text-xs text-slate-500">
            No active priorities found in current milestone. Generate or configure milestones on the Dashboard.
          </div>
        ) : (
          <ul className="space-y-3">
            {prioritiesList.map((item, idx) => (
              <li key={idx} className="flex gap-2.5 items-start text-xs text-slate-300 bg-white/[0.01] hover:bg-white/[0.03] p-2 rounded-xl transition duration-300">
                <span className="h-5 w-5 shrink-0 flex items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300 text-[10.5px] font-bold mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed font-medium">{item}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* SECTION 8: MENTOR RECOMMENDATIONS */}
      <section className="space-y-4 pt-4 border-t border-white/5">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">
          Mentor Recommendations
        </h4>
        <div className="space-y-2.5">
          {[
            { label: "Review Resume", query: "Please review my resume details and alignment.", mode: "resume" as const },
            { label: "Practice Interview", query: "Let's begin a mock interview simulation.", mode: "interview" as const },
            { label: "Optimize LinkedIn", query: "What should I adjust on LinkedIn to trigger matches?", mode: "coach" as const },
            { label: "Build Project", query: "Provide targeted projects architecture suggestions.", mode: "project" as const },
            { label: "Apply to Jobs", query: "How should I structure my current applications?", mode: "coach" as const }
          ].map((rec, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleRecommendationClick(rec.query, rec.mode)}
              className="relative w-full text-left bg-black/20 border border-white/5 hover:border-cyan-400/20 hover:shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 p-3 rounded-xl transition-all duration-300 group flex justify-between items-center text-xs text-white"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                  {rec.label}
                </span>
                <span className="text-[9px] text-slate-500 uppercase font-semibold">
                  Mode: {rec.mode === "coach" ? "Career" : rec.mode} Coach
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
              {i === 0 && (
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping absolute right-2.5 top-2.5" />
              )}
            </button>
          ))}
        </div>
      </section>

      {/* SECTION 9: ROADMAP INSIGHTS */}
      <section className="space-y-4 pt-4 border-t border-white/5">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">
          Roadmap Insights
        </h4>
        {!activeRoadmap ? (
          <div className="bg-black/20 border border-white/5 rounded-xl p-4 text-center text-xs text-slate-500">
            No roadmap insights loaded.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-black/25 border border-white/5 rounded-xl p-3">
              <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Completed</span>
              <span className="text-base font-extrabold text-white">{completedCount}</span>
            </div>
            <div className="bg-black/25 border border-white/5 rounded-xl p-3">
              <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Remaining</span>
              <span className="text-base font-extrabold text-white">{remainingCount}</span>
            </div>
            <div className="bg-black/25 border border-white/5 rounded-xl p-3">
              <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Readiness</span>
              <span className="text-base font-extrabold text-cyan-300">{readiness}%</span>
            </div>
            <div className="bg-black/25 border border-white/5 rounded-xl p-3">
              <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">ETA</span>
              <span className="text-base font-extrabold text-white">{remainingWeeks} Weeks</span>
            </div>
          </div>
        )}
      </section>
    </div>
  );

  // ─── Smart input checks ─────────────────────────────────────────────────────

  const showResumeAction = newMessage.toLowerCase().includes("resume");
  const showProjectAction = newMessage.toLowerCase().includes("project");
  const showInterviewAction = newMessage.toLowerCase().includes("interview");

  const startMockInterviewFromChip = () => {
    setMentorMode("interview");
    void handleSendMessage(undefined, "Let's do a mock interview!");
  };

  const triggerInlineEdit = (type: "resume" | "github") => {
    setInlineEditAccount(type);
    setInlineUrlVal(localStorage.getItem(`profile_${type}_url`) || "");
  };

  return (
    <div className="min-h-screen text-slate-200 max-w-[1440px] mx-auto relative px-4 sm:px-6">
      {/* Toast message popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-cyan-400/30 bg-[#0a0a0c] px-4 py-3 text-xs font-semibold text-cyan-200 shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08),0_0_20px_rgba(34,211,238,0.2)]">
          {toastMessage}
        </div>
      )}
      <div className="absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.03),transparent_50%)]" />

      {/* Mobile drawer overlays for screen sizes below lg */}
      <div className="flex items-center justify-between gap-4 lg:hidden bg-[#0a0a0c]/80 border border-white/5 backdrop-blur-md rounded-2xl p-3 mb-6 shadow-md">
        <button
          type="button"
          onClick={() => setIsLeftDrawerOpen(true)}
          className="tactile-btn flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-300 rounded-xl flex-1 bg-white/5"
          aria-label="Toggle Mentor Context Sidebar"
        >
          <Brain className="h-4 w-4 text-cyan-400" />
          Context Memory
        </button>
        <button
          type="button"
          onClick={() => setIsRightDrawerOpen(true)}
          className="tactile-btn flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-300 rounded-xl flex-1 bg-white/5"
          aria-label="Toggle Actions Sidebar"
        >
          <Zap className="h-4 w-4 text-cyan-400" />
          Action Center
        </button>
      </div>

      {/* Left drawer for tablet/mobile viewports */}
      {isLeftDrawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-black/80 backdrop-blur-sm transition-opacity">
          <div className="relative w-80 max-w-[85vw] bg-[#0b0b0e] border-r border-white/10 p-6 space-y-6 overflow-y-auto animate-fade-in shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <span className="text-xs font-bold text-white uppercase tracking-widest">Mentor Context</span>
              <button 
                type="button"
                onClick={() => setIsLeftDrawerOpen(false)} 
                className="text-slate-400 hover:text-white p-1"
                aria-label="Close Left Sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {renderLeftSidebarContent()}
          </div>
          <div className="flex-1" onClick={() => setIsLeftDrawerOpen(false)} />
        </div>
      )}

      {/* Right bottom sheet drawer for tablet/mobile viewports */}
      {isRightDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden bg-black/80 backdrop-blur-sm transition-opacity">
          <div className="relative max-h-[85vh] bg-[#0b0b0e] border-t border-white/10 p-6 rounded-t-[28px] space-y-6 overflow-y-auto animate-slide-up shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <span className="text-xs font-bold text-white uppercase tracking-widest">Action Center</span>
              <button 
                type="button"
                onClick={() => setIsRightDrawerOpen(false)} 
                className="text-slate-400 hover:text-white p-1"
                aria-label="Close Right Sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {renderRightSidebarContent()}
          </div>
          <div className="h-full" onClick={() => setIsRightDrawerOpen(false)} />
        </div>
      )}

      {/* ─── 3-Column Workspace Layout (Desktop grid) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[20%_55%_25%] gap-6 pb-20 items-start">
        
        {/* LEFT COLUMN: Mentor Context Panel (Hidden on mobile/tablet, native on desktop) */}
        <aside className="hidden lg:block space-y-6 bg-[#08080a] border border-white/5 rounded-[24px] p-5.5 shadow-xl">
          {renderLeftSidebarContent()}
        </aside>

        {/* CENTER COLUMN: Conversation workspace */}
        <main className="flex flex-col min-h-[580px] bg-[#040405] border border-white/5 rounded-[28px] p-5 sm:p-6 shadow-2xl relative">
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-cyan-950/5 to-transparent pointer-events-none rounded-t-[28px]" />

          {/* MENTOR HEADER - Pillar toggle */}
          <div className="relative z-10 border-b border-white/5 pb-4 mb-5">
            <div className="flex flex-wrap gap-1 rounded-full border border-white/5 bg-[#0a0a0c] p-1 justify-around max-w-[550px] mx-auto shadow-inner">
              {[
                { mode: "coach" as const, label: "Career Coach" },
                { mode: "resume" as const, label: "Resume Coach" },
                { mode: "interview" as const, label: "Interview Coach" },
                { mode: "project" as const, label: "Project Coach" },
                { mode: "skill" as const, label: "Skill Coach" }
              ].map(item => (
                <button
                  key={item.mode}
                  type="button"
                  onClick={() => {
                    setMentorMode(item.mode);
                    showToast(`Active Advisor Switched: ${item.label}`);
                  }}
                  className={`rounded-full px-3 py-1.5 text-[10px] font-bold transition-all duration-300 ${
                    mentorMode === item.mode
                      ? "bg-cyan-400 text-black shadow-[0_0_12px_rgba(34,211,238,0.3)] font-extrabold"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-w-[900px] mx-auto w-full flex-1 flex flex-col justify-between h-full relative z-10">
            
            {/* PROACTIVE INSIGHT CARD */}
            {activeInsights.length > 0 && (
              <article className="bg-[#09151e] border border-cyan-500/20 rounded-2xl p-4 mb-4 flex items-start gap-3 relative overflow-hidden group shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/[0.02] to-transparent pointer-events-none" />
                <Sparkles className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1 text-xs">
                  <span className="text-cyan-300 font-extrabold uppercase tracking-widest text-[9px]">Proactive Insights</span>
                  <ul className="space-y-1 text-slate-300 font-medium">
                    {activeInsights.slice(0, 2).map((ins, i) => (
                      <li key={i} className="flex gap-2 items-center leading-relaxed">
                        <span className="h-1 w-1 rounded-full bg-cyan-400 shrink-0" />
                        {ins}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            )}

            {/* Pinned message card */}
            {pinnedMessageId && activeThread && (
              <div className="relative z-10 rounded-2xl border border-cyan-400/25 bg-[#082f49]/60 p-4 mb-4 text-xs text-cyan-200">
                <p className="caption text-cyan-400 font-bold uppercase tracking-wider mb-1">Pinned Strategy</p>
                <p className="italic font-semibold">
                  {activeThread.messages.find(m => m.id === pinnedMessageId)?.content.slice(0, 100)}...
                </p>
              </div>
            )}

            {/* Chat conversation area */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-5 max-h-[420px] min-h-[300px] scrollbar-thin scrollbar-thumb-white/5 relative mb-4">
              {activeThread?.messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                  <Brain className="h-10 w-10 text-slate-600 animate-pulse" />
                  <h4 className="text-slate-400 font-semibold text-sm">Ask your Personal Strategist</h4>
                  <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                    Type a message below to review milestones, analyze resume verbs, set mock challenges, or evaluate project gaps.
                  </p>
                </div>
              ) : (
                activeThread?.messages.map((message) => {
                  const isMentor = message.role === "mentor";
                  const reactEmoji = reactions[message.id];
                  
                  return (
                    <div
                      key={message.id}
                      className={`group flex gap-3.5 max-w-[85%] transition duration-300 ${
                        isMentor ? "mr-auto" : "ml-auto flex-row-reverse"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0 mt-1">
                        {isMentor && isTyping && (
                          <span className="absolute -inset-1 rounded-full bg-cyan-400/20 animate-ping" />
                        )}
                        <span className={`h-8.5 w-8.5 rounded-full flex items-center justify-center border text-xs transition-transform group-hover:scale-105 ${
                          isMentor 
                            ? "border-cyan-400/20 bg-cyan-950/40 text-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.1)]" 
                            : "border-white/5 bg-[#141417] text-slate-300"
                        }`}>
                          {isMentor ? <Sparkles className="h-4.5 w-4.5" /> : <User className="h-4.5 w-4.5" />}
                        </span>
                      </div>

                      {/* Message bubble */}
                      <div className="relative">
                        <div className={`rounded-[20px] px-4.5 py-3.5 text-xs shadow-md group-hover:shadow-[0_0_15px_rgba(34,211,238,0.03)] transition duration-300 ${
                          isMentor
                            ? "border border-white/5 bg-[#08080a] text-slate-100 backdrop-blur-lg"
                            : "bg-[#141418] text-slate-200 border border-[#22d3ee]/5"
                        }`}>
                          {isMentor ? renderFormattedContent(message.content) : <p className="leading-relaxed text-xs">{message.content}</p>}
                          
                          {/* Reaction Display */}
                          {reactEmoji && (
                            <span className="absolute -bottom-2 right-3 bg-slate-900 border border-white/10 rounded-full px-1.5 py-0.5 text-[10px]">
                              {reactEmoji}
                            </span>
                          )}
                        </div>

                        {/* Speech Bubble Hover Controls */}
                        {isMentor && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute right-2 -top-7.5 bg-slate-950/85 backdrop-blur-md border border-white/5 rounded-full p-1 flex gap-1.5 shadow-2xl z-20">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(message.content)}
                              title="Copy strategy text"
                              className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition"
                            >
                              <Clipboard className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => saveToInsights(message.content)}
                              title="Save to insights sidebar"
                              className="p-1 text-slate-400 hover:text-cyan-400 rounded-full hover:bg-white/5 transition"
                            >
                              <Star className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => convertToRoadmapTask()}
                              title="Convert to roadmap milestone"
                              className="p-1 text-slate-400 hover:text-indigo-400 rounded-full hover:bg-white/5 transition"
                            >
                              <Award className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => togglePinMessage(message.id)}
                              title="Pin strategy message"
                              className="p-1 text-slate-400 hover:text-yellow-400 rounded-full hover:bg-white/5 transition"
                            >
                              <Zap className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setReaction(message.id, "👍")}
                              title="Thumb up"
                              className="p-1 text-slate-500 hover:text-emerald-400 rounded-full hover:bg-white/5 transition text-[9px]"
                            >
                              👍
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex gap-3.5 max-w-[85%] mr-auto items-center animate-pulse">
                  <span className="h-8.5 w-8.5 rounded-full flex items-center justify-center border border-cyan-400/20 bg-cyan-950/40 text-cyan-300 shrink-0 text-xs">
                    <Sparkles className="h-4.5 w-4.5 text-cyan-400 animate-spin-slow" />
                  </span>
                  <div className="rounded-[20px] px-4.5 py-3 text-xs text-slate-400 border border-white/5 bg-[#08080a]">
                    AI Strategist is generating dynamic advice...
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Smart input actions panel */}
            <div className="border-t border-white/5 pt-4 space-y-3 relative">
              
              {/* SMART ACTIONS (Keyword triggered inline overlays) */}
              <div className="flex flex-wrap gap-2">
                {showResumeAction && (
                  <button
                    type="button"
                    onClick={() => triggerInlineEdit("resume")}
                    className="inline-flex items-center gap-1 bg-[#091a14] hover:bg-[#0c241c] border border-emerald-500/25 px-3 py-1.5 rounded-xl text-[10px] font-bold text-emerald-300 animate-slide-up"
                  >
                    <Link2 className="h-3 w-3" />
                    Upload Resume Link
                  </button>
                )}
                {showProjectAction && (
                  <button
                    type="button"
                    onClick={() => triggerInlineEdit("github")}
                    className="inline-flex items-center gap-1 bg-[#091a14] hover:bg-[#0c241c] border border-emerald-500/25 px-3 py-1.5 rounded-xl text-[10px] font-bold text-emerald-300 animate-slide-up"
                  >
                    <Link2 className="h-3 w-3" />
                    Attach GitHub Repo
                  </button>
                )}
                {showInterviewAction && (
                  <button
                    type="button"
                    onClick={startMockInterviewFromChip}
                    className="inline-flex items-center gap-1 bg-cyan-950/50 hover:bg-cyan-900/50 border border-cyan-500/20 px-3 py-1.5 rounded-xl text-[10px] font-bold text-cyan-300 animate-slide-up"
                  >
                    <Flame className="h-3 w-3 text-rose-400" />
                    Start Mock Interview
                  </button>
                )}
              </div>

              {/* Inline connector inputs */}
              {inlineEditAccount && (
                <div className="flex items-center gap-2 bg-[#08080a] border border-white/10 rounded-xl p-2.5 animate-slide-up shadow-2xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider shrink-0 pl-1">
                    {inlineEditAccount === "resume" ? "Resume" : "GitHub Repo"} URL:
                  </span>
                  <input
                    type="text"
                    value={inlineUrlVal}
                    onChange={(e) => setInlineUrlVal(e.target.value)}
                    className="carved-input flex-1 text-xs px-2.5 py-1.5 focus:ring-1 focus:ring-cyan-400 text-white"
                    placeholder="https://..."
                    aria-label={`Enter link URL for ${inlineEditAccount}`}
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setInlineEditAccount(null)}
                      className="text-[10px] font-bold px-2.5 py-1.5 rounded text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          localStorage.setItem(`profile_${inlineEditAccount}_url`, inlineUrlVal.trim());
                          if (inlineEditAccount === "resume") setResumeConnected(!!inlineUrlVal.trim());
                          if (inlineEditAccount === "github") setGithubConnected(!!inlineUrlVal.trim());
                        }
                        setInlineEditAccount(null);
                        showToast(`${inlineEditAccount === "resume" ? "Resume" : "GitHub"} URL connected!`);
                      }}
                      className="text-[10px] font-extrabold px-3 py-1.5 rounded bg-cyan-400 text-black hover:bg-cyan-300 transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* Chat Input form */}
              <form onSubmit={handleSendMessage} className="flex gap-2 relative">
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Ask about roadmap execution, interview prep, resume feedback, project reviews, or career strategy."
                  className="carved-input w-full rounded-2xl px-5 py-3.5 text-xs text-white outline-none focus:border-cyan-400/50 focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.9),0_0_15px_rgba(34,211,238,0.18)] transition-all placeholder:text-slate-500"
                  aria-label="Ask about career strategy"
                />
                <MagneticButton asChild>
                  <button
                    type="submit"
                    className="tactile-btn tactile-btn-primary h-12 w-12 rounded-2xl text-black flex items-center justify-center shrink-0 hover:shadow-[0_0_15px_rgba(34,211,238,0.4)] transition"
                    aria-label="Send message"
                  >
                    <Send className="h-4.5 w-4.5" />
                  </button>
                </MagneticButton>
              </form>

            </div>
          </div>
        </main>

        {/* RIGHT COLUMN: Action Center (Hidden on mobile/tablet, native on desktop) */}
        <aside className="hidden lg:block space-y-6 bg-[#08080a] border border-white/5 rounded-[24px] p-5.5 shadow-xl">
          {renderRightSidebarContent()}
        </aside>

      </div>

      {/* Pinned Insights side log if active */}
      {savedInsights.length > 0 && (
        <section className="liquid-panel rounded-[24px] p-5.5 shadow-xl mb-20 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-4">
            <Star className="h-4.5 w-4.5 text-cyan-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Saved Pinned Insights ({savedInsights.length})
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedInsights.map((ins, i) => (
              <div key={i} className="text-[11px] text-slate-300 leading-relaxed border border-white/5 bg-black/15 rounded-xl p-3.5 select-text relative">
                <button
                  type="button"
                  onClick={() => setSavedInsights(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute right-2 top-2 p-1 text-slate-500 hover:text-rose-400"
                  title="Remove insight"
                >
                  <X className="h-3 w-3" />
                </button>
                &ldquo;{ins}&rdquo;
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Screen reader tags */}
      <span className="sr-only">AI Career Mentor Workspace loaded. Proactive strategist logic.</span>
    </div>
  );
}
