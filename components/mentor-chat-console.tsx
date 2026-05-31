"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, User, MessageSquare, Cpu, Clock } from "lucide-react";
import { MagneticButton } from "./magnetic-button";
import { FeatureStatusBadge } from "./feature-status";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { updateWorkspace } from "@/lib/app-data";
import type { ChatThread, ChatMessage, UserProfileRecord, WorkspaceSnapshotRecord } from "@/lib/supabase/types";

type MentorChatConsoleProps = {
  profile: UserProfileRecord | null;
  workspace: WorkspaceSnapshotRecord | null;
};

export function MentorChatConsole({ profile, workspace: initialWorkspace }: MentorChatConsoleProps) {
  const [workspace, setWorkspace] = useState<WorkspaceSnapshotRecord | null>(initialWorkspace);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
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

  // Persist Workspace state helper
  async function persistWorkspaceChange(updated: Partial<WorkspaceSnapshotRecord>) {
    if (!workspace) return;
    const nextState = { ...workspace, ...updated };
    setWorkspace(nextState);

    try {
      if (supabase && profile?.id) {
        await updateWorkspace(supabase, profile.id, updated);
        showToast("Synchronized with cloud workspace.");
      } else {
        showToast("Saved locally.");
      }
    } catch {
      showToast("Cloud sync failed. Saved to memory.");
    }
  }

  const activeThread = workspace?.ai_chats.find((t) => t.id === activeThreadId) || null;

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !workspace || !activeThreadId) return;

    const userMsgText = newMessage.trim();
    setNewMessage("");

    // 1. Create and append user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: userMsgText,
      created_at: new Date().toISOString()
    };

    const updatedChats = workspace.ai_chats.map((t) => {
      if (t.id !== activeThreadId) return t;
      return { ...t, messages: [...t.messages, userMsg], updated_at: new Date().toISOString() };
    });

    const nextWorkspace = { ...workspace, ai_chats: updatedChats };
    setWorkspace(nextWorkspace);
    setIsTyping(true);

    // Persist user message to Supabase
    try {
      if (supabase && profile?.id) {
        await updateWorkspace(supabase, profile.id, { ai_chats: updatedChats });
      }
    } catch {
      // Memory state persists
    }

    // 2. Fetch AI Mentor response (OpenAI endpoint or tailored fallback)
    try {
      const response = await fetch("/api/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsgText,
          profile,
          threadHistory: activeThread?.messages || []
        })
      });

      const data = await response.json();
      const mentorReplyText = data.reply || getSimulatedResponse(userMsgText);

      // Create and append mentor reply
      const mentorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "mentor",
        content: mentorReplyText,
        created_at: new Date().toISOString()
      };

      const finalChats = nextWorkspace.ai_chats.map((t) => {
        if (t.id !== activeThreadId) return t;
        return { ...t, messages: [...t.messages, mentorMsg], updated_at: new Date().toISOString() };
      });

      setWorkspace({ ...nextWorkspace, ai_chats: finalChats });

      // Persist final thread
      if (supabase && profile?.id) {
        await updateWorkspace(supabase, profile.id, { ai_chats: finalChats });
      }
    } catch {
      // Local fallback in case of connection limits
      const fallbackReply = getSimulatedResponse(userMsgText);
      const mentorMsg: ChatMessage = {
        id: crypto.randomUUID(),
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

  // Highly adaptive, premium localized AI Mentor simulator
  function getSimulatedResponse(query: string): string {
    const q = query.toLowerCase();
    const role = profile?.goal || "Frontend Engineer";
    const experience = profile?.experience_level || "Junior";

    if (q.includes("help") || q.includes("how") || q.includes("portfolio")) {
      return `For a ${experience} level targeting a "${role}" track, portfolio proof-of-work is your primary leverage. \n\nI recommend: \n1. **Build 1 Visible Case Study**: Focus on one strong feature rather than a thin collection of pages. Document tradeoffs (e.g. why you selected HSL colors or key Framer Motion spring speeds). \n2. **Isolate Gaps**: If you struggle with advanced testing, set up a simple Playwright suite and write down your testing stories. \n\nWhat specific codebase or mock application are we refining this week? Let's write down the sprint parameters.`;
    }

    if (q.includes("replan") || q.includes("stuck") || q.includes("time") || q.includes("busy")) {
      return `I hear you. Balancing time availability is one of the biggest bottlenecks. Since you have a goal of "${role}", let's run a micro-replan: \n\nInstead of aiming for 15 hours of study, let's shrink this week's sprint commitment to a **3-hour Focused Loop**: \n- Spend 1 hour reviewing API Design notes. \n- Spend 2 hours shipping a tiny isolated custom hook or CSS morph element. \n\nI can trigger an adaptive replan for your saved sprints if you click the **AI Replan** button on the roadmaps board. Let's adjust parameters slowly without building fatigue.`;
    }

    return `Understood. Analyzing your target focus: "${role}". To ensure your technical positioning is launch-ready, we should orient this week around high-quality proof of work. \n\nLet's verify: \n- Have you committed a custom design or component to GitHub this week? \n- What is the most complex database schema or state pattern you have built recently? \n\nGive me some details so I can calibrate our upcoming adaptive milestones!`;
  }

  // Create new chat thread
  async function handleCreateThread() {
    if (!workspace) return;
    const newThread: ChatThread = {
      id: crypto.randomUUID(),
      title: `Sprint Calibrator ${workspace.ai_chats.length + 1}`,
      topic: profile?.goal || "Career strategy",
      updated_at: new Date().toISOString(),
      messages: [
        {
          id: crypto.randomUUID(),
          role: "mentor",
          content: `Hello! I have loaded your diagnostic profile. Targeting "${profile?.goal || "Frontend role"}". Let's use this thread to calibrate strategy sprints and technical tradeoffs.`,
          created_at: new Date().toISOString()
        }
      ]
    };

    const ai_chats = [...workspace.ai_chats, newThread];
    await persistWorkspaceChange({ ai_chats });
    setActiveThreadId(newThread.id);
    showToast("Opened new strategy discussion.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr] min-h-[500px]">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-cyan-400/30 bg-[#0a0a0c] px-4 py-2 text-xs font-semibold text-cyan-200 shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08),0_0_20px_rgba(34,211,238,0.2)]">
          {toastMessage}
        </div>
      )}
      
      {/* THREADS SIDEBAR LIST */}
      <div className="liquid-panel rounded-[24px] p-4 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-4 relative z-10">
            <span className="caption text-slate-500 flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-cyan-400" /> Co-Pilot Logs
            </span>
            <button
              type="button"
              onClick={handleCreateThread}
              disabled
              aria-disabled="true"
              title="🧪 Beta: AI Mentor thread creation will be available after launch stabilization."
              className="tactile-btn caption rounded-full px-2.5 py-1 text-slate-300 animate-fade-in disabled:cursor-not-allowed disabled:opacity-40"
            >
              + New
            </button>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[380px] relative z-10">
            {workspace?.ai_chats.map((thread) => {
              const active = thread.id === activeThreadId;
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setActiveThreadId(thread.id)}
                  disabled
                  aria-disabled="true"
                  title="🧪 Beta: switching mentor threads is temporarily disabled during launch gating."
                  className={`w-full flex flex-col items-start rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer ${
                    active
                      ? "border-cyan-400/40 bg-[#082f49] text-cyan-200 shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.12),0_0_12px_rgba(34,211,238,0.1)]"
                      : "border-[#202028] bg-[#0c0c0e] text-slate-400 hover:border-[#30303c] hover:bg-[#141418] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_4px_8px_rgba(0,0,0,0.4)]"
                  } active:scale-[0.98]`}
                >
                  <span className="font-bold small text-white line-clamp-1">{thread.title}</span>
                  <span className="caption opacity-75 mt-1">{thread.topic}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-white/5 pt-4 mt-4 space-y-2 caption text-slate-500 relative z-10">
          <div className="flex items-center gap-2"><Cpu className="h-3.5 w-3.5 text-cyan-400" /> Core: <FeatureStatusBadge status="beta" featureName="AI Mentor" className="px-2 py-0.5 text-[9px]" /></div>
          <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-cyan-400" /> Active session synced</div>
        </div>
      </div>

      {/* CHAT HUB PANEL */}
      <div className="liquid-panel rounded-[24px] p-6 flex flex-col justify-between relative overflow-hidden min-h-[500px]">
        
        {/* Thread Header */}
        <div className="border-b border-white/5 pb-4 mb-4 flex items-center justify-between relative z-10">
          <div>
            <h3 className="heading-card text-white">{activeThread?.title || "Co-Pilot Mentor"}</h3>
            <p className="small text-slate-400 mt-1">Topic: {activeThread?.topic || "Career strategy calibration"}</p>
          </div>
          <div className="rounded-full bg-[#082f49] border border-cyan-400/25 px-4 py-2 caption text-cyan-200 shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
            <FeatureStatusBadge status="beta" featureName="AI Mentor" className="px-0 py-0 border-0 bg-transparent text-cyan-200" />
          </div>
        </div>

        {/* Scrollable messages area */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[360px] min-h-[300px] relative z-10">
          {activeThread?.messages.map((message) => {
            const isMentor = message.role === "mentor";
            return (
              <div
                key={message.id}
                className={`flex gap-3 max-w-[85%] ${isMentor ? "mr-auto" : "ml-auto flex-row-reverse"}`}
              >
                <span className={`h-8 w-8 rounded-full flex items-center justify-center border shrink-0 text-xs ${
                  isMentor ? "border-cyan-400/25 bg-[#082f49] text-cyan-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" : "border-[#202028] bg-[#141418] text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
                }`}>
                  {isMentor ? <Sparkles className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </span>

                <div className={`rounded-2xl px-4 py-2 small ${
                  isMentor ? "liquid-card border border-[#202028] bg-[#0c0c0e] text-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.03)]" : "carved-input text-slate-300"
                }`}>
                  {message.content.split("\n\n").map((para, i) => (
                    <p key={i} className={i > 0 ? "mt-3" : ""}>{para}</p>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Morphing typing indicator */}
          {isTyping && (
            <div className="flex gap-3 max-w-[85%] mr-auto items-center animate-pulse">
              <span className="h-8 w-8 rounded-full flex items-center justify-center border border-cyan-400/25 bg-[#082f49] text-cyan-200 shrink-0 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="liquid-card rounded-2xl px-4 py-2 small text-slate-400 border border-[#202028] bg-[#0c0c0e] shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
                AI Mentor is formulating advice...
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Message Input form */}
        <form onSubmit={handleSendMessage} className="mt-6 border-t border-white/5 pt-4 flex gap-2 relative z-10">
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled
            aria-disabled="true"
            placeholder="Ask your mentor about skill pacing, portfolio proof of work, or sprint calibration..."
            title="🧪 Beta: AI Mentor chat is disabled until launch readiness is complete."
            className="carved-input w-full rounded-full px-4 py-2 small text-white focus:border-cyan-400/60 focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.95),0_0_15px_rgba(34,211,238,0.25)] disabled:cursor-not-allowed disabled:opacity-40"
          />
          <MagneticButton asChild>
            <button
              type="submit"
              disabled
              aria-disabled="true"
              title="🧪 Beta: AI Mentor sending is disabled during launch gating."
              className="tactile-btn tactile-btn-primary h-10 w-10 rounded-full text-black flex items-center justify-center shrink-0 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </MagneticButton>
        </form>

      </div>

    </div>
  );
}
