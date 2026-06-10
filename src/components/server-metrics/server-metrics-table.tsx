"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  isSystemServerEntry,
  sortServerMetricsRows,
  type ServerMetricSortKey,
} from "@/lib/parsers/server-metrics-parser";
import type { ServerMetricRow, ServerMetricsData } from "@/lib/types";
import { cn } from "@/lib/utils";

const BORDER = "border border-black";
const CELL = `${BORDER} bg-white align-middle text-[13px] leading-snug text-black`;
const HEADER = `${BORDER} bg-black px-2 py-1 text-center text-sm font-bold text-white`;
const SUBHEADER = `${BORDER} bg-[#808080] px-2 py-1 text-center text-xs font-semibold text-white`;
const NAME_CELL = `${CELL} max-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-2 py-1 text-left font-medium`;
const VALUE_CELL = `${CELL} whitespace-nowrap px-2 py-1 text-center tabular-nums`;
const TOP_PERFORMER_CELL = "bg-emerald-50";

type SortDirection = "asc" | "desc";

interface ColumnDef {
  key: ServerMetricSortKey;
  label: string;
  format: (row: ServerMetricRow) => string;
}

function formatCurrency(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number | null, decimals = 0): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

const COLUMNS: ColumnDef[] = [
  { key: "netSales", label: "Net Sales", format: (row) => formatCurrency(row.netSales) },
  {
    key: "grossSales",
    label: "Gross Sales",
    format: (row) => formatCurrency(row.grossSales),
  },
  {
    key: "totalGuests",
    label: "Guests",
    format: (row) => formatNumber(row.totalGuests),
  },
  {
    key: "netSalesPerGuest",
    label: "Net / Guest",
    format: (row) => formatCurrency(row.netSalesPerGuest),
  },
  {
    key: "avgCheckSize",
    label: "Avg Check",
    format: (row) => formatCurrency(row.avgCheckSize),
  },
  {
    key: "avgTurnTimeMin",
    label: "Turn (min)",
    format: (row) => formatNumber(row.avgTurnTimeMin),
  },
  {
    key: "totalLaborHours",
    label: "Labor Hrs",
    format: (row) => formatNumber(row.totalLaborHours, 2),
  },
  {
    key: "netSalesPerLaborHour",
    label: "Net / Labor Hr",
    format: (row) => formatCurrency(row.netSalesPerLaborHour),
  },
  {
    key: "voidsAndDiscounts",
    label: "Voids + Disc",
    format: (row) => formatCurrency(row.voidsAndDiscounts),
  },
];

function SortIndicator({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection;
}) {
  if (!active) {
    return <ArrowUpDown className="ml-1 inline size-3 opacity-60" />;
  }
  return direction === "asc" ? (
    <ArrowUp className="ml-1 inline size-3" />
  ) : (
    <ArrowDown className="ml-1 inline size-3" />
  );
}

interface ServerMetricsTableProps {
  data: ServerMetricsData;
  hideSystemEntries: boolean;
}

export function ServerMetricsTable({
  data,
  hideSystemEntries,
}: ServerMetricsTableProps) {
  const [sortKey, setSortKey] = useState<ServerMetricSortKey>(
    "netSalesPerLaborHour",
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const visibleRows = useMemo(() => {
    const filtered = hideSystemEntries
      ? data.rows.filter((row) => !isSystemServerEntry(row.employeeName))
      : data.rows;
    return sortServerMetricsRows(filtered, sortKey, sortDirection);
  }, [data.rows, hideSystemEntries, sortDirection, sortKey]);

  const topPerformerNames = useMemo(() => {
    const eligible = visibleRows.filter(
      (row) =>
        !isSystemServerEntry(row.employeeName) &&
        row.netSalesPerLaborHour !== null &&
        row.netSalesPerLaborHour > 0 &&
        (row.netSales ?? 0) > 0,
    );
    const sorted = sortServerMetricsRows(
      eligible,
      "netSalesPerLaborHour",
      "desc",
    );
    return new Set(sorted.slice(0, 5).map((row) => row.employeeName));
  }, [visibleRows]);

  function handleSort(key: ServerMetricSortKey) {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection(key === "employeeName" ? "asc" : "desc");
  }

  if (visibleRows.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded border border-black bg-white">
        <p className="text-sm text-zinc-600">
          No server rows match the current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-black bg-white">
      <table className="w-full min-w-[1100px] table-fixed border-collapse text-sm">
        <colgroup>
          <col style={{ width: "4%" }} />
          <col style={{ width: "14%" }} />
          {COLUMNS.map((column) => (
            <col key={column.key} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className={HEADER} colSpan={COLUMNS.length + 2}>
              Server Performance — {data.fileName || "Uploaded report"}
            </th>
          </tr>
          <tr>
            <th className={SUBHEADER} scope="col">
              #
            </th>
            <th
              className={cn(SUBHEADER, "cursor-pointer select-none")}
              scope="col"
              onClick={() => handleSort("employeeName")}
            >
              Employee
              <SortIndicator
                active={sortKey === "employeeName"}
                direction={sortDirection}
              />
            </th>
            {COLUMNS.map((column) => (
              <th
                key={column.key}
                className={cn(SUBHEADER, "cursor-pointer select-none")}
                scope="col"
                onClick={() => handleSort(column.key)}
              >
                {column.label}
                <SortIndicator
                  active={sortKey === column.key}
                  direction={sortDirection}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row, index) => {
            const isTopPerformer = topPerformerNames.has(row.employeeName);
            const rowClass = isTopPerformer ? TOP_PERFORMER_CELL : undefined;

            return (
              <tr key={row.employeeName}>
                <td className={cn(VALUE_CELL, rowClass)}>{index + 1}</td>
                <td className={cn(NAME_CELL, rowClass)} title={row.employeeName}>
                  {row.employeeName}
                </td>
                {COLUMNS.map((column) => (
                  <td key={column.key} className={cn(VALUE_CELL, rowClass)}>
                    {column.format(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
