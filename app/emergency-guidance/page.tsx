import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadAppData } from "@/lib/app-data";
import { EmergencyGuidanceWorkspace } from "@/components/emergency-guidance-workspace";

export default async function EmergencyGuidancePage() {
  if (!hasSupabaseConfig()) {
    redirect("/login");
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { profile, workspace } = await loadAppData(supabase, user.id);

  if (!profile?.onboarding_complete) {
    redirect("/onboarding");
  }

  return (
    <WorkspaceShell profile={profile} workspace={workspace}>
      <EmergencyGuidanceWorkspace />
    </WorkspaceShell>
  );
}
