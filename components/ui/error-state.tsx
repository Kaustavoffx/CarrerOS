"use client";

import React from "react";
import { AlertCircle, RotateCw, ArrowLeft, RefreshCw } from "lucide-react";
import { CardSurface } from "@/components/ui/card-surface";
import { buttonStyle } from "@/styles/careeros-design-system";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  onRefresh?: () => void;
  onGoBack?: () => void;
  className?: string;
}

export function ErrorState({
  title = "System Anomaly Detected",
  description = "A localized encryption sync error or network exception occurred while reading this matrix.",
  onRetry,
  onRefresh,
  onGoBack,
  className = "",
}: ErrorStateProps) {
  const handleGoBack = () => {
    if (onGoBack) {
      onGoBack();
    } else {
      window.history.back();
    }
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      window.location.reload();
    }
  };

  return (
    <CardSurface
      variant="glass"
      className={`flex flex-col items-center justify-center text-center p-8 min-h-[280px] border border-rose-500/10 bg-rose-950/5 ${className}`}
      noPadding
    >
      <div className="flex flex-col items-center max-w-sm space-y-4 p-6">
        {/* Pulsing Danger Icon */}
        <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-950/20 border border-rose-500/20 shadow-[0_0_15px_rgba(239,68,68,0.05)]">
          <AlertCircle className="h-6 w-6 text-rose-400 animate-pulse" />
          <span className="absolute -inset-1 rounded-2xl border border-rose-500/10 opacity-30 pointer-events-none" />
        </div>

        <div className="space-y-1.5">
          <h4 className="text-sm font-bold text-white tracking-wide">{title}</h4>
          <p className="text-xs text-slate-400 leading-normal">{description}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-3">
          {onRetry && (
            <button
              onClick={onRetry}
              style={buttonStyle("primary")}
              className="px-4 py-2 text-xs font-bold flex items-center gap-1.5 text-black"
            >
              <RotateCw className="h-3.5 w-3.5" />
              Retry Operation
            </button>
          )}

          <button
            onClick={handleRefresh}
            style={buttonStyle("secondary")}
            className="px-4 py-2 text-xs font-bold flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>

          <button
            onClick={handleGoBack}
            style={buttonStyle("ghost")}
            className="px-4 py-2 text-xs font-bold flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Go Back
          </button>
        </div>
      </div>
    </CardSurface>
  );
}
