"use client";

import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";
import { Streamdown } from "streamdown";
import {
  Database,
  LayoutDashboard,
  FileSpreadsheet,
  TableProperties,
  Loader2,
  Check,
} from "lucide-react";

interface MessageListProps {
  messages: UIMessage[];
  isStreaming?: boolean;
}

const toolLabels: Record<string, { active: string; done: string; icon: typeof Database }> = {
  get_schema: { active: "Reading schema", done: "Read schema", icon: TableProperties },
  query_data: { active: "Querying data", done: "Queried data", icon: Database },
  render_dashboard: { active: "Building dashboard", done: "Built dashboard", icon: LayoutDashboard },
  export_excel: { active: "Exporting to Excel", done: "Exported to Excel", icon: FileSpreadsheet },
};

export function MessageList({ messages, isStreaming }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <p className="text-sm text-warm-faint text-center">
          Ask a question about your data to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 custom-scroll">
      {messages.map((message, msgIndex) => (
        <div key={message.id}>
          {message.role === "user" &&
            message.parts.some((p) => p.type === "text" && p.text.trim()) && (
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-br-md px-4 py-2.5 text-warm text-sm" style={{ background: "var(--bubble-user-bg)" }}>
                {message.parts
                  .filter((part): part is { type: "text"; text: string } => part.type === "text" && part.text.trim() !== "")
                  .map((part, i) => (
                    <span key={i}>{part.text}</span>
                  ))}
              </div>
            </div>
          )}

          {message.role === "assistant" && (
            <div className="flex justify-start">
              <div className="max-w-[90%] space-y-2">
                {message.parts.map((part, i) => {
                  if (part.type === "text" && part.text.trim()) {
                    const isLastAssistantMessage = msgIndex === messages.length - 1;
                    return (
                      <div key={i} className="chat-markdown">
                        <Streamdown
                          isAnimating={isStreaming && isLastAssistantMessage}
                          linkSafety={{ enabled: false }}
                        >
                          {part.text}
                        </Streamdown>
                      </div>
                    );
                  }

                  if (part.type === "dynamic-tool") {
                    const toolConfig = toolLabels[part.toolName] ?? {
                      active: part.toolName,
                      done: part.toolName,
                      icon: Database,
                    };
                    const Icon = toolConfig.icon;
                    const isComplete =
                      part.state === "output-available" || part.state === "output-error";

                    return (
                      <div
                        key={i}
                        className="inline-flex items-center gap-1.5 text-xs text-warm-faint"
                      >
                        {isComplete ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        )}
                        <Icon className="h-3 w-3" />
                        <span>
                          {isComplete ? toolConfig.done : toolConfig.active + "..."}
                        </span>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          )}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
