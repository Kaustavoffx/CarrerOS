import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { CommunitySupportProvider } from "@/components/community-support-context";
import { CommunitySupportLayout } from "@/components/community-support-layout";
import dynamic from "next/dynamic";

const CommunityNeedDashboard = dynamic(
  () => import("@/components/community-need-dashboard").then((mod) => mod.CommunityNeedDashboard),
  {
    loading: () => <div className="animate-pulse bg-white/[0.02] border border-white/5 rounded-2xl h-[450px] w-full" />
  }
);

const ReportNeedWorkspace = dynamic(
  () => import("@/components/report-need-workspace").then((mod) => mod.ReportNeedWorkspace),
  {
    loading: () => <div className="animate-pulse bg-white/[0.02] border border-white/5 rounded-2xl h-[400px] w-full" />
  }
);
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadAppData } from "@/lib/app-data";

export default async function CommunityIntelligencePage(props: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const searchParams = await props.searchParams;
  const tab = searchParams.tab;

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
      {tab === "review" ? (
        <CommunitySupportProvider profile={profile} workspace={workspace}>
          <CommunitySupportLayout activeTab="review">
            <ReportNeedWorkspace />
          </CommunitySupportLayout>
        </CommunitySupportProvider>
      ) : (
        <CommunityNeedDashboard />
      )}
    </WorkspaceShell>
  );
}
