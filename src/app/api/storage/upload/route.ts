import { NextResponse } from "next/server";
import { readArrayBufferAsNamedSheets } from "@/lib/file-ingest";
import { parseAvailabilityWorkbook } from "@/lib/parsers/availability-parser";
import { parseScheduleSheet } from "@/lib/parsers/schedule-parser";
import {
  persistAvailabilityUpload,
  persistPriorScheduleUpload,
  persistScheduleUpload,
  persistServerMetricsUpload,
} from "@/lib/server/app-storage";
import { parseServerMetricsSheet } from "@/lib/parsers/server-metrics-parser";
import type { PriorSchedule } from "@/lib/types";

type UploadKind = "availability" | "schedule" | "prior-schedule" | "server-metrics";

function getUploadKind(value: FormDataEntryValue | null): UploadKind | null {
  if (
    value === "availability" ||
    value === "schedule" ||
    value === "prior-schedule" ||
    value === "server-metrics"
  ) {
    return value;
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const kind = getUploadKind(formData.get("kind"));
    const file = formData.get("file");

    if (!kind) {
      return NextResponse.json({ error: "Missing or invalid upload kind." }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing upload file." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (kind === "availability") {
      const sheets = readArrayBufferAsNamedSheets(buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ));
      const data = parseAvailabilityWorkbook(sheets);
      const state = await persistAvailabilityUpload(file.name, buffer, data);
      return NextResponse.json(state);
    }

    const rows = readArrayBufferAsNamedSheets(buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ))[0]?.rows ?? [];

    if (kind === "server-metrics") {
      const data = parseServerMetricsSheet(rows);
      const state = await persistServerMetricsUpload(file.name, buffer, {
        ...data,
        fileName: file.name,
      });
      return NextResponse.json(state);
    }

    const schedule = parseScheduleSheet(rows);

    if (kind === "schedule") {
      const state = await persistScheduleUpload(file.name, buffer, schedule);
      return NextResponse.json(state);
    }

    const priorSchedule: PriorSchedule = {
      schedule,
      fileName: file.name,
      importedAt: new Date().toISOString(),
    };
    const state = await persistPriorScheduleUpload(file.name, buffer, priorSchedule);
    return NextResponse.json(state);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process upload.",
      },
      { status: 400 },
    );
  }
}
