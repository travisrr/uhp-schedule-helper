"use client";

import {
  useCallback,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { FileSpreadsheet, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { readFileAsRawRows } from "@/lib/file-ingest";

interface FileDropzoneProps<T> {
  label: string;
  description: string;
  onSuccess: (fileName: string, data: T, file: File) => void;
  onError: (message: string) => void;
  parse?: (rows: string[][]) => T;
  readAndParse?: (file: File) => Promise<T>;
  lastUploaded?: string | null;
  compact?: boolean;
}

export function FileDropzone<T>({
  label,
  description,
  onSuccess,
  onError,
  parse,
  readAndParse,
  lastUploaded,
  compact = false,
}: FileDropzoneProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      try {
        const data = readAndParse
          ? await readAndParse(file)
          : parse!(await readFileAsRawRows(file));
        onSuccess(file.name, data, file);
      } catch (error) {
        onError(
          error instanceof Error ? error.message : "Unable to process file.",
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [onError, onSuccess, parse, readAndParse],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      void processFile(file);
    },
    [processFile],
  );

  const dropzoneHandlers = {
    role: "button" as const,
    tabIndex: 0,
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        inputRef.current?.click();
      }
    },
    onClick: () => inputRef.current?.click(),
    onDragEnter: (event: DragEvent) => {
      event.preventDefault();
      setIsDragging(true);
    },
    onDragOver: (event: DragEvent) => {
      event.preventDefault();
      setIsDragging(true);
    },
    onDragLeave: (event: DragEvent) => {
      event.preventDefault();
      setIsDragging(false);
    },
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      setIsDragging(false);
      handleFiles(event.dataTransfer.files);
    },
  };

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      className="hidden"
      onChange={(event) => {
        handleFiles(event.target.files);
        event.target.value = "";
      }}
    />
  );

  const dragClasses = cn(
    "transition-colors",
    isDragging
      ? "border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/20"
      : "border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/40",
  );

  if (compact) {
    return (
      <div className="space-y-1">
        {label ? (
          <div>
            <Label>{label}</Label>
            {description ? (
              <p className="mt-0.5 text-xs leading-snug text-black dark:text-zinc-200">
                {description}
              </p>
            ) : null}
          </div>
        ) : null}

        <div
          {...dropzoneHandlers}
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-2.5 py-1.5",
            dragClasses,
          )}
        >
          {isProcessing ? (
            <Upload className="h-3.5 w-3.5 shrink-0 animate-pulse text-black dark:text-zinc-200" />
          ) : (
            <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-black dark:text-zinc-200" />
          )}
          <p className="min-w-0 flex-1 truncate text-xs font-medium text-black dark:text-zinc-100">
            {isProcessing
              ? "Processing file..."
              : lastUploaded
                ? `Loaded: ${lastUploaded}`
                : "Drop CSV or Excel · .csv, .xlsx, .xls"}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 shrink-0 px-2 text-xs"
            disabled={isProcessing}
            onClick={(event) => {
              event.stopPropagation();
              inputRef.current?.click();
            }}
          >
            Browse
          </Button>
          {fileInput}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <Label>{label}</Label>
        <p className="mt-1 text-xs leading-relaxed text-black dark:text-zinc-200">
          {description}
        </p>
      </div>

      <div
        {...dropzoneHandlers}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10",
          dragClasses,
        )}
      >
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 bg-zinc-100 text-black dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          {isProcessing ? (
            <Upload className="h-4 w-4 animate-pulse" />
          ) : (
            <FileSpreadsheet className="h-4 w-4" />
          )}
        </div>
        <p className="text-sm font-medium text-black dark:text-zinc-100">
          {isProcessing ? "Processing file..." : "Drop CSV or Excel file here"}
        </p>
        <p className="mt-1 text-xs text-black dark:text-zinc-200">
          .csv, .xlsx, .xls supported
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-4"
          disabled={isProcessing}
          onClick={(event) => {
            event.stopPropagation();
            inputRef.current?.click();
          }}
        >
          Browse files
        </Button>
        {fileInput}
      </div>

      {lastUploaded ? (
        <div className="flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-100/80 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
          <p className="truncate text-xs text-black dark:text-zinc-200">
            Loaded: <span className="font-medium">{lastUploaded}</span>
          </p>
          <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
        </div>
      ) : null}
    </div>
  );
}

interface StatusMessageProps {
  message: string | null;
  onDismiss: () => void;
}

export function StatusMessage({ message, onDismiss }: StatusMessageProps) {
  if (!message) return null;

  return (
    <div className="flex items-start justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 dark:border-emerald-900/50 dark:bg-emerald-950/20">
      <p className="text-xs leading-snug text-black dark:text-emerald-200">
        {message}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="text-emerald-500 hover:text-emerald-300"
        aria-label="Dismiss message"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface ErrorMessageProps {
  message: string | null;
  onDismiss: () => void;
}

export function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  if (!message) return null;

  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900/40 dark:bg-red-950/20">
      <p className="text-xs text-red-700 dark:text-red-300">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="text-red-400 hover:text-red-300"
        aria-label="Dismiss error"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
