import { normalizeScheduleAssignments } from "@/lib/schedule-management-roles";
import {
  createDefaultShiftHours,
  normalizeShiftHours,
} from "@/lib/shift-hours";
import type {
  AppDataState,
  PersistedAppState,
  StoredManifest,
} from "@/lib/types";
import { getDefaultWeekStart, toISODateString } from "@/lib/week-utils";

export const LOCAL_STORAGE_KEY = "uhp-schedule-helper-data";

export interface LocalStorageEnvelope {
  version: 1;
  updatedAt: string;
  manifest: StoredManifest;
  state: AppDataState;
}

function createEmptyManifest(): StoredManifest {
  return {
    availabilityFile: null,
    scheduleFile: null,
    priorScheduleFile: null,
    serverMetricsFile: null,
    updatedAt: null,
  };
}

function createEmptyState(): AppDataState {
  return {
    availability: null,
    schedule: null,
    priorSchedule: null,
    serverMetrics: null,
    selectedWeekStart: toISODateString(getDefaultWeekStart()),
    shiftHours: createDefaultShiftHours(),
  };
}

function normalizeAppDataState(parsed: Partial<AppDataState>): AppDataState {
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
  };
}

function parseTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function pickByRecency<T>(
  serverValue: T,
  localValue: T,
  serverTime: number,
  localTime: number,
): T {
  if (localTime >= serverTime) return localValue;
  return serverValue;
}

function pickNullableField<T>(
  serverValue: T | null,
  localValue: T | null,
  serverTime: number,
  localTime: number,
): T | null {
  if (serverValue && !localValue) return serverValue;
  if (localValue && !serverValue) return localValue;
  if (!serverValue && !localValue) return null;
  return pickByRecency(serverValue, localValue, serverTime, localTime);
}

function mergeManifest(
  serverManifest: StoredManifest,
  localManifest: StoredManifest,
  serverTime: number,
  localTime: number,
): StoredManifest {
  const preferred =
    localTime >= serverTime ? localManifest : serverManifest;
  const fallback =
    localTime >= serverTime ? serverManifest : localManifest;

  return {
    availabilityFile:
      preferred.availabilityFile ?? fallback.availabilityFile,
    scheduleFile: preferred.scheduleFile ?? fallback.scheduleFile,
    priorScheduleFile:
      preferred.priorScheduleFile ?? fallback.priorScheduleFile,
    serverMetricsFile:
      preferred.serverMetricsFile ?? fallback.serverMetricsFile,
    updatedAt:
      preferred.updatedAt ??
      fallback.updatedAt ??
      new Date(Math.max(serverTime, localTime)).toISOString(),
  };
}

export async function fetchPersistedState(): Promise<PersistedAppState | null> {
  try {
    const response = await fetch("/api/storage", { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as PersistedAppState;
  } catch {
    return null;
  }
}

export type PersistedStateSave = Partial<AppDataState> & {
  manifest?: Partial<StoredManifest>;
};

export type UploadKind =
  | "availability"
  | "schedule"
  | "prior-schedule"
  | "server-metrics";

const UPLOAD_MANIFEST_FIELD: Record<
  UploadKind,
  keyof Pick<
    StoredManifest,
    | "availabilityFile"
    | "scheduleFile"
    | "priorScheduleFile"
    | "serverMetricsFile"
  >
> = {
  availability: "availabilityFile",
  schedule: "scheduleFile",
  "prior-schedule": "priorScheduleFile",
  "server-metrics": "serverMetricsFile",
};

export function buildPersistedSnapshot(
  current: AppDataState,
  manifest: StoredManifest,
  statePatch: Partial<AppDataState>,
  manifestPatch?: Partial<StoredManifest>,
): PersistedAppState {
  return {
    ...current,
    ...statePatch,
    manifest: {
      ...manifest,
      ...manifestPatch,
      updatedAt: new Date().toISOString(),
    },
  };
}

export async function savePersistedStatePatch(
  patch: PersistedStateSave,
): Promise<void> {
  try {
    await fetch("/api/storage", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
      keepalive: true,
    });
  } catch {
    // Repo storage is best-effort; localStorage remains the offline fallback.
  }
}

export async function completeFileUpload(options: {
  kind: UploadKind;
  file: File;
  fileName: string;
  statePatch: Partial<AppDataState>;
  current: AppDataState;
  manifest: StoredManifest;
  applyPersistedState: (state: PersistedAppState) => void;
}): Promise<void> {
  const manifestField = UPLOAD_MANIFEST_FIELD[options.kind];
  const optimistic = buildPersistedSnapshot(
    options.current,
    options.manifest,
    options.statePatch,
    { [manifestField]: options.fileName },
  );

  options.applyPersistedState(optimistic);

  const persisted = await uploadPersistedFile(options.kind, options.file);
  if (persisted) {
    options.applyPersistedState(persisted);
    return;
  }

  await savePersistedStatePatch({
    ...options.statePatch,
    manifest: { [manifestField]: options.fileName },
  });
}

export async function clearPersistedState(): Promise<void> {
  try {
    await fetch("/api/storage", { method: "DELETE" });
  } catch {
    // Ignore network failures during clear.
  }
}

export async function uploadPersistedFile(
  kind: "availability" | "schedule" | "prior-schedule" | "server-metrics",
  file: File,
): Promise<PersistedAppState | null> {
  try {
    const formData = new FormData();
    formData.set("kind", kind);
    formData.set("file", file);

    const response = await fetch("/api/storage/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) return null;
    return (await response.json()) as PersistedAppState;
  } catch {
    return null;
  }
}

export function hasPersistedData(state: PersistedAppState): boolean {
  return Boolean(
    state.availability ||
      state.schedule ||
      state.priorSchedule ||
      state.serverMetrics ||
      state.manifest.availabilityFile ||
      state.manifest.scheduleFile ||
      state.manifest.priorScheduleFile ||
      state.manifest.serverMetricsFile,
  );
}

export function hasLocalData(envelope: LocalStorageEnvelope): boolean {
  return Boolean(
    envelope.state.availability ||
      envelope.state.schedule ||
      envelope.state.priorSchedule ||
      envelope.state.serverMetrics ||
      envelope.manifest.availabilityFile ||
      envelope.manifest.scheduleFile ||
      envelope.manifest.priorScheduleFile ||
      envelope.manifest.serverMetricsFile,
  );
}

export function toAppDataState(state: PersistedAppState): AppDataState {
  return normalizeAppDataState(state);
}

export function loadLocalSnapshot(): LocalStorageEnvelope | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<LocalStorageEnvelope> &
      Partial<AppDataState>;

    if (parsed.version === 1 && parsed.state && parsed.updatedAt) {
      return {
        version: 1,
        updatedAt: parsed.updatedAt,
        manifest: {
          ...createEmptyManifest(),
          ...parsed.manifest,
        },
        state: normalizeAppDataState(parsed.state),
      };
    }

    // Legacy format: raw AppDataState without envelope metadata.
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      manifest: createEmptyManifest(),
      state: normalizeAppDataState(parsed),
    };
  } catch {
    return null;
  }
}

export function saveLocalSnapshot(
  state: AppDataState,
  manifest: StoredManifest,
): void {
  if (typeof window === "undefined") return;

  const envelope: LocalStorageEnvelope = {
    version: 1,
    updatedAt: new Date().toISOString(),
    manifest: {
      ...manifest,
      updatedAt: new Date().toISOString(),
    },
    state,
  };

  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(envelope));
}

export function mergeHydratedState(
  server: PersistedAppState | null,
  local: LocalStorageEnvelope | null,
): PersistedAppState {
  const empty: PersistedAppState = {
    ...createEmptyState(),
    manifest: createEmptyManifest(),
  };

  const serverHasData = server ? hasPersistedData(server) : false;
  const localHasData = local ? hasLocalData(local) : false;

  if (!serverHasData && !localHasData) return empty;
  if (!serverHasData && local) {
    return {
      ...local.state,
      manifest: local.manifest,
    };
  }
  if (serverHasData && server && !localHasData) return server;
  if (!server || !local) return empty;

  const serverTime = parseTimestamp(server.manifest.updatedAt);
  const localTime = parseTimestamp(local.updatedAt);

  return {
    availability: pickNullableField(
      server.availability,
      local.state.availability,
      serverTime,
      localTime,
    ),
    schedule: pickNullableField(
      server.schedule,
      local.state.schedule,
      serverTime,
      localTime,
    ),
    priorSchedule: pickNullableField(
      server.priorSchedule,
      local.state.priorSchedule,
      serverTime,
      localTime,
    ),
    serverMetrics: pickNullableField(
      server.serverMetrics,
      local.state.serverMetrics,
      serverTime,
      localTime,
    ),
    selectedWeekStart: pickByRecency(
      server.selectedWeekStart,
      local.state.selectedWeekStart,
      serverTime,
      localTime,
    ),
    shiftHours: pickByRecency(
      server.shiftHours,
      local.state.shiftHours,
      serverTime,
      localTime,
    ),
    manifest: mergeManifest(server.manifest, local.manifest, serverTime, localTime),
  };
}
