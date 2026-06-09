"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { CAREEROS } from "@/styles/careeros-design-system";

/* ─────────────────────────────────────────────────────────────────────────────
   PageHero — Universal page header for all CareerOS workspace pages.

   Every page gets an identical, consistent header experience.
   No per-page hand-rolled title sections.

   Usage:
     <PageHero
       badge="Community Intelligence"
       title="Community Intelligence"
       subtitle="Real-time needs analysis powered by AI pattern detection"
       status="live"
       actions={<Button>Report Need</Button>}
     />

     <PageHero
       badge="Roadmaps"
       badgeVariant="indigo"
       title="Your Learning Roadmap"
       subtitle="AI-curated curriculum adapted to your career goal"
     />
   ───────────────────────────────────────────────────────────────────────────── */

export type BadgeVariant = "cyan" | "indigo" | "green" | "amber" | "rose" | "slate";
export type PageStatus   = "live" | "beta" | "offline";

interface PageHeroProps {
  /** Small eyebrow badge above the title */
  badge?: string;
  /** Badge color variant (default: "cyan") */
  badgeVariant?: BadgeVariant;
  /** Main page title — H1 */
  title: string;
  /** Supporting subtitle — shown below title */
  subtitle?: string;
  /** Live status indicator */
  status?: PageStatus;
  /** Right-side action slot (buttons, controls) */
  actions?: React.ReactNode;
  /** Additional className for layout only */
  className?: string;
}

/* ── Badge styles ─────────────────────────────────────────────────────────── */
const BADGE_STYLES: Record<BadgeVariant, React.CSSProperties> = {
  cyan:   { background: "rgba(34,211,238,0.08)",  border: "1px solid rgba(34,211,238,0.22)",  color: "#67E8F9"  },
  indigo: { background: "rgba(96,165,250,0.08)",  border: "1px solid rgba(96,165,250,0.22)",  color: "#93C5FD"  },
  green:  { background: "rgba(16,185,129,0.08)",  border: "1px solid rgba(16,185,129,0.22)",  color: "#6EE7B7"  },
  amber:  { background: "rgba(245,158,11,0.08)",  border: "1px solid rgba(245,158,11,0.22)",  color: "#FCD34D"  },
  rose:   { background: "rgba(239,68,68,0.08)",   border: "1px solid rgba(239,68,68,0.22)",   color: "#FCA5A5"  },
  slate:  { background: "rgba(100,116,139,0.10)", border: "1px solid rgba(100,116,139,0.22)", color: "#94A3B8"  },
};

/* ── Status indicator ─────────────────────────────────────────────────────── */
const STATUS_CONFIG: Record<PageStatus, { label: string; color: string; dot: string }> = {
  live:    { label: "Live",    color: "#6EE7B7", dot: "#10B981" },
  beta:    { label: "Beta",    color: "#FCD34D", dot: "#F59E0B" },
  offline: { label: "Offline", color: "#94A3B8", dot: "#64748B" },
};

/* ── Framer Motion variants ───────────────────────────────────────────────── */
const containerVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden:  { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] } },
};

function PageHeroComponent({
  badge,
  badgeVariant = "cyan",
  title,
  subtitle,
  status,
  actions,
  className = "",
}: PageHeroProps) {
  const statusConfig = status ? STATUS_CONFIG[status] : null;
  const { TYPOGRAPHY, COLORS } = CAREEROS;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`flex items-start justify-between gap-6 mb-8 ${className}`}
    >
      {/* ── Left: badge + title + subtitle ──────────────────────────── */}
      <div className="flex flex-col gap-3 min-w-0">

        {/* Badge row */}
        {(badge || statusConfig) && (
          <motion.div variants={itemVariants} className="flex items-center gap-2.5 flex-wrap">
            {badge && (
              <span
                style={{
                  ...CAREEROS.BADGES.base,
                  ...BADGE_STYLES[badgeVariant],
                }}
              >
                {badge}
              </span>
            )}
            {statusConfig && (
              <span
                style={{
                  display:       "inline-flex",
                  alignItems:    "center",
                  gap:           "5px",
                  fontSize:      "9px",
                  fontWeight:    600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color:         statusConfig.color,
                }}
              >
                {/* Pulsing dot */}
                <span
                  style={{
                    width:        "6px",
                    height:       "6px",
                    borderRadius: "50%",
                    background:   statusConfig.dot,
                    display:      "inline-block",
                    animation:    status === "live" ? "lis-pulse-live 1.8s ease-in-out infinite" : "none",
                  }}
                />
                {statusConfig.label}
              </span>
            )}
          </motion.div>
        )}

        {/* H1 Title */}
        <motion.h1
          variants={itemVariants}
          style={{
            ...TYPOGRAPHY.dashboard,
            color:      COLORS.text,
            margin:     0,
            lineHeight: 1.1,
          }}
        >
          {title}
        </motion.h1>

        {/* Subtitle */}
        {subtitle && (
          <motion.p
            variants={itemVariants}
            style={{
              fontSize:   "14px",
              lineHeight: "1.55",
              color:      COLORS.secondary,
              margin:     0,
              maxWidth:   "560px",
            }}
          >
            {subtitle}
          </motion.p>
        )}
      </div>

      {/* ── Right: actions slot ──────────────────────────────────────── */}
      {actions && (
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-2 shrink-0 flex-wrap justify-end"
        >
          {actions}
        </motion.div>
      )}
    </motion.div>
  );
}

export const PageHero = memo(PageHeroComponent);
