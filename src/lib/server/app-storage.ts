import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { normalizeScheduleAssignments } from "@/lib/schedule-management-roles";
import {
  createDefaultShiftHours,
  normalizeShiftHours,
  type ShiftHoursSettings,
} from "@/lib/shift-hours";
import type {
  AvailabilityData,
  PersistedAppState,
  PriorSchedule,
  ScheduleData,
  ServerMetricsData,
  StoredManifest,
} from "@/lib/types";
import { getDefaultWeekStart, toISODateString } from "@/lib/week-utils";

const DATA_DIR = path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const STATE_FILE = path.join(DATA_DIR, "app-state.json");
const MANIFEST_FILE = path.join(DATA_DIR, "manifest.json");

function createEmptyManifest(): StoredManifest {
  return {
    availabilityFile: null,
    scheduleFile: null,
    priorScheduleFile: null,
    serverMetricsFile: null,
    updatedAt: null,
  };
}

function createEmptyPersistedState(): PersistedAppState {
  return {
    availability: null,
    schedule: null,
    priorSchedule: null,
    serverMetrics: null,
    selectedWeekStart: toISODateString(getDefaultWeekStart()),
    shiftHours: createDefaultShiftHours(),
    manifest: createEmptyManifest(),
  };
}

async function ensureDataDirs(): Promise<void> {
  await mkdir(UPLOADS_DIR, { recursive: true });
}

function normalizePersistedState(
  parsed: Partial<PersistedAppState>,
): PersistedAppState {
  const schedule = parsed.schedule
    ? normalizeScheduleAssignments(parsed.schedule)
    : null;

  return {
    availability: parsed.availability ?? null,
    schedule,
    priorSchedule: parsed.priorSchedule ?? null,
    serverMetrics: parsed.serverMetrics ?? null,
    selectedWeekStart:
      parsed.selectedWeekStart ?? toISODateString(getDefaultWeekStart()),
    shiftHours: normalizeShiftHours(parsed.shiftHours),
    manifest: {
      ...createEmptyManifest(),
      ...parsed.manifest,
    },
  };
}

export async function readPersistedState(): Promise<PersistedAppState> {
  await ensureDataDirs();

  try {
    const raw = await readFile(STATE_FILE, "utf8");
    return normalizePersistedState(JSON.parse(raw) as Partial<PersistedAppState>);
  } catch {
    return createEmptyPersistedState();
  }
}

type PersistedStatePatch = Partial<Omit<PersistedAppState, "manifest">> & {
  manifest?: Partial<StoredManifest>;
};

export async function writePersistedState(
  state: PersistedStatePatch,
): Promise<PersistedAppState> {
  await ensureDataDirs();

  const existing = await readPersistedState();
  const next: PersistedAppState = normalizePersistedState({
    ...existing,
    ...state,
    manifest: {
      ...existing.manifest,
      ...state.manifest,
      updatedAt: new Date().toISOString(),
    },
  });

  await writeFile(STATE_FILE, JSON.stringify(next, null, 2), "utf8");
  await writeFile(MANIFEST_FILE, JSON.stringify(next.manifest, null, 2), "utf8");

  return next;
}

export async function saveUploadedFile(
  fileName: string,
  buffer: Buffer,
): Promise<string> {
  await ensureDataDirs();

  const safeName = path.basename(fileName).replace(/[^\w.\-() ]+/g, "_");
  const targetPath = path.join(UPLOADS_DIR, safeName);
  await writeFile(targetPath, buffer);
  return safeName;
}

export function getUploadsDirectory(): string {
  return UPLOADS_DIR;
}

export async function persistAvailabilityUpload(
  fileName: string,
  buffer: Buffer,
  data: AvailabilityData,
): Promise<PersistedAppState> {
  const savedFileName = await saveUploadedFile(fileName, buffer);

  return writePersistedState({
    availability: data,
    manifest: {
      availabilityFile: savedFileName,
    },
  });
}

export async function persistScheduleUpload(
  fileName: string,
  buffer: Buffer,
  data: ScheduleData,
): Promise<PersistedAppState> {
  const savedFileName = await saveUploadedFile(fileName, buffer);

  return writePersistedState({
    schedule: data,
    manifest: {
      scheduleFile: savedFileName,
    },
  });
}

export async function persistPriorScheduleUpload(
  fileName: string,
  buffer: Buffer,
  priorSchedule: PriorSchedule,
): Promise<PersistedAppState> {
  const savedFileName = await saveUploadedFile(fileName, buffer);

  return writePersistedState({
    priorSchedule,
    manifest: {
      priorScheduleFile: savedFileName,
    },
  });
}

export async function persistServerMetricsUpload(
  fileName: string,
  buffer: Buffer,
  data: ServerMetricsData,
): Promise<PersistedAppState> {
  const savedFileName = await saveUploadedFile(fileName, buffer);

  return writePersistedState({
    serverMetrics: data,
    manifest: {
      serverMetricsFile: savedFileName,
    },
  });
}

export async function persistAppStatePatch(
  patch: PersistedStatePatch,
): Promise<PersistedAppState> {
  const existing = await readPersistedState();
  const { manifest, ...statePatch } = patch;

  return writePersistedState({
    ...existing,
    ...statePatch,
    ...(manifest
      ? { manifest: { ...existing.manifest, ...manifest } }
      : {}),
  });
}

export async function clearPersistedState(): Promise<PersistedAppState> {
  const existing = await readPersistedState();
  return writePersistedState({
    ...createEmptyPersistedState(),
    shiftHours: existing.shiftHours,
  });
}

export type { ShiftHoursSettings };
