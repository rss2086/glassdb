"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { StatCardProps } from "@/lib/types";

const trendConfig = {
  up: {
    icon: TrendingUp,
    color: "text-emerald-400",
  },
  down: {
    icon: TrendingDown,
    color: "text-red-400",
  },
  neutral: {
    icon: Minus,
    color: "text-warm-faint",
  },
} as const;

export function StatCard({ title, value, change, trend }: StatCardProps) {
  const trendInfo = trend ? trendConfig[trend] : null;
  const TrendIcon = trendInfo?.icon;

  return (
    <div className="glass-secondary p-5 transition-all duration-200 hover:bg-white/12">
      <p className="text-xs font-medium text-warm-muted uppercase tracking-wider truncate">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-warm">{value}</p>
      {change && (
        <div className="mt-2 flex items-center gap-1.5">
          {TrendIcon && trendInfo && (
            <TrendIcon className={`w-3.5 h-3.5 ${trendInfo.color}`} />
          )}
          <span
            className={`text-sm font-medium ${
              trendInfo?.color ?? "text-warm-faint"
            }`}
          >
            {change}
          </span>
        </div>
      )}
    </div>
  );
}
