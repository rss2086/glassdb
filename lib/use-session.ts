"use client";

import { useState, useEffect, useCallback } from "react";
import { isDesktop } from "./desktop";

export interface Session {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionMessage {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  toolCalls: string | null;
  toolResults: string | null;
  createdAt: string;
}

export interface SessionFile {
  id: string;
  sessionId: string;
  filePath: string;
  tableName: string;
  rowCount: number;
  columnCount: number;
}

export interface FullSession {
  session: Session;
  messages: SessionMessage[];
  dashboardComponents: string | null;
  files: SessionFile[];
}

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const desktop = isDesktop();

  useEffect(() => {
    if (!desktop) return;
    (async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      const list = await invoke<Session[]>("list_sessions");
      setSessions(list);
    })();
  }, [desktop]);

  const createSession = useCallback(
    async (name: string): Promise<string | null> => {
      if (!desktop) return null;
      const { invoke } = await import("@tauri-apps/api/core");
      const session = await invoke<Session>("create_session", { name });
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      return session.id;
    },
    [desktop],
  );

  const saveMessage = useCallback(
    async (
      role: string,
      content: string,
      toolCalls?: string | null,
      toolResults?: string | null,
    ) => {
      if (!desktop || !activeSessionId) return;
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("save_message", {
        sessionId: activeSessionId,
        role,
        content,
        toolCalls: toolCalls ?? null,
        toolResults: toolResults ?? null,
      });
    },
    [desktop, activeSessionId],
  );

  const saveDashboard = useCallback(
    async (componentsJson: string) => {
      if (!desktop || !activeSessionId) return;
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("save_dashboard", {
        sessionId: activeSessionId,
        components: componentsJson,
      });
    },
    [desktop, activeSessionId],
  );

  const saveFiles = useCallback(
    async (
      files: { filePath: string; tableName: string; rowCount: number; columnCount: number }[],
      sessionIdOverride?: string,
    ) => {
      const sid = sessionIdOverride ?? activeSessionId;
      if (!desktop || !sid) return;
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("save_loaded_files", {
        sessionId: sid,
        files: files.map((f) => ({
          id: "",
          sessionId: sid,
          filePath: f.filePath,
          tableName: f.tableName,
          rowCount: f.rowCount,
          columnCount: f.columnCount,
        })),
      });
    },
    [desktop, activeSessionId],
  );

  const loadSession = useCallback(
    async (id: string): Promise<FullSession | null> => {
      if (!desktop) return null;
      const { invoke } = await import("@tauri-apps/api/core");
      const full = await invoke<FullSession>("load_session", { id });
      setActiveSessionId(id);
      return full;
    },
    [desktop],
  );

  const deleteSession = useCallback(
    async (id: string) => {
      if (!desktop) return;
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("delete_session", { id });
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) setActiveSessionId(null);
    },
    [desktop, activeSessionId],
  );

  const clearActiveSession = useCallback(() => {
    setActiveSessionId(null);
  }, []);

  return {
    sessions,
    activeSessionId,
    createSession,
    saveMessage,
    saveDashboard,
    saveFiles,
    loadSession,
    deleteSession,
    setActiveSessionId,
    clearActiveSession,
  };
}
