import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  if (!hasSupabaseConfig()) {
    redirect("/login");
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
