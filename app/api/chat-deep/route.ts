import {
  anthropic as defaultAnthropic,
  createAnthropic,
  forwardAnthropicContainerIdFromLastStep,
} from "@ai-sdk/anthropic";
import {
  streamText,
  tool,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import {
  DEEP_SYSTEM_PROMPT,
  getSchemaInput,
  queryDataInput,
  renderDashboardInput,
  exportExcelInput,
} from "@/lib/tools";

export const maxDuration = 120;

// Deep mode uses code execution (programmatic tool calling) which requires
// Anthropic-native API. Use direct Anthropic API if available, otherwise
// fall back to gateway with Anthropic-native format.
const anthropic = process.env.ANTHROPIC_API_KEY
  ? defaultAnthropic
  : createAnthropic({
      baseURL: "https://ai-gateway.vercel.sh/v1",
      apiKey: process.env.AI_GATEWAY_API_KEY,
    });

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: anthropic(
      process.env.ANTHROPIC_API_KEY
        ? "claude-sonnet-4-5-20250929"
        : "anthropic/claude-sonnet-4-5-20250929"
    ),
    system: DEEP_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(15),
    tools: {
      code_execution: anthropic.tools.codeExecution_20250825(),

      get_schema: tool({
        description:
          "Get the schema of all loaded tables. Returns table names, column names and types, row counts, and sample rows (amount controlled by user's privacy setting).",
        inputSchema: getSchemaInput,
      }),

      query_data: tool({
        description:
          "Execute a DuckDB SQL query against the user's data. Returns query results as JSON (capped at 20 rows). Always aggregate — never SELECT *.",
        inputSchema: queryDataInput,
        providerOptions: {
          anthropic: {
            allowedCallers: ["code_execution_20250825"],
          },
        },
      }),

      render_dashboard: tool({
        description: "Render a dashboard with the specified components.",
        inputSchema: renderDashboardInput,
      }),

      export_excel: tool({
        description:
          "Export data to an Excel file. Provide a SQL query — it runs locally in the browser with NO row limit and exports the full result.",
        inputSchema: exportExcelInput,
      }),
    },

    prepareStep: forwardAnthropicContainerIdFromLastStep,
  });

  return result.toUIMessageStreamResponse();
}
