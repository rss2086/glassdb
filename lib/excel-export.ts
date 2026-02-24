"use client";

import * as XLSX from "xlsx";

/**
 * Quick export: client-side with SheetJS (instant, basic formatting)
 */
export function quickExport(
  data: Record<string, unknown>[],
  filename: string
) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Polished export: server-side with Anthropic xlsx skill
 * Creates a professionally formatted Excel file with charts and styling
 */
export async function polishedExport(
  data: Record<string, unknown>[],
  instructions?: string
): Promise<void> {
  const response = await fetch("/api/export-excel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, instructions }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Export failed");
  }

  // Check if we got a file back (binary) or a JSON response
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("spreadsheetml")) {
    // Direct file download
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "glassdb-export.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  } else {
    // JSON response — the skill API integration may need refinement
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Export failed");
    }
    // Fallback to quick export if polished export can't return a file yet
    quickExport(data, "glassdb-export");
  }
}
