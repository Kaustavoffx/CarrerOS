import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export type FeatureStatus = "coming-soon" | "beta";

const statusConfig: Record<FeatureStatus, { label: string; accent: string; tooltip: string }> = {
  "coming-soon": {
    label: "🚧 Coming Soon",
    accent: "border-amber-400/25 bg-amber-400/10 text-amber-200",
    tooltip: "This feature is not production-ready yet and will be available in a future release."
  },
  beta: {
    label: "🧪 Beta",
    accent: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
    tooltip: "This feature is available in beta and may change before launch."
  }
};

export function featureStatusLabel(status: FeatureStatus) {
  return statusConfig[status].label;
}

export function featureStatusTooltip(status: FeatureStatus, featureName: string) {
  return `${featureName}: ${statusConfig[status].tooltip}`;
}

type FeatureStatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  status: FeatureStatus;
  featureName: string;
};

export function FeatureStatusBadge({ status, featureName, className = "", ...props }: FeatureStatusBadgeProps) {
  return (
    <span
      {...props}
      title={featureStatusTooltip(status, featureName)}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${statusConfig[status].accent} ${className}`}
    >
      {featureStatusLabel(status)}
    </span>
  );
}

type FeatureGateButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  status: FeatureStatus;
  featureName: string;
  children?: ReactNode;
};

export function FeatureGateButton({ status, featureName, disabled = true, title, className = "", children, ...props }: FeatureGateButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      aria-disabled={disabled}
      title={title ?? featureStatusTooltip(status, featureName)}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}