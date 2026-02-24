"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DataTableProps } from "@/lib/types";

type SortDirection = "asc" | "desc" | null;

interface SortState {
  column: string | null;
  direction: SortDirection;
}

export function DataTable({ title, columns, data, sortable }: DataTableProps) {
  const [sort, setSort] = useState<SortState>({
    column: null,
    direction: null,
  });

  const handleSort = (column: string) => {
    if (!sortable) return;

    setSort((prev) => {
      if (prev.column !== column) return { column, direction: "asc" };
      if (prev.direction === "asc") return { column, direction: "desc" };
      if (prev.direction === "desc") return { column: null, direction: null };
      return { column, direction: "asc" };
    });
  };

  const sortedData = useMemo(() => {
    if (!sort.column || !sort.direction) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sort.column!];
      const bVal = b[sort.column!];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let comparison = 0;
      if (typeof aVal === "number" && typeof bVal === "number") {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sort.direction === "desc" ? -comparison : comparison;
    });
  }, [data, sort]);

  return (
    <div className="glass-primary p-5 transition-all duration-200">
      <h3 className="text-base font-semibold text-warm mb-4">{title}</h3>
      <div className="overflow-x-auto rounded-lg border border-white/8">
        <Table>
          <TableHeader>
            <TableRow className="bg-white/6 hover:bg-white/6 border-white/8">
              {columns.map((column) => (
                <TableHead
                  key={column}
                  className={`text-warm-muted font-medium text-xs uppercase tracking-wider ${
                    sortable ? "cursor-pointer select-none" : ""
                  }`}
                  onClick={() => handleSort(column)}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {column}
                    {sortable && (
                      <ArrowUpDown
                        className={`w-3 h-3 transition-opacity ${
                          sort.column === column
                            ? "opacity-100 text-warm"
                            : "opacity-30"
                        }`}
                      />
                    )}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((row, rowIndex) => (
              <TableRow
                key={rowIndex}
                className="hover:bg-white/6 transition-colors duration-150 border-white/6"
              >
                {columns.map((column) => (
                  <TableCell
                    key={column}
                    className="text-warm-muted text-sm"
                  >
                    {row[column] != null ? String(row[column]) : ""}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
