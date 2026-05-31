"use client";

import { MagneticButton } from "./magnetic-button";
import { Code2, ShieldCheck } from "lucide-react";

type AuthProvidersProps = {
  onProviderSelect: (provider: "google" | "github") => void;
  loading?: boolean;
};

export function AuthProviders({ onProviderSelect, loading = false }: AuthProvidersProps) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      <MagneticButton
        type="button"
        onClick={() => onProviderSelect("google")}
        disabled={loading}
        className="tactile-btn tactile-btn-primary inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
      >
        <ShieldCheck className="h-4 w-4" />
        Continue with Google
      </MagneticButton>
      <MagneticButton
        type="button"
        onClick={() => onProviderSelect("github")}
        disabled={loading}
        className="tactile-btn inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        <Code2 className="h-4 w-4" />
        Continue with GitHub
      </MagneticButton>
    </div>
  );
}
