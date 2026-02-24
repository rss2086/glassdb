"use client";

import type { AnalysisMode } from "@/lib/types";
import type { Session } from "@/lib/use-session";
import type { ThemeName } from "@/lib/use-theme";
import { THEMES } from "@/lib/use-theme";
import { Database, Github, Zap, Brain, Settings, ChevronDown, Plus, Palette } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

function GlassDBLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="460 340 1140 1380"
      fill="currentColor"
      className={className}
    >
      {/* Database cylinder */}
      <path d="M 919.363 543.429 C 950.542 542.116 995.66 541.984 1026.84 543.564 L 1027.05 610.384 L 997.248 609.262 C 876.663 605.319 658.71 627.253 564.402 712.198 C 546.929 728.811 530.582 751.75 530.501 776.729 C 530.377 815.296 562.922 843.888 592.376 863.481 C 614.706 878.335 637.842 888.342 662.718 897.447 C 743.866 927.148 830.853 937.839 916.621 943.615 C 952.721 945.986 990.163 945.014 1026.44 945.172 C 1026.42 966.983 1026.54 988.794 1026.8 1010.6 C 1025.54 1010.7 1024.27 1010.77 1023 1010.82 C 889.033 1016.61 700.538 997.703 579.572 933.728 C 562.162 924.52 544.417 910.264 529.893 896.826 C 531.687 931.014 539.875 951.98 565.285 975.922 C 643.132 1049.27 821.056 1072.74 924.968 1077.85 C 958.907 1079.34 992.891 1079.48 1026.84 1078.27 L 1027.01 1146.06 C 897.135 1149.69 620.084 1134.03 530.939 1025.58 C 530.347 1032.71 530.114 1039.88 530.24 1047.03 C 530.891 1073.69 542.466 1094.93 561.527 1113.09 C 643.172 1190.87 826.164 1212.66 934.498 1217.05 C 965.37 1218.3 996.093 1217.66 1026.96 1216.99 L 1027.35 1286.45 C 997.663 1288.79 930.177 1287.32 898.728 1284.7 C 792.995 1275.88 665.455 1258.09 572.612 1203.49 C 557.74 1194.75 542.117 1178.98 530.971 1166.21 C 530.17 1191.98 528.691 1209.12 543.813 1231.83 C 585.114 1293.86 679.955 1319.22 748.213 1334.98 C 840.006 1354.61 933.523 1359.58 1027.06 1357.78 C 1026.7 1380.57 1026.99 1404.2 1026.98 1427.06 C 954.333 1429.49 881.614 1425.46 809.683 1415 C 729.387 1403.54 582.155 1375.44 530.717 1306.86 C 530.607 1313.85 530.554 1320.84 530.557 1327.83 C 530.676 1353.58 541.797 1375.33 559.991 1393.12 C 640.232 1471.58 824.071 1494.12 930.571 1499.23 C 962.708 1500.77 994.892 1500.25 1027.05 1499.84 L 1026.87 1568.03 C 950.038 1570.56 873.138 1565.93 797.168 1554.19 C 719.597 1542.8 579.726 1513.39 530.793 1447.59 C 530.698 1453.9 530.663 1460.22 530.687 1466.54 C 531.044 1494.05 543.654 1517.56 563.57 1535.63 C 668.993 1631.31 894.217 1644.6 1026.91 1642.57 L 1026.95 1709.69 C 876.53 1715.42 642.828 1692.72 522.956 1590.69 C 490.57 1563.13 462.042 1519.79 461.052 1476.52 C 460.627 1457.98 460.626 1438.73 460.629 1419.99 L 460.487 1325.92 L 459.929 1004.49 L 458.924 839.443 C 458.839 815.298 457.568 783.509 460.375 760.077 C 463.671 732.559 482.861 699.778 501.814 679.608 C 598.564 576.647 786.455 549.676 919.363 543.429 z" />
      {/* Bars */}
      <path d="M 1080.4 342.616 C 1086.09 345.991 1105.98 366.663 1112.19 372.786 C 1131.85 391.802 1151.33 411.002 1170.62 430.383 L 1170.87 1392 L 1170.88 1612.78 C 1170.9 1626.43 1172.56 1682.83 1170.44 1690.71 C 1167.54 1692.9 1165.04 1692.6 1161.04 1693.16 C 1134.5 1696.01 1106.94 1700.02 1080.64 1702.38 C 1079.07 1591.72 1080.89 1476.63 1080.88 1365.64 L 1080.4 342.616 z" />
      <path d="M 1311.34 478.669 C 1313.6 480.747 1312.35 494.731 1312.3 498.75 L 1312.14 546.635 L 1312 756.615 L 1312 1333.82 C 1311.99 1443.82 1311.07 1555.35 1312.45 1665.24 C 1280.16 1672.02 1254.16 1677.66 1221.19 1683.33 C 1219.69 1677.23 1220.07 1616.23 1220.07 1606.7 L 1220.05 1413 L 1220.02 581.715 C 1233.38 565.739 1249.18 548.873 1263.16 533.073 C 1278.79 515.4 1295.24 495.478 1311.34 478.669 z" />
      <path d="M 1451.46 552.677 C 1452.93 557.317 1452.63 602.151 1452.68 610.789 L 1453.1 788.122 L 1452.98 1615.07 C 1443.59 1618.69 1431.07 1624.76 1421.47 1628.9 C 1402.9 1637.05 1383.92 1644.22 1364.61 1650.39 C 1363.33 1616.98 1364.77 1573.29 1364.86 1539.1 L 1365.01 1323.5 L 1364.93 653.201 C 1389.73 622.366 1416.83 592.981 1442.38 562.745 C 1445.28 559.314 1448.4 555.969 1451.46 552.677 z" />
      <path d="M 1503.15 697.481 C 1508.63 701.069 1535.86 729.656 1542.02 735.918 C 1558.27 752.438 1576.35 769.364 1592.24 786.069 L 1592.26 1516.79 C 1580.78 1531.79 1571.55 1540.12 1557.38 1552.04 C 1540.27 1565.68 1522.17 1578.03 1503.23 1588.98 L 1503.15 697.481 z" />
    </svg>
  );
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  // SQLite datetimes are UTC without the Z suffix
  const normalized = dateStr.endsWith("Z") ? dateStr : dateStr + "Z";
  const then = new Date(normalized).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

const THEME_DOTS: Record<ThemeName, string> = {
  ember: "bg-amber-500",
  mono: "bg-neutral-300",
  paper: "bg-neutral-100 border border-neutral-300",
  pixel: "bg-green-400",
  vista: "bg-emerald-600",
};

interface NavBarProps {
  fileCount: number;
  mode: AnalysisMode;
  onModeChange: (mode: AnalysisMode) => void;
  onFilesClick: () => void;
  onSettingsClick?: () => void;
  sessions?: Session[];
  activeSessionId?: string | null;
  onSessionClick?: (id: string) => void;
  onNewSession?: () => void;
  theme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
}

export function NavBar({
  fileCount,
  mode,
  onModeChange,
  onFilesClick,
  onSettingsClick,
  sessions,
  activeSessionId,
  onSessionClick,
  onNewSession,
  theme,
  onThemeChange,
}: NavBarProps) {
  const hasSessionSupport = sessions && onSessionClick && onNewSession;

  return (
    <nav className="flex h-14 items-center justify-between px-5" style={{ borderBottom: `1px solid var(--nav-border)` }}>
      {/* Left: Logo + file chip */}
      <div className="flex items-center gap-4">
        {hasSessionSupport ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 font-display text-xl text-warm tracking-wide transition-colors hover:text-white outline-none">
                <GlassDBLogo className="h-5 w-5" />
                GlassDB
                <ChevronDown className="h-4 w-4 text-warm-muted" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={onNewSession}>
                <Plus className="h-4 w-4" />
                New Session
              </DropdownMenuItem>
              {sessions.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  {sessions.slice(0, 10).map((s) => (
                    <DropdownMenuItem
                      key={s.id}
                      onClick={() => onSessionClick(s.id)}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {s.id === activeSessionId && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                        )}
                        <span className={`truncate ${s.id === activeSessionId ? "text-warm" : ""}`}>
                          {s.name}
                        </span>
                      </div>
                      <span className="shrink-0 text-xs text-warm-faint">
                        {formatRelativeTime(s.updatedAt)}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className="flex items-center gap-1.5 font-display text-xl text-warm tracking-wide">
            <GlassDBLogo className="h-5 w-5" />
            GlassDB
          </span>
        )}

        <button
          onClick={onFilesClick}
          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm text-warm-muted transition-all duration-300 hover:text-warm"
          style={{ background: "var(--surface-subtle)" }}
        >
          <Database className="h-3.5 w-3.5" />
          <span>
            {fileCount} {fileCount === 1 ? "file" : "files"} loaded
          </span>
        </button>
      </div>

      {/* Right: Mode toggle + Theme + Settings + GitHub */}
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-full p-0.5" style={{ background: "var(--surface-subtle)" }}>
          <button
            onClick={() => onModeChange("quick")}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-300 ${
              mode === "quick"
                ? "text-warm shadow-sm"
                : "text-warm-muted hover:text-warm"
            }`}
            style={mode === "quick" ? { background: "var(--surface-active)" } : undefined}
          >
            <Zap className="h-3.5 w-3.5" />
            Quick
          </button>
          <button
            onClick={() => onModeChange("deep")}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-300 ${
              mode === "deep"
                ? "text-warm shadow-sm"
                : "text-warm-muted hover:text-warm"
            }`}
            style={mode === "deep" ? { background: "var(--surface-active)" } : undefined}
          >
            <Brain className="h-3.5 w-3.5" />
            Deep
          </button>
        </div>

        {/* Theme switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-center rounded-full p-2 text-warm-muted transition-all duration-300 hover:text-warm" style={{ ["--hover-bg" as string]: "var(--surface-hover)" }}>
              <Palette className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Theme</DropdownMenuLabel>
            {THEMES.map((t) => (
              <DropdownMenuItem
                key={t.id}
                onClick={() => onThemeChange(t.id)}
                className="flex items-center gap-2.5"
              >
                <span className={`h-2.5 w-2.5 rounded-full ${THEME_DOTS[t.id]} ${theme === t.id ? "ring-2 ring-white/40 ring-offset-1 ring-offset-transparent" : ""}`} />
                <span className={theme === t.id ? "text-warm font-medium" : ""}>
                  {t.label}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {onSettingsClick && (
          <button
            onClick={onSettingsClick}
            className="flex items-center justify-center rounded-full p-2 text-warm-muted transition-all duration-300 hover:text-warm"
          >
            <Settings className="h-5 w-5" />
          </button>
        )}

        <a
          href="https://github.com/rss2086/glassdb"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center rounded-full p-2 text-warm-muted transition-all duration-300 hover:text-warm"
        >
          <Github className="h-5 w-5" />
        </a>
      </div>
    </nav>
  );
}
