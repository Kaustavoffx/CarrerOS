import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createStarterWorkspace } from "@/lib/workspace";

export default async function OnboardingPage() {
  if (!hasSupabaseConfig()) {
    const demo = createStarterWorkspace("Front-end role at a startup", "Junior");
    return (
      <main className="min-h-screen px-6 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-slate-300 backdrop-blur-2xl">
          <p className="caption text-cyan-200">Onboarding preview</p>
          <h1 className="mt-4 heading-dashboard text-white">Supabase is not configured yet.</h1>
          <p className="mt-3 small">The seeded onboarding flow is ready, but the database connection needs env vars before it can save.</p>
          <pre className="mt-6 overflow-auto rounded-2xl border border-white/10 bg-black/25 p-4 small text-slate-200">{JSON.stringify(demo.profile, null, 2)}</pre>
        </div>
      </main>
    );
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<{ onboarding_complete: boolean; full_name: string | null }>();

  if (profile?.onboarding_complete) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen px-6 py-10 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <OnboardingWizard userId={user.id} email={user.email} displayName={profile?.full_name ?? user.user_metadata?.full_name ?? user.email ?? undefined} />
      </div>
    </main>
  );
}
