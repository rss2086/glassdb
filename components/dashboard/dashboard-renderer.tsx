"use client";

import type { DashboardComponent } from "@/lib/types";
import { StatCard } from "./stat-card";
import { KpiRow } from "./kpi-row";
import { GlassBarChart } from "./bar-chart";
import { GlassLineChart } from "./line-chart";
import { GlassAreaChart } from "./area-chart";
import { GlassPieChart } from "./pie-chart";
import { DataTable } from "./data-table";
import { SectionHeader } from "./section-header";

export function DashboardRenderer({
  components,
}: {
  components: DashboardComponent[];
}) {
  if (!components || components.length === 0) return null;

  return (
    <div className="space-y-6">
      {components.map((component, index) => {
        switch (component.type) {
          case "stat-card":
            return <StatCard key={index} {...component.props} />;
          case "kpi-row":
            return <KpiRow key={index} {...component.props} />;
          case "bar-chart":
            return <GlassBarChart key={index} {...component.props} />;
          case "line-chart":
            return <GlassLineChart key={index} {...component.props} />;
          case "area-chart":
            return <GlassAreaChart key={index} {...component.props} />;
          case "pie-chart":
            return <GlassPieChart key={index} {...component.props} />;
          case "data-table":
            return <DataTable key={index} {...component.props} />;
          case "section-header":
            return <SectionHeader key={index} {...component.props} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
