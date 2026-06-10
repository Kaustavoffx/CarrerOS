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
import { PageHero, CardSurface } from "@/components/ui";
import { buttonStyle, inputStyle } from "@/styles/careeros-design-system";

// ─── Design Input Wrapper ────────────────────────────────────────────────────

function DesignInput({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const state = isFocused ? "focus" : isHovered ? "hover" : "base";
  return (
    <input
      {...props}
      style={{ ...inputStyle(state), ...props.style }}
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

import { useState } from "react";

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
      <PageHero
        badge="CSI Command Center // Live Encryption Active"
        title="Community Support Intelligence"
        subtitle="Government-grade regional assessment, AI resource matching, and agentic eligibility validation operations."
        actions={
          <div className="flex items-center gap-4 bg-slate-900/60 border border-white/5 rounded-2xl p-3 shrink-0">
            <Globe className="h-8 w-8 text-cyan-500/80 animate-spin-slow shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Operational Mode</p>
              <p className="text-xs font-bold text-white">District Gap Monitoring</p>
              <p className="text-[9px] font-mono text-cyan-400/70">SYNC: 100% OK</p>
            </div>
          </div>
        }
      />

      {/* --- Main 3-Column command setup --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ========================================================================= */}
        {/* --- LEFT COLUMN: Health Overview + Feed + Crisis Shortages --- */}
        {/* ========================================================================= */}
        <div className="lg:col-span-3 space-y-6 flex flex-col">
          
          {/* Health Index Metric Ring */}
          <CardSurface variant="surface" className="p-4 space-y-4">
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
          </CardSurface>

          {/* Crisis Detection alerts */}
          {criticalDeficiencies.length > 0 && (
            <CardSurface variant="glass" className="border-rose-500/10 bg-rose-950/10 p-4 space-y-3">
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
            </CardSurface>
          )}

          {/* AI Support Operations Feed */}
          <CardSurface variant="surface" className="p-4 space-y-3 flex-1 flex flex-col">
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
          </CardSurface>
        </div>

        {/* ========================================================================= */}
        {/* --- CENTER COLUMN (MAIN WORKSPACE): Intelligence Tabs + Active Child --- */}
        {/* ========================================================================= */}
        <div className="lg:col-span-6 space-y-6">
          {/* Navigation Tab Menu */}
          <div className="flex border border-white/5 bg-slate-900/50 rounded-2xl p-1 relative z-10 shrink-0 overflow-x-auto gap-1">
            <Link
              href="/resource-discovery"
              prefetch={true}
              style={activeTab === "discovery" ? { ...buttonStyle("secondary"), height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" } : { ...buttonStyle("ghost"), height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              className="flex-1 py-2 px-3 text-xs font-semibold rounded-xl whitespace-nowrap text-center"
            >
              Resource Discovery
            </Link>
            <Link
              href="/support-navigator"
              prefetch={true}
              style={activeTab === "matching" ? { ...buttonStyle("secondary"), height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" } : { ...buttonStyle("ghost"), height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              className="flex-1 py-2 px-3 text-xs font-semibold rounded-xl whitespace-nowrap text-center"
            >
              Match Engine
            </Link>
            <Link
              href="/community-heatmap"
              prefetch={true}
              style={activeTab === "heatmap" ? { ...buttonStyle("secondary"), height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" } : { ...buttonStyle("ghost"), height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              className="flex-1 py-2 px-3 text-xs font-semibold rounded-xl whitespace-nowrap text-center"
            >
              Heatmap Matrix
            </Link>
            <Link
              href="/community-gaps"
              prefetch={true}
              style={activeTab === "gaps" ? { ...buttonStyle("secondary"), height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" } : { ...buttonStyle("ghost"), height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              className="flex-1 py-2 px-3 text-xs font-semibold rounded-xl whitespace-nowrap text-center"
            >
              Gap Reports
            </Link>
            <Link
              href="/report-need"
              prefetch={true}
              style={activeTab === "review" ? { ...buttonStyle("secondary"), height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" } : { ...buttonStyle("ghost"), height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              className="flex-1 py-2 px-3 text-xs font-semibold rounded-xl whitespace-nowrap text-center"
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
          <CardSurface variant="surface" className="p-4 space-y-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
              Agentic Workflow Center
            </p>

            <div className="space-y-3">
              <select
                value={selectedWorkflowResourceId}
                onChange={(e) => setSelectedWorkflowResourceId(e.target.value)}
                style={inputStyle("base")}
                className="w-full text-slate-300"
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
                  style={workflowAction === "verify_eligibility" ? { ...buttonStyle("secondary"), height: "32px", fontSize: "10px" } : { ...buttonStyle("ghost"), height: "32px", fontSize: "10px" }}
                  className="flex-1 font-bold"
                >
                  Verify Eligibility
                </button>
                <button
                  onClick={() => setWorkflowAction("draft_sop_or_application")}
                  style={workflowAction === "draft_sop_or_application" ? { ...buttonStyle("secondary"), height: "32px", fontSize: "10px" } : { ...buttonStyle("ghost"), height: "32px", fontSize: "10px" }}
                  className="flex-1 font-bold"
                >
                  Draft SOP
                </button>
              </div>

              <button
                onClick={() => triggerAgentAction(selectedWorkflowResourceId, activeWorkflowResource?.name || "Target", workflowAction)}
                disabled={isWorkflowRunning}
                style={buttonStyle("primary")}
                className="w-full flex items-center justify-center gap-2"
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
          </CardSurface>

          {/* AI Community Navigator Chat */}
          <CardSurface variant="surface" className="p-4 flex-1 flex flex-col overflow-hidden space-y-3">
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
                <DesignInput
                  type="text"
                  placeholder="Ask about resources..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()}
                  className="flex-1 px-3 py-1.5 bg-transparent border-none text-[11px] text-white"
                />
                <button
                  onClick={handleSendChatMessage}
                  style={{ ...buttonStyle("primary"), height: "32px", width: "32px", padding: 0 }}
                  className="flex items-center justify-center shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </CardSurface>
        </div>

      </div>
    </div>
  );
}
