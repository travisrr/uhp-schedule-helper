"use client";

import { useState } from "react";
import { FileDown, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildScheduleExportFilename,
  printSchedule,
  saveScheduleAsPdf,
} from "@/lib/schedule-export";

interface ScheduleExportActionsProps {
  weekStartDate?: string | null;
}

export function ScheduleExportActions({
  weekStartDate,
}: ScheduleExportActionsProps) {
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  async function handleSavePdf() {
    setIsSavingPdf(true);
    setPdfError(null);
    try {
      await saveScheduleAsPdf(buildScheduleExportFilename(weekStartDate));
    } catch (error) {
      setPdfError(
        error instanceof Error
          ? error.message
          : "Could not save the shift report as a PDF.",
      );
    } finally {
      setIsSavingPdf(false);
    }
  }

  return (
    <div className="no-print flex flex-wrap items-center justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={printSchedule}
      >
        <Printer className="size-4" />
        Print
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleSavePdf}
        disabled={isSavingPdf}
      >
        <FileDown className="size-4" />
        {isSavingPdf ? "Saving…" : "Save as PDF"}
      </Button>
      {pdfError ? (
        <p className="w-full text-right text-xs text-red-600" role="alert">
          {pdfError}
        </p>
      ) : null}
    </div>
  );
}
