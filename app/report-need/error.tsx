"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { CardSurface } from "@/components/ui/card-surface";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Community route error:", error);
  }, [error]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <PageHero
        badge="System Interruption"
        title="Intelligence Temporarily Offline"
        subtitle="Our regional data uplinks experienced a disruption."
      />
      <CardSurface variant="glass" className="p-12 text-center flex flex-col items-center justify-center min-h-[500px]">
        <div className="h-16 w-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="h-8 w-8 text-rose-400" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Telemetry Sync Failed</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
          The community systems were unable to retrieve the latest dataset. This usually resolves automatically within a few moments.
        </p>
        <div className="flex gap-4 items-center justify-center">
          <button
            onClick={() => reset()}
            className="flex items-center gap-2 px-6 py-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-sm font-bold text-cyan-300 hover:bg-cyan-900/50 transition active:scale-95"
          >
            <RefreshCw className="h-4 w-4" />
            Attempt Reconnection
          </button>
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/10 transition"
          >
            Return to Mission Control
          </Link>
        </div>
      </CardSurface>
    </div>
  );
}
