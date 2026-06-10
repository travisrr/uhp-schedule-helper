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

  async function handleSavePdf() {
    setIsSavingPdf(true);
    try {
      await saveScheduleAsPdf(buildScheduleExportFilename(weekStartDate));
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
    </div>
  );
}
