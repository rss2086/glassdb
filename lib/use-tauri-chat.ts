"use client";

import { useState, useCallback, useRef } from "react";
import type { UIMessage } from "ai";
import { tauriChatStream } from "@/lib/desktop";
import { SYSTEM_PROMPT, DEEP_SYSTEM_PROMPT } from "@/lib/tools";
import type { AnalysisMode } from "@/lib/types";

// ── Anthropic API tool definitions ──────────────────────

const ANTHROPIC_TOOLS = [
  {
    name: "get_schema",
    description:
      "Get the schema of all loaded tables, including column names, types, and row counts.",
    input_schema: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description:
            "Brief reason for fetching the schema, e.g. 'initial exploration' or 'checking column types'",
        },
      },
      required: ["reason"],
    },
  },
  {
    name: "query_data",
    description:
      "Execute a DuckDB SQL query against the loaded tables. Results are capped at 20 rows.",
    input_schema: {
      type: "object",
      properties: {
        sql: {
          type: "string",
          description: "DuckDB SQL query to execute against the loaded tables",
        },
        description: {
          type: "string",
          description:
            "Brief description of what this query does, shown in the privacy panel",
        },
      },
      required: ["sql", "description"],
    },
  },
  {
    name: "render_dashboard",
    description:
      "Render a dashboard with charts, tables, and stat cards from aggregated data.",
    input_schema: {
      type: "object",
      properties: {
        components: {
          type: "array",
          description: "Array of dashboard components to render",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: [
                  "stat-card",
                  "kpi-row",
                  "bar-chart",
                  "line-chart",
                  "area-chart",
                  "pie-chart",
                  "data-table",
                  "section-header",
                ],
              },
              props: {
                type: "object",
              },
            },
            required: ["type", "props"],
          },
        },
      },
      required: ["components"],
    },
  },
  {
    name: "export_excel",
    description:
      "Export data as an Excel file. Runs the SQL query locally with no row limit.",
    input_schema: {
      type: "object",
      properties: {
        sql: {
          type: "string",
          description: "DuckDB SQL query to fetch the data for export.",
        },
        filename: {
          type: "string",
          description: "Name for the Excel file (without extension)",
        },
        description: {
          type: "string",
          description: "Brief description of what is being exported",
        },
      },
      required: ["sql", "filename", "description"],
    },
  },
];

// ── Types ───────────────────────────────────────────────

type ChatStatus = "ready" | "submitted" | "streaming" | "error";

interface PendingToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface ToolResultContent {
  type: "tool_result";
  tool_use_id: string;
  content: string;
}

// ── Hook ────────────────────────────────────────────────

export interface UseTauriChatOptions {
  mode: AnalysisMode;
  onToolCall: (tool: PendingToolCall) => Promise<string>;
}

export function useTauriChat({ mode, onToolCall }: UseTauriChatOptions) {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [error, setError] = useState<Error | null>(null);

  // Use a ref to track the latest messages for the agentic loop,
  // since state updates are async and we need the latest value
  // within the streaming callbacks.
  const messagesRef = useRef<UIMessage[]>([]);
  const abortRef = useRef(false);

  const onToolCallRef = useRef(onToolCall);
  onToolCallRef.current = onToolCall;

  /**
   * Convert our UIMessage[] to the Anthropic messages format.
   */
  const toAnthropicMessages = useCallback(
    (msgs: UIMessage[]): Array<{ role: string; content: unknown }> => {
      const result: Array<{ role: string; content: unknown }> = [];

      for (const msg of msgs) {
        if (msg.role === "user") {
          // Check if parts contain tool results (from the agentic loop)
          const toolResults = (msg as unknown as { _toolResults?: ToolResultContent[] })
            ._toolResults;
          if (toolResults) {
            result.push({ role: "user", content: toolResults });
          } else {
            const text = msg.parts
              .filter(
                (p): p is { type: "text"; text: string } => p.type === "text"
              )
              .map((p) => p.text)
              .join("");
            result.push({ role: "user", content: text });
          }
        } else if (msg.role === "assistant") {
          const content: unknown[] = [];
          for (const part of msg.parts) {
            if (part.type === "text" && part.text.trim()) {
              content.push({ type: "text", text: part.text });
            }
            if (part.type === "dynamic-tool" && "toolCallId" in part) {
              content.push({
                type: "tool_use",
                id: part.toolCallId,
                name: part.toolName,
                input: part.input ?? {},
              });
            }
          }
          if (content.length > 0) {
            result.push({ role: "assistant", content });
          }
        }
      }

      return result;
    },
    []
  );

  /**
   * Run a single stream turn. Returns the list of tool calls
   * that need results, or empty if the model stopped with end_turn.
   */
  const streamOnce = useCallback(
    async (
      allMessages: UIMessage[]
    ): Promise<PendingToolCall[]> => {
      const anthropicMessages = toAnthropicMessages(allMessages);
      const systemPrompt =
        mode === "quick" ? SYSTEM_PROMPT : DEEP_SYSTEM_PROMPT;

      const assistantId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      let textSoFar = "";
      const toolCalls: PendingToolCall[] = [];
      const toolParts: Array<{
        type: "dynamic-tool";
        toolName: string;
        toolCallId: string;
        state: "input-available";
        input: unknown;
        output: undefined;
      }> = [];

      return new Promise<PendingToolCall[]>((resolve, reject) => {
        tauriChatStream({
          messages: anthropicMessages,
          systemPrompt,
          tools: ANTHROPIC_TOOLS,

          onText(text) {
            textSoFar += text;
            // Update the assistant message in place for streaming
            const assistantMsg: UIMessage = {
              id: assistantId,
              role: "assistant",
              parts: [
                { type: "text", text: textSoFar },
                ...toolParts,
              ],
            };
            const updated = [
              ...allMessages.filter((m) => m.id !== assistantId),
              assistantMsg,
            ];
            messagesRef.current = updated;
            setMessages(updated);
            setStatus("streaming");
          },

          onToolUse(tool) {
            toolCalls.push(tool);
            toolParts.push({
              type: "dynamic-tool",
              toolName: tool.name,
              toolCallId: tool.id,
              state: "input-available",
              input: tool.input,
              output: undefined,
            });
            // Update message with tool indicator
            const assistantMsg: UIMessage = {
              id: assistantId,
              role: "assistant",
              parts: [
                ...(textSoFar ? [{ type: "text" as const, text: textSoFar }] : []),
                ...toolParts,
              ],
            };
            const updated = [
              ...allMessages.filter((m) => m.id !== assistantId),
              assistantMsg,
            ];
            messagesRef.current = updated;
            setMessages(updated);
          },

          onDone(stopReason) {
            // Finalize the assistant message
            const parts: UIMessage["parts"] = [];
            if (textSoFar) {
              parts.push({ type: "text", text: textSoFar });
            }
            parts.push(...toolParts);

            const assistantMsg: UIMessage = {
              id: assistantId,
              role: "assistant",
              parts,
            };
            const updated = [
              ...allMessages.filter((m) => m.id !== assistantId),
              assistantMsg,
            ];
            messagesRef.current = updated;
            setMessages(updated);

            if (stopReason === "tool_use") {
              resolve(toolCalls);
            } else {
              resolve([]);
            }
          },

          onError(errMsg) {
            reject(new Error(errMsg));
          },
        }).catch(reject);
      });
    },
    [mode, toAnthropicMessages]
  );

  /**
   * The agentic loop: stream, execute tool calls, feed results back,
   * repeat until the model says end_turn.
   */
  const runAgenticLoop = useCallback(
    async (currentMessages: UIMessage[]) => {
      let loopMessages = currentMessages;
      let maxIterations = 10; // safety limit

      while (maxIterations-- > 0 && !abortRef.current) {
        const pendingTools = await streamOnce(loopMessages);

        if (pendingTools.length === 0) {
          // Model finished with end_turn
          break;
        }

        // Execute each tool call and collect results
        const toolResults: ToolResultContent[] = [];
        for (const tool of pendingTools) {
          const output = await onToolCallRef.current(tool);
          toolResults.push({
            type: "tool_result",
            tool_use_id: tool.id,
            content: output,
          });
        }

        // Update tool parts in the last assistant message to show completion
        const lastMsg = messagesRef.current[messagesRef.current.length - 1];
        if (lastMsg && lastMsg.role === "assistant") {
          const updatedParts: UIMessage["parts"] = lastMsg.parts.map((part) => {
            if (part.type === "dynamic-tool") {
              const result = toolResults.find(
                (r) => r.tool_use_id === part.toolCallId
              );
              if (result) {
                // Construct a clean output-available part to avoid type
                // conflicts from spreading discriminated union variants.
                const completed: UIMessage["parts"][number] = {
                  type: "dynamic-tool" as const,
                  toolName: part.toolName,
                  toolCallId: part.toolCallId,
                  state: "output-available" as const,
                  input: part.input,
                  output: result.content,
                };
                return completed;
              }
            }
            return part;
          });
          const updatedMsg: UIMessage = { ...lastMsg, parts: updatedParts };
          const updatedAll: UIMessage[] = [
            ...messagesRef.current.slice(0, -1),
            updatedMsg,
          ];
          messagesRef.current = updatedAll;
          setMessages(updatedAll);
        }

        // Add a synthetic "user" message with tool results for the next turn
        const toolResultMsg: UIMessage & { _toolResults: ToolResultContent[] } = {
          id: `tool-results-${Date.now()}`,
          role: "user",
          parts: [], // Not rendered — tool results go via _toolResults
          _toolResults: toolResults,
        };

        loopMessages = [...messagesRef.current, toolResultMsg];
        messagesRef.current = loopMessages;
        // Don't add tool result messages to visible state — they're internal
      }
    },
    [streamOnce]
  );

  /**
   * Send a user message and kick off the agentic loop.
   */
  const sendMessage = useCallback(
    async (opts: { text: string }) => {
      if (!opts.text.trim()) return;

      abortRef.current = false;
      setError(null);
      setStatus("submitted");

      const userMsg: UIMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        parts: [{ type: "text", text: opts.text }],
      };

      const updated = [...messagesRef.current, userMsg];
      messagesRef.current = updated;
      setMessages(updated);

      try {
        await runAgenticLoop(updated);
        setStatus("ready");
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setStatus("error");
      }
    },
    [runAgenticLoop]
  );

  const clearMessages = useCallback(() => {
    messagesRef.current = [];
    setMessages([]);
    setError(null);
    setStatus("ready");
  }, []);

  const replaceMessages = useCallback((msgs: UIMessage[]) => {
    messagesRef.current = msgs;
    setMessages(msgs);
  }, []);

  return {
    messages,
    setMessages: replaceMessages,
    clearMessages,
    sendMessage,
    status,
    error,
  };
}
