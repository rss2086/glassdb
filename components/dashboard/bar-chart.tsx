"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getChartColors, getChartTheme } from "@/lib/chart-theme";
import type { BarChartProps } from "@/lib/types";

function GlassTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const theme = getChartTheme();

  return (
    <div
      className="rounded-lg px-3 py-2 shadow-lg border text-sm"
      style={{
        backgroundColor: theme.tooltipBg,
        borderColor: theme.tooltipBorder,
        color: theme.tooltipText,
      }}
    >
      <p className="font-medium mb-1" style={{ color: theme.tooltipText }}>{label}</p>
      {payload.map((entry, index) => (
        <p key={index} style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

export function GlassBarChart({
  title,
  data,
  xKey,
  yKey,
  yKeys,
  colors,
  horizontal,
}: BarChartProps) {
  const chartColors = getChartColors();
  const theme = getChartTheme();
  const barKeys = yKeys && yKeys.length > 0 ? yKeys : [yKey];
  const barColors = colors && colors.length > 0 ? colors : chartColors;

  return (
    <div className="glass-primary p-5 transition-all duration-200">
      <h3 className="text-base font-semibold text-warm mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={theme.gridColor}
          />
          {horizontal ? (
            <>
              <XAxis type="number" tick={{ fill: theme.textColor, fontSize: 12 }} />
              <YAxis
                dataKey={xKey}
                type="category"
                tick={{ fill: theme.textColor, fontSize: 12 }}
                width={80}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey={xKey}
                tick={{ fill: theme.textColor, fontSize: 12 }}
              />
              <YAxis tick={{ fill: theme.textColor, fontSize: 12 }} />
            </>
          )}
          <Tooltip content={<GlassTooltip />} />
          {barKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={barColors[index % barColors.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
