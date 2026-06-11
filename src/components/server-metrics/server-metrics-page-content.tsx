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
import { useAppData } from "@/context/data-context";
import { parseServerMetricsSheet } from "@/lib/parsers/server-metrics-parser";
import { completeFileUpload } from "@/lib/storage-sync";
import { cn } from "@/lib/utils";

export function ServerMetricsPageContent() {
  const {
    serverMetrics,
    clearServerMetrics,
    applyPersistedState,
    manifest,
    availability,
    schedule,
    priorSchedule,
    selectedWeekStart,
    shiftHours,
  } = useAppData();

  const currentState = {
    availability,
    schedule,
    priorSchedule,
    serverMetrics,
    selectedWeekStart,
    shiftHours,
  };

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
      compact
      title="Server Metrics"
      description="Upload a Toast server performance export to compare sales efficiency."
    >
      <div className="space-y-1.5">
        <StatusMessage message={success} onDismiss={() => setSuccess(null)} />
        <ErrorMessage message={error} onDismiss={() => setError(null)} />

        {serverMetrics ? (
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="min-w-0 truncate text-xs text-black dark:text-zinc-100">
              <span className="font-medium">{serverMetrics.rows.length} servers</span>
              {" · "}
              {new Date(serverMetrics.importedAt).toLocaleString()}
              {" · "}
              {serverMetrics.fileName || metricsFile || "Unknown"}
            </p>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-black dark:text-zinc-100">
                <input
                  type="checkbox"
                  checked={hideSystemEntries}
                  onChange={(event) =>
                    setHideSystemEntries(event.target.checked)
                  }
                  className={cn(
                    "size-3.5 rounded border-zinc-300 text-emerald-600",
                    "focus:ring-emerald-500 dark:border-zinc-700",
                  )}
                />
                Hide Ghost / Default
              </label>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  clearServerMetrics();
                  setMetricsFile(null);
                  setSuccess("Server metrics cleared.");
                  setError(null);
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        ) : null}

        <FileDropzone
          compact
          label=""
          description=""
          parse={parseServerMetricsSheet}
          lastUploaded={metricsFile}
          onSuccess={(fileName, data, file) => {
            const next = { ...data, fileName };
            void completeFileUpload({
              kind: "server-metrics",
              file,
              fileName,
              statePatch: { serverMetrics: next },
              current: currentState,
              manifest,
              applyPersistedState,
            }).then(() => {
              setMetricsFile(fileName);
              setSuccess(
                `Loaded ${next.rows.length} server rows from ${fileName}. Sorted by net sales per labor hour.`,
              );
              setError(null);
            });
          }}
          onError={(message) => {
            setError(message);
            setSuccess(null);
          }}
        />

        {serverMetrics ? (
          <ServerMetricsTable
            data={serverMetrics}
            hideSystemEntries={hideSystemEntries}
          />
        ) : null}
      </div>
    </AppShell>
  );
}
