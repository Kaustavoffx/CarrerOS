import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { SettingsDashboard } from "@/components/settings-dashboard";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadAppData } from "@/lib/app-data";
import { loadAiProviderStatuses } from "@/lib/ai-provider-store";
import type { AiProviderStatusRecord } from "@/lib/supabase/types";

export default async function SettingsPage() {
  let profile = null;
  let workspace = null;
  let aiProviders: AiProviderStatusRecord[] = [];
  let userEmail: string | null = null;
  let userId = "";

  if (hasSupabaseConfig()) {
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

    userEmail = user.email ?? null;
    userId = user.id;

    const data = await loadAppData(supabase, user.id);
    profile = data.profile;
    workspace = data.workspace;
    aiProviders = await loadAiProviderStatuses(user.id);

    if (!profile?.onboarding_complete) {
      redirect("/onboarding");
    }
  } else {
    redirect("/login");
  }

  return (
    <WorkspaceShell profile={profile} workspace={workspace}>
      <SettingsDashboard
        profile={profile}
        workspace={workspace}
        initialProviders={aiProviders}
        userEmail={userEmail}
        userId={userId}
      />
    </WorkspaceShell>
  );
}
