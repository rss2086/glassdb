"use client";

import { StatCard } from "./stat-card";
import type { KpiRowProps } from "@/lib/types";

export function KpiRow({ cards }: KpiRowProps) {
  if (!cards || cards.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <StatCard key={index} {...card} />
      ))}
    </div>
  );
}
