"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { UserProfileRecord, WorkspaceSnapshotRecord } from "@/lib/supabase/types";
import { MagneticButton } from "./magnetic-button";
import { useAuth } from "./auth-provider";
import { LogOut, Sparkles, UserCircle2 } from "lucide-react";
import { FeatureStatusBadge } from "./feature-status";

type WorkspaceShellProps = {
  profile: UserProfileRecord | null;
  workspace: WorkspaceSnapshotRecord | null;
  children: React.ReactNode;
};

const navigation = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Roadmaps", href: "/roadmaps" },
  { label: "Career Twin", href: "/career-twin" },
  { label: "AI Mentor", href: "/mentor" },
  { label: "Settings", href: "/settings" },
  { label: "Profile", href: "/profile" }
];

export function WorkspaceShell({ profile, workspace, children }: WorkspaceShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#050505] via-[#080808] to-[#0a0a0a] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-[0.03] [background-image:radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:28px_28px]" />
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[18rem] border-r border-[#141417] bg-[#08080a] px-6 py-6 xl:flex xl:flex-col">
        <div className="flex items-center gap-3 px-1">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#202028] bg-gradient-to-b from-[#141418] to-[#0a0a0c] text-cyan-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_20px_rgba(0,0,0,0.8)]">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <p className="font-sinistre text-card font-black tracking-[0.08em] text-white">CareerOS</p>
            <p className="caption text-slate-500">Private workspace</p>
          </div>
        </div>

        <nav className="mt-10 space-y-2">
          {navigation.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between rounded-2xl border px-4 py-2.5 text-sm transition duration-200 ${
                  active
                      ? "border-[#202028] bg-gradient-to-b from-[#16161c] to-[#0a0a0c] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1px_1px_rgba(0,0,0,0.8)]"
                      : "border-transparent text-slate-400 hover:border-[#16161c] hover:bg-[#0c0c0e] hover:text-white"
                }`}
              >
                <span>{item.label}</span>
                {active ? <span className="h-2 w-2 rounded-full bg-cyan-300" /> : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4 rounded-[24px] border border-[#141417] bg-gradient-to-b from-[#08080a] to-[#050506] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-1px_1px_rgba(0,0,0,0.9)]">
          <div>
            <p className="caption text-slate-500">Signed in as</p>
            <p className="mt-2 body font-bold text-white">{profile?.full_name ?? "Your profile"}</p>
            <p className="mt-1 small text-slate-400">{profile?.goal ?? "Set your goal in onboarding"}</p>
          </div>
          <MagneticButton
            type="button"
            onClick={handleSignOut}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-bold tactile-btn text-slate-200"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </MagneticButton>
        </div>
      </aside>

      <div className="xl:pl-[18rem]">
        <header className="sticky top-0 z-20 border-b border-[#141417] bg-[#050505] px-6 py-4 sm:px-8 lg:px-10 xl:px-12">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div>
              <p className="caption text-cyan-400">Private workspace</p>
              <h1 className="mt-2 heading-dashboard text-white">
                {navigation.find((item) => item.href === pathname)?.label ?? "Dashboard"}
              </h1>
              <p className="mt-1 small text-slate-500 font-semibold">
                {workspace?.roadmaps.length ? `${workspace.roadmaps.length} saved roadmap${workspace.roadmaps.length === 1 ? "" : "s"}` : "Coming Soon"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden rounded-full border border-[#141417] bg-gradient-to-b from-[#08080a] to-[#050506] px-4 py-2 small text-slate-400 md:block shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-1px_1px_rgba(0,0,0,0.9)]">
                Readiness score: <span className="text-cyan-300 font-sinistre font-black">{profile?.readiness_score ? profile.readiness_score : "Coming Soon"}</span>
              </div>
              <FeatureStatusBadge status="coming-soon" featureName="Career Intelligence" />
              <MagneticButton
                type="button"
                onClick={() => router.push("/profile")}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold tactile-btn text-slate-200"
              >
                <UserCircle2 className="h-4 w-4" />
                Profile
              </MagneticButton>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10 xl:px-12">{children}</main>
      </div>
    </div>
  );
}
