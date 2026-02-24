"use client";

import { useState, useCallback, useEffect } from "react";
import type { UIMessage } from "ai";
import type { Dashboard, AnalysisMode, LoadedFile } from "@/lib/types";
import { loadFile, loadFileFromBytes } from "@/lib/file-loader";
import { dropTable, dropAllTables } from "@/lib/duckdb";
import { loadSampleData, SAMPLE_SUGGESTIONS } from "@/lib/sample-data";
import { addLocalRows } from "@/lib/privacy";
import { quickExport } from "@/lib/excel-export";
import { isDesktop, hasApiKey } from "@/lib/desktop";
import { useSessions } from "@/lib/use-session";
import { DashboardRenderer } from "@/components/dashboard/dashboard-renderer";
import { ChatPanel } from "@/components/chat/chat-panel";
import { NavBar } from "@/components/layout/nav-bar";
import { FileModal } from "@/components/layout/file-modal";
import { Landing } from "@/components/layout/landing";
import { ApiKeyModal } from "@/components/desktop/api-key-modal";
import { useTheme } from "@/lib/use-theme";
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Table2,
} from "lucide-react";

export default function Home() {
  const [view, setView] = useState<"landing" | "active">("landing");
  const [mode, setMode] = useState<AnalysisMode>("quick");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loadedFiles, setLoadedFiles] = useState<LoadedFile[]>([]);
  const [fileModalOpen, setFileModalOpen] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [sampleRowLimit, setSampleRowLimit] = useState(10);

  // Desktop-only state
  const [desktop, setDesktop] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKeyReady, setApiKeyReady] = useState(false);

  // Theme
  const { theme, setTheme } = useTheme();

  // Session restore state
  const [restoredMessages, setRestoredMessages] = useState<UIMessage[] | undefined>();

  // Hydration-safe desktop detection + API key check
  useEffect(() => {
    const isD = isDesktop();
    setDesktop(isD);
    if (isD) {
      hasApiKey().then(setApiKeyReady);
    }
  }, []);

  const {
    sessions,
    activeSessionId,
    createSession,
    saveMessage,
    saveDashboard,
    saveFiles,
    loadSession,
    deleteSession,
    clearActiveSession,
  } = useSessions();

  const handleFilesSelected = useCallback(async (files: FileList) => {
    setIsLoadingFiles(true);
    try {
      const results: LoadedFile[] = [];
      for (const file of Array.from(files)) {
        const loaded = await loadFile(file);
        results.push(...loaded);
      }
      for (const f of results) {
        addLocalRows(f.rowCount);
      }
      setLoadedFiles((prev) => [...prev, ...results]);
      setView("active");
      setFileModalOpen(false);
    } catch (err) {
      console.error("Failed to load files:", err);
    } finally {
      setIsLoadingFiles(false);
    }
  }, []);

  const handleDesktopFilesLoaded = useCallback(async (files: LoadedFile[]) => {
    for (const f of files) {
      addLocalRows(f.rowCount);
    }
    setLoadedFiles((prev) => [...prev, ...files]);
    setView("active");
    setFileModalOpen(false);

    // Create a session and save file references
    const filesWithPaths = files.filter((f) => f.filePath);
    if (filesWithPaths.length > 0) {
      const name = files.map((f) => f.fileName).join(", ");
      const sid = await createSession(name);
      if (sid) {
        await saveFiles(
          filesWithPaths.map((f) => ({
            filePath: f.filePath!,
            tableName: f.tableName,
            rowCount: f.rowCount,
            columnCount: f.columnCount,
          })),
          sid,
        );
      }
    }
  }, [createSession, saveFiles]);

  const handleLoadSampleData = useCallback(async () => {
    setIsLoadingFiles(true);
    try {
      const { tables } = await loadSampleData();
      const files = tables.map((t) => ({
        fileName: `${t.name}.csv`,
        tableName: t.name,
        rowCount: t.rowCount,
        columnCount: t.columnCount,
      }));
      setLoadedFiles(files);
      setView("active");

      // Create a session for sample data (no file paths to restore)
      await createSession("Sample Data");
    } catch (err) {
      console.error("Failed to load sample data:", err);
    } finally {
      setIsLoadingFiles(false);
    }
  }, [createSession]);

  const handleRemoveFile = useCallback(async (tableName: string) => {
    await dropTable(tableName);
    setLoadedFiles((prev) => prev.filter((f) => f.tableName !== tableName));
  }, []);

  const handleDashboardUpdate = useCallback((d: Dashboard) => {
    setDashboard(d);
    // Persist dashboard to session
    saveDashboard(JSON.stringify(d.components));
  }, [saveDashboard]);

  const handleExcelExport = useCallback((data: Record<string, unknown>[], filename: string) => {
    quickExport(data, filename);
  }, []);

  const handleClear = useCallback(async () => {
    await dropAllTables();
    setDashboard(null);
    setLoadedFiles([]);
    setRestoredMessages(undefined);
    clearActiveSession();
    setView("landing");
  }, [clearActiveSession]);

  const handleKeyStored = useCallback(() => {
    setApiKeyReady(true);
  }, []);

  const handleMessagesRestored = useCallback(() => {
    setRestoredMessages(undefined);
  }, []);

  const handleSessionRestore = useCallback(async (id: string) => {
    setIsLoadingFiles(true);
    try {
      const full = await loadSession(id);
      if (!full) return;

      // Re-load files from disk paths
      const fileResults: LoadedFile[] = [];
      for (const sf of full.files) {
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          const data = await invoke<{ path: string; name: string; contents: number[] }>(
            "read_file_bytes",
            { path: sf.filePath },
          );
          const bytes = new Uint8Array(data.contents);
          const loaded = await loadFileFromBytes(data.name, bytes);
          fileResults.push(
            ...loaded.map((f) => ({ ...f, filePath: sf.filePath })),
          );
        } catch (err) {
          console.warn(`Skipping missing file: ${sf.filePath}`, err);
        }
      }

      for (const f of fileResults) {
        addLocalRows(f.rowCount);
      }
      setLoadedFiles(fileResults);

      // Restore dashboard
      if (full.dashboardComponents) {
        try {
          const components = JSON.parse(full.dashboardComponents);
          setDashboard({ components });
        } catch {
          console.warn("Failed to parse stored dashboard");
        }
      }

      // Convert stored messages to UIMessage format for display
      const uiMessages: UIMessage[] = [];
      for (const msg of full.messages) {
        const parts: UIMessage["parts"] = [];
        if (msg.content) {
          parts.push({ type: "text" as const, text: msg.content });
        }
        if (msg.toolCalls) {
          try {
            const names = JSON.parse(msg.toolCalls) as string[];
            for (const name of names) {
              parts.push({
                type: "dynamic-tool" as const,
                toolName: name,
                toolCallId: `restored-${msg.id}-${name}`,
                state: "output-available" as const,
                input: {},
                output: "(restored from session)",
              });
            }
          } catch {
            // ignore parse errors
          }
        }
        if (parts.length > 0) {
          uiMessages.push({
            id: msg.id,
            role: msg.role as "user" | "assistant",
            parts,
          });
        }
      }

      setRestoredMessages(uiMessages);
      setView("active");
    } catch (err) {
      console.error("Failed to restore session:", err);
    } finally {
      setIsLoadingFiles(false);
    }
  }, [loadSession]);

  // Landing view
  if (view === "landing") {
    return (
      <>
        <Landing
          onFilesSelected={handleFilesSelected}
          onDesktopFilesLoaded={handleDesktopFilesLoaded}
          onLoadSampleData={handleLoadSampleData}
          isLoading={isLoadingFiles}
          sessions={desktop ? sessions : undefined}
          onSessionClick={desktop ? handleSessionRestore : undefined}
          onSessionDelete={desktop ? deleteSession : undefined}
        />
        {desktop && (
          <ApiKeyModal
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            onKeyStored={handleKeyStored}
          />
        )}
      </>
    );
  }

  // Active analysis view — two-panel layout on gradient
  return (
    <div className="app-gradient flex h-screen flex-col overflow-hidden">
      <NavBar
        fileCount={loadedFiles.length}
        mode={mode}
        onModeChange={setMode}
        onFilesClick={() => setFileModalOpen(true)}
        onSettingsClick={desktop ? () => setSettingsOpen(true) : undefined}
        sessions={desktop ? sessions : undefined}
        activeSessionId={desktop ? activeSessionId : undefined}
        onSessionClick={desktop ? handleSessionRestore : undefined}
        onNewSession={desktop ? handleClear : undefined}
        theme={theme}
        onThemeChange={setTheme}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Chat Panel */}
        <div className="w-[456px] shrink-0 p-3 pr-1.5">
          <ChatPanel
            mode={mode}
            sampleRowLimit={sampleRowLimit}
            onSampleRowLimitChange={setSampleRowLimit}
            onDashboardUpdate={handleDashboardUpdate}
            onExcelExport={handleExcelExport}
            onClear={handleClear}
            suggestions={SAMPLE_SUGGESTIONS}
            saveMessage={desktop ? saveMessage : undefined}
            restoredMessages={restoredMessages}
            onMessagesRestored={handleMessagesRestored}
          />
        </div>

        {/* Right: Dashboard Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scroll">
          {dashboard ? (
            <DashboardRenderer components={dashboard.components} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center max-w-md">
                {/* Ghost dashboard preview */}
                <div className="mb-8 grid grid-cols-2 gap-3 opacity-[0.15]">
                  <div className="glass-secondary p-4 h-20 flex items-center justify-center">
                    <TrendingUp className="h-8 w-8 text-white" />
                  </div>
                  <div className="glass-secondary p-4 h-20 flex items-center justify-center">
                    <BarChart3 className="h-8 w-8 text-white" />
                  </div>
                  <div className="glass-secondary p-4 h-20 flex items-center justify-center">
                    <PieChart className="h-8 w-8 text-white" />
                  </div>
                  <div className="glass-secondary p-4 h-20 flex items-center justify-center">
                    <Table2 className="h-8 w-8 text-white" />
                  </div>
                </div>

                <h2 className="font-display text-2xl text-warm">
                  Your dashboard appears here
                </h2>
                <p className="mt-3 text-sm text-warm-muted leading-relaxed">
                  Ask a question in the chat to generate charts, tables, and insights from your data.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <FileModal
        open={fileModalOpen}
        onOpenChange={setFileModalOpen}
        loadedFiles={loadedFiles}
        onFilesSelected={handleFilesSelected}
        onDesktopFilesLoaded={handleDesktopFilesLoaded}
        onRemoveFile={handleRemoveFile}
        isLoading={isLoadingFiles}
      />

      {desktop && (
        <ApiKeyModal
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onKeyStored={handleKeyStored}
        />
      )}
    </div>
  );
}
