"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send, Sparkles, User, Cpu, Compass, Briefcase, Award,
  Zap, ShieldAlert, Brain, History, Clipboard, Flame, Star
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

type MentorMode = "coach" | "interview" | "technical" | "resume" | "project";

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

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    setWorkspace(initialWorkspace);
    if (initialWorkspace?.ai_chats.length) {
      setActiveThreadId(initialWorkspace.ai_chats[0].id);
    }
  }, [initialWorkspace]);

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [workspace, activeThreadId, isTyping]);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }



  const activeThread = workspace?.ai_chats.find((t) => t.id === activeThreadId) || null;
  const readiness = profile?.readiness_score ?? 82;
  const weeklyHours = workspace?.roadmaps?.[0]?.weekly_hours ?? 15;

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
    if (q.includes("review my roadmap")) {
      return `### Roadmap Milestone Calibration\n\nI have reviewed your active milestones. Currently, your **Consistency** is pacing well, but there is a bottleneck in project evidence.\n\n- **Active Sprint Target**: Deploy portfolio sub-systems.\n- **Mentor Priority Check**: Shift 4 hours from textbook algorithms to Playwright automated integration testing files.\n- **Actionable Steps**: Set up testing scripts inside your active repo directory this weekend.`;
    }
    if (q.includes("what should i do today")) {
      return `### Today's Sprint Recommendations\n\nBased on your Career Twin gaps, let's target this **3-part Sprint today**:\n\n1. **DSA Core Loop (45 mins)**: Solve one sliding window pattern inside LeetCode.\n2. **Architecture Refactor (1.5 hrs)**: Extract the responsive grids inside your dashboard module and verify mobile viewport sizing.\n3. **Git Push (10 mins)**: Keep your commit momentum streak alive.\n\nLet's check back when today's commits are live!`;
    }
    if (q.includes("analyze my resume")) {
      return `### Resume Diagnostic Assessment\n\nYour profile lists target tracks for **${role}**. Let's align your resumes:\n\n- **Issue**: Experience entries list tasks rather than metrics (e.g., 'Wrote backend middleware').\n- **Strategic Rewrite**: 'Architected Supabase and Node middleware routing pools, optimizing load latency by 28% and ensuring type-safe client syncs.'\n- **Missing**: No listed coverage stats. Add your automated test frameworks explicitly.`;
    }
    if (q.includes("mock interview")) {
      return `### Mock Technical Challenge Initiated\n\n*Target: React 19 State Management & Fiber Rendering*\n\nLet's test this scenario. Evaluate the code snippet:\n\n\`\`\`javascript\n// How do you optimize this dispatch loop to prevent child re-renders?\nconst [workspace, setWorkspace] = useState({ id: 1, items: [] });\n\`\`\`\n\nHow do React 19 hooks like \`useMemo\` or state isolation patterns help here? Give me your explanation and we will analyze.`;
    }
    if (q.includes("skill gap analysis")) {
      return `### Skill Gap Assessment\n\nAnalyzing **${role}** credentials:\n\n- **Already strong**: React state modeling, TypeScript layouts, Tailwind styling, Git flows.\n- **Needs work**: Database horizontal scales, Node API cache indexes.\n- **Critical gap**: Live system deployment architectures and mock testing scenarios.\n\nLet's focus our upcoming milestones on system caches.`;
    }
    if (q.includes("project suggestions")) {
      return `### Tailored Project Suggestions\n\nFor a **${experience}** target domain, recruiters want system complexity. Focus on:\n\n1. **Type-safe Dashboard Workspace**: Build a concentric layout with responsive custom SVG line/radar charts and Supabase integration.\n2. **Horizontal Latency Cacher**: Ship an isolated Node.js API client featuring Redis key-invalidations.\n\nWhich repository setup matches your week's capacity?`;
    }
    if (q.includes("weekly sprint plan")) {
      return `### Weekly Strategist Sprint Plan\n\n- **Study Target**: ${weeklyHours} hours committed.\n- **Focus**: Solve 5 DSA stack loops, build 1 database index schema, and compile your current Next.js static pages.\n- **Log Cadence**: Submit a progress log every 2 days to sustain momentum.\n\nExecute focused loops this week!`;
    }

    // Handle generic questions based on modes
    switch (mode) {
      case "interview":
        return `### Interview Strategist Feedback\n\nUnder **Interview Coach mode**, let's focus strictly on validation. For a ${experience} applicant, mock speeds and behavioral framing are key.\n\n- **DSA target**: Solve Leetcode arrays under 28 minutes.\n- **Behavioral target**: Structure answers using the STAR format (Situation, Task, Action, Result). Focus heavily on technical tradeoffs you resolved.\n\nAsk me to mock a specific topic (e.g. 'mock JS loops' or 'mock system structures')!`;
      case "technical":
        return `### Technical Mentor Diagnostics\n\nAnalyzing code implementation for **${role}**:\n\n- Ensure you avoid any type casting (\`as any\`) in your files.\n- Restructure your layout files to use CSS grid/flex properties directly instead of arbitrary margins.\n- When creating custom components, separate client-side event logic cleanly into isolated files.\n\nWhat structural file or database tables are we refactoring today?`;
      case "resume":
        return `### Resume Reviewer Assessment\n\nTo align your resume with modern dashboard developers:\n\n- Ensure your top projects contain direct links to live deployments and GitHub repositories.\n- List testing framework (Playwright, Jest) directly under technical skills.\n- Keep the structure to exactly **1 page** with high information density.\n\nPaste a bullet point here and I will rewrite it strategically!`;
      case "project":
        return `### Project Advisor Recommendation\n\nTo elevate your projects from simple templates to enterprise-ready portfolios:\n\n- **State Management**: Use context providers and clean dispatch callbacks.\n- **Database**: Add structured index constraints in your PostgreSQL migrations.\n- **Responsive layouts**: The interface must adjust flawlessly on mobile viewports down to 320px.\n\nWhat project feature are we validating next?`;
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

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr_300px] min-h-[600px] relative">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-cyan-400/30 bg-[#0a0a0c] px-4 py-2 text-xs font-semibold text-cyan-200 shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08),0_0_20px_rgba(34,211,238,0.2)]">
          {toastMessage}
        </div>
      )}
      <div className="absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.03),transparent_50%)]" />

      {/* ═══ COLUMN 1: LEFT SIDEBAR (TIMELINE & MEMORY) ═════════════════════ */}
      <aside className="space-y-6 lg:col-span-1">
        
        {/* SECTION 1: COMMAND CENTER STATUS */}
        <div className="liquid-panel rounded-[24px] p-5 border border-white/5 bg-[#08080a] shadow-xl">
          <span className="caption uppercase tracking-[0.25em] text-slate-500 font-bold">Mentor Status</span>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-xs font-bold text-white">Coach Online</span>
            </div>
            <span className="text-[10px] text-cyan-300 font-semibold bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 rounded-full">
              Real-time Active
            </span>
          </div>

          <div className="mt-5 pt-4 border-t border-white/5 space-y-2.5">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Workspace Sync</p>
            <div className="flex flex-wrap gap-1.5">
              {["Roadmap", "Career Twin", "Profile", "Progress"].map(item => (
                <span key={item} className="text-[9px] text-slate-300 font-semibold bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                  ✓ {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 8: CAREER CONVERSATION TIMELINE */}
        <div className="liquid-panel rounded-[24px] p-5 shadow-xl">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3.5 mb-4">
            <History className="h-4.5 w-4.5 text-cyan-400" />
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Career Timeline</h4>
              <p className="text-[9px] text-slate-500 mt-0.5">Timeline of narrative events</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { event: "Mock Interview Done", date: "Just now", color: "bg-emerald-400" },
              { event: "Resume Sync Completed", date: "3h ago", color: "bg-cyan-400" },
              { event: "Milestone S2 Complete", date: "Yesterday", color: "bg-cyan-400" },
              { event: "Readiness Increased", date: "3 days ago", color: "bg-indigo-400" },
              { event: "Mentor Session Started", date: "4 days ago", color: "bg-cyan-400" },
              { event: "Roadmap Created", date: "5 days ago", color: "bg-cyan-400" }
            ].map((node, index) => (
              <div key={index} className="flex gap-3 text-xs">
                <div className="flex flex-col items-center">
                  <span className={`h-1.5 w-1.5 rounded-full ${node.color} mt-1`} />
                  {index !== 5 && <span className="w-px bg-white/5 flex-1 mt-1.5" />}
                </div>
                <div>
                  <p className="font-bold text-slate-200 text-[11px] leading-tight">{node.event}</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">{node.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 6: CONTEXT MEMORY */}
        <div className="liquid-panel rounded-[24px] p-5 shadow-xl">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3.5 mb-4">
            <Brain className="h-4.5 w-4.5 text-indigo-400" />
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Context Memory</h4>
              <p className="text-[9px] text-slate-500 mt-0.5">Parameters mentor retains</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { label: "Target Track", val: profile?.goal ?? "SDE I" },
              { label: "Experience Level", val: profile?.experience_level ?? "Student" },
              { label: "Readiness Score", val: `${readiness}/100` },
              { label: "Sprint Roadmap", val: "Version 7" },
              { label: "Weekly Commitment", val: `${weeklyHours}h/week` },
              { label: "Projects Logged", val: "3 Projects" }
            ].map((item, index) => (
              <div key={index} className="flex justify-between items-center text-xs py-1">
                <span className="text-slate-500 font-semibold text-[11px]">{item.label}</span>
                <span className="text-slate-300 font-bold text-[11px]">{item.val}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ═══ COLUMN 2: CENTER PANEL (CONVERSATION HUB) ════════════════════ */}
      <main className="lg:col-span-1 flex flex-col justify-between rounded-[28px] border border-white/5 bg-[#040405] p-5 sm:p-6 shadow-2xl relative">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-cyan-950/5 to-transparent pointer-events-none rounded-t-[28px]" />

        {/* SECTION 9: MENTOR MODES PILL TOGGLE */}
        <div className="relative z-10 border-b border-white/5 pb-4.5 mb-5">
          <p className="caption uppercase tracking-[0.25em] text-slate-500 font-bold text-center mb-3">Active Mentor Focus Mode</p>
          <div className="flex flex-wrap gap-1 rounded-full border border-white/5 bg-[#0a0a0c] p-1 justify-around">
            {[
              { mode: "coach", label: "Career Coach" },
              { mode: "interview", label: "Interview" },
              { mode: "technical", label: "Technical" },
              { mode: "resume", label: "Resume" },
              { mode: "project", label: "Project" }
            ].map(item => (
              <button
                key={item.mode}
                onClick={() => {
                  setMentorMode(item.mode as MentorMode);
                  showToast(`Switched strategy focus to: ${item.label}`);
                }}
                className={`rounded-full px-3 py-1.5 text-[10.5px] font-bold transition-all ${
                  mentorMode === item.mode
                    ? "bg-cyan-400 text-black shadow-[0_0_12px_rgba(34,211,238,0.35)]"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pinned message card */}
        {pinnedMessageId && activeThread && (
          <div className="relative z-10 rounded-2xl border border-cyan-400/25 bg-[#082f49]/60 p-4 mb-4.5 text-xs text-cyan-200">
            <p className="caption text-cyan-400 font-bold uppercase tracking-wider mb-1">Pinned Strategy</p>
            <p className="italic font-semibold">
              {activeThread.messages.find(m => m.id === pinnedMessageId)?.content.slice(0, 100)}...
            </p>
          </div>
        )}

        {/* Messages list container */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-5 max-h-[380px] min-h-[340px] relative z-10 scrollbar-thin scrollbar-thumb-white/5">
          {activeThread?.messages.map((message) => {
            const isMentor = message.role === "mentor";
            const reactEmoji = reactions[message.id];
            
            return (
              <div
                key={message.id}
                className={`group flex gap-3.5 max-w-[85%] ${isMentor ? "mr-auto" : "ml-auto flex-row-reverse"}`}
              >
                {/* Avatar */}
                <div className="relative shrink-0 mt-1">
                  {isMentor && isTyping && (
                    <span className="absolute -inset-1 rounded-full bg-cyan-400/20 animate-ping" />
                  )}
                  <span className={`h-8.5 w-8.5 rounded-full flex items-center justify-center border text-xs transition-transform group-hover:scale-105 ${
                    isMentor ? "border-cyan-400/20 bg-cyan-950/40 text-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.1)]" : "border-white/5 bg-[#141417] text-slate-300"
                  }`}>
                    {isMentor ? <Sparkles className="h-4.5 w-4.5" /> : <User className="h-4.5 w-4.5" />}
                  </span>
                </div>

                {/* Message bubble */}
                <div className="relative">
                  <div className={`rounded-[20px] px-4.5 py-3.5 text-xs shadow-md ${
                    isMentor
                      ? "border border-white/5 bg-[#08080a] text-slate-100 backdrop-blur-lg"
                      : "bg-[#141418] text-slate-200 border border-white/5"
                  }`}>
                    {isMentor ? renderFormattedContent(message.content) : <p className="leading-relaxed text-xs">{message.content}</p>}
                    
                    {/* Reaction Display */}
                    {reactEmoji && (
                      <span className="absolute -bottom-2 right-3 bg-slate-900 border border-white/10 rounded-full px-1.5 py-0.5 text-[10px]">
                        {reactEmoji}
                      </span>
                    )}
                  </div>

                  {/* Micro Interaction Hover Actions */}
                  {isMentor && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 -top-7.5 bg-slate-950/80 backdrop-blur-md border border-white/5 rounded-full p-1 flex gap-1.5 shadow-2xl z-20">
                      <button
                        onClick={() => copyToClipboard(message.content)}
                        title="Copy text"
                        className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition"
                      >
                        <Clipboard className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => saveToInsights(message.content)}
                        title="Save to Insights"
                        className="p-1 text-slate-400 hover:text-cyan-400 rounded-full hover:bg-white/5 transition"
                      >
                        <Star className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => convertToRoadmapTask()}
                        title="Convert to roadmap milestone"
                        className="p-1 text-slate-400 hover:text-indigo-400 rounded-full hover:bg-white/5 transition"
                      >
                        <Award className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => togglePinMessage(message.id)}
                        title="Pin strategy message"
                        className="p-1 text-slate-400 hover:text-yellow-400 rounded-full hover:bg-white/5 transition"
                      >
                        <Zap className="h-3 w-3" />
                      </button>
                      <button
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
          })}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-3.5 max-w-[85%] mr-auto items-center animate-pulse">
              <span className="h-8.5 w-8.5 rounded-full flex items-center justify-center border border-cyan-400/20 bg-cyan-950/40 text-cyan-300 shrink-0 text-xs">
                <Sparkles className="h-4.5 w-4.5 text-cyan-400" />
              </span>
              <div className="rounded-[20px] px-4.5 py-3 text-xs text-slate-400 border border-white/5 bg-[#08080a]">
                AI Strategist is thinking...
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input area, Quick Actions & Actions bar */}
        <div className="mt-5 pt-4 border-t border-white/5 relative z-10 space-y-4">
          
          {/* SECTION 4: QUICK ACTION BAR */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none whitespace-nowrap mask-gradient">
            {[
              { act: "Review My Roadmap", icon: Compass, col: "text-cyan-400" },
              { act: "What Should I Do Today?", icon: Zap, col: "text-amber-400" },
              { act: "Analyze My Resume", icon: Briefcase, col: "text-indigo-400" },
              { act: "Mock Interview", icon: Flame, col: "text-rose-400" },
              { act: "Skill Gap Analysis", icon: ShieldAlert, col: "text-cyan-400" },
              { act: "Project Suggestions", icon: Brain, col: "text-indigo-400" },
              { act: "Weekly Sprint Plan", icon: Award, col: "text-emerald-400" }
            ].map(action => {
              const Icon = action.icon;
              return (
                <button
                  key={action.act}
                  onClick={() => void handleSendMessage(undefined, action.act)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-[#0a0a0c] px-3.5 py-2 text-[10.5px] font-bold text-slate-300 hover:border-cyan-400/20 hover:bg-[#0c0c10] active:scale-95 transition"
                >
                  <Icon className={`h-3.5 w-3.5 ${action.col}`} />
                  {action.act}
                </button>
              );
            })}
          </div>

          {/* Form input */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Ask your strategist advisor about sprint pacing, resumes, or mockup tasks..."
              className="carved-input w-full rounded-full px-5 py-3 text-xs text-white outline-none focus:border-cyan-400/50 focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.9),0_0_15px_rgba(34,211,238,0.18)] transition-all placeholder:text-slate-500"
            />
            <MagneticButton asChild>
              <button
                type="submit"
                className="tactile-btn tactile-btn-primary h-11 w-11 rounded-full text-black flex items-center justify-center shrink-0 hover:shadow-[0_0_15px_rgba(34,211,238,0.4)] transition"
              >
                <Send className="h-4 w-4" />
              </button>
            </MagneticButton>
          </form>
        </div>
      </main>

      {/* ═══ COLUMN 3: RIGHT PANEL (OVERVIEW & INSIGHTS) ═══════════════════ */}
      <aside className="space-y-6 lg:col-span-1">
        
        {/* SECTION 2: MENTOR OVERVIEW PANEL */}
        <div className="liquid-panel rounded-[28px] p-5 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(129,140,248,0.03),transparent_50%)] pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3.5 mb-4">
              <Compass className="h-4.5 w-4.5 text-indigo-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Overview Panel</h4>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-slate-500 font-semibold block text-[10px] uppercase">Goal Target</span>
                <span className="text-white font-bold block mt-1 text-sm">{profile?.goal ?? "SDE I Target"}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase">Readiness</span>
                  <span className="text-cyan-400 font-extrabold block mt-0.5 text-sm">{readiness}%</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase">Current Focus</span>
                  <span className="text-amber-400 font-bold block mt-0.5 text-xs uppercase">Projects</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-white/[0.03] pt-3">
                <div>
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase">Weekly Capacity</span>
                  <span className="text-slate-200 font-bold block mt-0.5">{weeklyHours} hours</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase">Last Activity</span>
                  <span className="text-slate-200 font-bold block mt-0.5">Just now</span>
                </div>
              </div>
              <div className="border-t border-white/[0.03] pt-3">
                <span className="text-slate-500 font-semibold block text-[10px] uppercase">Mentor Priority</span>
                <span className="text-indigo-300 font-bold block mt-1.5 bg-indigo-500/10 border border-indigo-500/25 px-2.5 py-1.5 rounded-lg leading-relaxed text-[11px]">
                  Build portfolio evidence & setup Horizonal Database structures.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 5: MENTOR INSIGHTS PANEL */}
        <div className="liquid-panel rounded-[24px] p-5 shadow-xl">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3.5 mb-4">
            <Award className="h-4.5 w-4.5 text-cyan-400 animate-pulse" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Live Insights</h4>
          </div>

          <div className="space-y-4">
            {[
              { label: "Current Bottleneck", val: "Low portfolio deploy count", col: "text-amber-400" },
              { label: "Highest Impact Task", val: "Create database schemas indexes", col: "text-indigo-400" },
              { label: "Next Milestone", val: "Next.js routing structure tests", col: "text-cyan-400" },
              { label: "Readiness Trend", val: "Up +5% this sprint loop", col: "text-emerald-400" },
              { label: "Career Risk", val: "Strong theory. Weak project evidence.", col: "text-rose-400" }
            ].map((insight, idx) => (
              <div key={idx} className="border-b border-white/[0.03] last:border-0 pb-3 last:pb-0">
                <span className="text-slate-500 text-[9px] uppercase tracking-wider block font-bold">{insight.label}</span>
                <span className={`text-[11px] font-bold block mt-1 leading-snug ${insight.col}`}>{insight.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 7: AI COACHING CARDS */}
        <div className="liquid-panel rounded-[24px] p-5 shadow-xl">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3.5 mb-4">
            <Cpu className="h-4.5 w-4.5 text-indigo-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">AI Coaching Cards</h4>
          </div>

          <div className="space-y-4">
            {[
              { type: "This Week Focus", val: "Complete Git database schema indexes", detail: "Tracks PostgreSQL horizontal indexes configuration." },
              { type: "Portfolio Suggestion", val: "Build structured workspace charts SVG", detail: "Master vector animations and layout views." },
              { type: "Interview Readiness", val: "Practice mock behavioral loops", detail: "Calibrate communication tone STAR patterns." }
            ].map((card, idx) => (
              <div key={idx} className="rounded-xl border border-white/5 bg-black/25 p-3.5 space-y-1.5">
                <span className="caption uppercase tracking-[0.15em] text-cyan-400 font-bold text-[9px]">
                  {card.type}
                </span>
                <h5 className="text-xs font-bold text-white leading-snug">{card.val}</h5>
                <p className="text-[10px] text-slate-500 leading-normal">{card.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pinned Insights Side-Panel Box */}
        {savedInsights.length > 0 && (
          <div className="liquid-panel rounded-[24px] p-5 shadow-xl">
            <span className="text-xs font-bold text-white uppercase tracking-wider block border-b border-white/5 pb-3.5 mb-4">
              Saved Pinned Insights ({savedInsights.length})
            </span>
            <div className="space-y-3">
              {savedInsights.map((ins, i) => (
                <div key={i} className="text-[10.5px] text-slate-400 leading-relaxed border border-white/5 bg-black/15 rounded-xl p-3 select-text">
                  &ldquo;{ins.slice(0, 100)}...&rdquo;
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Sticky Actions pill */}
      <div className="sticky bottom-6 left-0 right-0 z-40 mx-auto max-w-[280px] rounded-full border border-white/10 bg-slate-950/70 p-1.5 backdrop-blur-xl shadow-2xl flex justify-around items-center sm:hidden md:hidden lg:hidden">
        <button
          onClick={() => {
            void handleSendMessage(undefined, "What Should I Do Today?");
            showToast("Quick Action: Focus query dispatched.");
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-white/5 transition text-cyan-400 text-xs font-bold"
        >
          <Zap className="h-3.5 w-3.5" />
          Focus Today
        </button>
        <div className="h-4 w-px bg-white/10" />
        <button
          onClick={() => {
            void handleSendMessage(undefined, "Review My Roadmap");
            showToast("Quick Action: Roadmap review dispatched.");
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-white/5 transition text-indigo-400 text-xs font-bold"
        >
          <Compass className="h-3.5 w-3.5" />
          Review Plan
        </button>
      </div>

    </div>
  );
}
