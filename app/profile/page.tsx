import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { ProfileDashboard } from "@/components/profile-dashboard";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadAppData } from "@/lib/app-data";

export default async function ProfilePage() {
  let profile = null;
  let workspace = null;
  let userId = null;

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

    userId = user.id;
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
      <ProfileDashboard
        userId={userId ?? profile?.id ?? ""}
        profile={profile}
        workspace={workspace}
      />
    </WorkspaceShell>
  );
}
