import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadAppData } from "@/lib/app-data";
import { DemoGuideConsole } from "@/components/demo-guide-console";

export default async function DemoGuidePage() {
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
      <DemoGuideConsole />
    </WorkspaceShell>
  );
}
