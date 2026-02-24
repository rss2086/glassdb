"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, Database, Loader2, Shield, Clock, X } from "lucide-react";
import { isDesktop } from "@/lib/desktop";
import { loadFileFromBytes } from "@/lib/file-loader";
import type { LoadedFile } from "@/lib/types";
import type { Session } from "@/lib/use-session";

interface LandingProps {
  onFilesSelected: (files: FileList) => void;
  onDesktopFilesLoaded?: (files: LoadedFile[]) => void;
  onLoadSampleData: () => void;
  isLoading: boolean;
  sessions?: Session[];
  onSessionClick?: (id: string) => void;
  onSessionDelete?: (id: string) => void;
}

const ACCEPTED_TYPES = ".csv,.xlsx,.xls,.json,.parquet";

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr + "Z"); // SQLite datetimes are UTC
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function Landing({
  onFilesSelected,
  onDesktopFilesLoaded,
  onLoadSampleData,
  isLoading,
  sessions,
  onSessionClick,
  onSessionDelete,
}: LandingProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingDesktop, setIsLoadingDesktop] = useState(false);
  const loading = isLoading || isLoadingDesktop;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        onFilesSelected(e.dataTransfer.files);
      }
    },
    [onFilesSelected]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onFilesSelected(e.target.files);
      }
    },
    [onFilesSelected]
  );

  const handleClick = useCallback(async () => {
    if (!isDesktop()) {
      inputRef.current?.click();
      return;
    }

    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const { invoke } = await import("@tauri-apps/api/core");

      const selected = await open({
        multiple: true,
        filters: [
          {
            name: "Data Files",
            extensions: ["csv", "xlsx", "xls", "json", "parquet", "tsv"],
          },
        ],
      });

      if (!selected) return;
      setIsLoadingDesktop(true);

      const paths = Array.isArray(selected) ? selected : [selected];
      const results: LoadedFile[] = [];

      for (const filePath of paths) {
        const data = await invoke<{ path: string; name: string; contents: number[] }>(
          "read_file_bytes",
          { path: filePath }
        );
        const bytes = new Uint8Array(data.contents);
        const loaded = await loadFileFromBytes(data.name, bytes);
        results.push(...loaded.map((f) => ({ ...f, filePath: data.path })));
      }

      if (results.length > 0 && onDesktopFilesLoaded) {
        onDesktopFilesLoaded(results);
      }
    } catch (err) {
      console.error("Native file dialog error:", err);
    } finally {
      setIsLoadingDesktop(false);
    }
  }, [onDesktopFilesLoaded]);

  const visibleSessions = sessions?.slice(0, 5) ?? [];

  return (
    <div
      className={`app-gradient flex min-h-screen flex-col items-center justify-center px-4 transition-all duration-300 ${
        isDragging ? "brightness-110" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="flex flex-col items-center glass-primary p-12">
            <Upload className="h-12 w-12 text-warm" />
            <p className="mt-4 text-lg font-medium text-warm">
              Drop your files here
            </p>
          </div>
        </div>
      )}

      <div className="flex max-w-2xl flex-col items-center text-center">
        {/* Title */}
        <h1 className="font-display text-6xl text-warm tracking-tight sm:text-7xl">
          GlassDB
        </h1>

        {/* Subtitle */}
        <p className="mt-4 text-xl text-warm-muted sm:text-2xl">
          See through your data
        </p>

        {/* Tagline */}
        <p className="mt-2 text-sm text-warm-faint">
          Your files. Your browser. Your answers.
        </p>

        {/* CTA buttons */}
        <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row">
          <button
            onClick={handleClick}
            disabled={loading}
            className="flex items-center gap-2 rounded-2xl bg-white/15 backdrop-blur-sm px-8 py-3.5 text-base font-medium text-warm transition-all duration-300 hover:bg-white/25 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Upload className="h-5 w-5" />
            )}
            {loading ? "Loading..." : "Drop files to start"}
          </button>

          <button
            onClick={onLoadSampleData}
            disabled={loading}
            className="flex items-center gap-2 rounded-2xl bg-white/8 px-8 py-3.5 text-base font-medium text-warm-muted transition-all duration-300 hover:bg-white/15 hover:text-warm disabled:opacity-60"
          >
            <Database className="h-5 w-5" />
            Try with sample data
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Recent Sessions (desktop only) */}
        {visibleSessions.length > 0 && onSessionClick && (
          <div className="mt-10 w-full max-w-sm">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-warm-faint">
              Recent Sessions
            </p>
            <div className="space-y-1.5">
              {visibleSessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSessionClick(s.id)}
                  className="group flex w-full items-center gap-3 rounded-xl bg-white/8 px-4 py-2.5 text-left transition-all duration-200 hover:bg-white/15"
                >
                  <Clock className="h-3.5 w-3.5 shrink-0 text-warm-faint" />
                  <span className="flex-1 truncate text-sm text-warm-muted group-hover:text-warm">
                    {s.name}
                  </span>
                  <span className="shrink-0 text-xs text-warm-faint">
                    {timeAgo(s.updatedAt)}
                  </span>
                  {onSessionDelete && (
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSessionDelete(s.id);
                      }}
                      className="shrink-0 rounded-full p-1 text-warm-faint opacity-0 transition-all duration-200 hover:bg-white/10 hover:text-warm group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Privacy note */}
        <div className="mt-16 flex items-center gap-2 text-xs text-warm-faint">
          <Shield className="h-3.5 w-3.5" />
          <span>All data stays in your browser. Nothing is uploaded.</span>
        </div>
      </div>
    </div>
  );
}
