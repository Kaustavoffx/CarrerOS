import { Suspense } from "react";
import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { WorkspaceShell } from "@/components/workspace-shell";
import type { UserProfileRecord, WorkspaceSnapshotRecord } from "@/lib/supabase/types";
import dynamic from "next/dynamic";

const AgenticSwarmWorkspace = dynamic(
  () => import("@/components/agentic-swarm-workspace").then((mod) => mod.AgenticSwarmWorkspace),
  {
    loading: () => <div className="animate-pulse bg-white/[0.02] border border-white/5 rounded-2xl h-[500px] w-full" />
  }
);

export const metadata = {
  title: "Agentic Swarm Engine | CareerOS",
  description: "Orchestrate specialized AI agents to generate unified action plans.",
};

export default async function AgenticSwarmPage() {
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

    profile = profileData as UserProfileRecord | null;
    workspace = workspaceData as WorkspaceSnapshotRecord | null;
  } else {
    redirect("/login");
  }

  return (
    <WorkspaceShell profile={profile} workspace={workspace}>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-3">
            <div className="h-8 w-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Initializing Agentic Swarm...</p>
          </div>
        </div>
      }>
        <AgenticSwarmWorkspace />
      </Suspense>
    </WorkspaceShell>
  );
}
