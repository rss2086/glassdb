import { anthropic } from "@ai-sdk/anthropic";
import { gateway, generateText } from "ai";
import type { AnthropicLanguageModelOptions } from "@ai-sdk/anthropic";

export const maxDuration = 120;

export async function POST(req: Request) {
  const { data, instructions } = await req.json();

  try {
    // Use the xlsx agent skill via AI SDK provider options
    const result = await generateText({
      model: gateway("anthropic/claude-sonnet-4-5-20250929"),
      tools: {
        code_execution: anthropic.tools.codeExecution_20250825(),
      },
      prompt: `Create a polished Excel spreadsheet with the following data and requirements:

Data (JSON):
${JSON.stringify(data, null, 2)}

Requirements:
${instructions || "Create a well-formatted spreadsheet with proper headers, number formatting, and a summary chart if appropriate."}

Make it look professional with:
- Proper column widths
- Number formatting (currency, percentages where appropriate)
- Header styling
- A chart if the data lends itself to visualization
- Conditional formatting for trends/changes if applicable`,
      providerOptions: {
        anthropic: {
          container: {
            skills: [
              {
                type: "anthropic",
                skillId: "xlsx",
                version: "latest",
              },
            ],
          },
        } satisfies AnthropicLanguageModelOptions,
      },
    });

    // Extract file content from the response
    // The xlsx skill generates a file in the code execution container
    // We need to find the file reference in the response
    const responseText = result.text;

    // For now, return the response text — file download integration
    // depends on the exact response format from the skills API
    return Response.json({
      success: true,
      message: responseText,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to generate Excel file";
    return Response.json({ error: message }, { status: 500 });
  }
}
