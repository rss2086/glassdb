import { gateway } from "ai";
import {
  streamText,
  tool,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import {
  SYSTEM_PROMPT,
  getSchemaInput,
  queryDataInput,
  renderDashboardInput,
  exportExcelInput,
} from "@/lib/tools";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: gateway("anthropic/claude-sonnet-4-5-20250929"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(10),
    tools: {
      get_schema: tool({
        description:
          "Get the schema of all loaded tables. Returns table names, column names and types, row counts, and sample rows (amount controlled by user's privacy setting). Call this first to understand what data is available.",
        inputSchema: getSchemaInput,
      }),
      query_data: tool({
        description:
          "Execute a DuckDB SQL query against the user's data in their browser. Returns query results as JSON (capped at 20 rows). Always use aggregation (GROUP BY, SUM, COUNT, etc.) — never SELECT *.",
        inputSchema: queryDataInput,
      }),
      render_dashboard: tool({
        description:
          "Render a dashboard with the specified components. Call this after you have query results to visualize.",
        inputSchema: renderDashboardInput,
      }),
      export_excel: tool({
        description:
          "Export data to an Excel file. Provide a SQL query — it runs locally in the browser with NO row limit and exports the full result. Use this when the user asks to download/export data.",
        inputSchema: exportExcelInput,
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
