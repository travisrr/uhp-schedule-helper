"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import {
  ErrorMessage,
  FileDropzone,
  StatusMessage,
} from "@/components/data-ingestion/file-dropzone";
import { ServerMetricsTable } from "@/components/server-metrics/server-metrics-table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAppData } from "@/context/data-context";
import { parseServerMetricsSheet } from "@/lib/parsers/server-metrics-parser";
import { uploadPersistedFile } from "@/lib/storage-sync";
import { cn } from "@/lib/utils";

export function ServerMetricsPageContent() {
  const {
    serverMetrics,
    setServerMetrics,
    clearServerMetrics,
    applyPersistedState,
    manifest,
  } = useAppData();

  const [metricsFile, setMetricsFile] = useState<string | null>(
    manifest.serverMetricsFile,
  );
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hideSystemEntries, setHideSystemEntries] = useState(true);

  useEffect(() => {
    setMetricsFile(
      manifest.serverMetricsFile ?? serverMetrics?.fileName ?? null,
    );
  }, [manifest.serverMetricsFile, serverMetrics?.fileName]);

  return (
    <AppShell
      title="Server Metrics"
      description="Upload a Toast server performance export to compare sales efficiency and reward top performers with more shifts."
    >
      <div className="space-y-6">
        <StatusMessage message={success} onDismiss={() => setSuccess(null)} />
        <ErrorMessage message={error} onDismiss={() => setError(null)} />

        <div className="mx-auto max-w-3xl">
          <FileDropzone
            label="Server metrics upload"
            description="CSV export with Employee Name, Net Sales, Gross Sales, Total Guests, Net Sales per Guest, Avg Check Size, Avg Turn Time, Total Labor Hours, Net Sales per Labor Hour, and Voids + Discounts."
            parse={parseServerMetricsSheet}
            lastUploaded={metricsFile}
            onSuccess={(fileName, data, file) => {
              const next = { ...data, fileName };
              setServerMetrics(next);
              setMetricsFile(fileName);
              setSuccess(
                `Loaded ${next.rows.length} server rows from ${fileName}. Sorted by net sales per labor hour — top performers are highlighted.`,
              );
              setError(null);
              void uploadPersistedFile("server-metrics", file).then(
                (persisted) => {
                  if (persisted) applyPersistedState(persisted);
                },
              );
            }}
            onError={(message) => {
              setError(message);
              setSuccess(null);
            }}
          />
        </div>

        {serverMetrics ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Current report
                </p>
                <p className="text-xs text-zinc-500">
                  {serverMetrics.rows.length} servers · Imported{" "}
                  {new Date(serverMetrics.importedAt).toLocaleString()} · File:{" "}
                  {serverMetrics.fileName || metricsFile || "Unknown"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={hideSystemEntries}
                    onChange={(event) =>
                      setHideSystemEntries(event.target.checked)
                    }
                    className={cn(
                      "size-4 rounded border-zinc-300 text-emerald-600",
                      "focus:ring-emerald-500 dark:border-zinc-700",
                    )}
                  />
                  Hide Ghost / Default entries
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    clearServerMetrics();
                    setMetricsFile(null);
                    setSuccess("Server metrics cleared.");
                    setError(null);
                  }}
                >
                  Clear metrics
                </Button>
              </div>
            </div>

            <p className="text-sm text-zinc-500">
              Top five servers by net sales per labor hour (with meaningful
              sales) are highlighted in green. Click any column header to sort.
              Use this view alongside availability when deciding who gets the
              most shifts each week.
            </p>

            <ServerMetricsTable
              data={serverMetrics}
              hideSystemEntries={hideSystemEntries}
            />
          </>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-100/50 dark:border-zinc-800 dark:bg-zinc-950/50">
            <div className="space-y-1 text-center">
              <Label className="text-sm text-zinc-700 dark:text-zinc-300">
                No server metrics loaded
              </Label>
              <p className="text-xs text-zinc-500">
                Upload a CSV export to review server performance.
              </p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
