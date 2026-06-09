"use client";

import React from "react";
import {
  Shield,
  Activity,
  AlertTriangle,
  Brain,
  RefreshCw,
  Send,
  Loader2,
  Globe,
  Terminal
} from "lucide-react";
import Link from "next/link";
import { useCommunitySupport } from "./community-support-context";

type CommunitySupportLayoutProps = {
  activeTab: "discovery" | "matching" | "gaps" | "heatmap" | "review";
  children: React.ReactNode;
};

export function CommunitySupportLayout({ activeTab, children }: CommunitySupportLayoutProps) {
  const {
    feedEvents,
    feedFilter,
    setFeedFilter,
    criticalDeficiencies,
    setDismissedShortages,
    healthMetrics,
    selectedWorkflowResourceId,
    setSelectedWorkflowResourceId,
    workflowAction,
    setWorkflowAction,
    workflowLogs,
    isWorkflowRunning,
    workflowOutput,
    triggerAgentAction,
    resources,
    chatMessages,
    chatInput,
    setChatInput,
    isChatTyping,
    handleSendChatMessage,
    chatBottomRef,
    copiedId,
    copyToClipboard
  } = useCommunitySupport();

  const activeWorkflowResource = resources.find((r) => r.id === selectedWorkflowResourceId);

  return (
    <div className="space-y-6">
      {/* --- Dashboard Tactical Header Banner --- */}
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
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
                      <strong>Shortage:</strong> {gap.city} lacks certified <strong>{gap.type}</strong> facilities.
                    </p>
                    <div className="flex gap-2">
                      <Link
                        href="/resource-discovery"
                        className="text-[9px] text-rose-400 font-bold hover:underline"
                      >
                        Investigate Gap
                      </Link>
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
        {/* --- CENTER COLUMN (MAIN WORKSPACE): Intelligence Tabs + Active Child --- */}
        {/* ========================================================================= */}
        <div className="lg:col-span-6 space-y-6">
          {/* Navigation Tab Menu */}
          <div className="flex border border-white/5 bg-slate-900/50 rounded-2xl p-1 relative z-10 shrink-0 overflow-x-auto">
            <Link
              href="/resource-discovery"
              prefetch={true}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl transition-all whitespace-nowrap text-center ${
                activeTab === "discovery" ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Resource Discovery
            </Link>
            <Link
              href="/support-navigator"
              prefetch={true}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl transition-all whitespace-nowrap text-center ${
                activeTab === "matching" ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Match Engine
            </Link>
            <Link
              href="/community-heatmap"
              prefetch={true}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl transition-all whitespace-nowrap text-center ${
                activeTab === "heatmap" ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Heatmap Matrix
            </Link>
            <Link
              href="/community-gaps"
              prefetch={true}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl transition-all whitespace-nowrap text-center ${
                activeTab === "gaps" ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Gap Reports
            </Link>
            <Link
              href="/report-need"
              prefetch={true}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl transition-all whitespace-nowrap text-center ${
                activeTab === "review" ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Review Queue
            </Link>
          </div>

          {children}
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
                {resources.map((r) => (
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
                onClick={() => triggerAgentAction(selectedWorkflowResourceId, activeWorkflowResource?.name || "Target", workflowAction)}
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
