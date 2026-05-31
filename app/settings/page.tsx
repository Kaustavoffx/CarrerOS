import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { AiProvidersPanel } from "@/components/ai-providers-panel";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadAppData } from "@/lib/app-data";
import { loadAiProviderStatuses } from "@/lib/ai-provider-store";
import type { AiProviderStatusRecord } from "@/lib/supabase/types";
import { LogOut, ShieldCheck } from "lucide-react";

export default async function SettingsPage() {
  let profile = null;
  let workspace = null;
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
    aiProviders = await loadAiProviderStatuses(user.id);

    if (!profile?.onboarding_complete) {
      redirect("/onboarding");
    }
  } else {
    redirect("/login");
  }

  return (
    <WorkspaceShell profile={profile} workspace={workspace}>
      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <section className="liquid-panel rounded-[24px] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.42)]">
          <div className="relative z-10">
            <p className="caption text-cyan-200">Settings</p>
            <h2 className="mt-3 heading-dashboard text-white">Account and workspace controls.</h2>
            <div className="mt-6 space-y-4 text-slate-300">
              <div className="liquid-card rounded-2xl p-4">
                <p className="caption text-slate-400">Signed in</p>
                <p className="mt-2 body font-semibold text-white">Supabase Auth</p>
                <p className="mt-1 small">Google, GitHub, and email login are enabled through your project settings.</p>
              </div>
              <div className="liquid-card rounded-2xl p-4">
                <p className="caption text-slate-400">Storage</p>
                <p className="mt-2 body font-semibold text-white">Persistent cloud records</p>
                <p className="mt-1 small">Roadmaps, progress, notes, and mentor chats live in Supabase tables.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-6">
          <AiProvidersPanel providers={aiProviders} />

          <section className="liquid-panel rounded-[24px] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.42)]">
            <div className="relative z-10">
              <p className="caption text-cyan-200">Session</p>
              <h2 className="mt-3 heading-dashboard text-white">Leave the workspace safely.</h2>
              <p className="mt-4 body text-slate-300">Use the sidebar sign out action whenever you want to end the session. The workspace will be there when you return.</p>
              <div className="mt-6 flex flex-wrap gap-4">
                <Link href="/profile" className="tactile-btn tactile-btn-primary inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-black">
                  <ShieldCheck className="h-4 w-4" />
                  Update profile
                </Link>
                <Link href="/login" className="tactile-btn inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-slate-200">
                  <LogOut className="h-4 w-4" />
                  Return to login
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </WorkspaceShell>
  );
}
