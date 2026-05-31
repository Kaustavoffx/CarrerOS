"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { MagneticButton } from "./magnetic-button";
import { Code2, Mail, ShieldCheck, Sparkles } from "lucide-react";

export function LoginPanel() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleOAuth(provider: "google" | "github") {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setStatus("Set your Supabase environment variables to enable sign-in.");
      return;
    }

    setLoading(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=/onboarding`;
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
      setStatus("Set your Supabase environment variables to enable email login.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` }
    });

    if (error) {
      setStatus(error.message);
      setLoading(false);
      return;
    }

    setStatus("Check your email for a secure login link.");
    setLoading(false);
  }

  return (
    <div className="liquid-panel rounded-[24px] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.45)] sm:p-8">
      <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 caption text-cyan-200 relative z-10">
        <Sparkles className="h-3.5 w-3.5" />
        Supabase Auth
      </div>
      <h2 className="mt-6 heading-dashboard text-white relative z-10">Sign in and pick up where you left off.</h2>
      <p className="mt-3 max-w-xl body text-slate-300 relative z-10">
        Google, GitHub, or email login with Supabase. Your roadmap, progress, notes, and mentor chats stay in the cloud.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 relative z-10">
        <MagneticButton
          type="button"
          onClick={() => void handleOAuth("google")}
          disabled={loading}
          className="tactile-btn tactile-btn-primary inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 small font-semibold text-black disabled:opacity-60"
        >
          <ShieldCheck className="h-4 w-4" />
          Continue with Google
        </MagneticButton>
        <MagneticButton
          type="button"
          onClick={() => void handleOAuth("github")}
          disabled={loading}
          className="tactile-btn inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 small font-semibold text-white disabled:opacity-60"
        >
          <Code2 className="h-4 w-4" />
          Continue with GitHub
        </MagneticButton>
      </div>

      <form onSubmit={(event) => void handleEmail(event)} className="mt-6 space-y-3 relative z-10">
        <label className="caption text-slate-400">Email login</label>
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
          className="tactile-btn tactile-btn-primary inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 small font-semibold text-black disabled:opacity-60"
        >
          {loading ? <span className="loading-spinner mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
          Send magic link
        </MagneticButton>
      </form>

      <div className="mt-6 rounded-2xl border border-[#141417] bg-[#0c0c0e] p-4 small text-slate-300 relative z-10">
        <p className="body font-semibold text-white">No AI generation on sign-in.</p>
        <p className="mt-1 small">The first login opens onboarding so the workspace starts full, not empty.</p>
      </div>

      {status ? <p className="mt-4 small text-cyan-200 relative z-10">{status}</p> : null}
    </div>
  );
}
