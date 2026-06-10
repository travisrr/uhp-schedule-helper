import type { AppDataState, PersistedAppState } from "@/lib/types";

export async function fetchPersistedState(): Promise<PersistedAppState | null> {
  try {
    const response = await fetch("/api/storage", { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as PersistedAppState;
  } catch {
    return null;
  }
}

export async function savePersistedStatePatch(
  patch: Partial<AppDataState>,
): Promise<void> {
  try {
    await fetch("/api/storage", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  } catch {
    // Repo storage is best-effort; localStorage remains the offline fallback.
  }
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

export function toAppDataState(state: PersistedAppState): AppDataState {
  return {
    availability: state.availability,
    schedule: state.schedule,
    priorSchedule: state.priorSchedule,
    serverMetrics: state.serverMetrics,
    selectedWeekStart: state.selectedWeekStart,
    shiftHours: state.shiftHours,
  };
}
