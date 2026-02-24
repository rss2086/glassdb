function getCSSVar(name: string): string {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function getChartColors(): string[] {
  if (typeof document === "undefined") {
    // SSR fallback — ember defaults
    return [
      "#F0A070", "#E8C4A0", "#D4A574", "#F5D5B8",
      "#C9836A", "#E0B090", "#B8977A", "#D4956B",
    ];
  }
  return [
    getCSSVar("--chart-color-1"),
    getCSSVar("--chart-color-2"),
    getCSSVar("--chart-color-3"),
    getCSSVar("--chart-color-4"),
    getCSSVar("--chart-color-5"),
    getCSSVar("--chart-color-6"),
    getCSSVar("--chart-color-7"),
    getCSSVar("--chart-color-8"),
  ].map((c) => c || "#F0A070");
}

export function getChartTheme() {
  if (typeof document === "undefined") {
    return {
      backgroundColor: "transparent",
      gridColor: "rgba(255, 245, 238, 0.08)",
      textColor: "rgba(255, 245, 238, 0.6)",
      tooltipBg: "rgba(92, 42, 20, 0.85)",
      tooltipBorder: "rgba(255, 245, 238, 0.15)",
      tooltipText: "#FFF5EE",
    };
  }
  return {
    backgroundColor: "transparent",
    gridColor: getCSSVar("--chart-grid"),
    textColor: getCSSVar("--chart-text"),
    tooltipBg: getCSSVar("--chart-tooltip-bg"),
    tooltipBorder: getCSSVar("--chart-tooltip-border"),
    tooltipText: getCSSVar("--chart-tooltip-text"),
  };
}

// Static exports for backwards compat — components that import these
// will get the ember defaults. For dynamic theme support, use the
// functions above.
export const CHART_COLORS = [
  "#F0A070", "#E8C4A0", "#D4A574", "#F5D5B8",
  "#C9836A", "#E0B090", "#B8977A", "#D4956B",
];

export const CHART_THEME = {
  backgroundColor: "transparent",
  gridColor: "rgba(255, 245, 238, 0.08)",
  textColor: "rgba(255, 245, 238, 0.6)",
  tooltipBg: "rgba(92, 42, 20, 0.85)",
  tooltipBorder: "rgba(255, 245, 238, 0.15)",
  tooltipText: "#FFF5EE",
};
