"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Check, Lock, Shield, Database, Mail } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { MagneticButton } from "./magnetic-button";
import { AuthProviders } from "./auth-providers";

type AuthMode = "login" | "signup";

type AuthFormProps = {
  mode: AuthMode;
};

export function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [activeProvider, setActiveProvider] = useState<"google" | "github" | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const isSignup = mode === "signup";

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValidEmail = emailRegex.test(email);
  const showValidationError = touched && email.length > 0 && !isValidEmail;
  const showValidationSuccess = touched && email.length > 0 && isValidEmail;

  async function handleOAuth(provider: "google" | "github") {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setStatus("Supabase environment variables are missing.");
      setStatusType("error");
      return;
    }

    setLoading(true);
    setActiveProvider(provider);
    setLoadingMessage("Authenticating...");

    // Briefly simulate high-trust message right before external page transition
    const timer = setTimeout(() => {
      setLoadingMessage("Restoring workspace...");
    }, 800);

    const redirectTo = `${window.location.origin}/auth/callback?next=${isSignup ? "/onboarding" : "/dashboard"}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo }
    });

    clearTimeout(timer);

    if (error) {
      setStatus(error.message);
      setStatusType("error");
      setLoading(false);
      setActiveProvider(null);
      setLoadingMessage("");
      return;
    }
  }

  async function handleEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidEmail) return;

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setStatus("Supabase environment variables are missing.");
      setStatusType("error");
      return;
    }

    setLoading(true);
    setLoadingMessage("Authenticating...");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${isSignup ? "/onboarding" : "/dashboard"}`
      }
    });

    if (error) {
      setStatus(error.message);
      setStatusType("error");
      setLoading(false);
      setLoadingMessage("");
      return;
    }

    setLoading(false);
    setLoadingMessage("");
    setMagicLinkSent(true);
  }

  if (magicLinkSent) {
    return (
      <div className="flex flex-col gap-3 w-full max-w-[520px] mx-auto select-none">
        <div className="liquid-panel rounded-[24px] p-5 sm:p-6 shadow-[0_30px_100px_rgba(0,0,0,0.45)] relative border border-white/10 bg-[#080c14]/48 backdrop-blur-md">

          {/* Brand Lockup */}
          <div className="flex items-center gap-2 relative z-10 mb-4">
            <Image
              src="/logo.png"
              alt="CareerOS Logo"
              width={24}
              height={24}
              priority
              className="h-6 w-6 object-contain"
            />
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-wider text-white leading-none">CareerOS</span>
              <span className="text-[10px] text-slate-500 font-semibold leading-none mt-0.5">Private Career Workspace</span>
            </div>
          </div>

          <div className="mt-4 text-center relative z-10 py-2">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
              <Mail className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Check your inbox.</h3>
            <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
              We&apos;ve sent a secure sign-in link to <span className="font-semibold text-white">{email}</span>.
            </p>
            <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
              Please click the link in the email to complete verification and enter your workspace.
            </p>

            <button
              onClick={() => {
                setMagicLinkSent(false);
                setEmail("");
                setTouched(false);
                setStatus(null);
                setStatusType(null);
              }}
              className="mt-4 text-[11px] text-cyan-300 underline decoration-cyan-300/30 underline-offset-4 hover:text-white hover:decoration-white transition duration-200 cursor-pointer"
            >
              Use a different email or provider
            </button>
          </div>

          {/* Bottom Trust Signals */}
          <div className="mt-5 border-t border-white/5 pt-4 text-[10px] text-slate-500 relative z-10">
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-left">
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                <span>Protected by Supabase Auth</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                <span>Secure OAuth Authentication</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] border border-slate-700 rounded px-1 py-0.5 leading-none shrink-0 font-semibold font-mono">GDPR</span>
                <span>GDPR-Friendly Architecture</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                <span>Private Career Data Storage</span>
              </div>
            </div>
          </div>
        </div>

        {/* Outer footer block */}
        <p className="text-center text-[10px] text-slate-500/80 tracking-wide font-normal max-w-sm mx-auto leading-relaxed mt-1">
          Trusted workspace for roadmap execution, career intelligence, and professional growth.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full max-w-[520px] mx-auto select-none">
      <div className="liquid-panel rounded-[24px] p-5 sm:p-6 shadow-[0_30px_100px_rgba(0,0,0,0.45)] relative border border-white/10 bg-[#080c14]/48 backdrop-blur-md">

        {/* Brand Lockup */}
        <div className="flex items-center gap-2 relative z-10 mb-4">
          <Image
            src="/logo.png"
            alt="CareerOS Logo"
            width={24}
            height={24}
            priority
            className="h-6 w-6 object-contain"
          />
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-wider text-white leading-none">CareerOS</span>
            <span className="text-[10px] text-slate-500 font-semibold leading-none mt-0.5">Private Career Workspace</span>
          </div>
        </div>

        {/* Header copy */}
        <h2 className="mt-2 text-base font-bold text-white relative z-10">
          {isSignup ? "Create your workspace." : "Welcome back."}
        </h2>
        <p className="mt-0.5 text-xs text-slate-400 relative z-10 leading-relaxed">
          {isSignup ? "Start your CareerOS workspace." : "Continue to your CareerOS workspace."}
        </p>

        {/* Human Positioning statement */}
        <p className="mt-2 text-[11px] text-slate-500 relative z-10 font-normal leading-relaxed border-l border-cyan-400/20 pl-2">
          CareerOS helps you manage roadmaps, projects, career intelligence, and execution in one workspace.
        </p>

        {/* Auth providers */}
        <div className="relative z-10">
          <AuthProviders
            onProviderSelect={(provider) => void handleOAuth(provider)}
            loading={loading}
            activeProvider={activeProvider}
          />
        </div>

        {/* Session Confidence Indicators */}
        <div className="mt-4 grid grid-cols-2 gap-y-2 gap-x-4 border-t border-white/5 pt-4 text-[10px] text-slate-500 relative z-10 font-normal">
          <div className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-emerald-500 shrink-0" />
            <span>Session persists across devices</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-emerald-500 shrink-0" />
            <span>Encrypted authentication</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-emerald-500 shrink-0" />
            <span>Private workspace</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-emerald-500 shrink-0" />
            <span>No passwords stored</span>
          </div>
        </div>

        {/* Divider */}
        <div className="relative flex py-2 items-center z-10 mt-3">
          <div className="flex-grow border-t border-white/5"></div>
          <span className="flex-shrink mx-3 text-[9px] text-slate-500 uppercase tracking-widest font-bold">or login via secure link</span>
          <div className="flex-grow border-t border-white/5"></div>
        </div>

        {/* Form fields */}
        <form onSubmit={(event) => void handleEmail(event)} className="mt-2 space-y-3 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="email" className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Mail className="h-4 w-4 text-slate-500" />
                <span>Email Address</span>
              </label>
              {showValidationError && (
                <span className="text-[10px] text-red-400 font-semibold animate-pulse" id="email-error">Please enter a valid email</span>
              )}
              {showValidationSuccess && (
                <span className="text-[10px] text-emerald-400 font-semibold" id="email-success">Valid email address</span>
              )}
            </div>
            <input
              id="email"
              type="email"
              value={email}
              disabled={loading}
              autoComplete="email"
              aria-invalid={showValidationError}
              aria-describedby={showValidationError ? "email-error" : showValidationSuccess ? "email-success" : undefined}
              onChange={(event) => {
                setEmail(event.target.value);
                setTouched(true);
              }}
              onBlur={() => setTouched(true)}
              placeholder="name@domain.com"
              className={`w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 transition-all duration-200 outline-none h-[46px]
                ${loading ? "opacity-50 cursor-not-allowed bg-white/[0.02] border-white/5" : "bg-white/[0.04] border-white/10 carved-input"}
                ${showValidationError ? "border-red-500/40 bg-red-500/5 focus:border-red-500/60 focus:ring-2 focus:ring-red-500/10" : ""}
                ${showValidationSuccess ? "border-emerald-500/40 bg-emerald-500/5 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10" : ""}
                ${!showValidationError && !showValidationSuccess ? "focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-500/20" : ""}`}
            />
          </div>

          <MagneticButton
            type="submit"
            disabled={loading || !isValidEmail}
            className="flex h-[52px] w-full items-center justify-center gap-3 rounded-[14px] px-[18px] text-sm font-semibold text-black bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer shadow-[0_4px_20px_rgba(34,211,238,0.15)] focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            {loading && activeProvider === null ? (
              <>
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" aria-hidden="true" />
                <span>{loadingMessage || "Authenticating..."}</span>
              </>
            ) : (
              <>
                <Mail className="h-4.5 w-4.5 shrink-0" />
                <span>{isSignup ? "Send secure signup link" : "Send secure login link"}</span>
              </>
            )}
          </MagneticButton>
        </form>

        {/* Footer Navigation */}
        <p className="mt-4 text-xs text-slate-400 relative z-10 font-normal">
          {isSignup ? "Already have an account? " : "New here? "}
          <Link
            href={isSignup ? "/login" : "/signup"}
            className="text-cyan-300 underline decoration-cyan-300/30 underline-offset-4 hover:text-white hover:decoration-white transition duration-200"
          >
            {isSignup ? "Log in" : "Create account"}
          </Link>
        </p>

        {/* Supabase status errors */}
        {status && statusType === "error" ? (
          <p className="mt-3 text-xs text-red-400 relative z-10 border border-red-500/10 bg-red-500/5 p-2 rounded-lg flex items-center gap-2" role="alert">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-ping shrink-0" />
            <span>{status}</span>
          </p>
        ) : null}

        {/* Bottom Trust Signals */}
        <div className="mt-4 border-t border-white/5 pt-4 text-[10px] text-slate-500 relative z-10">
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-left">
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-slate-600 shrink-0" />
              <span>Protected by Supabase Auth</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-slate-600 shrink-0" />
              <span>Secure OAuth Authentication</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] border border-slate-700 rounded px-1 py-0.5 leading-none shrink-0 font-semibold font-mono">GDPR</span>
              <span>GDPR-Friendly Architecture</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-slate-600 shrink-0" />
              <span>Private Career Data Storage</span>
            </div>
          </div>
        </div>
      </div>

      {/* Outer footer block */}
      <p className="text-center text-[10px] text-slate-500/80 tracking-wide font-normal max-w-sm mx-auto leading-relaxed mt-1">
        Trusted workspace for roadmap execution, career intelligence, and professional growth.
      </p>
    </div>
  );
}


