import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { FeatureStatusBadge } from "@/components/feature-status";
import { ProfileEditor } from "@/components/profile-editor";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createStarterWorkspace } from "@/lib/workspace";
import { loadAppData } from "@/lib/app-data";

export default async function ProfilePage() {
  let profile = null;
  let workspace = null;
  let userId = null;

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

    userId = user.id;
    const data = await loadAppData(supabase, user.id);
    profile = data.profile;
    workspace = data.workspace;

    if (!profile?.onboarding_complete) {
      redirect("/onboarding");
    }
  } else {
    const demo = createStarterWorkspace("Front-end role at a startup", "Junior");
    profile = demo.profile;
    workspace = demo.workspace;
    userId = demo.profile.id;
  }

  return (
    <WorkspaceShell profile={profile} workspace={workspace}>
      <div className="grid gap-6 xl:grid-cols-[0.94fr_1.06fr]">
        <ProfileEditor userId={userId ?? profile?.id ?? ""} profile={profile} />

        <section className="liquid-panel rounded-[24px] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.42)]">
          <div className="relative z-10">
            <p className="caption text-cyan-200">Profile preview</p>
            <h2 className="mt-3 heading-dashboard text-white">What gets shown across the app.</h2>
            <div className="mt-6 space-y-4">
              <div className="liquid-card rounded-2xl p-4">
                <p className="caption text-slate-400">Name</p>
                <p className="mt-2 body font-semibold text-white">{profile?.full_name ?? "Unnamed"}</p>
              </div>
              <div className="liquid-card rounded-2xl p-4">
                <p className="caption text-slate-400">Avatar</p>
                <p className="mt-2 break-all small text-slate-300">{profile?.avatar_url ?? "No avatar set"}</p>
              </div>
              <div className="liquid-card rounded-2xl p-4">
                <p className="caption text-slate-400">Goal and readiness</p>
                <p className="mt-2 small text-slate-300">{profile?.goal ?? "Set a target in onboarding"}</p>
                <p className="mt-1 small text-slate-400">
                  Readiness Score: <span className="font-sinistre font-black text-cyan-300">{profile?.readiness_score ? profile.readiness_score : "Coming Soon"}</span>
                </p>
                <div className="mt-2">
                  <FeatureStatusBadge status="coming-soon" featureName="Career Intelligence" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
