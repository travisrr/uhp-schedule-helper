"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AvailabilityStatusOption } from "@/lib/availability-utils";
import type {
  AppDataState,
  AvailabilityData,
  EmployeeAvailability,
  PersistedAppState,
  PriorSchedule,
  ScheduleData,
  ServerMetricsData,
  StoredManifest,
} from "@/lib/types";
import { setAvailabilityDayLocked } from "@/lib/availability-day-lock";
import type { DayKey } from "@/lib/utils";
import { normalizeScheduleAssignments } from "@/lib/schedule-management-roles";
import {
  createDefaultShiftHours,
  type ShiftHoursSettings,
} from "@/lib/shift-hours";
import {
  clearPersistedState,
  fetchPersistedState,
  loadLocalSnapshot,
  mergeHydratedState,
  saveLocalSnapshot,
  savePersistedStatePatch,
  toAppDataState,
} from "@/lib/storage-sync";
import { getDefaultWeekStart, toISODateString } from "@/lib/week-utils";

export type ScheduleUpdater =
  | ScheduleData
  | null
  | ((previous: ScheduleData | null) => ScheduleData | null);

interface AppDataContextValue extends AppDataState {
  manifest: StoredManifest;
  hydrated: boolean;
  applyPersistedState: (state: PersistedAppState) => void;
  setAvailability: (data: AvailabilityData | null) => void;
  setSchedule: (data: ScheduleUpdater) => void;
  setPriorSchedule: (data: PriorSchedule | null) => void;
  setSelectedWeekStart: (weekStart: string | null) => void;
  setShiftHours: (shiftHours: ShiftHoursSettings) => void;
  setServerMetrics: (data: ServerMetricsData | null) => void;
  addAvailabilityEmployee: (employee: EmployeeAvailability) => void;
  removeAvailabilityEmployee: (index: number) => void;
  updateAvailabilityStatus: (
    employeeIndex: number,
    day: DayKey,
    status: AvailabilityStatusOption,
  ) => void;
  setAvailabilityDayLocked: (day: DayKey, locked: boolean) => void;
  clearAvailability: () => void;
  clearSchedule: () => void;
  clearPriorSchedule: () => void;
  clearServerMetrics: () => void;
  clearAll: () => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

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

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppDataState>(createEmptyState);
  const [manifest, setManifest] = useState<StoredManifest>(createEmptyManifest);
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    let cancelled = false;

    async function hydrateState() {
      const [server, local] = await Promise.all([
        fetchPersistedState(),
        Promise.resolve(loadLocalSnapshot()),
      ]);
      if (cancelled) return;

      const merged = mergeHydratedState(server, local);
      setState(toAppDataState(merged));
      setManifest(merged.manifest);
      setHydrated(true);
    }

    void hydrateState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveLocalSnapshot(state, manifest);
  }, [state, manifest, hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    const timeoutId = window.setTimeout(() => {
      void savePersistedStatePatch(state);
    }, 100);

    return () => window.clearTimeout(timeoutId);
  }, [state, hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    function flushToServer() {
      void savePersistedStatePatch(stateRef.current);
    }

    window.addEventListener("pagehide", flushToServer);
    return () => window.removeEventListener("pagehide", flushToServer);
  }, [hydrated]);

  const applyPersistedState = useCallback((persisted: PersistedAppState) => {
    const nextState = toAppDataState(persisted);
    setState(nextState);
    setManifest(persisted.manifest);
    saveLocalSnapshot(nextState, persisted.manifest);
  }, []);

  const setAvailability = useCallback((availability: AvailabilityData | null) => {
    setState((prev) => ({ ...prev, availability }));
  }, []);

  const setSchedule = useCallback((schedule: ScheduleUpdater) => {
    setState((prev) => {
      const nextSchedule =
        typeof schedule === "function" ? schedule(prev.schedule) : schedule;

      return {
        ...prev,
        schedule: nextSchedule
          ? normalizeScheduleAssignments(nextSchedule)
          : null,
      };
    });
  }, []);

  const setPriorSchedule = useCallback((priorSchedule: PriorSchedule | null) => {
    setState((prev) => ({ ...prev, priorSchedule }));
  }, []);

  const setSelectedWeekStart = useCallback((selectedWeekStart: string | null) => {
    setState((prev) => ({ ...prev, selectedWeekStart }));
  }, []);

  const setShiftHours = useCallback((shiftHours: ShiftHoursSettings) => {
    setState((prev) => ({ ...prev, shiftHours }));
  }, []);

  const setServerMetrics = useCallback((serverMetrics: ServerMetricsData | null) => {
    setState((prev) => ({ ...prev, serverMetrics }));
  }, []);

  const addAvailabilityEmployee = useCallback((employee: EmployeeAvailability) => {
    setState((prev) => ({
      ...prev,
      availability: prev.availability
        ? {
            ...prev.availability,
            employees: [...prev.availability.employees, employee],
          }
        : { employees: [employee] },
    }));
  }, []);

  const removeAvailabilityEmployee = useCallback((index: number) => {
    setState((prev) => {
      if (!prev.availability) return prev;
      const employees = prev.availability.employees.filter((_, i) => i !== index);
      return {
        ...prev,
        availability:
          employees.length > 0
            ? { ...prev.availability, employees }
            : null,
      };
    });
  }, []);

  const updateAvailabilityStatus = useCallback(
    (employeeIndex: number, day: DayKey, status: AvailabilityStatusOption) => {
      setState((prev) => {
        if (!prev.availability) return prev;
        if (prev.availability.lockedDays?.[day]) return prev;
        const employee = prev.availability.employees[employeeIndex];
        if (!employee) return prev;

        const employees = prev.availability.employees.map((entry, index) =>
          index === employeeIndex
            ? {
                ...entry,
                days: {
                  ...entry.days,
                  [day]: status,
                },
              }
            : entry,
        );

        const uploadProtectedDays = { ...prev.availability.uploadProtectedDays };
        delete uploadProtectedDays[day];

        return {
          ...prev,
          availability: {
            ...prev.availability,
            employees,
            uploadProtectedDays,
          },
        };
      });
    },
    [],
  );

  const setAvailabilityDayLockedState = useCallback(
    (day: DayKey, locked: boolean) => {
      setState((prev) => {
        if (!prev.availability) return prev;
        return {
          ...prev,
          availability: setAvailabilityDayLocked(prev.availability, day, locked),
        };
      });
    },
    [],
  );

  const clearAvailability = useCallback(() => {
    setState((prev) => ({ ...prev, availability: null }));
  }, []);

  const clearSchedule = useCallback(() => {
    setState((prev) => ({ ...prev, schedule: null }));
  }, []);

  const clearPriorSchedule = useCallback(() => {
    setState((prev) => ({ ...prev, priorSchedule: null }));
  }, []);

  const clearServerMetrics = useCallback(() => {
    setState((prev) => ({ ...prev, serverMetrics: null }));
    setManifest((prev) => ({ ...prev, serverMetricsFile: null }));
  }, []);

  const clearAll = useCallback(() => {
    const nextState = createEmptyState();
    const nextManifest = createEmptyManifest();
    setState((prev) => ({
      ...nextState,
      shiftHours: prev.shiftHours,
    }));
    setManifest(nextManifest);
    saveLocalSnapshot(
      { ...nextState, shiftHours: stateRef.current.shiftHours },
      nextManifest,
    );
    void clearPersistedState();
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      manifest,
      hydrated,
      applyPersistedState,
      setAvailability,
      setSchedule,
      setPriorSchedule,
      setSelectedWeekStart,
      setShiftHours,
      setServerMetrics,
      addAvailabilityEmployee,
      removeAvailabilityEmployee,
      updateAvailabilityStatus,
      setAvailabilityDayLocked: setAvailabilityDayLockedState,
      clearAvailability,
      clearSchedule,
      clearPriorSchedule,
      clearServerMetrics,
      clearAll,
    }),
    [
      state,
      manifest,
      hydrated,
      applyPersistedState,
      setAvailability,
      setSchedule,
      setPriorSchedule,
      setSelectedWeekStart,
      setShiftHours,
      setServerMetrics,
      addAvailabilityEmployee,
      removeAvailabilityEmployee,
      updateAvailabilityStatus,
      setAvailabilityDayLockedState,
      clearAvailability,
      clearSchedule,
      clearPriorSchedule,
      clearServerMetrics,
      clearAll,
    ],
  );

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within AppDataProvider");
  }
  return context;
}
