"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Send, User, Zap, Brain, Clipboard, Star, X,
  Link2, Edit2, CheckSquare, Square
} from "lucide-react";
import { MagneticButton } from "./magnetic-button";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { generateId } from "@/lib/id";
import { updateWorkspace, updateProfile } from "@/lib/app-data";
import type { ChatMessage, UserProfileRecord, WorkspaceSnapshotRecord } from "@/lib/supabase/types";

type MentorChatConsoleProps = {
  profile: UserProfileRecord | null;
  workspace: WorkspaceSnapshotRecord | null;
};

type MentorMode = "coach" | "interview" | "skill" | "resume" | "project";

function renderFormattedContent(content: string) {
  return content.split("\n\n").map((para, paraIdx) => {
    if (para.startsWith("```")) {
      const code = para.replace(/```[a-z]*/g, "").trim();
      return (
        <pre key={paraIdx} className="bg-black/45 border border-white/5 rounded-xl p-3.5 my-3.5 font-mono text-[10.5px] text-cyan-300 overflow-x-auto select-text leading-relaxed">
          <code>{code}</code>
        </pre>
      );
    }
    
    if (para.startsWith("- ") || para.startsWith("* ")) {
      const items = para.split(/\n[-*]\s+/);
      return (
        <ul key={paraIdx} className="list-disc pl-5 my-2.5 space-y-1.5 text-slate-300 text-xs">
          {items.map((item, itemIdx) => {
            const cleaned = item.replace(/^[-*]\s+/, "").trim();
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

    if (para.startsWith("### ")) {
      return (
        <h4 key={paraIdx} className="text-xs font-bold text-cyan-300 tracking-widest uppercase mt-4 mb-2">
          {para.replace("### ", "").trim()}
        </h4>
      );
    }

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

export function MentorChatConsole({ profile, workspace: initialWorkspace }: MentorChatConsoleProps) {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [workspace, setWorkspace] = useState<WorkspaceSnapshotRecord | null>(initialWorkspace);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  
  // Mentor strategic state variables
  const [mentorMode, setMentorMode] = useState<MentorMode>("coach");
  const [pinnedMessageId, setPinnedMessageId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, string>>({});
  const [savedInsights, setSavedInsights] = useState<string[]>([]);
  const [checkedRecs, setCheckedRecs] = useState<Record<string, boolean>>({});

  // Inline context editors state
  const [isEditingContext, setIsEditingContext] = useState(false);
  const [editGoal, setEditGoal] = useState("");
  const [editTimeAvailability, setEditTimeAvailability] = useState("");
  const [editWeeklyHours, setEditWeeklyHours] = useState("");

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

  useEffect(() => {
    setWorkspace(initialWorkspace);
    if (initialWorkspace?.ai_chats.length) {
      setActiveThreadId(initialWorkspace.ai_chats[0].id);
    }
  }, [initialWorkspace]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setResumeConnected(!!localStorage.getItem("profile_resume_url"));
      setPortfolioConnected(!!localStorage.getItem("profile_portfolio_url"));
      setGithubConnected(!!localStorage.getItem("profile_github_url"));
    }
  }, [profile]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [workspace, activeThreadId, isTyping]);

  function showToast(msg: string) {
    console.log(msg);
  }

  // ─── Real Data Fetching/Parsing Calculations ────────────────────────────────
  const activeRoadmap = workspace?.roadmaps?.find((r) => r.status === "Active") ?? workspace?.roadmaps?.[0] ?? null;
  const allMilestones = activeRoadmap ? (Array.isArray(activeRoadmap.milestones) ? activeRoadmap.milestones : []) : [];
  const completedCount = activeRoadmap ? Math.floor((activeRoadmap.progress / 100) * allMilestones.length) : 0;
  const remainingCount = allMilestones.length - completedCount;


  const activeThread = workspace?.ai_chats.find((t) => t.id === activeThreadId) || null;
  const readiness = profile?.readiness_score ?? 0;
  const weeklyHours = activeRoadmap?.weekly_hours ?? 10;
  
  const currentFocus = allMilestones[completedCount] 
    ? allMilestones[completedCount].title 
    : (profile?.skills?.[0] ?? "Core Strategy");



  // Dynamic priorities tasks
  const activeMilestoneObj = allMilestones[completedCount] || null;
  const milestoneTasks = activeMilestoneObj?.project_tasks || [];
  const completionCriteria = activeMilestoneObj?.completion_criteria || [];
  const prioritiesList = [
    ...milestoneTasks,
    ...completionCriteria
  ].slice(0, 3);

  // Pinned insight recommendations
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
    return list;
  };
  const activeInsights = getProactiveInsights();

  // Initialize context editing parameters
  const startEditingContext = () => {
    setEditGoal(profile?.goal || "");
    setEditTimeAvailability(profile?.time_availability || "");
    setEditWeeklyHours(weeklyHours.toString());
    setIsEditingContext(true);
  };

  const saveContext = async () => {
    if (!profile || !supabase) return;
    try {
      await updateProfile(supabase, profile.id, {
        goal: editGoal,
        time_availability: editTimeAvailability
      });

      if (activeRoadmap && workspace) {
        const updatedRoadmaps = workspace.roadmaps.map(r => {
          if (r.id === activeRoadmap.id) {
            return { ...r, weekly_hours: parseInt(editWeeklyHours) || 10 };
          }
          return r;
        });
        await updateWorkspace(supabase, profile.id, { roadmaps: updatedRoadmaps });
        setWorkspace(prev => prev ? { ...prev, roadmaps: updatedRoadmaps } : null);
      }
      setIsEditingContext(false);
      showToast("Mentor context parameters updated successfully.");
      router.refresh();
    } catch (err) {
      console.error(err);
      showToast("Failed to save context updates.");
    }
  };

  // ─── Messaging Core ─────────────────────────────────────────────────────────
  async function handleSendMessage(e?: React.FormEvent, customText?: string) {
    if (e) e.preventDefault();
    const queryText = (customText || newMessage).trim();
    if (!queryText || !workspace || !activeThreadId) return;

    setNewMessage("");

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
      if (profile?.id && supabase) {
        await updateWorkspace(supabase, profile.id, { ai_chats: updatedChats });
      }
    } catch {}

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

      if (profile?.id && supabase) {
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

  function getSimulatedResponse(query: string, mode: MentorMode): string {
    const q = query.toLowerCase();
    const role = profile?.goal || "Frontend Engineer";
    const experience = profile?.experience_level || "Junior";

    if (q.includes("resume")) {
      return `### Resume Performance Insights\n\nYour linked resume requires structural modifications to target **${role}** positions:\n\n- **Objective Audit**: Shift entries to highlight accomplishments (e.g. 'Optimized app renders by 32% under Next.js 15 routing pools.').\n- **Keyword Alignments**: Ensure TypeScript, Tailwind CSS, and testing libraries Jest/Vitest are indexed clearly.`;
    }
    if (q.includes("interview")) {
      return `### Technical Mock Challenge Initialized\n\n*Focus Area: React State Management*\n\nEvaluate this statement:\n\`\`\`javascript\nconst [data, setData] = useState({ state: 'active' });\n\`\`\`\nWhy is direct mutating state bad, and how does React Fiber schedule renders differently when set functions execute? Describe your understanding.`;
    }
    if (q.includes("project")) {
      return `### Recommended Technical Spec\n\nFor a **${experience}** target, build a **Distributed Latency Cache API**:\n\n- Node.js API with strict TypeScript schemas.\n- Redis key-value invalidation on state hooks.\n- Playwright integration verifying layout shifts.`;
    }
    
    switch (mode) {
      case "interview":
        return `### Technical Readiness Drill\n\n- Focus on array manipulation logic.\n- STAR structure: Star with target problem details first.`;
      case "resume":
        return `### Resume Reviewer Output\n\nEnsure direct links to your GitHub code repos are attached to all project descriptions.`;
      case "project":
        return `### Project Spec Assessment\n\nIsolate client-side state hooks from core business handlers.`;
      default:
        return `### Strategist Calibration\n\nTarget is **${role}** at **${readiness}%** readiness. Work on active tasks to speed up milestone progress.`;
    }
  }

  const addToRoadmap = async (taskText: string) => {
    if (!activeRoadmap || !workspace || !profile || !supabase) return;
    const updatedMilestones = allMilestones.map((m, idx) => {
      if (idx === completedCount) {
        return {
          ...m,
          project_tasks: [...(m.project_tasks || []), taskText]
        };
      }
      return m;
    });
    const updatedRoadmaps = workspace.roadmaps.map(r => {
      if (r.id === activeRoadmap.id) {
        return { ...r, milestones: updatedMilestones };
      }
      return r;
    });
    try {
      await updateWorkspace(supabase, profile.id, { roadmaps: updatedRoadmaps });
      setWorkspace(prev => prev ? { ...prev, roadmaps: updatedRoadmaps } : null);
      showToast("Added task draft to current roadmap milestone!");
      router.refresh();
    } catch (err) {
      console.error(err);
      showToast("Failed to write task draft to roadmap.");
    }
  };

  const saveNote = async (noteText: string) => {
    if (!profile || !workspace || !supabase) return;
    const newNote = {
      id: generateId(),
      title: "Strategist Insight Note",
      content: noteText,
      tag: "Strategy",
      created_at: new Date().toISOString()
    };
    const updatedNotes = [...(workspace.notes || []), newNote];
    try {
      await updateWorkspace(supabase, profile.id, { notes: updatedNotes });
      setWorkspace(prev => prev ? { ...prev, notes: updatedNotes } : null);
      showToast("Strategist note saved successfully.");
    } catch (err) {
      console.error(err);
      showToast("Failed to save note.");
    }
  };

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

  const triggerInlineEdit = (type: "resume" | "github") => {
    setInlineEditAccount(type);
    setInlineUrlVal(localStorage.getItem(`profile_${type}_url`) || "");
  };

  // ─── Shared Layout Render Elements ──────────────────────────────────────────
  const renderLeftSidebarContent = () => (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Mentor Context
          </h4>
          {!isEditingContext && (
            <button
              onClick={startEditingContext}
              className="text-slate-500 hover:text-cyan-300 transition"
              aria-label="Edit context parameters"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {isEditingContext ? (
          <div className="space-y-3 text-xs bg-[#0b0b0e] p-3 rounded-xl border border-white/5">
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Target Goal</label>
              <input
                type="text"
                value={editGoal}
                onChange={e => setEditGoal(e.target.value)}
                className="carved-input w-full px-2 py-1 text-xs rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Weekly Capacity</label>
              <input
                type="text"
                value={editTimeAvailability}
                onChange={e => setEditTimeAvailability(e.target.value)}
                className="carved-input w-full px-2 py-1 text-xs rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Weekly Hours</label>
              <input
                type="number"
                value={editWeeklyHours}
                onChange={e => setEditWeeklyHours(e.target.value)}
                className="carved-input w-full px-2 py-1 text-xs rounded-lg"
              />
            </div>
            <div className="flex gap-1.5 justify-end pt-1">
              <button
                type="button"
                onClick={() => setIsEditingContext(false)}
                className="text-[10px] font-semibold text-slate-400 px-2 py-1 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveContext}
                className="text-[10px] font-bold text-black bg-cyan-400 px-3 py-1 rounded-md"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 text-xs">
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase">Goal Target</span>
              <span className="text-white font-bold block mt-0.5">{profile?.goal || "SDE I"}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Roadmap</span>
                <span className="text-slate-200 font-bold block mt-0.5">
                  {activeRoadmap?.roadmap_version ? `v${activeRoadmap.roadmap_version}` : "None"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Readiness</span>
                <span className="text-cyan-400 font-extrabold block mt-0.5">{readiness}%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-3">
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Capacity</span>
                <span className="text-slate-200 font-bold block mt-0.5">{profile?.time_availability || "Not set"}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Weekly Hours</span>
                <span className="text-slate-200 font-bold block mt-0.5">{weeklyHours} hrs</span>
              </div>
            </div>

            <div className="border-t border-white/5 pt-3">
              <span className="text-slate-400 font-semibold block text-[10px] uppercase">Current focus area</span>
              <span className="text-indigo-300 font-bold block mt-0.5 leading-snug">{currentFocus}</span>
            </div>

            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase">Milestones</span>
              <span className="text-slate-200 font-bold block mt-0.5">
                {completedCount} Completed / {remainingCount} Remaining
              </span>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4 pt-4 border-t border-white/5">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">
          Identity Assets
        </h4>
        <div className="space-y-3.5 text-xs">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-slate-400 font-semibold block text-[9px] uppercase font-bold">Resume</span>
              <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded mt-1 inline-block border ${
                resumeConnected ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-white/5 text-slate-400 border-white/5"
              }`}>
                {resumeConnected ? "Active" : "Missing"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-[9px] uppercase font-bold">Portfolio</span>
              <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded mt-1 inline-block border ${
                portfolioConnected ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-white/5 text-slate-400 border-white/5"
              }`}>
                {portfolioConnected ? "Active" : "Missing"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-[9px] uppercase font-bold">GitHub</span>
              <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded mt-1 inline-block border ${
                githubConnected ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-white/5 text-slate-400 border-white/5"
              }`}>
                {githubConnected ? "Active" : "Missing"}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );

  const renderRightSidebarContent = () => (
    <div className="space-y-6">
      <section className="space-y-4">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">
          Priority Sprint Queue
        </h4>
        {prioritiesList.length === 0 ? (
          <div className="bg-black/20 border border-white/5 rounded-xl p-4 text-center text-xs text-slate-500">
            No active sprint goals cataloged.
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

      <section className="space-y-4 pt-4 border-t border-white/5">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">
          Action Recommendations
        </h4>
        <div className="space-y-3">
          {[
            { id: "ar1", action: "Resume Review Simulation", query: "Please run diagnostic checks on my credentials resume.", impact: "Optimizes recruiter targeting score", priority: "High" },
            { id: "ar2", action: "State Management Challenge", query: "Let's perform mock interview drills for React/Redux.", impact: "Improves technical coding confidence", priority: "High" },
            { id: "ar3", action: "LinkedIn SEO Calibration", query: "How should I structure keyword indexes on LinkedIn?", impact: "Triggers recruiter match loops", priority: "Medium" }
          ].map((rec) => {
            const isChecked = checkedRecs[rec.id] ?? false;
            return (
              <div key={rec.id} className={`border p-3 rounded-xl transition ${
                isChecked ? "border-cyan-500/10 bg-cyan-950/[0.01] text-slate-500" : "border-white/5 bg-black/20 hover:border-cyan-400/25"
              }`}>
                <div className="flex items-start gap-2.5">
                  <button
                    onClick={() => setCheckedRecs(prev => ({ ...prev, [rec.id]: !prev[rec.id] }))}
                    className="shrink-0 mt-0.5 text-cyan-400"
                  >
                    {isChecked ? (
                      <CheckSquare className="h-4 w-4 fill-cyan-400 text-black" />
                    ) : (
                      <Square className="h-4 w-4 text-slate-600" />
                    )}
                  </button>

                  <div className="flex-1 space-y-1 min-w-0">
                    <span className="text-[8px] font-extrabold uppercase tracking-wider block text-cyan-300">{rec.priority} Priority</span>
                    <h5 className={`text-xs font-bold truncate text-white ${isChecked ? "line-through opacity-40 text-slate-400" : ""}`}>{rec.action}</h5>
                    <p className="text-[9px] text-slate-500 leading-tight">{rec.impact}</p>

                    {!isChecked && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5 mt-2">
                        <button
                          onClick={() => handleRecommendationClick(rec.query, "coach")}
                          className="text-[9px] text-cyan-400 font-bold hover:underline"
                        >
                          Ask AI
                        </button>
                        <button
                          onClick={() => void addToRoadmap(rec.action)}
                          className="text-[9px] text-indigo-400 font-bold hover:underline"
                        >
                          + Roadmap
                        </button>
                        <button
                          onClick={() => void saveNote(rec.action + ": " + rec.impact)}
                          className="text-[9px] text-slate-400 font-bold hover:underline"
                        >
                          Save Note
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );

  return (
    <div className="min-h-screen text-slate-200 max-w-[1440px] mx-auto relative px-4 sm:px-6">
      <div className="absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.03),transparent_50%)]" />

      {/* Mobile drawer overlays for screen sizes below lg */}
      <div className="flex items-center justify-between gap-4 lg:hidden bg-white/[0.02] border border-white/[0.06] backdrop-blur-md rounded-2xl p-3 mb-6 shadow-md">
        <button
          type="button"
          onClick={() => setIsLeftDrawerOpen(true)}
          className="tactile-btn flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-300 rounded-xl flex-1"
        >
          <Brain className="h-4 w-4 text-cyan-400" />
          Context Memory
        </button>
        <button
          type="button"
          onClick={() => setIsRightDrawerOpen(true)}
          className="tactile-btn flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-300 rounded-xl flex-1"
        >
          <Zap className="h-4 w-4 text-cyan-400" />
          Action Center
        </button>
      </div>

      {/* Mobile left side drawer */}
      {isLeftDrawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-black/40 backdrop-blur-sm">
          <div className="relative w-80 max-w-[85vw] bg-[#0b0b0e]/90 border-r border-white/10 p-6 space-y-6 overflow-y-auto backdrop-blur-xl">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <span className="text-xs font-bold text-white uppercase tracking-widest">Mentor Context</span>
              <button 
                type="button"
                onClick={() => setIsLeftDrawerOpen(false)} 
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {renderLeftSidebarContent()}
          </div>
          <div className="flex-1" onClick={() => setIsLeftDrawerOpen(false)} />
        </div>
      )}

      {/* Mobile right side drawer */}
      {isRightDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden bg-black/40 backdrop-blur-sm">
          <div className="relative max-h-[85vh] bg-[#0b0b0e]/90 border-t border-white/10 p-6 rounded-t-[28px] space-y-6 overflow-y-auto backdrop-blur-xl">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <span className="text-xs font-bold text-white uppercase tracking-widest">Action Center</span>
              <button 
                type="button"
                onClick={() => setIsRightDrawerOpen(false)} 
                className="text-slate-400 hover:text-white p-1"
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
        
        {/* LEFT COLUMN: Context Memory Sidebar */}
        <aside className="hidden lg:block space-y-6 card-data p-5.5 shadow-xl">
          {renderLeftSidebarContent()}
        </aside>

        {/* CENTER COLUMN: Chat Interface */}
        <main className="flex flex-col min-h-[580px] bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl rounded-[28px] p-5 sm:p-6 shadow-2xl relative">
          
          {/* Conversation Header: CareerOS Strategist */}
          <div className="flex items-center gap-2.5 pb-3 mb-3 border-b border-white/5">
            <Image src="/logo.png" alt="CareerOS" width={22} height={22} className="object-contain" />
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">CareerOS Strategist</h3>
              <p className="text-[9px] text-slate-500 font-semibold">Connected to active roadmap execution queue</p>
            </div>
          </div>
          
          {/* MENTOR HEADER - Advisor Pillars */}
          <div className="relative z-10 border-b border-white/5 pb-4 mb-5">
            <div className="flex flex-wrap gap-1 rounded-full border border-white/[0.06] bg-white/[0.02] p-1 justify-around max-w-[550px] mx-auto shadow-inner">
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
                    showToast(`Active Strategist swapped: ${item.label}`);
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
            
            {/* ═══ SPOTLIGHT CARD 1: AI STRATEGIST INSIGHT ════════════════════ */}
            {activeInsights.length > 0 && (
              <article className="card-spotlight rounded-[24px] p-5 mb-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 h-32 w-48 bg-cyan-400/5 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex items-start gap-3.5">
                  <Image src="/logo.png" alt="Strategist" width={18} height={18} className="shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1 text-xs">
                    <span className="text-cyan-300 font-extrabold uppercase tracking-widest text-[9px]">Live Strategist Insights</span>
                    <ul className="space-y-1 text-slate-200 font-semibold list-disc list-inside">
                      {activeInsights.slice(0, 2).map((ins, i) => (
                        <li key={i} className="leading-relaxed">{ins}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            )}

            {pinnedMessageId && activeThread && (
              <div className="relative z-10 rounded-2xl border border-cyan-400/25 bg-[#082f49]/60 p-4 mb-4 text-xs text-cyan-200">
                <p className="caption text-cyan-400 font-bold uppercase tracking-wider mb-1">Pinned Strategy</p>
                <p className="italic font-semibold">
                  {activeThread.messages.find(m => m.id === pinnedMessageId)?.content.slice(0, 100)}...
                </p>
              </div>
            )}

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-5 max-h-[420px] min-h-[300px] scrollbar-thin scrollbar-thumb-white/5 relative mb-4">
              {activeThread?.messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                  <Brain className="h-10 w-10 text-slate-600 animate-pulse" />
                  <h4 className="text-slate-400 font-semibold text-sm">Strategist Session Initialized</h4>
                  <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                    Query parameters dynamically calibrated to goal {profile?.goal || "SDE"}. Send a message below to strategize.
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
                      <div className="relative shrink-0 mt-1">
                        <span className={`h-8.5 w-8.5 rounded-full flex items-center justify-center border text-xs transition-transform group-hover:scale-105 ${
                          isMentor 
                            ? "border-cyan-400/20 bg-cyan-950/40 text-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.1)]" 
                            : "border-white/5 bg-[#141417] text-slate-300"
                        }`}>
                          {isMentor ? <Image src="/logo.png" alt="Strategist" width={18} height={18} className="object-contain" /> : <User className="h-4.5 w-4.5" />}
                        </span>
                      </div>

                      <div className="relative">
                        <div className={`rounded-[20px] px-4.5 py-3.5 text-xs shadow-md group-hover:shadow-[0_0_15px_rgba(34,211,238,0.03)] transition duration-300 ${
                          isMentor
                            ? "chat-message-assistant text-slate-100"
                            : "chat-message-user text-slate-200"
                        }`}>
                          {isMentor ? renderFormattedContent(message.content) : <p className="leading-relaxed text-xs">{message.content}</p>}
                          
                          {reactEmoji && (
                            <span className="absolute -bottom-2 right-3 bg-slate-900 border border-white/10 rounded-full px-1.5 py-0.5 text-[10px]">
                              {reactEmoji}
                            </span>
                          )}
                        </div>

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
                              onClick={() => togglePinMessage(message.id)}
                              title="Pin strategy message"
                              className="p-1 text-slate-400 hover:text-yellow-400 rounded-full hover:bg-white/5 transition"
                            >
                              <Zap className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setReaction(message.id, "👍")}
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

              {isTyping && (
                <div className="flex gap-3.5 max-w-[85%] mr-auto items-center animate-pulse">
                  <span className="h-8.5 w-8.5 rounded-full flex items-center justify-center border border-cyan-400/20 bg-cyan-950/40 text-cyan-300 shrink-0 text-xs">
                    <Image src="/logo.png" alt="Thinking" width={18} height={18} className="object-contain" />
                  </span>
                  <div className="rounded-[20px] px-4.5 py-3 text-xs text-slate-400 border border-white/5 bg-white/[0.03] backdrop-blur-md">
                    AI Strategist is thinking...
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Smart input actions panel */}
            <div className="border-t border-white/5 pt-4 space-y-3 relative">
              
              {/* SMART ACTIONS */}
              <div className="flex flex-wrap gap-2">
                {newMessage.toLowerCase().includes("resume") && (
                  <button
                    type="button"
                    onClick={() => triggerInlineEdit("resume")}
                    className="inline-flex items-center gap-1 bg-[#091a14] hover:bg-[#0c241c] border border-emerald-500/25 px-3 py-1.5 rounded-xl text-[10px] font-bold text-emerald-300 transition-colors duration-[120ms]"
                  >
                    <Link2 className="h-3 w-3" />
                    Upload Resume Link
                  </button>
                )}
                {newMessage.toLowerCase().includes("project") && (
                  <button
                    type="button"
                    onClick={() => triggerInlineEdit("github")}
                    className="inline-flex items-center gap-1 bg-[#091a14] hover:bg-[#0c241c] border border-emerald-500/25 px-3 py-1.5 rounded-xl text-[10px] font-bold text-emerald-300 transition-colors duration-[120ms]"
                  >
                    <Link2 className="h-3 w-3" />
                    Attach GitHub Repo
                  </button>
                )}
              </div>

              {/* Inline connector inputs */}
              {inlineEditAccount && (
                <div className="flex items-center gap-2 bg-[#08080a] border border-white/10 rounded-xl p-2.5 shadow-2xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider shrink-0 pl-1">
                    {inlineEditAccount === "resume" ? "Resume" : "GitHub"} URL:
                  </span>
                  <input
                    type="text"
                    value={inlineUrlVal}
                    onChange={(e) => setInlineUrlVal(e.target.value)}
                    className="carved-input flex-1 text-xs px-2.5 py-1.5 text-white"
                    placeholder="https://..."
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
                        showToast(`${inlineEditAccount === "resume" ? "Resume" : "GitHub"} URL linked.`);
                      }}
                      className="text-[10px] font-extrabold px-3 py-1.5 rounded bg-cyan-400 text-black hover:bg-cyan-300 transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="flex items-center gap-3 relative p-1.5 mentor-input-dock rounded-[20px]">
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Ask advisor about roadmap, resume review, mock interviews, or project specification..."
                  className="w-full bg-transparent px-4 py-2.5 text-xs text-white outline-none border-none placeholder:text-slate-500"
                />
                <MagneticButton asChild>
                  <button
                    type="submit"
                    className="tactile-btn-primary h-10 w-10 rounded-xl text-black flex items-center justify-center shrink-0 transition"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </MagneticButton>
              </form>

            </div>
          </div>
        </main>

        {/* RIGHT COLUMN: Action Center Sidebar */}
        <aside className="hidden lg:block space-y-6 bg-[#08080a] border border-white/5 rounded-[24px] p-5.5 shadow-xl">
          {renderRightSidebarContent()}
        </aside>

      </div>

      {/* Pinned Insights bottom log */}
      {savedInsights.length > 0 && (
        <section className="card-data rounded-[24px] p-5 shadow-xl mb-20 max-w-[1440px] mx-auto border border-white/5">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-4">
            <Star className="h-4.5 w-4.5 text-cyan-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Pinned Strategy Notes ({savedInsights.length})
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedInsights.map((ins, i) => (
              <div key={i} className="text-[11px] text-slate-300 leading-relaxed border border-white/5 bg-black/15 rounded-xl p-3.5 relative">
                <button
                  type="button"
                  onClick={() => setSavedInsights(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute right-2 top-2 p-1 text-slate-500 hover:text-rose-400"
                >
                  <X className="h-3 w-3" />
                </button>
                &ldquo;{ins}&rdquo;
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
