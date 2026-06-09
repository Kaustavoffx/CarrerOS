import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { CommunitySupportIntelligence } from "@/components/community-support-intelligence";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadAppData } from "@/lib/app-data";

export default async function CommunityIntelligencePage() {
  let profile = null;
  let workspace = null;

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

    const data = await loadAppData(supabase, user.id);
    profile = data.profile;
    workspace = data.workspace;

    if (!profile?.onboarding_complete) {
      redirect("/onboarding");
    }
  } else {
    redirect("/login");
  }

  return (
    <WorkspaceShell profile={profile} workspace={workspace}>
      <CommunitySupportIntelligence profile={profile} workspace={workspace} />
    </WorkspaceShell>
  );
}
