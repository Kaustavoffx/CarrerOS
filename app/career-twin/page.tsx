import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { CareerTwinDashboard } from "@/components/career-twin-dashboard";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadAppData } from "@/lib/app-data";
import type { CommunityNeedReport } from "@/lib/supabase/types";

export default async function CareerTwinPage() {
  let profile = null;
  let workspace = null;
  let communityNeeds: CommunityNeedReport[] = [];

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
    communityNeeds = data.communityNeeds || [];

    if (!profile?.onboarding_complete) {
      redirect("/onboarding");
    }
  } else {
    redirect("/login");
  }

  return (
    <WorkspaceShell profile={profile} workspace={workspace}>
      <CareerTwinDashboard profile={profile} workspace={workspace} communityNeeds={communityNeeds} />
    </WorkspaceShell>
  );
}
