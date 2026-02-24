"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Key, Check, Trash2, Loader2 } from "lucide-react";
import { isDesktop } from "@/lib/desktop";

interface ApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKeyStored: () => void;
}

export function ApiKeyModal({ open, onOpenChange, onKeyStored }: ApiKeyModalProps) {
  const [key, setKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !isDesktop()) return;
    (async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      const existing = await invoke<string | null>("get_api_key");
      setHasKey(!!existing);
    })();
  }, [open]);

  const handleSave = useCallback(async () => {
    if (!key.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("store_api_key", { apiKey: key.trim() });
      setHasKey(true);
      setKey("");
      onKeyStored();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [key, onKeyStored, onOpenChange]);

  const handleDelete = useCallback(async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("delete_api_key");
      setHasKey(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="backdrop-blur-xl text-warm sm:max-w-md" style={{ background: "var(--modal-bg)", borderColor: "var(--modal-border)" }}>
        <DialogHeader>
          <DialogTitle className="text-warm font-display text-lg">
            API Key
          </DialogTitle>
        </DialogHeader>

        {hasKey ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-xl bg-white/8 px-4 py-3 text-sm text-warm">
              <Check className="h-4 w-4 text-green-400" />
              Anthropic API key is stored in your system keychain.
            </div>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 rounded-xl bg-red-500/15 px-4 py-2.5 text-sm text-red-200 transition-all hover:bg-red-500/25"
            >
              <Trash2 className="h-4 w-4" />
              Remove key
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-warm-muted">
              Enter your Anthropic API key. It will be stored securely in your
              system keychain — never in a file or browser storage.
            </p>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full rounded-xl bg-white/8 border border-white/10 px-4 py-2.5 text-sm text-warm placeholder:text-warm-faint focus:outline-none focus:border-white/25"
            />
            {error && (
              <p className="text-sm text-red-300">{error}</p>
            )}
            <button
              onClick={handleSave}
              disabled={!key.trim() || saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-medium text-warm transition-all hover:bg-white/25 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Key className="h-4 w-4" />
              )}
              {saving ? "Saving..." : "Save API Key"}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
