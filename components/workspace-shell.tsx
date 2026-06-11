"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { UserProfileRecord, WorkspaceSnapshotRecord } from "@/lib/supabase/types";
import { useAuth } from "./auth-provider";
import { useRouteTransition } from "./route-transition-provider";
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
  Brain,
  Info,
  X,
  Database,
  Zap,
  Play,
  TrendingUp
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { motion, AnimatePresence, usePresence } from "framer-motion";
import { CAREEROS, sidebarItemStyle } from "@/styles/careeros-design-system";
import { LiquidDust } from "@/components/ui/liquid-dust";
import { ThemeOrb } from "@/components/theme-orb";

interface GuideContent {
  title: string;
  whatItDoes: string;
  aiCapabilities: Array<{ name: string; desc: string }>;
  dataAnalyzed: string;
  recommendationsGeneration: string;
  privacyPolicy: string;
  howToTakeAction: string[];
}

const GUIDE_DATA: Record<string, GuideContent> = {
  "/demo": {
    title: "Demo Mode Guide",
    whatItDoes: "Interactive walkthrough of the platform designed to guide judges and mentors through core AI capabilities in under 2 minutes.",
    aiCapabilities: [
      { name: "Guided Walkthrough", desc: "Coordinates dynamic previews of twin calibrations, proximity search, and demand forecasting." }
    ],
    dataAnalyzed: "Aggregated platform metrics, seed datasets, and interactive mock state calibrations.",
    recommendationsGeneration: "Synthesizes slide progression stages with real-time interactive widget responses.",
    privacyPolicy: "Demo inputs are fully sandbox-isolated in-memory and are never written to permanent database stores.",
    howToTakeAction: [
      "Click 'Next' to navigate sequentially through the 5 value proposition steps.",
      "Interact with the live widget panels (e.g. adding skills, clicking cities) to trigger calibrations.",
      "Click 'Enter Operational Workspace' on the final slide to transition to the live dashboard."
    ]
  },
  "/demo-guide": {
    title: "Walkthrough Guide",
    whatItDoes: "An expandable directory system providing a comprehensive mapping of every workspace, AI utility, and operational module.",
    aiCapabilities: [
      { name: "Schema Mapping", desc: "Coordinates structured purpose summaries and action triggers across the platform." }
    ],
    dataAnalyzed: "Platform navigational targets, actions checklists, and core system architectures.",
    recommendationsGeneration: "Synthesizes detailed structural components into a single interactive 2-minute overview.",
    privacyPolicy: "Guide configurations represent static documentation metadata and contain zero personal identifiers.",
    howToTakeAction: [
      "Select any system module from the left directory rail.",
      "Review the purpose description and key features listed in the center panel.",
      "Click 'Enter Operational Workspace' to visit the live system view."
    ]
  },
  "/impact-center": {
    title: "Impact Calibration Guide",
    whatItDoes: "Operations desk compiling real-time reach, assist counts, and support resolution metrics.",
    aiCapabilities: [
      { name: "Live Stats Indexing", desc: "Performs exact aggregations on active profile rows, need reports, and chat logs." }
    ],
    dataAnalyzed: "Supabase database counts, program categories, and community health access indexes.",
    recommendationsGeneration: "Computes community reach indicators from primary tables without simulated offsets.",
    privacyPolicy: "Metrics display anonymous aggregate totals only, safeguarding individual identities.",
    howToTakeAction: [
      "Review the operational reach cards monitoring People Assisted and Needs Resolved.",
      "Monitor the Community Health Index measuring resource density access.",
      "Check database validation notices detailing transparency protocols."
    ]
  },
  "/dashboard": {
    title: "Dashboard Guide",
    whatItDoes: "Centralized workspace that aggregates your readiness score, career goals, active development steps, and roadmap metrics in a unified overview.",
    aiCapabilities: [
      { name: "Goal Analysis", desc: "Extracts key technical objectives from your profile goals to dynamically color-code skill metrics." }
    ],
    dataAnalyzed: "Student profile records, completed roadmap checkpoints, and user budget preferences.",
    recommendationsGeneration: "Synthesizes data by cross-referencing your active goal string against completed learning units to estimate readiness percentages.",
    privacyPolicy: "All metrics and goal inputs are stored securely under strict Supabase Row Level Security (RLS) policies.",
    howToTakeAction: [
      "Review your overall Readiness Score circle in the top right.",
      "Browse active checklists and click on outstanding items to proceed to their modules.",
      "Check your goal summary and adjust constraints in Settings if requirements shift."
    ]
  },
  "/roadmaps": {
    title: "Roadmaps Guide",
    whatItDoes: "Generates custom step-by-step career tracks structured into distinct learning phases.",
    aiCapabilities: [
      { name: "Curriculum Synthesis", desc: "Uses generative models to construct optimized learning paths tailored to specific developer roles." },
      { name: "Contamination Auditing", desc: "Lints roadmap contents to prevent cross-domain topic pollution and ensure SDE-I consistency." }
    ],
    dataAnalyzed: "Target career tracks, educational backgrounds, and current skill sets.",
    recommendationsGeneration: "Matches developer benchmarks with your current profile context to dynamically organize phase timelines.",
    privacyPolicy: "Roadmap details are compiled privately and visible only to your authenticated account.",
    howToTakeAction: [
      "Navigate through learning phases using the progressive steps menu.",
      "Expand milestones to access target links and certification reference codes.",
      "Click the PDF icon to export your curriculum offline."
    ]
  },
  "/career-twin": {
    title: "Career Twin Guide",
    whatItDoes: "Simulates an AI-driven digital representation of your professional profile to evaluate market readiness.",
    aiCapabilities: [
      { name: "Vector Embeddings", desc: "Converts profile data into multidimensional vectors to calculate career-market similarity indices." }
    ],
    dataAnalyzed: "Resume skills, experience levels, target domains, and mock interview answers.",
    recommendationsGeneration: "Computes cosine similarity between your profile embeddings and standard industry criteria models.",
    privacyPolicy: "Vectorized coordinates are computed dynamically and never sold or shared with public trackers.",
    howToTakeAction: [
      "Calibrate career variables in the customization panel.",
      "Trigger compatibility simulations to evaluate readiness indices.",
      "Add recommended keywords to your core profile to improve similarity alignment."
    ]
  },
  "/mentor": {
    title: "AI Mentor Guide (Locked)",
    whatItDoes: "The AI Career Mentor will act as a 24/7 expert advisor providing real-time technical prep, resume calibration, and career counseling.",
    aiCapabilities: [
      { name: "Agentic Mock Challenges", desc: "Under development: interactive coding drills, technical system design prompts, and behavioral STAR coaching." },
      { name: "ATS Optimization Engine", desc: "Under development: semantic keyword auditing to check resume compatibility against developer standards." }
    ],
    dataAnalyzed: "Target profiles, milestones completeness rates, and linked technical assets (e.g. resumes and portfolios).",
    recommendationsGeneration: "Calculates mock ratings, confidence metrics, and strategic action prompts from active goals.",
    privacyPolicy: "Session logs, mock records, and text entries are sandboxed and fully isolated to your profile context.",
    howToTakeAction: [
      "Review the features preview in the locked panel to see upcoming modules.",
      "Ensure your Goal Target and Capacity fields are set in Settings to prepare for simulator drills.",
      "Connect your GitHub URL in Profile settings to calibrate project reviews when calibrations complete."
    ]
  },
  "/community-intelligence": {
    title: "Community Intel Guide",
    whatItDoes: "Centralized regional command panel detailing support density, health metrics, and strategic interventions.",
    aiCapabilities: [
      { name: "Pattern Detection", desc: "Identifies regional support anomalies by mapping resources against developer densities." },
      { name: "Predictive Surge Modeling", desc: "Projects upcoming program application surges based on registration statistics." }
    ],
    dataAnalyzed: "Seeded directories, user geographic coordinates, and active system logs.",
    recommendationsGeneration: "Aggregates localized support types and divides active programs by target cities to output regional indices.",
    privacyPolicy: "Aggregates are calculated using anonymized demographic parameters with zero individual identity exposure.",
    howToTakeAction: [
      "Review the general accessibility index progress bar.",
      "Track active deficiencies to locate city districts with severe program shortages.",
      "Review Recommended Actions and check completed tasks to save deployment progress."
    ]
  },
  "/support-navigator": {
    title: "Support Navigator Guide",
    whatItDoes: "Analyzes and ranks community resources based on eligibility and goals, creating custom execution checklists.",
    aiCapabilities: [
      { name: "Explainable Matching", desc: "Calculates compatibility scores and explains the reasoning behind each recommendation." }
    ],
    dataAnalyzed: "Opportunity eligibility rules, user goals, and obstacles.",
    recommendationsGeneration: "Scores opportunities against profile parameters (budget, goals, obstacles) to rank matches.",
    privacyPolicy: "Private profile parameters are matched in-memory and are never leaked externally.",
    howToTakeAction: [
      "Select an opportunity in the ranked sidebar to load its dashboard.",
      "Read the AI compatibility details explaining why the match is suggested.",
      "Track your application checkmarks in the custom Action Plan list."
    ]
  },
  "/resource-discovery": {
    title: "Resource Discovery Guide",
    whatItDoes: "Interactive proximity search map and directory for scholarships, wellness services, and internships.",
    aiCapabilities: [
      { name: "Semantic Query Parsing", desc: "Translates conversational search parameters into targeted category filters." }
    ],
    dataAnalyzed: "Geocoding coordinates, category tags, and search keywords.",
    recommendationsGeneration: "Queries proximity databases and matches results by city name or distance radius.",
    privacyPolicy: "Coordinates are used solely for localized calculation and are not logged persistently.",
    howToTakeAction: [
      "Enter custom keywords or select a specific support sector (e.g. Wellness).",
      "Filter listings by target city.",
      "Read requirements and click 'Apply Externally' to visit the direct portal."
    ]
  },
  "/community-gaps": {
    title: "Gap Intelligence Guide",
    whatItDoes: "Compiles help gap assessment reports listing districts with absolute resource shortages.",
    aiCapabilities: [
      { name: "Deficiency Compilation", desc: "Monitors regional databases to generate automated markdown impact reports." }
    ],
    dataAnalyzed: "Verified program allocations and district statistics.",
    recommendationsGeneration: "Scans the heatmap data to compile list of city-sector pairs with zero active resources.",
    privacyPolicy: "Aggregated regional gap metrics contain no personally identifiable records.",
    howToTakeAction: [
      "Review the list of active critical gaps by district.",
      "Download the formal CSI Help Gap Report file as a markdown document.",
      "Identify areas for target grant allocations or community volunteering."
    ]
  },
  "/community-heatmap": {
    title: "Heatmap Matrix Guide",
    whatItDoes: "Interactive grid matrix showing resource counts across target cities and support types.",
    aiCapabilities: [
      { name: "Grid Density Aggregation", desc: "Summarizes multi-dimensional density records into access tiers." }
    ],
    dataAnalyzed: "Resource classifications mapped by city boundaries.",
    recommendationsGeneration: "Tallies counts of verified records per city and color-codes grid cells by density levels.",
    privacyPolicy: "Displays public program counts with no individual user profiles exposed.",
    howToTakeAction: [
      "Review color-coded cells: Red (Severe Shortage), Yellow (Low Density), and Blue (Optimal Access).",
      "Hover or check cells to check raw listings counts.",
      "Export the gap data using the action button in the matrix header."
    ]
  },
  "/report-need": {
    title: "Review Queue Guide",
    whatItDoes: "Crowdsourced review ledger allowing users to propose new resources and vote on pending verification cases.",
    aiCapabilities: [
      { name: "Queue Ingestion Routing", desc: "Routes submitted proposals into review queues and feeds." }
    ],
    dataAnalyzed: "Proposal metadata, community votes, and submission fields.",
    recommendationsGeneration: "Promotes entries to verified status when community votes cross the threshold (25 votes).",
    privacyPolicy: "Submissions and voting history are transparent to maintain community trust.",
    howToTakeAction: [
      "Fill out the proposal form (Name, Type, City, Description) and submit.",
      "Browse pending cases in the crowdsourced list.",
      "Click the 'Approve' button to cast your validation vote for pending entries."
    ]
  },
  "/community-command-center": {
    title: "Command Center Guide",
    whatItDoes: "NASA-style real-time operations dashboard aggregating live needs, gap scores, demand forecasts, heatmap matrix, and AI agent actions in one mission-control interface.",
    aiCapabilities: [
      { name: "Live Need Aggregation", desc: "Polls the community_need_reports table every 30s to surface the latest submissions." },
      { name: "Predictive Demand Modeling", desc: "Runs linear regression on 5 weeks of report history to forecast next-month demand per category." },
      { name: "Gap Score Computation", desc: "Calculates real gap scores as requests ÷ (available + 1) × 100 for each need category." }
    ],
    dataAnalyzed: "community_need_reports, community_resources, community_ai_actions, community_forecasts, and heatmap density data.",
    recommendationsGeneration: "Each panel independently fetches its own data slice and auto-refreshes. No stale data.",
    privacyPolicy: "All aggregated metrics are anonymized. Individual report content is only visible to the submitting user.",
    howToTakeAction: [
      "Monitor the Live Needs Feed for urgent community submissions.",
      "Check Gap Intelligence cards — any score above 80 indicates a crisis-level shortage.",
      "Review Demand Forecasts to identify categories with >25% projected growth.",
      "Click 'Report Need' in System Status to submit a new community need."
    ]
  }
};

type WorkspaceShellProps = {
  profile: UserProfileRecord | null;
  workspace: WorkspaceSnapshotRecord | null;
  children: React.ReactNode;
};

// ── NAV_SECTIONS — Single config for ALL sidebar entries ──────────────────
// All 3 sections — Core, Community, Account — render through SidebarNavItem.
// Adding a route here is the ONLY place you need to touch.
interface NavSectionConfig { title: string; items: NavItemConfig[] }

const navGroups: NavSectionConfig[] = [
  {
    title: "Judge Showcase",
    items: [
      { label: "Demo Mode",     href: "/demo",          icon: Play },
      { label: "Impact Center", href: "/impact-center", icon: TrendingUp },
      { label: "Demo Guide",    href: "/demo-guide",    icon: Info },
    ],
  },
  {
    title: "Core Space",
    items: [
      { label: "Dashboard",   href: "/dashboard",   icon: LayoutDashboard },
      { label: "Roadmaps",    href: "/roadmaps",    icon: Map             },
      { label: "Career Twin", href: "/career-twin", icon: Users           },
      { label: "AI Mentor",   href: "/mentor",      icon: MessageSquare   },
    ],
  },
  {
    title: "Community Support Intelligence",
    items: [
      { label: "Community Intel",    href: "/community-intelligence",  icon: Shield  },
      { label: "Support Navigator",  href: "/support-navigator",       icon: Compass },
      { label: "Resource Discovery", href: "/resource-discovery",      icon: Globe   },
      { label: "Gap Intelligence",   href: "/community-gaps",          icon: Activity},
      { label: "Command Center",     href: "/community-command-center",icon: Zap     },
    ],
  },
  {
    title: "Account Systems",
    items: [
      { label: "Settings", href: "/settings", icon: Settings    },
      { label: "Profile",  href: "/profile",  icon: UserCircle  },
    ],
  },
];

const allNavItems = navGroups.flatMap((g) => g.items);

// Mobile navigation links
const mobileNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Roadmaps", href: "/roadmaps", icon: Map },
  { label: "Career Twin", href: "/career-twin", icon: Users }
];

const secondaryModules = [
  { label: "AI Mentor", href: "/mentor", icon: MessageSquare },
  { label: "Community Intel", href: "/community-intelligence", icon: Shield },
  { label: "Opportunities", href: "/support-navigator", icon: Compass },
  { label: "Reports", href: "/community-gaps", icon: Activity },
  { label: "Analytics", href: "/community-command-center", icon: TrendingUp },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Profile", href: "/profile", icon: UserCircle },
];

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

/* ─────────────────────────────────────────────────────────────
   SidebarNavItem — THE single shared component for every nav entry.
   Every route in the rail renders through this. No exceptions.
   ───────────────────────────────────────────────────────────── */
interface NavItemConfig {
  label: string;
  href:  string;
  icon:  React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

interface SidebarNavItemProps {
  item:          NavItemConfig;
  active:        boolean;
  isLoading:     boolean;
  collapsed:     boolean;
  isHovered:     boolean;
  onClick:       (href: string, e: React.MouseEvent<HTMLAnchorElement>) => void;
  onMouseEnter:  (href: string) => void;
  onMouseLeave:  () => void;
}

const SidebarNavItem = memo(function SidebarNavItem({
  item,
  active,
  isLoading,
  collapsed,
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: SidebarNavItemProps) {
  const Icon = item.icon;
  const state = active ? "active" : isHovered ? "hover" : "idle";
  const baseStyle = sidebarItemStyle(state);
  const [isPresent] = usePresence();

  const linkStyle = {
    ...baseStyle,
    background: "transparent",
    borderLeft: "none",
    boxShadow: "none",
    color: active 
      ? CAREEROS.SIDEBAR.itemActive.color 
      : isHovered 
        ? "#cbd5e1" 
        : CAREEROS.SIDEBAR.item.color,
  };

  return (
    <Link
      href={item.href}
      prefetch={true}
      onClick={(e) => onClick(item.href, e)}
      tabIndex={0}
      onMouseEnter={() => onMouseEnter(item.href)}
      onMouseLeave={onMouseLeave}
      title={collapsed ? item.label : undefined}
      style={linkStyle}
      className={[
        "sidebar-link-item lis-nav-item group",
        "relative flex items-center",
        "focus:outline-none focus:ring-1 focus:ring-cyan-500/40",
        collapsed ? "justify-center" : "",
        isLoading ? "shimmer-loading-item" : "",
      ].join(" ")}
    >
      {/* ── Active indicator — LIS liquid cyan beam ─────────────── */}
      {active && isPresent && (
        <motion.div
          layoutId="active-indicator-desktop"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 -z-10 animate-active-pulse"
          style={{
            background:   CAREEROS.SIDEBAR.itemActive.background,
            borderLeft:   CAREEROS.SIDEBAR.itemActive.borderLeft,
            borderRadius: CAREEROS.SIDEBAR.itemActive.borderRadius,
            boxShadow:    CAREEROS.SIDEBAR.itemActive.boxShadow,
          }}
          transition={{
            type: "spring",
            stiffness: 380,
            damping: 30,
          }}
        />
      )}

      {/* ── Hover indicator — only on non-active items ───────────── */}
      {isHovered && !active && isPresent && (
        <motion.div
          layoutId="hover-indicator-desktop"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 -z-10"
          style={{
            background:   CAREEROS.SIDEBAR.itemHover.background,
            borderRadius: CAREEROS.SIDEBAR.itemHover.borderRadius,
          }}
          transition={{
            type: "spring",
            stiffness: 380,
            damping: 30,
          }}
        />
      )}

      {/* ── Icon ─────────────────────────────────────────────────── */}
      <div className="relative shrink-0 flex items-center justify-center">
        <Icon
          style={{
            width: CAREEROS.SIDEBAR.item.iconSize,
            height: CAREEROS.SIDEBAR.item.iconSize,
          }}
          className={`transition-colors duration-[150ms] ${
            active ? "text-cyan-300" : "text-slate-500 group-hover:text-slate-300"
          }`}
        />
        {isLoading && (
          <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-cyan-400 border border-slate-950 animate-pulse-dot" />
        )}
      </div>

      {/* ── Label + loading progress bar ─────────────────────────── */}
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
});

export function WorkspaceShell({ profile, children }: WorkspaceShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();

  // Route transition overlay context (provided by RouteTransitionProvider in layout.tsx)
  const { startTransition, isTransitioning, destination } = useRouteTransition();
  const transitioningTo = isTransitioning ? destination : null;

  // Desktop sidebar collapse state — persisted to localStorage
  const [collapsed, setCollapsed] = useState(false);

  // Mobile Swift Diagnostic expandable menu state
  const [isSwiftDiagnosticOpen, setIsSwiftDiagnosticOpen] = useState(false);

  // Desktop hover slider state
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);

  // Command Palette states
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [paletteFocusedIndex, setPaletteFocusedIndex] = useState(0);

  // Global guide states
  const [guideOpen, setGuideOpen] = useState(false);
  const activeGuide = GUIDE_DATA[pathname];
  const isGuideAvailable = !!activeGuide;

  const score = profile?.readiness_score ?? 0;

  // Restore collapsed state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("careeros-sidebar-collapsed");
      if (stored !== null) setCollapsed(stored === "true");
    } catch { /* localStorage unavailable in SSR guard */ }
  }, []);

  // Persist collapsed state to localStorage on every change
  const handleToggleCollapse = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem("careeros-sidebar-collapsed", String(next)); } catch { /* noop */ }
      return next;
    });
  }, []);

  // Clear mobile overlays and guide on route change complete
  useEffect(() => {
    setIsSwiftDiagnosticOpen(false);
    setGuideOpen(false);
  }, [pathname]);

  // Stub retained for type completeness — actual progress logic lives in RouteTransitionProvider
  const showProgressEstimation = false;
  const progressMessage = "";
  void showProgressEstimation;
  void progressMessage;

  // Link click handlers — triggers global RouteTransitionProvider overlay
  const handleNavClick = useCallback((href: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === href) {
      e.preventDefault();
      return;
    }
    startTransition(href);
  }, [pathname, startTransition]);

  // Command palette keystroke shortcut triggers (CMD/Ctrl+K)
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

  const filteredPaletteItems = useMemo(() => {
    if (!paletteQuery.trim()) return allNavItems;
    return allNavItems.filter((item) =>
      item.label.toLowerCase().includes(paletteQuery.toLowerCase())
    );
  }, [paletteQuery]);

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
        startTransition(targetItem.href);
        setIsCommandPaletteOpen(false);
        setPaletteQuery("");
        router.push(targetItem.href);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsCommandPaletteOpen(false);
    }
  }, [filteredPaletteItems, paletteFocusedIndex, router, startTransition]);

  // Keyboard desktop sidebar navigation support
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

  // Command Actions from mobile swift diagnostic
  const handleSwiftAction = useCallback((href: string) => {
    setIsSwiftDiagnosticOpen(false);
    startTransition(href);
    router.push(href);
  }, [startTransition, router]);

  return (
    <div className="relative min-h-screen bg-transparent text-white overflow-x-hidden">
      {/* Dynamic CSS animations tag */}
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
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 4px rgba(34,211,238,0.2); }
          50% { box-shadow: 0 0 12px rgba(34,211,238,0.4); }
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s infinite ease-in-out;
        }
        @keyframes active-pulse {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; }
        }
        .animate-active-pulse {
          animation: active-pulse 2.2s infinite ease-in-out;
        }
      `}} />



      {/* ── DESKTOP SIDEBAR — Liquid Command Rail ── */}
      <aside
        style={{
          width: collapsed ? "4.5rem" : "15rem",
          transition: "width 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          willChange: "width",
        }}
        className="fixed left-4 top-4 bottom-4 z-30 hidden flex-col rounded-lis border-0 lis-sidebar xl:flex overflow-hidden"
      >
        <LiquidDust origin="tr" color="cyan" intensity={0.05} />
        <LiquidDust origin="bl" color="indigo" intensity={0.06} />
        <div className="flex h-full flex-col relative z-10">
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
            <div className="mx-4 mt-5 flex items-center gap-3 rounded-lis-sm border border-white/[0.07] bg-white/[0.025] p-3" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }}>
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

          {/* Liquid Search Bar (Ctrl+K) */}
          {!collapsed && (
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="mx-4 mt-4 flex items-center justify-between rounded-lis-xs border border-white/[0.06] px-3 py-1.5 text-left text-slate-500 hover:text-slate-300 hover:border-white/10 transition-all duration-[150ms]"
              style={{ background: 'rgba(4,8,16,0.55)', backdropFilter: 'blur(12px)' }}
            >
              <span className="text-[11px] flex items-center gap-1.5">
                <Search className="h-3 w-3" />
                Quick search...
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-mono select-none text-slate-600" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                Ctrl+K
              </span>
            </button>
          )}

          {/* Spaces Navigation Groups */}
          <nav
            onKeyDown={handleSidebarKeyDown}
            className="mt-6 flex-1 space-y-5 px-3 overflow-y-auto"
          >
            {navGroups.map((group) => (
              <div key={group.title} className="space-y-1.5">
                {!collapsed && (
                  <p className="text-[9px] uppercase tracking-[0.16em] text-slate-600 font-bold px-2 select-none">
                    {group.title}
                  </p>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <SidebarNavItem
                      key={item.href}
                      item={item}
                      active={pathname === item.href}
                      isLoading={transitioningTo === item.href}
                      collapsed={collapsed}
                      isHovered={hoveredHref === item.href}
                      onClick={handleNavClick}
                      onMouseEnter={setHoveredHref}
                      onMouseLeave={() => setHoveredHref(null)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Profile Footer */}
          <div
            className={`m-3 mt-0 rounded-lis-sm p-3 ${collapsed ? "flex justify-center" : ""}`}
            style={{ background: 'rgba(6,10,22,0.60)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
          >
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
                  aria-label="Sign out of account"
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-rose-400 focus-visible:ring-2 focus-visible:ring-cyan-500 transition-colors duration-[120ms] shrink-0"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Collapse Toggle */}
        <button
          type="button"
          onClick={handleToggleCollapse}
          aria-label="Toggle sidebar collapse"
          className="absolute -right-3 top-20 z-40 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:text-cyan-300 focus-visible:ring-2 focus-visible:ring-cyan-500 transition-colors duration-[150ms]"
          style={{ background: 'rgba(8,12,24,0.90)', border: '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(12px)' }}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* ── DESKTOP CONTENT CONTAINER — follows sidebar width via motion ── */}
      <div
        style={{
          paddingLeft: collapsed ? "5.5rem" : "16.5rem",
          transition: "padding-left 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          willChange: "padding-left",
        }}
        className="hidden xl:block"
      >
        <main className="mx-auto max-w-7xl px-8 py-8 pb-24 relative">
          {isGuideAvailable && (
            <button
              onClick={() => setGuideOpen(true)}
              aria-label="Open Mission Guide instructions"
              className="absolute top-8 right-8 z-30 px-3.5 py-2 rounded-lis-xs text-xs text-slate-300 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-500 transition-all duration-[150ms] flex items-center gap-1.5 font-semibold active:scale-95 hover:border-cyan-500/25"
              style={{ background: 'rgba(8,12,24,0.75)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(20px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 24px rgba(0,0,0,0.35)' }}
            >
              <Info className="h-3.5 w-3.5 text-cyan-400" />
              Mission Guide
            </button>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: CAREEROS.MOTION.route.duration, ease: CAREEROS.MOTION.route.ease }}
              className={`transition-all duration-[350ms] ${transitioningTo ? "blur-[4px] opacity-40 pointer-events-none" : ""}`}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ── MOBILE / TABLET VIEWPORTS (DEDICATED NAVIGATION SYSTEM) ── */}
      <div className="xl:hidden min-h-screen flex flex-col">
        {/* Mobile Top Header — LIS surface */}
        <header
          className="sticky top-0 z-20 px-5 py-3"
          style={{ background: 'rgba(7,10,22,0.82)', backdropFilter: 'blur(30px) saturate(180%)', borderBottom: '1px solid rgba(255,255,255,0.07)', boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.03)' }}
        >
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
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

        {/* Mobile main content container */}
        <main className="flex-1 mx-auto w-full max-w-5xl px-5 py-6 pb-28 relative overflow-x-hidden">
          {isGuideAvailable && (
            <button
              onClick={() => setGuideOpen(true)}
              className="absolute top-4 right-5 z-30 px-2.5 py-1.5 rounded-lis-xs text-[10px] text-slate-300 hover:text-white transition-all duration-[150ms] flex items-center gap-1 font-semibold active:scale-95"
              style={{ background: 'rgba(8,12,24,0.80)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)' }}
            >
              <Info className="h-3.5 w-3.5 text-cyan-400" />
              Guide
            </button>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: CAREEROS.MOTION.route.duration, ease: CAREEROS.MOTION.route.ease }}
              className={`transition-all duration-[350ms] ${transitioningTo ? "blur-[4px] opacity-40 pointer-events-none" : ""}`}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* ── MOBILE BOTTOM NAVIGATION BAR ── */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-20 px-2 pb-safe select-none"
          style={{ background: 'rgba(7,10,22,0.85)', backdropFilter: 'blur(20px) saturate(180%)', borderTop: '1px solid rgba(255,255,255,0.07)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}
        >
          {mobileNavItems.map((item, idx) => {
            const active = pathname === item.href;
            const isLoading = transitioningTo === item.href;
            const Icon = item.icon;

            return (
              <div key={item.href} className="flex flex-1 items-center justify-center relative">
                {/* Insert Swift Diagnostic Orb directly after the first item (Dashboard) to center it in a 3-item + orb layout */}
                {idx === 1 && (
                  <div className="px-4 shrink-0 relative z-50">
                    <button
                      onClick={() => setIsSwiftDiagnosticOpen(prev => !prev)}
                      aria-label="Toggle Swift Diagnostic Menu"
                      aria-expanded={isSwiftDiagnosticOpen}
                      className="flex h-12 w-12 items-center justify-center rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                      style={{ 
                        background: 'linear-gradient(135deg, #22d3ee, #3b82f6)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        boxShadow: '0 0 20px rgba(34,211,238,0.4), inset 0 2px 4px rgba(255,255,255,0.3)',
                        transform: isSwiftDiagnosticOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
                    >
                      <Zap className="h-6 w-6 text-slate-900 fill-slate-900 stroke-[1.5]" />
                    </button>
                  </div>
                )}

                <Link
                  href={item.href}
                  prefetch={true}
                  onClick={(e) => handleNavClick(item.href, e)}
                  className={`flex flex-col items-center gap-1.5 py-2 w-full text-[10px] font-medium transition-colors ${
                    active ? "text-cyan-300 font-semibold" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <div className="relative">
                    <Icon className="h-5 w-5" />
                    {isLoading && (
                      <span className="absolute -top-1 -right-1 flex h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse-dot" />
                    )}
                  </div>
                  <span className="truncate max-w-[65px]">{item.label}</span>
                </Link>
              </div>
            );
          })}
        </nav>

        {/* ── SWIFT DIAGNOSTIC FULL-SCREEN MENU ── */}
        <AnimatePresence>
          {isSwiftDiagnosticOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 30, duration: 0.25 }}
              className="fixed inset-0 z-40 flex flex-col pt-24 px-6 pb-28 overflow-y-auto overscroll-contain"
              style={{ 
                background: 'rgba(3,7,18,0.92)', 
                backdropFilter: 'blur(16px)', 
                willChange: "transform, opacity" 
              }}
            >
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                  <Zap className="h-5 w-5 text-cyan-400 fill-cyan-400/20" />
                  Swift Diagnostic
                </h2>
                <p className="text-xs text-slate-400 mt-1">Access all secondary modules and tools</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {secondaryModules.map((mod) => {
                  const Icon = mod.icon;
                  return (
                    <button
                      key={mod.href}
                      onClick={() => handleSwiftAction(mod.href)}
                      className="flex flex-col items-start gap-3 p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-cyan-500/30 active:scale-[0.98] transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                    >
                      <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-white block">{mod.label}</span>
                      </div>
                    </button>
                  );
                })}
                
                {/* Theme Studio Inline Launcher */}
                <div className="flex flex-col items-start gap-3 p-4 rounded-2xl border border-white/5 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 active:scale-[0.98] transition-all text-left relative overflow-hidden">
                   <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 relative z-10">
                     <Settings className="h-5 w-5" />
                   </div>
                   <div className="relative z-10 w-full flex items-center justify-between">
                     <span className="text-sm font-semibold text-white block">Theme Studio</span>
                   </div>
                   <div className="absolute right-4 bottom-4 z-20 scale-75 origin-bottom-right">
                     <ThemeOrb />
                   </div>
                </div>
              </div>
            </motion.div>
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
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.96 }}
              transition={{ duration: 0.20, ease: [0.16,1,0.3,1] }}
              className="fixed inset-x-4 top-[15vh] mx-auto z-50 max-w-lg overflow-hidden rounded-lis p-4 space-y-3"
              style={{ background: 'rgba(8,12,24,0.90)', backdropFilter: 'blur(40px) saturate(200%)', border: '1px solid rgba(255,255,255,0.09)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 40px 100px rgba(0,0,0,0.60)' }}
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
                  className="lis-input w-full pl-9 pr-4 text-xs placeholder-slate-500"
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
                          startTransition(item.href);
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

      {/* ── GLOBAL MISSION GUIDE DRAWER ── */}
      <AnimatePresence>
        {guideOpen && activeGuide && (
          <>
            {/* Modal backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setGuideOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Slide-over panel — LIS surface */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 35 }}
              className="fixed top-0 right-0 h-screen w-80 z-50 p-6 flex flex-col gap-5 select-none text-xs text-slate-300 overflow-hidden"
              style={{ background: 'rgba(7,10,22,0.96)', backdropFilter: 'blur(40px) saturate(200%)', borderLeft: '1px solid rgba(255,255,255,0.08)', boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.04), -20px 0 80px rgba(0,0,0,0.50)' }}
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-2.5 shrink-0">
                <div className="flex items-center gap-2">
                  <Info className="h-4.5 w-4.5 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white tracking-wide">{activeGuide.title}</h3>
                </div>
                <button 
                  onClick={() => setGuideOpen(false)}
                  aria-label="Close guide panel"
                  className="p-1 hover:bg-white/5 rounded-lg border border-white/5 text-slate-500 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-500 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-5 pr-1 leading-relaxed scrollbar-thin">
                <div className="space-y-1.5">
                  <p className="font-bold text-cyan-400 uppercase tracking-wider text-[9px]">What this page does</p>
                  <p className="text-slate-300">{activeGuide.whatItDoes}</p>
                </div>

                <div className="space-y-1.5">
                  <p className="font-bold text-cyan-400 uppercase tracking-wider text-[9px]">AI Capabilities Used</p>
                  <div className="space-y-2 mt-1">
                    {activeGuide.aiCapabilities.map((cap, i) => (
                      <div key={i} className="rounded-lis-xs p-2.5" style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)' }}>
                        <p className="font-bold text-white text-[10px] flex items-center gap-1">
                          <Brain className="h-3.5 w-3.5 text-indigo-400" /> {cap.name}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {cap.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="font-bold text-cyan-400 uppercase tracking-wider text-[9px]">What data is analyzed</p>
                  <div className="flex items-start gap-1.5 rounded-lis-xs p-2.5 text-[10px] text-slate-300" style={{ background: 'rgba(4,8,16,0.60)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <Database className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{activeGuide.dataAnalyzed}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="font-bold text-cyan-400 uppercase tracking-wider text-[9px]">How recommendations are generated</p>
                  <p className="text-slate-300">{activeGuide.recommendationsGeneration}</p>
                </div>

                <div className="space-y-1.5">
                  <p className="font-bold text-cyan-400 uppercase tracking-wider text-[9px]">Privacy Policy</p>
                  <p className="text-slate-400 italic text-[11px]">{activeGuide.privacyPolicy}</p>
                </div>

                <div className="space-y-1.5">
                  <p className="font-bold text-cyan-400 uppercase tracking-wider text-[9px]">How user can take action</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {activeGuide.howToTakeAction.map((action, i) => (
                      <li key={i}>{action}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <button
                onClick={() => setGuideOpen(false)}
                className="lis-btn-primary w-full py-2 text-xs rounded-lis-xs text-center mt-auto shrink-0 active:scale-95"
              >
                Got it
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <ThemeOrb />
    </div>
  );
}
