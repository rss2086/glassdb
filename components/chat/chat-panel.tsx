"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { getAllSchemas, runQuery } from "@/lib/duckdb";
import { addPrivacyEvent, resetPrivacy } from "@/lib/privacy";
import type { Dashboard, AnalysisMode } from "@/lib/types";
import { useCallback, useRef, useState, useEffect } from "react";
import type { UIMessage } from "ai";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { PrivacyBeacon } from "./privacy-beacon";
import { AlertCircle } from "lucide-react";
import { isDesktop } from "@/lib/desktop";
import { useTauriChat } from "@/lib/use-tauri-chat";

interface ChatPanelProps {
  mode: AnalysisMode;
  sampleRowLimit: number;
  onSampleRowLimitChange: (limit: number) => void;
  onDashboardUpdate: (dashboard: Dashboard) => void;
  onExcelExport: (data: Record<string, unknown>[], filename: string) => void;
  onClear: () => void;
  suggestions?: string[];
  saveMessage?: (
    role: string,
    content: string,
    toolCalls?: string | null,
    toolResults?: string | null,
  ) => Promise<void>;
  restoredMessages?: UIMessage[];
  onMessagesRestored?: () => void;
}

export function ChatPanel(props: ChatPanelProps) {
  // Hydration-safe desktop check
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    setDesktop(isDesktop());
  }, []);

  if (desktop) {
    return <TauriChatPanel {...props} />;
  }
  return <WebChatPanel {...props} />;
}

// ── Web mode: existing useChat flow (unchanged) ─────────

function WebChatPanel({
  mode,
  sampleRowLimit,
  onSampleRowLimitChange,
  onDashboardUpdate,
  onExcelExport,
  onClear,
  suggestions,
}: ChatPanelProps) {
  const onDashboardUpdateRef = useRef(onDashboardUpdate);
  onDashboardUpdateRef.current = onDashboardUpdate;
  const onExcelExportRef = useRef(onExcelExport);
  onExcelExportRef.current = onExcelExport;

  const { messages, sendMessage, setMessages, addToolOutput, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: mode === "quick" ? "/api/chat" : "/api/chat-deep",
    }),

    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,

    // IMPORTANT: Don't await addToolOutput inside onToolCall — it causes
    // a deadlock with the SerialJobExecutor. Fire-and-forget instead.
    async onToolCall({ toolCall }) {
      if (toolCall.toolName === "get_schema") {
        try {
          const schema = await getAllSchemas(sampleRowLimit);
          const output = JSON.stringify(schema);
          addPrivacyEvent({
            type: "schema_sent",
            description: `Schema sent: ${schema.tables.length} tables`,
            tokensSent: Math.ceil(output.length / 4),
            payload: output,
          });
          addToolOutput({
            tool: toolCall.toolName,
            toolCallId: toolCall.toolCallId,
            output,
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          addToolOutput({
            state: "output-error",
            tool: toolCall.toolName,
            toolCallId: toolCall.toolCallId,
            errorText: msg,
          });
        }
        return;
      }

      if (toolCall.toolName === "query_data") {
        try {
          const { sql, description } = toolCall.input as {
            sql: string;
            description: string;
          };
          const result = await runQuery(sql);
          const capped = {
            ...result,
            rows: result.rows.slice(0, 20),
            rowCount: Math.min(result.rowCount, 20),
            truncated: result.rowCount > 20,
          };
          const output = JSON.stringify(capped);
          addPrivacyEvent({
            type: "query_result",
            description: `Query: ${description} — ${capped.rowCount} rows`,
            tokensSent: Math.ceil(output.length / 4),
            rowsProcessed: capped.rowCount,
            payload: output,
            sql,
          });
          addToolOutput({
            tool: toolCall.toolName,
            toolCallId: toolCall.toolCallId,
            output,
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          addToolOutput({
            tool: toolCall.toolName,
            toolCallId: toolCall.toolCallId,
            output: JSON.stringify({ error: `SQL Error: ${msg}` }),
          });
        }
        return;
      }

      if (toolCall.toolName === "render_dashboard") {
        try {
          const { components } = toolCall.input as {
            components: Dashboard["components"];
          };
          onDashboardUpdateRef.current({ components });
          const output = JSON.stringify({ rendered: true, componentCount: components.length });
          addPrivacyEvent({
            type: "component_generated",
            description: `Dashboard: ${components.length} components`,
            payload: JSON.stringify(components, null, 2),
          });
          addToolOutput({
            tool: toolCall.toolName,
            toolCallId: toolCall.toolCallId,
            output,
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          addToolOutput({
            state: "output-error",
            tool: toolCall.toolName,
            toolCallId: toolCall.toolCallId,
            errorText: msg,
          });
        }
        return;
      }

      if (toolCall.toolName === "export_excel") {
        try {
          const { sql, filename, description } = toolCall.input as {
            sql: string;
            filename: string;
            description: string;
          };
          // Run query with NO row cap for full export
          const result = await runQuery(sql);
          addPrivacyEvent({
            type: "query_result",
            description: `Export: ${description} — ${result.rowCount} rows`,
            rowsProcessed: result.rowCount,
            sql,
          });
          onExcelExportRef.current(
            result.rows as Record<string, unknown>[],
            filename
          );
          addToolOutput({
            tool: toolCall.toolName,
            toolCallId: toolCall.toolCallId,
            output: JSON.stringify({
              exported: true,
              filename: `${filename}.xlsx`,
              rowCount: result.rowCount,
            }),
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          addToolOutput({
            state: "output-error",
            tool: toolCall.toolName,
            toolCallId: toolCall.toolCallId,
            errorText: msg,
          });
        }
        return;
      }
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  const handleSend = useCallback(
    (text: string) => {
      if (text.trim()) {
        sendMessage({ text });
      }
    },
    [sendMessage]
  );

  const handleClear = useCallback(() => {
    setMessages([]);
    resetPrivacy();
    onClear();
  }, [setMessages, onClear]);

  return (
    <ChatPanelUI
      messages={messages}
      status={status}
      error={error}
      isLoading={isLoading}
      sampleRowLimit={sampleRowLimit}
      onSampleRowLimitChange={onSampleRowLimitChange}
      onSend={handleSend}
      onClear={handleClear}
      suggestions={suggestions}
    />
  );
}

// ── Desktop / Tauri mode ────────────────────────────────

function TauriChatPanel({
  mode,
  sampleRowLimit,
  onSampleRowLimitChange,
  onDashboardUpdate,
  onExcelExport,
  onClear,
  suggestions,
  saveMessage: saveMessageToSession,
  restoredMessages,
  onMessagesRestored,
}: ChatPanelProps) {
  const onDashboardUpdateRef = useRef(onDashboardUpdate);
  onDashboardUpdateRef.current = onDashboardUpdate;
  const onExcelExportRef = useRef(onExcelExport);
  onExcelExportRef.current = onExcelExport;

  // Capture sampleRowLimit in a ref so the tool callback always
  // sees the latest value without re-creating the hook.
  const sampleRowLimitRef = useRef(sampleRowLimit);
  sampleRowLimitRef.current = sampleRowLimit;

  const handleToolCall = useCallback(
    async (tool: {
      id: string;
      name: string;
      input: Record<string, unknown>;
    }): Promise<string> => {
      if (tool.name === "get_schema") {
        try {
          const schema = await getAllSchemas(sampleRowLimitRef.current);
          const output = JSON.stringify(schema);
          addPrivacyEvent({
            type: "schema_sent",
            description: `Schema sent: ${schema.tables.length} tables`,
            tokensSent: Math.ceil(output.length / 4),
            payload: output,
          });
          return output;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return JSON.stringify({ error: msg });
        }
      }

      if (tool.name === "query_data") {
        try {
          const { sql, description } = tool.input as {
            sql: string;
            description: string;
          };
          const result = await runQuery(sql);
          const capped = {
            ...result,
            rows: result.rows.slice(0, 20),
            rowCount: Math.min(result.rowCount, 20),
            truncated: result.rowCount > 20,
          };
          const output = JSON.stringify(capped);
          addPrivacyEvent({
            type: "query_result",
            description: `Query: ${description} — ${capped.rowCount} rows`,
            tokensSent: Math.ceil(output.length / 4),
            rowsProcessed: capped.rowCount,
            payload: output,
            sql,
          });
          return output;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return JSON.stringify({ error: `SQL Error: ${msg}` });
        }
      }

      if (tool.name === "render_dashboard") {
        try {
          const { components } = tool.input as {
            components: Dashboard["components"];
          };
          onDashboardUpdateRef.current({ components });
          const output = JSON.stringify({
            rendered: true,
            componentCount: components.length,
          });
          addPrivacyEvent({
            type: "component_generated",
            description: `Dashboard: ${components.length} components`,
            payload: JSON.stringify(components, null, 2),
          });
          return output;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return JSON.stringify({ error: msg });
        }
      }

      if (tool.name === "export_excel") {
        try {
          const { sql, filename, description } = tool.input as {
            sql: string;
            filename: string;
            description: string;
          };
          const result = await runQuery(sql);
          addPrivacyEvent({
            type: "query_result",
            description: `Export: ${description} — ${result.rowCount} rows`,
            rowsProcessed: result.rowCount,
            sql,
          });
          onExcelExportRef.current(
            result.rows as Record<string, unknown>[],
            filename
          );
          return JSON.stringify({
            exported: true,
            filename: `${filename}.xlsx`,
            rowCount: result.rowCount,
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return JSON.stringify({ error: msg });
        }
      }

      return JSON.stringify({ error: `Unknown tool: ${tool.name}` });
    },
    []
  );

  const { messages, setMessages, clearMessages, sendMessage, status, error } = useTauriChat({
    mode,
    onToolCall: handleToolCall,
  });

  // Track how many messages have been saved so we don't re-save restored ones
  const savedCountRef = useRef(0);

  // Restore messages from a loaded session
  useEffect(() => {
    if (restoredMessages && restoredMessages.length > 0) {
      setMessages(restoredMessages);
      savedCountRef.current = restoredMessages.length;
      onMessagesRestored?.();
    }
  }, [restoredMessages, setMessages, onMessagesRestored]);

  // Save new messages when streaming completes
  const saveMessageRef = useRef(saveMessageToSession);
  saveMessageRef.current = saveMessageToSession;

  useEffect(() => {
    if (status !== "ready" || !saveMessageRef.current) return;
    const newMessages = messages.slice(savedCountRef.current);
    if (newMessages.length === 0) return;
    savedCountRef.current = messages.length;

    for (const msg of newMessages) {
      // Skip internal tool-result messages (no visible parts)
      if (msg.parts.length === 0) continue;

      const textParts = msg.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("");

      const toolCallNames = msg.parts
        .filter((p) => p.type === "dynamic-tool")
        .map((p) => ("toolName" in p ? (p as { toolName: string }).toolName : ""))
        .filter(Boolean);

      saveMessageRef.current(
        msg.role,
        textParts,
        toolCallNames.length > 0 ? JSON.stringify(toolCallNames) : null,
        null,
      );
    }
  }, [status, messages]);

  const isLoading = status === "submitted" || status === "streaming";

  const handleSend = useCallback(
    (text: string) => {
      if (text.trim()) {
        sendMessage({ text });
      }
    },
    [sendMessage]
  );

  const handleClear = useCallback(() => {
    clearMessages();
    savedCountRef.current = 0;
    resetPrivacy();
    onClear();
  }, [clearMessages, onClear]);

  return (
    <ChatPanelUI
      messages={messages}
      status={status}
      error={error}
      isLoading={isLoading}
      sampleRowLimit={sampleRowLimit}
      onSampleRowLimitChange={onSampleRowLimitChange}
      onSend={handleSend}
      onClear={handleClear}
      suggestions={suggestions}
    />
  );
}

// ── Shared presentation layer ───────────────────────────

interface ChatPanelUIProps {
  messages: { id: string; role: string; parts: unknown[] }[];
  status: string;
  error: Error | null | undefined;
  isLoading: boolean;
  sampleRowLimit: number;
  onSampleRowLimitChange: (limit: number) => void;
  onSend: (text: string) => void;
  onClear: () => void;
  suggestions?: string[];
}

function ChatPanelUI({
  messages,
  status,
  error,
  isLoading,
  sampleRowLimit,
  onSampleRowLimitChange,
  onSend,
  onClear,
  suggestions,
}: ChatPanelUIProps) {
  return (
    <div className="flex h-full flex-col glass-chat overflow-hidden">
      {/* Privacy beacon + clear */}
      <div className="shrink-0 p-3 pb-0">
        <PrivacyBeacon
          sampleRowLimit={sampleRowLimit}
          onSampleRowLimitChange={onSampleRowLimitChange}
          onClear={messages.length > 0 ? onClear : undefined}
        />
      </div>

      {/* Messages */}
      <MessageList
        messages={messages as Parameters<typeof MessageList>[0]["messages"]}
        isStreaming={status === "streaming"}
      />

      {/* Error display */}
      {error && (
        <div className="mx-3 mb-2 flex items-start gap-2.5 rounded-xl bg-red-500/15 px-4 py-2.5 text-sm text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-300" />
          <span>{error.message || "Something went wrong. Try again."}</span>
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 p-3 pt-0">
        <ChatInput
          onSend={onSend}
          isLoading={isLoading}
          suggestions={messages.length === 0 ? suggestions : undefined}
        />
      </div>
    </div>
  );
}
