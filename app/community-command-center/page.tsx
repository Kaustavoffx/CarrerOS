import { Suspense } from "react";
import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { WorkspaceShell } from "@/components/workspace-shell";
import { CommunitySupportProvider } from "@/components/community-support-context";
import type { UserProfileRecord, WorkspaceSnapshotRecord } from "@/lib/supabase/types";
import dynamic from "next/dynamic";

const CommunityCommandCenter = dynamic(
  () => import("@/components/community-command-center").then((mod) => mod.CommunityCommandCenter),
  {
    loading: () => <div className="animate-pulse bg-white/[0.02] border border-white/5 rounded-2xl h-[500px] w-full" />
  }
);

export const metadata = {
  title: "Community Command Center | CareerOS",
  description: "Real-time NASA-style intelligence dashboard — live needs, gap scores, forecasts, heatmap, and AI actions.",
};

export default async function CommunityCommandCenterPage() {
  let profile: UserProfileRecord | null = null;
  let workspace: WorkspaceSnapshotRecord | null = null;

  if (hasSupabaseConfig()) {
    const supabase = await getSupabaseServerClient();

    if (!supabase) {
      redirect("/login");
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const [{ data: profileData }, { data: workspaceData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("career_workspace_state").select("*").eq("user_id", user.id).single(),
    ]);

    profile   = profileData as UserProfileRecord | null;
    workspace = workspaceData as WorkspaceSnapshotRecord | null;
  } else {
    redirect("/login");
  }

  return (
    <WorkspaceShell profile={profile} workspace={workspace}>
      <CommunitySupportProvider profile={profile} workspace={workspace}>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-3">
              <div className="h-8 w-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Initializing Command Center...</p>
            </div>
          </div>
        }>
          <CommunityCommandCenter />
        </Suspense>
      </CommunitySupportProvider>
    </WorkspaceShell>
  );
}
