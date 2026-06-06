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
          filter: "blur(10px) brightness(0.40) contrast(1.10) saturate(1.05)",
        }}
      />
      {/* Atmospheric overlay linear gradient */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(
            180deg,
            rgba(2, 3, 5, 0.82) 0%,
            rgba(2, 3, 5, 0.68) 50%,
            rgba(2, 3, 5, 0.90) 100%
          )`,
        }}
      />
    </div>
  );
}

export const CareerOSBackground = memo(CareerOSBackgroundComponent);
