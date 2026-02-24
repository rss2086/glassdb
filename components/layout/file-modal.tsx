"use client";

import { useCallback, useRef, useState } from "react";
import type { LoadedFile } from "@/lib/types";
import { isDesktop } from "@/lib/desktop";
import { loadFileFromBytes } from "@/lib/file-loader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, X, FileSpreadsheet, Loader2 } from "lucide-react";

interface FileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loadedFiles: LoadedFile[];
  onFilesSelected: (files: FileList) => void;
  onDesktopFilesLoaded?: (files: LoadedFile[]) => void;
  onRemoveFile: (tableName: string) => void;
  isLoading: boolean;
}

const ACCEPTED_TYPES = ".csv,.xlsx,.xls,.json,.parquet";

export function FileModal({
  open,
  onOpenChange,
  loadedFiles,
  onFilesSelected,
  onDesktopFilesLoaded,
  onRemoveFile,
  isLoading,
}: FileModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

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
    }
  }, [onDesktopFilesLoaded]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="backdrop-blur-xl text-warm sm:max-w-lg" style={{ background: "var(--modal-bg)", borderColor: "var(--modal-border)" }}>
        <DialogHeader>
          <DialogTitle className="text-warm font-display text-lg">Manage Files</DialogTitle>
        </DialogHeader>

        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-300 ${
            isDragging
              ? "border-white/40 bg-white/10"
              : "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/8"
          }`}
        >
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-warm" />
          ) : (
            <Upload className="h-8 w-8 text-warm-muted" />
          )}
          <p className="mt-3 text-sm font-medium text-warm">
            {isLoading ? "Loading files..." : "Drop files here or click to browse"}
          </p>
          <p className="mt-1 text-xs text-warm-faint">
            CSV, Excel, JSON, or Parquet
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Loaded files list */}
        {loadedFiles.length > 0 && (
          <div className="mt-2 space-y-2">
            <p className="text-xs font-medium text-warm-faint uppercase tracking-wider">
              Loaded Tables
            </p>
            <div className="max-h-48 space-y-1.5 overflow-y-auto custom-scroll">
              {loadedFiles.map((file) => (
                <div
                  key={file.tableName}
                  className="flex items-center justify-between rounded-lg bg-white/8 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-warm-muted" />
                    <div>
                      <p className="text-sm font-medium text-warm">
                        {file.tableName}
                      </p>
                      <p className="text-xs text-warm-faint">
                        {file.rowCount.toLocaleString()} rows &middot;{" "}
                        {file.columnCount} columns
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveFile(file.tableName)}
                    className="rounded-full p-1 text-warm-faint transition-all duration-300 hover:bg-white/10 hover:text-warm"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
