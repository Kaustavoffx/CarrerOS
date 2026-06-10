import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadAppData } from "@/lib/app-data";
import { loadAiProviderStatuses } from "@/lib/ai-provider-store";
import type { AiProviderStatusRecord, RoadmapVersionRecord } from "@/lib/supabase/types";
import dynamic from "next/dynamic";

const RoadmapsConsole = dynamic(
  () => import("@/components/roadmaps-console").then((mod) => mod.RoadmapsConsole),
  {
    loading: () => <div className="animate-pulse bg-white/[0.02] border border-white/5 rounded-2xl h-[500px] w-full" />
  }
);

export default async function RoadmapsPage() {
  let profile = null;
  let workspace = null;
  let roadmapHistory: RoadmapVersionRecord[] = [];
  let aiProviders: AiProviderStatusRecord[] = [];

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
    roadmapHistory = Array.isArray(data.roadmapHistory) ? data.roadmapHistory : [];
    aiProviders = await loadAiProviderStatuses(user.id);

    if (!profile?.onboarding_complete) {
      redirect("/onboarding");
    }
  } else {
    redirect("/login");
  }

  return (
    <WorkspaceShell profile={profile} workspace={workspace}>
      <RoadmapsConsole profile={profile} workspace={workspace} roadmapHistory={roadmapHistory} aiProviders={aiProviders} />
    </WorkspaceShell>
  );
}

