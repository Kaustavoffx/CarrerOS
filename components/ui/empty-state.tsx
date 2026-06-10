"use client";

import React from "react";
import { FolderOpen } from "lucide-react";
import { CardSurface } from "@/components/ui/card-surface";
import { buttonStyle } from "@/styles/careeros-design-system";

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: EmptyStateAction | React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  icon: Icon = FolderOpen,
  action,
  className = "",
  children,
}: EmptyStateProps) {
  return (
    <CardSurface
      variant="glass"
      className={`flex flex-col items-center justify-center text-center p-8 min-h-[260px] border border-dashed border-white/10 ${className}`}
      noPadding
    >
      <div className="flex flex-col items-center max-w-sm space-y-4 p-6">
        {/* Glow halo around Icon */}
        <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 shadow-[0_0_15px_rgba(255,255,255,0.02)]">
          <Icon className="h-6 w-6 text-slate-400" />
          <span className="absolute -inset-1 rounded-2xl border border-cyan-500/10 opacity-50 pointer-events-none" />
        </div>

        <div className="space-y-1.5">
          <h4 className="text-sm font-bold text-white tracking-wide">{title}</h4>
          <p className="text-xs text-slate-400 leading-normal">{description}</p>
        </div>

        {action && (
          <div className="pt-2">
            {React.isValidElement(action) ? (
              action
            ) : (
              typeof action === "object" &&
              "onClick" in action &&
              "label" in action && (
                <button
                  onClick={(action as EmptyStateAction).onClick}
                  style={buttonStyle("secondary")}
                  className="px-4 py-2 text-xs font-bold"
                >
                  {(action as EmptyStateAction).label}
                </button>
              )
            )}
          </div>
        )}

        {children && <div className="pt-2">{children}</div>}
      </div>
    </CardSurface>
  );
}
