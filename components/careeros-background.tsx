"use client";

import { memo } from "react";

function CareerOSBackgroundComponent() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[-10] overflow-hidden">
      {/* Background Image Layer with WebP filters */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          backgroundImage: "url('/background.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          filter: "brightness(0.85) contrast(1.0) saturate(1.0)",
        }}
      />
      {/* Atmospheric overlay linear gradient */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(
            180deg,
            rgba(2, 3, 5, 0.35) 0%,
            rgba(2, 3, 5, 0.20) 50%,
            rgba(2, 3, 5, 0.45) 100%
          )`,
        }}
      />
    </div>
  );
}

export const CareerOSBackground = memo(CareerOSBackgroundComponent);
