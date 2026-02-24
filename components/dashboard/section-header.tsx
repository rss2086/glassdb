"use client";

import type { SectionHeaderProps } from "@/lib/types";

export function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div className="space-y-1">
      <h2 className="font-display text-2xl text-warm">{title}</h2>
      {description && (
        <p className="text-sm text-warm-muted">{description}</p>
      )}
    </div>
  );
}
