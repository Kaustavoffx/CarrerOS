"use client";

import { MagneticButton } from "./magnetic-button";

type AuthProvidersProps = {
  onProviderSelect: (provider: "google" | "github") => void;
  loading?: boolean;
  activeProvider?: "google" | "github" | null;
};

export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

export function AuthProviders({ onProviderSelect, loading = false, activeProvider = null }: AuthProvidersProps) {
  return (
    <div className="mt-4 flex flex-col gap-2.5">
      <MagneticButton
        type="button"
        onClick={() => onProviderSelect("google")}
        disabled={loading}
        aria-label="Continue with Google"
        className="flex w-full h-[46px] items-center justify-center gap-3 rounded-xl border border-[#e3e3e3] bg-[#ffffff] px-[18px] text-xs font-bold text-[#1f1f1f] transition-all duration-150 hover:bg-[#f2f2f2] hover:-translate-y-0.5 active:translate-y-0 focus:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer shadow-sm transform-gpu"
      >
        {activeProvider === "google" ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1f1f1f] border-t-transparent" aria-hidden="true" />
        ) : (
          <GoogleIcon className="h-4 w-4 shrink-0" />
        )}
        <span>{activeProvider === "google" ? "Authenticating..." : "Continue with Google"}</span>
      </MagneticButton>

      <MagneticButton
        type="button"
        onClick={() => onProviderSelect("github")}
        disabled={loading}
        aria-label="Continue with GitHub"
        className="flex w-full h-[46px] items-center justify-center gap-3 rounded-xl border border-[#30363d] bg-[#24292f] px-[18px] text-xs font-bold text-[#ffffff] transition-all duration-150 hover:bg-[#2f363d] hover:-translate-y-0.5 active:translate-y-0 focus:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer shadow-sm transform-gpu"
      >
        {activeProvider === "github" ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
        ) : (
          <GitHubIcon className="h-4 w-4 shrink-0" />
        )}
        <span>{activeProvider === "github" ? "Authenticating..." : "Continue with GitHub"}</span>
      </MagneticButton>
    </div>
  );
}

