/**
 * Returns true when running inside the Tauri desktop shell.
 * Relies on `withGlobalTauri: true` in tauri.conf.json.
 */
export function isDesktop(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

// ── Types for Tauri Channel events ──────────────────────

export interface ChatEvent {
  event:
    | "messageStart"
    | "contentDelta"
    | "toolUseStart"
    | "toolUseInputDelta"
    | "toolUseEnd"
    | "messageDelta"
    | "done"
    | "error";
  data: Record<string, unknown>;
}

export interface TauriStreamOptions {
  messages: Array<{ role: string; content: unknown }>;
  systemPrompt: string;
  tools: unknown[] | null;
  model?: string;
  onText: (text: string) => void;
  onToolUse: (tool: {
    id: string;
    name: string;
    input: Record<string, unknown>;
  }) => void;
  onDone: (stopReason: string | null) => void;
  onError: (error: string) => void;
}

// ── Tauri AI streaming ──────────────────────────────────

/**
 * Streams an Anthropic Messages API call through the Rust backend.
 * All `@tauri-apps/api` imports are dynamic so the web build never
 * pulls in Tauri code.
 */
export async function tauriChatStream(
  opts: TauriStreamOptions
): Promise<void> {
  const { invoke, Channel } = await import("@tauri-apps/api/core");

  const toolAccumulators = new Map<
    number,
    { id: string; name: string; json: string }
  >();
  let lastStopReason: string | null = null;

  const onEvent = new Channel<ChatEvent>();
  onEvent.onmessage = (msg: ChatEvent) => {
    switch (msg.event) {
      case "contentDelta":
        opts.onText(msg.data.text as string);
        break;

      case "toolUseStart":
        toolAccumulators.set(msg.data.index as number, {
          id: msg.data.id as string,
          name: msg.data.name as string,
          json: "",
        });
        break;

      case "toolUseInputDelta": {
        const acc = toolAccumulators.get(msg.data.index as number);
        if (acc) acc.json += msg.data.partial_json as string;
        break;
      }

      case "toolUseEnd": {
        const acc = toolAccumulators.get(msg.data.index as number);
        if (acc) {
          const input = acc.json ? JSON.parse(acc.json) : {};
          opts.onToolUse({ id: acc.id, name: acc.name, input });
          toolAccumulators.delete(msg.data.index as number);
        }
        break;
      }

      case "messageDelta":
        lastStopReason = (msg.data.stop_reason as string) ?? null;
        break;

      case "done":
        opts.onDone(lastStopReason);
        break;

      case "error":
        opts.onError(msg.data.message as string);
        break;
    }
  };

  await invoke("chat_stream", {
    messages: opts.messages,
    systemPrompt: opts.systemPrompt,
    tools: opts.tools,
    model: opts.model ?? null,
    onEvent,
  });
}

// ── API key helpers ─────────────────────────────────────

/**
 * Checks whether an Anthropic API key is stored in the system keychain.
 * Always returns false in web mode.
 */
export async function hasApiKey(): Promise<boolean> {
  if (!isDesktop()) return false;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const key = await invoke<string | null>("get_api_key");
    return !!key;
  } catch {
    return false;
  }
}
