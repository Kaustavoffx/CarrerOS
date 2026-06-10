"use client";

import React, { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled Route Exception:", error);
  }, [error]);

  return (
    <div className="max-w-xl mx-auto py-20 px-6">
      <ErrorState
        title="Command Pipeline Exception"
        description={error?.message || "An unhandled execution trace sync error occurred while loading this workspace module."}
        onRetry={() => reset()}
        onRefresh={() => window.location.reload()}
      />
    </div>
  );
}
