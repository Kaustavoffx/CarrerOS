import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createStarterWorkspace } from "@/lib/workspace";
import { loadAppData } from "@/lib/app-data";
import { loadAiProviderStatuses } from "@/lib/ai-provider-store";
import { RoadmapsConsole } from "@/components/roadmaps-console";
import type { AiProviderStatusRecord, RoadmapVersionRecord } from "@/lib/supabase/types";

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
    const demo = createStarterWorkspace("Front-end role at a startup", "Junior");
    profile = demo.profile;
    workspace = demo.workspace;
  }

  return (
    <WorkspaceShell profile={profile} workspace={workspace}>
      <RoadmapsConsole profile={profile} workspace={workspace} roadmapHistory={roadmapHistory} aiProviders={aiProviders} />
    </WorkspaceShell>
  );
}

