import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { hasSupabaseEnv } from "@/lib/supabase";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export default async function LoginPage() {
  if (hasSupabaseEnv()) {
    const supabase = await getSupabaseServerClient();

    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("onboarding_complete").eq("id", user.id).maybeSingle<{ onboarding_complete: boolean }>();
        redirect(profile?.onboarding_complete ? "/dashboard" : "/onboarding");
      }
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-10 sm:px-8 lg:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-8 lg:grid-cols-[1.02fr_0.98fr]">
        <div>
          <p className="caption text-cyan-200">CareerOS access</p>
          <h1 className="mt-4 max-w-3xl heading-hero text-white">A private workspace that remembers everything.</h1>
          <p className="mt-5 max-w-2xl body text-slate-300">
            Sign in with Google, GitHub, or email. Your dashboard, roadmaps, notes, and mentor threads stay synced in Supabase.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 small text-slate-300">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">Dashboard</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">Roadmaps</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">Career Twin</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">AI Mentor</span>
          </div>
          <div className="mt-8 rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5 small leading-7 text-slate-300 backdrop-blur-2xl">
            <p className="body font-semibold text-white">Supabase setup</p>
            <p className="mt-1 small">Environment keys are detected. Login sessions persist after refresh through Supabase Auth.</p>
            <Link href="/" className="mt-4 inline-flex text-cyan-200 underline decoration-cyan-200/40 underline-offset-4">Back to landing</Link>
          </div>
        </div>

        <AuthForm mode="login" />
      </div>
    </main>
  );
}
