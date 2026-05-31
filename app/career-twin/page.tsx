import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { FeatureStatusBadge } from "@/components/feature-status";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createStarterWorkspace } from "@/lib/workspace";
import { loadAppData } from "@/lib/app-data";

export default async function CareerTwinPage() {
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
    const demo = createStarterWorkspace("Front-end role at a startup", "Junior");
    profile = demo.profile;
    workspace = demo.workspace;
  }

  const progress = workspace?.progress ?? [];

  return (
    <WorkspaceShell profile={profile} workspace={workspace}>
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="liquid-panel rounded-[24px] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.42)]">
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-3">
              <p className="caption text-cyan-200">Career Twin</p>
              <FeatureStatusBadge status="beta" featureName="Career Twin" />
            </div>
            <h2 className="mt-3 heading-dashboard text-white">A persistent snapshot of your career state.</h2>
            <div className="mt-6 space-y-4">
              <div className="liquid-card rounded-2xl p-4">
                <p className="caption text-slate-400">Goal</p>
                <p className="mt-2 body font-semibold text-white">{profile?.goal ?? "Coming Soon"}</p>
              </div>
              <div className="liquid-card rounded-2xl p-4">
                <p className="caption text-slate-400">Experience</p>
                <p className="mt-2 body font-semibold text-white">{profile?.experience_level ?? "Coming Soon"}</p>
              </div>
              <div className="liquid-card rounded-2xl p-4">
                <p className="caption text-slate-400">Readiness score</p>
                <p className="mt-2 text-section font-sinistre font-black text-cyan-300">{profile?.readiness_score ? profile.readiness_score : "Coming Soon"}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="liquid-panel rounded-[24px] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.42)]">
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-3">
              <p className="caption text-cyan-200">Momentum</p>
              <FeatureStatusBadge status="coming-soon" featureName="Cross-Session AI Context" />
            </div>
            <h2 className="mt-3 heading-dashboard text-white">Progress history</h2>
            <div className="mt-6 space-y-4">
              {progress.length ? progress.map((item) => (
                <article key={item.id} className="liquid-card rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="caption text-slate-400">{item.label}</p>
                      <h3 className="mt-2 text-dashboard font-sinistre font-black text-cyan-300">{item.value}%</h3>
                    </div>
                    <span className="small text-slate-500">{item.date}</span>
                  </div>
                  <p className="mt-3 small text-slate-300">{item.note}</p>
                </article>
              )) : <article className="liquid-card rounded-2xl p-4 border border-amber-400/20 bg-amber-400/10 text-amber-200">Coming Soon</article>}
            </div>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
