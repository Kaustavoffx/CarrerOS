import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import dynamic from "next/dynamic";

const CommunityGapIntelligenceWorkspace = dynamic(
  () => import("@/components/community-gap-intelligence-workspace").then((mod) => mod.CommunityGapIntelligenceWorkspace),
  {
    loading: () => <div className="animate-pulse bg-white/[0.02] border border-white/5 rounded-2xl h-[400px] w-full" />
  }
);
import { CommunitySupportProvider } from "@/components/community-support-context";
import { CommunitySupportLayout } from "@/components/community-support-layout";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadAppData } from "@/lib/app-data";

export default async function CommunityGapsPage() {
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
        <CommunitySupportLayout activeTab="gaps">
          <CommunityGapIntelligenceWorkspace />
        </CommunitySupportLayout>
      </CommunitySupportProvider>
    </WorkspaceShell>
  );
}
