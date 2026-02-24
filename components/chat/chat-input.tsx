"use client";

import { useState, useCallback, type KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";

interface ChatInputProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  suggestions?: string[];
}

export function ChatInput({ onSend, isLoading, suggestions }: ChatInputProps) {
  const [input, setInput] = useState("");

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (trimmed && !isLoading) {
      onSend(trimmed);
      setInput("");
    }
  }, [input, isLoading, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className="space-y-2">
      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                if (!isLoading) {
                  onSend(suggestion);
                }
              }}
              disabled={isLoading}
              className="rounded-lg bg-white/8 px-2.5 py-1 text-xs text-warm-muted transition-all duration-200 hover:bg-white/15 hover:text-warm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 rounded-2xl bg-white/10 px-3 py-2 transition-all duration-200 focus-within:bg-white/15">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your data..."
          disabled={isLoading}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-warm placeholder:text-warm-faint focus:outline-none disabled:opacity-50 min-h-9 max-h-30 py-1.5"
          style={{ fieldSizing: "content" } as React.CSSProperties}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-warm transition-all duration-200 disabled:opacity-20 disabled:cursor-not-allowed btn-send"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
