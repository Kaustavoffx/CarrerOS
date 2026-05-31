"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail, Sparkles } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { MagneticButton } from "./magnetic-button";
import { AuthProviders } from "./auth-providers";

type AuthMode = "login" | "signup";

type AuthFormProps = {
  mode: AuthMode;
};

export function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  async function handleOAuth(provider: "google" | "github") {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setStatus("Supabase env variables are missing.");
      return;
    }

    setLoading(true);

    const redirectTo = `${window.location.origin}/auth/callback?next=${isSignup ? "/onboarding" : "/dashboard"}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo }
    });

    if (error) {
      setStatus(error.message);
      setLoading(false);
      return;
    }
  }

  async function handleEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setStatus("Supabase env variables are missing.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${isSignup ? "/onboarding" : "/dashboard"}`
      }
    });

    if (error) {
      setStatus(error.message);
      setLoading(false);
      return;
    }

    setStatus(isSignup ? "Check your email to finish signup." : "Check your email to sign in.");
    setLoading(false);
  }

  return (
    <div className="liquid-panel rounded-[24px] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.45)] sm:p-8">
      <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-cyan-200 relative z-10">
        <Sparkles className="h-3.5 w-3.5" />
        Supabase Auth
      </div>
      <h2 className="mt-6 heading-dashboard text-white relative z-10">
        {isSignup ? "Create your account." : "Sign in and continue."}
      </h2>
      <p className="mt-3 max-w-xl body text-slate-300 relative z-10">
        Use Google, GitHub, or email. Your session is persisted and restored after refresh.
      </p>

      <div className="relative z-10">
        <AuthProviders onProviderSelect={(provider) => void handleOAuth(provider)} loading={loading} />
      </div>

      <form onSubmit={(event) => void handleEmail(event)} className="mt-6 space-y-3 relative z-10">
        <label className="caption text-slate-400">Email</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@domain.com"
          className="carved-input w-full rounded-xl px-4 py-2 text-white placeholder:text-slate-500 focus:border-cyan-400/60"
        />
        <MagneticButton
          type="submit"
          disabled={loading || !email}
          className="tactile-btn tactile-btn-primary inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
        >
          {loading ? <span className="loading-spinner mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
          {isSignup ? "Send signup link" : "Send login link"}
        </MagneticButton>
      </form>

      <p className="mt-5 small text-slate-300 relative z-10">
        {isSignup ? "Already have an account? " : "New here? "}
        <Link href={isSignup ? "/login" : "/signup"} className="text-cyan-200 underline decoration-cyan-200/40 underline-offset-4">
          {isSignup ? "Log in" : "Create account"}
        </Link>
      </p>

      {status ? <p className="mt-4 text-sm text-cyan-200 relative z-10">{status}</p> : null}
    </div>
  );
}
