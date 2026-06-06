"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { UserProfileRecord, WorkspaceSnapshotRecord } from "@/lib/supabase/types";
import { useAuth } from "./auth-provider";
import {
  LogOut,
  LayoutDashboard,
  Map,
  Users,
  MessageSquare,
  Settings,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  Plus
} from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion"; // Kept for layoutId sidebar active indicator micro-animation

type WorkspaceShellProps = {
  profile: UserProfileRecord | null;
  workspace: WorkspaceSnapshotRecord | null;
  children: React.ReactNode;
};

const navigation = [
  { label: "Dashboard",    href: "/dashboard",    icon: LayoutDashboard },
  { label: "Roadmaps",     href: "/roadmaps",     icon: Map },
  { label: "Career Twin",  href: "/career-twin",  icon: Users },
  { label: "AI Mentor",    href: "/mentor",       icon: MessageSquare },
  { label: "Settings",     href: "/settings",     icon: Settings },
  { label: "Profile",      href: "/profile",      icon: UserCircle },
];

const mobileNav = navigation.slice(0, 5);

function ScoreRing({ score }: { score: number }) {
  const r = 22;
  const circumference = 2 * Math.PI * r;
  const filled = circumference * (score / 100);
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" className="shrink-0">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#141418" strokeWidth="3" />
      <circle
        cx="28" cy="28" r={r}
        fill="none"
        stroke="#22d3ee"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
        strokeDashoffset={circumference * 0.25}
        style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.16,1,0.3,1)" }}
      />
      <text x="28" y="32" textAnchor="middle" fontSize="11" fontWeight="600" fill="#22d3ee">
        {score > 0 ? `${score}` : "—"}
      </text>
    </svg>
  );
}

function AvatarCircle({ name }: { name: string | null }) {
  const initials = name
    ? name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/25 text-xs font-bold text-cyan-300 shrink-0">
      {initials}
    </div>
  );
}

export function WorkspaceShell({ profile, children }: WorkspaceShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const score = profile?.readiness_score ?? 0;

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative min-h-screen bg-transparent text-white overflow-x-hidden">
      {/* Subtle dot-grid background */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.025] [background-image:radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:28px_28px]" />

      {/* ── DESKTOP SIDEBAR — CSS transition, no motion.aside ── */}
      <aside
        style={{
          width: collapsed ? "4.5rem" : "15rem",
          transition: "width 220ms ease"
        }}
        className="fixed left-4 top-4 bottom-4 z-30 hidden flex-col rounded-[24px] border border-white/5 sidebar-glass xl:flex overflow-hidden"
      >
        {/* Logo row */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/5 ${collapsed ? "justify-center" : ""}`}>
          <Image
            src="/logo.png"
            alt="CareerOS"
            width={36}
            height={36}
            style={{
              filter: "drop-shadow(0 0 8px rgba(0,216,255,.18)) drop-shadow(0 0 18px rgba(0,216,255,.08))"
            }}
            className="shrink-0 object-contain"
          />
          <div
            style={{
              opacity: collapsed ? 0 : 1,
              width: collapsed ? 0 : "auto",
              overflow: "hidden",
              transition: "opacity 150ms ease",
              whiteSpace: "nowrap"
            }}
          >
            <p className="text-sm font-semibold tracking-wide text-white">CareerOS</p>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Workspace</p>
          </div>
        </div>

        {/* Career score ring */}
        <div
          style={{
            opacity: collapsed ? 0 : 1,
            maxHeight: collapsed ? "0" : "120px",
            overflow: "hidden",
            transition: "opacity 150ms ease, max-height 220ms ease",
          }}
          className="mx-4 mt-5 flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3"
        >
          <ScoreRing score={score} />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Readiness</p>
            <p className="mt-0.5 text-sm font-semibold text-white truncate">
              {score > 0 ? `${score} / 100` : "Coming Soon"}
            </p>
            <p className="text-[10px] text-slate-500 truncate">{profile?.goal ?? "Set your goal"}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className={`mt-5 flex-1 space-y-1 px-2 ${collapsed ? "px-1.5" : ""}`}>
          {navigation.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-[120ms] ${
                  collapsed ? "justify-center" : ""
                } ${
                  active
                    ? "sidebar-active-item text-white"
                    : "text-slate-500 hover:bg-white/[0.03] hover:text-slate-300"
                }`}
              >
                {/* Active left-bar indicator — keep layoutId for micro-animation */}
                {active && (
                  <motion.span
                    layoutId="sidebar-active-bar"
                    className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-cyan-400"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
                <Icon className={`h-4 w-4 shrink-0 transition-colors duration-[120ms] ${active ? "text-cyan-300" : "text-slate-500 group-hover:text-slate-300"}`} />
                <span
                  style={{
                    opacity: collapsed ? 0 : 1,
                    width: collapsed ? 0 : "auto",
                    overflow: "hidden",
                    transition: "opacity 150ms ease",
                    whiteSpace: "nowrap",
                    display: "block"
                  }}
                  className="font-medium truncate"
                >
                  {item.label}
                </span>
                {active && !collapsed && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Profile footer */}
        <div className={`m-3 mt-0 rounded-2xl border border-white/5 bg-white/[0.03] p-3 ${collapsed ? "flex justify-center" : ""}`}>
          {collapsed ? (
            <AvatarCircle name={profile?.full_name ?? null} />
          ) : (
            <div className="flex items-center gap-2.5">
              <AvatarCircle name={profile?.full_name ?? null} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">{profile?.full_name ?? "Your profile"}</p>
                <p className="text-[10px] text-slate-500 truncate">{profile?.experience_level ?? "Student"}</p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                title="Sign out"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-rose-400 transition-colors duration-[120ms] shrink-0"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          type="button"
          onClick={() => setCollapsed(c => !c)}
          className="absolute -right-3 top-20 z-40 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-[#08080a] text-slate-400 hover:text-cyan-300 transition-colors duration-[120ms] shadow-md"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* ── MAIN CONTENT AREA — CSS padding-left transition ── */}
      <div
        style={{
          paddingLeft: collapsed ? "5.5rem" : "16.5rem",
          transition: "padding-left 220ms ease"
        }}
        className="hidden xl:block"
      >
        <main className="mx-auto max-w-7xl px-8 py-8 pb-24">{children}</main>
      </div>

      {/* Non-xl fallback (tablet / mobile) */}
      <div className="xl:hidden">
        {/* Top header for tablet */}
        <header className="sticky top-0 z-20 border-b border-[#141417] bg-[#020305]/75 backdrop-blur-sm px-5 py-3.5">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Image
                src="/logo.png"
                alt="CareerOS"
                width={28}
                height={28}
                style={{
                  filter: "drop-shadow(0 0 8px rgba(0,216,255,.18)) drop-shadow(0 0 18px rgba(0,216,255,.08))"
                }}
                className="shrink-0 object-contain"
              />
              <span className="text-sm font-semibold text-white">CareerOS</span>
            </div>
            <div className="flex items-center gap-2">
              {score > 0 && (
                <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                  {score} / 100
                </span>
              )}
              <AvatarCircle name={profile?.full_name ?? null} />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-5 py-6 pb-28">{children}</main>
      </div>

      {/* ── MOBILE STICKY BOTTOM NAV ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex xl:hidden border-t border-[#141417] bg-[#07070a]/95 backdrop-blur-md">
        {mobileNav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors duration-[120ms] ${
                active ? "text-cyan-300" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="mobile-active-pill"
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-cyan-400"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
              <Icon className="h-5 w-5" />
              <span className="hidden sm:block">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── MOBILE FLOATING QUICK ACTION ── */}
      <Link
        href="/roadmaps"
        className="fixed bottom-20 right-5 z-50 xl:hidden flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400 text-black shadow-[0_8px_24px_rgba(34,211,238,0.35)] hover:opacity-90 active:scale-95 transition-[opacity,transform] duration-[120ms]"
      >
        <Plus className="h-5 w-5" />
      </Link>
    </div>
  );
}
