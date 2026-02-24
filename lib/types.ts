// === Privacy Types ===

export interface PrivacyEvent {
  type: "schema_sent" | "tool_call" | "query_result" | "component_generated" | "export";
  description: string;
  tokensSent?: number;
  rowsProcessed?: number;
  rowsKeptLocal?: number;
  timestamp: number;
  /** The actual data sent to the model (for transparency) */
  payload?: string;
  /** The SQL query that was executed (for query_result events) */
  sql?: string;
}

export interface PrivacyStats {
  totalRowsLocal: number;
  totalTokensSent: number;
  totalQueryRowsSent: number;
  events: PrivacyEvent[];
}

// === Data Schema Types ===

export interface TableSchema {
  name: string;
  columns: { name: string; type: string }[];
  rowCount: number;
  sampleRows?: Record<string, unknown>[];
}

export interface DataSchema {
  tables: TableSchema[];
  totalRows: number;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
}

export interface LoadedFile {
  fileName: string;
  tableName: string;
  rowCount: number;
  columnCount: number;
  filePath?: string;
}

// === Dashboard Component Types ===

export type DashboardComponentType =
  | "stat-card"
  | "kpi-row"
  | "bar-chart"
  | "line-chart"
  | "area-chart"
  | "pie-chart"
  | "data-table"
  | "section-header";

export interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon?: string;
}

export interface KpiRowProps {
  cards: StatCardProps[];
}

export interface ChartDataPoint {
  [key: string]: string | number;
}

export interface BarChartProps {
  title: string;
  data: ChartDataPoint[];
  xKey: string;
  yKey: string;
  yKeys?: string[];
  colors?: string[];
  horizontal?: boolean;
}

export interface LineChartProps {
  title: string;
  data: ChartDataPoint[];
  xKey: string;
  yKeys: string[];
  colors?: string[];
}

export interface AreaChartProps {
  title: string;
  data: ChartDataPoint[];
  xKey: string;
  yKey: string;
  gradient?: boolean;
}

export interface PieChartProps {
  title: string;
  data: ChartDataPoint[];
  nameKey: string;
  valueKey: string;
}

export interface DataTableProps {
  title: string;
  columns: string[];
  data: Record<string, unknown>[];
  sortable?: boolean;
}

export interface SectionHeaderProps {
  title: string;
  description?: string;
}

export type DashboardComponent =
  | { type: "stat-card"; props: StatCardProps }
  | { type: "kpi-row"; props: KpiRowProps }
  | { type: "bar-chart"; props: BarChartProps }
  | { type: "line-chart"; props: LineChartProps }
  | { type: "area-chart"; props: AreaChartProps }
  | { type: "pie-chart"; props: PieChartProps }
  | { type: "data-table"; props: DataTableProps }
  | { type: "section-header"; props: SectionHeaderProps };

export interface Dashboard {
  components: DashboardComponent[];
}

// === Analysis Mode ===

export type AnalysisMode = "quick" | "deep";
