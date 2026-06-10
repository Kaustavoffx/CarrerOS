"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function RootLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto p-8 animate-pulse">
      <div className="h-24 w-full bg-white/[0.02] border border-white/5 rounded-[28px] mb-8" />
      <div className="grid gap-6 md:grid-cols-3">
        <Skeleton variant="dashboard-stat" />
        <Skeleton variant="dashboard-stat" />
        <Skeleton variant="dashboard-stat" />
      </div>
      <div className="grid gap-6 md:grid-cols-12 mt-6">
        <div className="md:col-span-8">
          <Skeleton variant="table" />
        </div>
        <div className="md:col-span-4">
          <Skeleton variant="list" />
        </div>
      </div>
    </div>
  );
}
