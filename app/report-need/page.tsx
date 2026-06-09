import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { ReportNeedWorkspace } from "@/components/report-need-workspace";
import { CommunitySupportProvider } from "@/components/community-support-context";
import { CommunitySupportLayout } from "@/components/community-support-layout";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadAppData } from "@/lib/app-data";

export default async function ReportNeedPage() {
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
      <CommunitySupportProvider profile={profile} workspace={workspace}>
        <CommunitySupportLayout activeTab="review">
          <ReportNeedWorkspace />
        </CommunitySupportLayout>
      </CommunitySupportProvider>
    </WorkspaceShell>
  );
}
