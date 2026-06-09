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
  Shield,
  Compass,
  Activity,
  Globe,
  Search,
  Menu,
  X
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

type WorkspaceShellProps = {
  profile: UserProfileRecord | null;
  workspace: WorkspaceSnapshotRecord | null;
  children: React.ReactNode;
};

// Notion / Arc Spaces grouped layout
const navGroups = [
  {
    title: "Core Space",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Roadmaps", href: "/roadmaps", icon: Map },
      { label: "Career Twin", href: "/career-twin", icon: Users },
      { label: "AI Mentor", href: "/mentor", icon: MessageSquare }
    ]
  },
  {
    title: "Community Support Intelligence",
    items: [
      { label: "Community Intel", href: "/community-intelligence", icon: Shield },
      { label: "Support Navigator", href: "/support-navigator", icon: Compass },
      { label: "Resource Discovery", href: "/resource-discovery", icon: Globe },
      { label: "Gap Intelligence", href: "/gap-intelligence", icon: Activity }
    ]
  },
  {
    title: "Account Systems",
    items: [
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "Profile", href: "/profile", icon: UserCircle }
    ]
  }
];

// Flat list for searching and routing
const allNavItems = navGroups.flatMap((g) => g.items);

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

  // Collapsed desktop sidebar status
  const [collapsed, setCollapsed] = useState(false);

  // Mobile drawer sidebar state
  const [mobileOpen, setMobileOpen] = useState(false);

  // Asynchronous transition loader indicators
  const [transitioningTo, setTransitioningTo] = useState<string | null>(null);

  // Hover indicator states
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);

  // Keyboard Command Palette dialog state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [paletteFocusedIndex, setPaletteFocusedIndex] = useState(0);

  const score = profile?.readiness_score ?? 0;

  // Clear transition loader on route change completed
  useEffect(() => {
    setTransitioningTo(null);
    setMobileOpen(false);
  }, [pathname]);

  // Intercepting Link clicks to show immediate sidebar loader states
  const handleNavClick = useCallback((href: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === href) {
      e.preventDefault();
      return;
    }
    setTransitioningTo(href);
  }, [pathname]);

  // Command palette toggle search listener (CMD+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filter Command palette results
  const filteredPaletteItems = useMemo(() => {
    if (!paletteQuery.trim()) return allNavItems;
    return allNavItems.filter((item) =>
      item.label.toLowerCase().includes(paletteQuery.toLowerCase())
    );
  }, [paletteQuery]);

  // Keyboard navigation on Command Palette list items
  const handlePaletteKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredPaletteItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setPaletteFocusedIndex((prev) => (prev + 1) % filteredPaletteItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setPaletteFocusedIndex((prev) => (prev - 1 + filteredPaletteItems.length) % filteredPaletteItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const targetItem = filteredPaletteItems[paletteFocusedIndex];
      if (targetItem) {
        setTransitioningTo(targetItem.href);
        setIsCommandPaletteOpen(false);
        setPaletteQuery("");
        router.push(targetItem.href);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsCommandPaletteOpen(false);
    }
  }, [filteredPaletteItems, paletteFocusedIndex, router]);

  // Keyboard arrow-key focus traversal on desktop sidebar navigation
  const handleSidebarKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const active = document.activeElement;
    if (!active || !active.classList.contains("sidebar-link-item")) return;

    const links = Array.from(document.querySelectorAll(".sidebar-link-item")) as HTMLElement[];
    const currentIndex = links.indexOf(active as HTMLElement);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % links.length;
      links[nextIndex]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + links.length) % links.length;
      links[prevIndex]?.focus();
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  }, [signOut, router]);

  // Common Sidebar Navigation Content renderer
  const renderSidebarContent = useCallback(() => {
    return (
      <div className="flex h-full flex-col">
        {/* Inject dynamic CSS transitions & shimmers */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes slide-progress {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .animate-progress-bar {
            animation: slide-progress 1.2s infinite linear;
          }
          @keyframes pulse-dot {
            0%, 100% { opacity: 0.35; transform: scale(0.9); }
            50% { opacity: 1; transform: scale(1.1); }
          }
          .animate-pulse-dot {
            animation: pulse-dot 0.8s infinite ease-in-out;
          }
          @keyframes shimmer-item {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          .shimmer-loading-item {
            background: linear-gradient(90deg, rgba(34,211,238,0) 0%, rgba(34,211,238,0.04) 50%, rgba(34,211,238,0) 100%);
            background-size: 200% 100%;
            animation: shimmer-item 1.4s infinite linear;
          }
        `}} />

        {/* Logo Header */}
        <div className={`flex items-center gap-3 px-4 py-4 border-b border-white/5 ${collapsed ? "justify-center" : ""}`}>
          <Image
            src="/logo.png"
            alt="CareerOS Logo"
            width={32}
            height={32}
            className="shrink-0 object-contain"
          />
          {!collapsed && (
            <div>
              <p className="text-sm font-semibold tracking-wide text-white">CareerOS</p>
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Intelligence Command</p>
            </div>
          )}
        </div>

        {/* Career score ring */}
        {!collapsed && (
          <div className="mx-4 mt-5 flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3">
            <ScoreRing score={score} />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Readiness</p>
              <p className="mt-0.5 text-sm font-semibold text-white truncate">
                {score > 0 ? `${score} / 100` : "Coming Soon"}
              </p>
              <p className="text-[10px] text-slate-500 truncate">{profile?.goal ?? "Set your goal"}</p>
            </div>
          </div>
        )}

        {/* Linear/Arc Search Bar Panel (Ctrl+K) */}
        {!collapsed && (
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="mx-4 mt-4 flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/80 px-3 py-1.5 text-left text-slate-500 hover:text-slate-300 hover:border-white/10 transition-all"
          >
            <span className="text-[11px] flex items-center gap-1.5">
              <Search className="h-3 w-3" />
              Quick search...
            </span>
            <span className="text-[9px] bg-slate-900 border border-white/5 px-1.5 py-0.5 rounded text-slate-600 font-mono select-none">
              Ctrl+K
            </span>
          </button>
        )}

        {/* Notion-style Spaces Navigation Groups */}
        <nav
          onKeyDown={handleSidebarKeyDown}
          className="mt-6 flex-1 space-y-5 px-3 overflow-y-auto"
        >
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1.5">
              {!collapsed && (
                <p className="text-[9px] uppercase tracking-wider text-slate-600 font-bold px-2 select-none">
                  {group.title}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  const isLoading = transitioningTo === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      onClick={(e) => handleNavClick(item.href, e)}
                      tabIndex={0}
                      onMouseEnter={() => setHoveredHref(item.href)}
                      onMouseLeave={() => setHoveredHref(null)}
                      title={collapsed ? item.label : undefined}
                      className={`sidebar-link-item group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors duration-[150ms] focus:outline-none focus:ring-1 focus:ring-cyan-500/40 ${
                        collapsed ? "justify-center" : ""
                      } ${
                        active
                          ? "text-white font-semibold"
                          : "text-slate-500 hover:text-slate-300"
                      } ${isLoading ? "shimmer-loading-item" : ""}`}
                    >
                      {/* Active Indicator Sliding Highlight via LayoutId */}
                      {active && (
                        <motion.div
                          layoutId="active-indicator-desktop"
                          className="absolute inset-0 bg-cyan-500/[0.08] border-l-2 border-cyan-400 rounded-r-lg -z-10"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}

                      {/* Hover Indicator sliding back highlight */}
                      {hoveredHref === item.href && (
                        <motion.div
                          layoutId="hover-indicator-desktop"
                          className="absolute inset-0 bg-white/[0.02] rounded-lg -z-10"
                          transition={{ type: "spring", stiffness: 400, damping: 35 }}
                        />
                      )}

                      {/* Icon with instant loading pulse overlay */}
                      <div className="relative shrink-0 flex items-center justify-center">
                        <Icon className={`h-3.5 w-3.5 transition-colors duration-[150ms] ${active ? "text-cyan-300" : "text-slate-500 group-hover:text-slate-300"}`} />
                        {isLoading && (
                          <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-cyan-400 border border-slate-950 animate-pulse-dot" />
                        )}
                      </div>

                      {/* Label with loader bar overlay */}
                      {!collapsed && (
                        <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                          <span className="truncate">{item.label}</span>
                          {isLoading && (
                            <span className="h-1 w-8 rounded-full bg-cyan-950 border border-cyan-500/20 overflow-hidden relative">
                              <span className="absolute inset-y-0 left-0 bg-cyan-400 w-1/2 animate-progress-bar rounded-full" />
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Profile Footer */}
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
      </div>
    );
  }, [collapsed, score, profile, transitioningTo, hoveredHref, pathname, handleNavClick, handleSidebarKeyDown, handleSignOut]);

  return (
    <div className="relative min-h-screen bg-transparent text-white overflow-x-hidden">
      {/* Vercel-style glowing progress loader at top of screen */}
      {transitioningTo && (
        <div className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-500 via-indigo-500 to-cyan-500 z-50 overflow-hidden shadow-[0_1px_8px_rgba(6,182,212,0.5)]">
          <div className="absolute inset-y-0 left-0 bg-cyan-300 w-[45%] animate-progress-bar shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
        </div>
      )}

      {/* Subtle Dot Matrix Background */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.025] [background-image:radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:28px_28px]" />

      {/* ── DESKTOP STATIC SIDEBAR ── */}
      <aside
        style={{
          width: collapsed ? "4.5rem" : "15rem",
          transition: "width 220ms ease"
        }}
        className="fixed left-4 top-4 bottom-4 z-30 hidden flex-col rounded-[24px] border border-white/5 sidebar-glass xl:flex overflow-hidden"
      >
        {renderSidebarContent()}

        {/* Collapse toggle arrow */}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-3 top-20 z-40 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-[#08080a] text-slate-400 hover:text-cyan-300 transition-colors duration-[120ms]"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <div
        style={{
          paddingLeft: collapsed ? "5.5rem" : "16.5rem",
          transition: "padding-left 220ms ease"
        }}
        className="hidden xl:block"
      >
        <main className="mx-auto max-w-7xl px-8 py-8 pb-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ── MOBILE DRAWERS AND HEADERS ── */}
      <div className="xl:hidden">
        {/* Top Header Row */}
        <header className="sticky top-0 z-20 border-b border-[#141417] bg-[#020305]/75 backdrop-blur-sm px-5 py-3.5">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-lg p-1 text-slate-400 hover:text-white transition-colors"
                title="Menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <Image
                  src="/logo.png"
                  alt="CareerOS Logo"
                  width={24}
                  height={24}
                  className="shrink-0 object-contain"
                />
                <span className="text-sm font-semibold text-white">CareerOS</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {score > 0 && (
                <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                  {score} / 100
                </span>
              )}
              <AvatarCircle name={profile?.full_name ?? null} />
            </div>
          </div>
        </header>

        {/* Mobile Page Content wrapper */}
        <main className="mx-auto max-w-5xl px-5 py-6 pb-28">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Drawer Sliding Overlay from left */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              />
              {/* Sidebar container */}
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#08080a] border-r border-white/5 p-4 flex flex-col"
              >
                {/* Close Button */}
                <button
                  onClick={() => setMobileOpen(false)}
                  className="absolute right-4 top-4 rounded-lg p-1 text-slate-500 hover:text-white transition-colors"
                  title="Close Menu"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="flex-1 mt-6">
                  {renderSidebarContent()}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* ── COMMAND PALETTE (CMD+K) OVERLAY ── */}
      <AnimatePresence>
        {isCommandPaletteOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCommandPaletteOpen(false)}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-x-4 top-[15vh] mx-auto z-50 max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-2xl space-y-3"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search and navigate pages... (esc to exit)"
                  value={paletteQuery}
                  onChange={(e) => {
                    setPaletteQuery(e.target.value);
                    setPaletteFocusedIndex(0);
                  }}
                  onKeyDown={handlePaletteKeyDown}
                  autoFocus
                  className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="max-h-[260px] overflow-y-auto space-y-0.5 pr-1">
                {filteredPaletteItems.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs font-mono">
                    No matching modules found.
                  </div>
                ) : (
                  filteredPaletteItems.map((item, index) => {
                    const isFocused = index === paletteFocusedIndex;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.href}
                        onClick={() => {
                          setTransitioningTo(item.href);
                          setIsCommandPaletteOpen(false);
                          setPaletteQuery("");
                          router.push(item.href);
                        }}
                        onMouseEnter={() => setPaletteFocusedIndex(index)}
                        className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-all ${
                          isFocused
                            ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                            : "text-slate-400 hover:text-slate-200 bg-transparent border border-transparent"
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </span>
                        {isFocused && (
                          <span className="text-[9px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded">
                            Go to
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
