/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║          CAREEROS LIQUID INTELLIGENCE SYSTEM — v2.0                     ║
 * ║          Single Source of Truth for ALL visual tokens                   ║
 * ║                                                                          ║
 * ║  Usage:                                                                  ║
 * ║    import { CAREEROS, glassStyle, cardStyle, buttonStyle } from          ║
 * ║             "@/styles/careeros-design-system";                           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import type { CSSProperties } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   COLOR PALETTE
   ═══════════════════════════════════════════════════════════════════════════ */
export const COLORS = {
  /** Global canvas — deepest background */
  bg:         "#030712",
  /** Deep navy canvas alternative */
  bgDeep:     "#020510",

  /** Default surface (glass card interior) */
  surface:    "rgba(8,12,24,0.55)",
  /** Richer solid surface for high-contrast contexts */
  surfaceRich:"rgba(8,12,22,0.88)",
  /** Sidebar rail surface */
  surfaceSide:"rgba(7,10,22,0.72)",
  /** Modal / overlay surface */
  surfaceMod: "rgba(8,12,24,0.92)",

  /* ── Brand / Accent ──────────────────────────────────────────────── */
  /** Electric Cyan — primary accent */
  accent:     "var(--careeros-primary)",
  /** Cyan glow (for shadows, halos) */
  accentGlow: "var(--careeros-card-glow)",
  /** Cyan at 7% — active nav background */
  accentDim:  "var(--careeros-sidebar-active)",
  /** Cyan at 32% — hover border */
  accentBdr:  "rgba(var(--careeros-primary-rgb), 0.32)",
  /** Secondary accent — Electric Indigo / Sky */
  accent2:    "var(--careeros-secondary)",
  /** Accent 2 glow */
  accent2Glow:"rgba(var(--careeros-secondary-rgb), 0.20)",

  /* ── Semantic ────────────────────────────────────────────────────── */
  success:    "#10B981",
  successGlow:"rgba(16,185,129,0.20)",
  warning:    "#F59E0B",
  warningGlow:"rgba(245,158,11,0.20)",
  danger:     "#EF4444",
  dangerGlow: "rgba(239,68,68,0.20)",

  /* ── Text hierarchy ──────────────────────────────────────────────── */
  text:       "#F8FAFC",
  secondary:  "#94A3B8",
  muted:      "#64748B",
  faint:      "#475569",

  /* ── Border system ───────────────────────────────────────────────── */
  border:     "var(--careeros-card-border)",
  borderSoft: "rgba(255,255,255,0.06)",
  borderAccnt:"rgba(var(--careeros-primary-rgb), 0.35)",
  borderDangr:"rgba(239,68,68,0.25)",
  /** Inner top highlight (inset 0 1px 0) */
  highlight:  "rgba(255,255,255,0.12)",
  /** Sidebar inner edge */
  highlightSm:"rgba(255,255,255,0.06)",
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   GLASS SURFACE SYSTEM
   backdrop-filter recipes. Apply via glassStyle() helper.
   ═══════════════════════════════════════════════════════════════════════════ */
export const GLASS = {
  /** Standard card / panel */
  surface: {
    backdropFilter:         "blur(20px) saturate(180%)",
    WebkitBackdropFilter:   "blur(20px) saturate(180%)",
    willChange:             "backdrop-filter, transform" as const,
    transform:              "translateZ(0)",
  },
  /** Sidebar Command Rail — heavier blur */
  sidebar: {
    backdropFilter:         "blur(24px) saturate(200%)",
    WebkitBackdropFilter:   "blur(24px) saturate(200%)",
    willChange:             "backdrop-filter, transform" as const,
    transform:              "translateZ(0)",
  },
  /** Overlay / modal — maximum depth */
  modal: {
    backdropFilter:         "blur(24px) saturate(200%)",
    WebkitBackdropFilter:   "blur(24px) saturate(200%)",
    willChange:             "backdrop-filter, transform" as const,
    transform:              "translateZ(0)",
  },
  /** Light input / search bar */
  light: {
    backdropFilter:         "blur(12px)",
    WebkitBackdropFilter:   "blur(12px)",
    willChange:             "backdrop-filter" as const,
    transform:              "translateZ(0)",
  },
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   CARD SYSTEM
   ═══════════════════════════════════════════════════════════════════════════ */
export const CARDS = {
  /** Standard card surface — resting state */
  surface: {
    background:   "linear-gradient(180deg, rgba(8,12,22,0.88) 0%, rgba(5,8,18,0.94) 100%)",
    border:       `1px solid ${COLORS.border}`,
    boxShadow:    `inset 0 1px 0 ${COLORS.highlight}, 0 20px 60px rgba(0,0,0,0.35)`,
    borderRadius: "28px",
    position:     "relative" as const,
    overflow:     "hidden" as const,
  },
  /** Glass-translucent variant (more see-through) */
  glass: {
    background:   COLORS.surface,
    border:       `1px solid ${COLORS.border}`,
    boxShadow:    `inset 0 1px 0 ${COLORS.highlight}, 0 20px 60px rgba(0,0,0,0.40)`,
    borderRadius: "24px",
    position:     "relative" as const,
    overflow:     "hidden" as const,
  },
  /** Hovered card surface */
  hover: {
    borderColor:  COLORS.accentBdr,
    boxShadow:    `inset 0 1px 0 ${COLORS.highlight}, 0 28px 80px var(--careeros-card-glow)`,
    transform:    "translateY(-2px) scale(1.01) translateZ(0)",
  },
  /** Radius tokens */
  radius:   { lg: "28px", md: "20px", sm: "16px", xs: "12px" },
  /** Hover motion */
  motion:   { scale: 1.01, y: -2, duration: 0.28, ease: [0.16, 1, 0.3, 1] as number[] },
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   BUTTON SYSTEM
   ═══════════════════════════════════════════════════════════════════════════ */
export const BUTTONS = {
  /** Shared geometry — all buttons */
  base: {
    height:       "40px",
    borderRadius: "12px",
    fontWeight:   600,
    fontSize:     "13px",
    cursor:       "pointer" as const,
    willChange:   "transform" as const,
    transform:    "translateZ(0)",
    transition:   "transform 180ms cubic-bezier(0.16,1,0.3,1), box-shadow 180ms cubic-bezier(0.16,1,0.3,1), opacity 180ms cubic-bezier(0.16,1,0.3,1)",
  },
  /** Liquid cyan — primary CTA */
  primary: {
    background:   "linear-gradient(135deg, #22D3EE 0%, #67E8F9 100%)",
    border:       "1px solid rgba(255,255,255,0.25)",
    boxShadow:    `0 0 28px ${COLORS.accentGlow}, inset 0 1px 0 rgba(255,255,255,0.30)`,
    color:        COLORS.bg,
  },
  primaryHover: {
    transform:    "translateY(-2px) translateZ(0)",
    boxShadow:    "0 0 40px rgba(34,211,238,0.45), inset 0 1px 0 rgba(255,255,255,0.35)",
  },
  /** Glass ghost */
  ghost: {
    background:   "rgba(255,255,255,0.04)",
    border:       `1px solid ${COLORS.border}`,
    boxShadow:    `inset 0 1px 0 ${COLORS.highlightSm}`,
    color:        COLORS.text,
  },
  ghostHover: {
    background:   "rgba(255,255,255,0.07)",
    borderColor:  "rgba(255,255,255,0.15)",
    transform:    "translateY(-1px) translateZ(0)",
  },
  /** Cyan-tinted secondary */
  secondary: {
    background:   "rgba(34,211,238,0.08)",
    border:       "1px solid rgba(34,211,238,0.20)",
    boxShadow:    `inset 0 1px 0 rgba(34,211,238,0.10)`,
    color:        "#67E8F9",
  },
  secondaryHover: {
    background:   "rgba(34,211,238,0.14)",
    borderColor:  "rgba(34,211,238,0.40)",
    transform:    "translateY(-1px) translateZ(0)",
  },
  /** Danger / destructive */
  danger: {
    background:   "rgba(239,68,68,0.06)",
    border:       `1px solid ${COLORS.borderDangr}`,
    boxShadow:    "inset 0 1px 0 rgba(239,68,68,0.08)",
    color:        "#FCA5A5",
  },
  dangerHover: {
    background:   "rgba(239,68,68,0.12)",
    borderColor:  "rgba(239,68,68,0.40)",
  },
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   INPUT SYSTEM
   ═══════════════════════════════════════════════════════════════════════════ */
export const INPUTS = {
  base: {
    background:   "rgba(4,8,16,0.50)",
    border:       `1px solid ${COLORS.border}`,
    boxShadow:    "inset 0 2px 6px rgba(0,0,0,0.30), inset 0 -1px 0 rgba(255,255,255,0.03)",
    borderRadius: "12px",
    color:        COLORS.text,
    fontSize:     "13px",
    height:       "40px",
    padding:      "0 12px",
    outline:      "none",
    transition:   "border-color 150ms cubic-bezier(0.16,1,0.3,1), box-shadow 150ms cubic-bezier(0.16,1,0.3,1)",
  },
  focus: {
    borderColor:  "rgba(34,211,238,0.55)",
    boxShadow:    "inset 0 2px 6px rgba(0,0,0,0.25), 0 0 0 3px rgba(34,211,238,0.08)",
  },
  hover: {
    borderColor:  "rgba(255,255,255,0.12)",
  },
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   TYPOGRAPHY SCALE — 8px rhythm
   ═══════════════════════════════════════════════════════════════════════════ */
export const TYPOGRAPHY = {
  /** 72px — Landing hero */
  hero: {
    fontSize: "72px", lineHeight: "1.05", letterSpacing: "-0.04em",
    fontWeight: 700,
  },
  /** 40px — Section header */
  section: {
    fontSize: "40px", lineHeight: "1.1", letterSpacing: "-0.03em",
    fontWeight: 600,
  },
  /** 24px — Dashboard / page title */
  dashboard: {
    fontSize: "24px", lineHeight: "1.15", letterSpacing: "-0.02em",
    fontWeight: 600,
  },
  /** 18px — Card title */
  cardTitle: {
    fontSize: "18px", lineHeight: "1.25", letterSpacing: "-0.015em",
    fontWeight: 600,
  },
  /** 15px — Body text */
  body: {
    fontSize: "15px", lineHeight: "1.5", letterSpacing: "-0.005em",
    fontWeight: 400,
  },
  /** 13px — Secondary body / labels */
  small: {
    fontSize: "13px", lineHeight: "1.4", letterSpacing: "0",
    fontWeight: 400,
  },
  /** 11px + uppercase — Eyebrow / caption */
  caption: {
    fontSize: "11px", lineHeight: "1.3", letterSpacing: "0.15em",
    textTransform: "uppercase" as const, fontWeight: 600,
  },
  /** Monospace — data / code */
  mono: {
    fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace",
    fontSize: "12px", lineHeight: "1.5", letterSpacing: "0.02em",
  },
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   MOTION SYSTEM
   ═══════════════════════════════════════════════════════════════════════════ */
export const MOTION = {
  /** Standard easing — "natural spring feel" */
  ease:          [0.16, 1, 0.3, 1] as [number,number,number,number],
  /** Fast micro-interactions */
  easeFast:      [0.25, 1, 0.5, 1] as [number,number,number,number],

  /** Card hover animation */
  hover: {
    initial:    { scale: 1, y: 0 },
    whileHover: { scale: 1.01, y: -2, transition: { duration: 0.28, ease: [0.16,1,0.3,1] as [number,number,number,number] } },
  },
  /** Page / card enter animation */
  enter: {
    initial:   { opacity: 0, y: 6 },
    animate:   { opacity: 1, y: 0 },
    transition:{ duration: 0.22, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] },
  },
  /** Stagger list enter */
  stagger: {
    container: { animate: { transition: { staggerChildren: 0.06 } } },
    child:     { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.22, ease: [0.16,1,0.3,1] } },
  },
  /** Route transition overlay */
  route: {
    duration:  0.35,
    ease:      [0.16, 1, 0.3, 1] as [number,number,number,number],
  },
  /** Sidebar spring */
  sidebar: {
    type:      "spring" as const,
    stiffness: 320,
    damping:   32,
    mass:      0.8,
  },
  /** Nav active indicator spring */
  navIndicator: {
    type:      "spring" as const,
    stiffness: 380,
    damping:   30,
  },
  /** Modal / drawer */
  modal: {
    initial:   { opacity: 0, scale: 0.97, y: 8 },
    animate:   { opacity: 1, scale: 1,    y: 0 },
    exit:      { opacity: 0, scale: 0.97, y: 8 },
    transition:{ duration: 0.22, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] },
  },
  /** Slide-over panel (Mission Guide, side drawers) */
  slideOver: {
    initial:   { x: "100%" },
    animate:   { x: 0 },
    exit:      { x: "100%" },
    transition:{ type: "spring" as const, stiffness: 380, damping: 35 },
  },
  /** Bottom sheet (mobile drawer) */
  bottomSheet: {
    initial:   { y: "100%" },
    animate:   { y: 0 },
    exit:      { y: "100%" },
    transition:{ type: "spring" as const, stiffness: 350, damping: 30 },
  },
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   SHADOW SYSTEM
   ═══════════════════════════════════════════════════════════════════════════ */
export const SHADOWS = {
  none:    "none",
  /** Resting card shadow */
  card:    "inset 0 1px 0 rgba(255,255,255,0.12), 0 20px 60px rgba(0,0,0,0.35)",
  /** Hovered card shadow */
  hover:   "inset 0 1px 0 rgba(255,255,255,0.14), 0 28px 80px var(--careeros-card-glow)",
  /** Sidebar rail shadow */
  sidebar: "4px 0 60px rgba(0,0,0,0.40), inset -1px 0 0 rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)",
  /** Cyan ambient glow */
  glow:    "0 0 32px rgba(var(--careeros-primary-rgb),0.28)",
  /** Elevated overlay */
  overlay: "0 40px 100px rgba(0,0,0,0.65)",
  /** Button primary glow */
  btnPrimary: "0 0 28px rgba(var(--careeros-primary-rgb),0.30), inset 0 1px 0 rgba(255,255,255,0.30)",
  /** Subtle inset (inputs, nested panels) */
  inset:   "inset 0 2px 6px rgba(0,0,0,0.30), inset 0 -1px 0 rgba(255,255,255,0.03)",
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   ATMOSPHERIC DUST SYSTEM
   ═══════════════════════════════════════════════════════════════════════════ */
export const DUST = {
  /** Top-right cyan origin */
  topRight: "radial-gradient(ellipse 200px 160px at top right, rgba(var(--careeros-dust-primary),0.07), transparent 70%)",
  /** Bottom-left indigo origin */
  bottomLeft:"radial-gradient(ellipse 180px 150px at bottom left, rgba(var(--careeros-dust-secondary),0.06), transparent 70%)",
  /** Top-left subtle */
  topLeft:   "radial-gradient(ellipse 160px 140px at top left, rgba(var(--careeros-dust-primary),0.05), transparent 70%)",
  /** Bottom-right warm */
  bottomRight:"radial-gradient(ellipse 180px 150px at bottom right, rgba(var(--careeros-dust-secondary),0.05), transparent 70%)",
  /** Default filter for all dust layers */
  filter:    "blur(40px)",
  /** Default opacity multiplier */
  opacity:   0.28,
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   SIDEBAR TOKENS
   ═══════════════════════════════════════════════════════════════════════════ */
export const SIDEBAR = {
  /** Expanded width */
  width:          "15rem",   // 240px
  /** Collapsed width */
  widthCollapsed: "4.5rem",  // 72px

  /** Nav item — resting */
  item: {
    padding:      "8px 10px",
    borderRadius: "8px",
    fontSize:     "12px",
    gap:          "10px",
    iconSize:     "14px",   // h-3.5 w-3.5
    color:        COLORS.muted,
  },
  /** Nav item — active state */
  itemActive: {
    background:   COLORS.accentDim,
    borderLeft:   `2px solid ${COLORS.accent}`,
    borderRadius: "0 10px 10px 0",
    boxShadow:    "inset 0 1px 0 rgba(var(--careeros-primary-rgb),0.08), inset 0 0 12px rgba(var(--careeros-primary-rgb),0.03)",
    color:        COLORS.text,
    fontWeight:   600,
    iconColor:    "var(--careeros-primary)",
  },
  /** Nav item — hover state */
  itemHover: {
    background:   "rgba(255,255,255,0.025)",
    borderRadius: "8px",
    transform:    "translateX(2px) translateZ(0)",
  },
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   BADGE SYSTEM
   ═══════════════════════════════════════════════════════════════════════════ */
export const BADGES = {
  base: {
    display:        "inline-flex",
    alignItems:     "center",
    gap:            "4px",
    fontSize:       "9px",
    fontWeight:     700,
    letterSpacing:  "0.12em",
    textTransform:  "uppercase" as const,
    padding:        "2px 8px",
    borderRadius:   "99px",
    border:         "1px solid",
  },
  variants: {
    cyan:    { background: "rgba(var(--careeros-primary-rgb),0.10)",  borderColor: "rgba(var(--careeros-primary-rgb),0.25)",  color: "var(--careeros-badge)"  },
    green:   { background: "rgba(16,185,129,0.10)",  borderColor: "rgba(16,185,129,0.25)",  color: "#6EE7B7"  },
    amber:   { background: "rgba(245,158,11,0.10)",  borderColor: "rgba(245,158,11,0.25)",  color: "#FCD34D"  },
    rose:    { background: "rgba(239,68,68,0.10)",   borderColor: "rgba(239,68,68,0.25)",   color: "#FCA5A5"  },
    indigo:  { background: "rgba(96,165,250,0.10)",  borderColor: "rgba(96,165,250,0.25)",  color: "#93C5FD"  },
    slate:   { background: "rgba(100,116,139,0.12)", borderColor: "rgba(100,116,139,0.25)", color: "#94A3B8"  },
  },
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   ROUTE MAP
   ═══════════════════════════════════════════════════════════════════════════ */
export const ROUTES = {
  dashboard:         "/dashboard",
  roadmaps:          "/roadmaps",
  careerTwin:        "/career-twin",
  mentor:            "/mentor",
  communityIntel:    "/community-intelligence",
  supportNavigator:  "/support-navigator",
  resourceDiscovery: "/resource-discovery",
  communityGaps:     "/community-gaps",
  commandCenter:     "/community-command-center",
  communityHeatmap:  "/community-heatmap",
  reportNeed:        "/report-need",
  settings:          "/settings",
  profile:           "/profile",
  login:             "/login",
  signup:            "/signup",
  onboarding:        "/onboarding",
} as const;

export type RoutePath = typeof ROUTES[keyof typeof ROUTES];

/* ═══════════════════════════════════════════════════════════════════════════
   MASTER CAREEROS OBJECT
   Single import covers everything.
   ═══════════════════════════════════════════════════════════════════════════ */
export const CAREEROS = {
  COLORS,
  GLASS,
  CARDS,
  BUTTONS,
  INPUTS,
  TYPOGRAPHY,
  MOTION,
  SHADOWS,
  DUST,
  SIDEBAR,
  BADGES,
  ROUTES,
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   STYLE HELPER FUNCTIONS
   Compose tokens into ready-to-use CSSProperties objects.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Returns a complete glass surface style object.
 * @param variant - "surface" | "sidebar" | "modal" | "light"
 */
export function glassStyle(
  variant: keyof typeof GLASS = "surface"
): CSSProperties {
  return { ...GLASS[variant] };
}

/**
 * Returns a complete card style, optionally in hovered state.
 * @param variant - "surface" (gradient) | "glass" (translucent)
 * @param hovered - if true, applies hover state overrides
 */
export function cardStyle(
  variant: "surface" | "glass" = "surface",
  hovered = false
): CSSProperties {
  const base = { ...CARDS[variant], ...GLASS.surface } as CSSProperties;
  if (!hovered) return base;
  return {
    ...base,
    boxShadow:   CARDS.hover.boxShadow,
    borderColor: CARDS.hover.borderColor,
    transform:   CARDS.hover.transform,
  };
}

/**
 * Returns a complete button style object.
 * @param variant - "primary" | "ghost" | "secondary" | "danger"
 */
export function buttonStyle(
  variant: "primary" | "ghost" | "secondary" | "danger" = "primary"
): CSSProperties {
  return { ...BUTTONS.base, ...BUTTONS[variant] } as CSSProperties;
}

/**
 * Returns a complete input style object.
 * @param state - "base" | "focus" | "hover"
 */
export function inputStyle(
  state: "base" | "focus" | "hover" = "base"
): CSSProperties {
  if (state === "base") return { ...INPUTS.base, ...GLASS.light };
  return { ...INPUTS.base, ...GLASS.light, ...INPUTS[state] };
}

/**
 * Returns dust layer style for a given corner origin.
 */
export function dustStyle(
  origin: "topRight" | "bottomLeft" | "topLeft" | "bottomRight",
  intensity: number = DUST.opacity
): CSSProperties {
  const positions: Record<typeof origin, CSSProperties> = {
    topRight:    { top: "-40px",  right:  "-40px" },
    bottomLeft:  { bottom: "-40px", left: "-40px" },
    topLeft:     { top: "-40px",  left:  "-40px"  },
    bottomRight: { bottom: "-40px", right: "-40px" },
  };
  return {
    position:      "absolute",
    width:         "220px",
    height:        "180px",
    backgroundImage: DUST[origin],
    filter:        DUST.filter,
    opacity:       intensity,
    pointerEvents: "none",
    zIndex:        0,
    ...positions[origin],
  };
}

/**
 * Returns sidebar nav item style based on state.
 */
export function sidebarItemStyle(
  state: "idle" | "active" | "hover"
): CSSProperties {
  const base: CSSProperties = {
    padding:      SIDEBAR.item.padding,
    borderRadius: SIDEBAR.item.borderRadius,
    fontSize:     SIDEBAR.item.fontSize,
    gap:          SIDEBAR.item.gap,
    position:     "relative",
    display:      "flex",
    alignItems:   "center",
    willChange:   "transform",
    transform:    "translateZ(0)",
  };
  if (state === "active") return { ...base, ...SIDEBAR.itemActive };
  if (state === "hover")  return { ...base, ...SIDEBAR.itemHover };
  return base;
}
