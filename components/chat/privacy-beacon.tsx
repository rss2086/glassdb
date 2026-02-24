"use client";

import { useState } from "react";
import { Shield, ChevronDown, ChevronUp, ChevronRight, Send, Database, LayoutDashboard, RotateCcw, Eye } from "lucide-react";
import { usePrivacy } from "@/lib/use-privacy";

const SAMPLE_PRESETS = [0, 5, 10, 25, 50, 100];

interface PrivacyBeaconProps {
  sampleRowLimit: number;
  onSampleRowLimitChange: (limit: number) => void;
  onClear?: () => void;
}

export function PrivacyBeacon({ sampleRowLimit, onSampleRowLimitChange, onClear }: PrivacyBeaconProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);
  const stats = usePrivacy();

  const toggleEvent = (index: number) => {
    setExpandedEvent(expandedEvent === index ? null : index);
  };

  return (
    <div className="rounded-xl bg-white/6 transition-all duration-300">
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex flex-1 items-center justify-between px-3 py-2 text-sm"
        >
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-medium text-warm text-xs">
              {stats.totalRowsLocal.toLocaleString()} rows local
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-warm-faint">
              ~{stats.totalTokensSent.toLocaleString()} tokens sent
            </span>
            {expanded ? (
              <ChevronUp className="h-3 w-3 text-warm-faint" />
            ) : (
              <ChevronDown className="h-3 w-3 text-warm-faint" />
            )}
          </div>
        </button>

        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 mr-2 p-1.5 rounded-lg text-warm-faint transition-all duration-200 hover:bg-white/10 hover:text-warm"
            title="Clear chat & dashboard"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {expanded && (
        <>
          {/* Sample row limit control */}
          <div className="border-t border-white/8 px-3 py-2.5">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-3 w-3 text-warm-faint" />
              <span className="text-xs text-warm-muted">
                Sample rows shared with AI:
              </span>
              <span className="text-xs font-medium text-warm ml-auto">
                {sampleRowLimit === 0 ? "None" : sampleRowLimit}
              </span>
            </div>
            <div className="flex gap-1">
              {SAMPLE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onSampleRowLimitChange(preset)}
                  className={`flex-1 rounded-md px-1 py-1 text-[10px] font-medium transition-all duration-150 ${
                    sampleRowLimit === preset
                      ? "bg-white/15 text-warm"
                      : "text-warm-faint hover:bg-white/8 hover:text-warm-muted"
                  }`}
                >
                  {preset === 0 ? "None" : preset}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-warm-faint mt-1.5 leading-relaxed">
              {sampleRowLimit === 0
                ? "Model sees column names only. Less accurate but maximum privacy."
                : `Model sees ${sampleRowLimit} sample rows per table to understand your data structure.`}
            </p>
          </div>

          {/* Event log */}
          {stats.events.length > 0 && (
            <div className="border-t border-white/8 px-2 py-1.5 space-y-0.5 max-h-64 overflow-y-auto custom-scroll">
              {stats.events.map((event, index) => {
                const isOpen = expandedEvent === index;
                const hasPayload = !!event.payload || !!event.sql;

                return (
                  <div key={`${event.timestamp}-${index}`}>
                    <button
                      type="button"
                      onClick={() => hasPayload && toggleEvent(index)}
                      className={`flex w-full items-start gap-2 text-xs rounded-lg px-2 py-1.5 text-left transition-colors duration-150 ${
                        hasPayload ? "hover:bg-white/6 cursor-pointer" : "cursor-default"
                      } ${isOpen ? "bg-white/6" : ""}`}
                    >
                      <span className="mt-0.5 shrink-0">
                        {event.type === "schema_sent" ? (
                          <Database className="h-3 w-3 text-blue-400/60" />
                        ) : event.type === "query_result" ? (
                          <Database className="h-3 w-3 text-amber-400/60" />
                        ) : event.type === "component_generated" ? (
                          <LayoutDashboard className="h-3 w-3 text-warm-faint" />
                        ) : (
                          <Send className="h-3 w-3 text-warm-faint" />
                        )}
                      </span>
                      <span className="flex-1 text-warm-muted leading-relaxed">{event.description}</span>
                      <span className="shrink-0 text-warm-faint ml-1">
                        {new Date(event.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                      {hasPayload && (
                        <ChevronRight className={`h-3 w-3 shrink-0 mt-0.5 text-warm-faint transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
                      )}
                    </button>

                    {isOpen && (event.sql || event.payload) && (
                      <div className="ml-5 mr-1 mb-1 space-y-1">
                        {event.sql && (
                          <pre className="text-[10px] leading-tight bg-black/20 rounded-lg p-2.5 overflow-x-auto custom-scroll whitespace-pre-wrap break-all" style={{ color: "var(--code-highlight)" }}>
                            {event.sql}
                          </pre>
                        )}
                        {event.payload && (
                          <pre className="text-[10px] leading-tight text-warm-faint bg-black/20 rounded-lg p-2.5 overflow-x-auto max-h-48 custom-scroll whitespace-pre-wrap break-all">
                            {formatPayload(event.payload)}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {stats.events.length === 0 && (
            <div className="border-t border-white/8 px-3 py-2">
              <p className="text-xs text-warm-faint">
                No activity yet. Start a conversation.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function formatPayload(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}
