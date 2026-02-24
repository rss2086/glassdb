"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getChartColors, getChartTheme } from "@/lib/chart-theme";
import type { AreaChartProps } from "@/lib/types";

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

export function GlassAreaChart({
  title,
  data,
  xKey,
  yKey,
  gradient,
}: AreaChartProps) {
  const colors = getChartColors();
  const theme = getChartTheme();
  const fillColor = colors[0];
  const gradientId = `areaGradient-${yKey}`;
  const useGradient = gradient !== false;

  return (
    <div className="glass-primary p-5 transition-all duration-200">
      <h3 className="text-base font-semibold text-warm mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={data}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          {useGradient && (
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={fillColor} stopOpacity={0.4} />
                <stop offset="95%" stopColor={fillColor} stopOpacity={0.05} />
              </linearGradient>
            </defs>
          )}
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={theme.gridColor}
          />
          <XAxis
            dataKey={xKey}
            tick={{ fill: theme.textColor, fontSize: 12 }}
          />
          <YAxis tick={{ fill: theme.textColor, fontSize: 12 }} />
          <Tooltip content={<GlassTooltip />} />
          <Area
            type="monotone"
            dataKey={yKey}
            stroke={fillColor}
            strokeWidth={2}
            fill={useGradient ? `url(#${gradientId})` : fillColor}
            fillOpacity={useGradient ? 1 : 0.2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
