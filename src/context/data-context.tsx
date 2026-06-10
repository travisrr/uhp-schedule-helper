"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AppDataState,
  AvailabilityData,
  PriorSchedule,
  ScheduleData,
} from "@/lib/types";
import { normalizeScheduleAssignments } from "@/lib/schedule-management-roles";
import {
  createDefaultShiftHours,
  normalizeShiftHours,
  type ShiftHoursSettings,
} from "@/lib/shift-hours";
import { getDefaultWeekStart, toISODateString } from "@/lib/week-utils";

const STORAGE_KEY = "uhp-schedule-helper-data";

interface AppDataContextValue extends AppDataState {
  setAvailability: (data: AvailabilityData | null) => void;
  setSchedule: (data: ScheduleData | null) => void;
  setPriorSchedule: (data: PriorSchedule | null) => void;
  setSelectedWeekStart: (weekStart: string | null) => void;
  setShiftHours: (shiftHours: ShiftHoursSettings) => void;
  removeAvailabilityEmployee: (index: number) => void;
  clearAvailability: () => void;
  clearSchedule: () => void;
  clearPriorSchedule: () => void;
  clearAll: () => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

function createEmptyState(): AppDataState {
  return {
    availability: null,
    schedule: null,
    priorSchedule: null,
    selectedWeekStart: toISODateString(getDefaultWeekStart()),
    shiftHours: createDefaultShiftHours(),
  };
}

function loadStoredState(): AppDataState {
  if (typeof window === "undefined") {
    return createEmptyState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyState();
    const parsed = JSON.parse(raw) as Partial<AppDataState>;
    const schedule = parsed.schedule
      ? normalizeScheduleAssignments(parsed.schedule)
      : null;

    return {
      availability: parsed.availability ?? null,
      schedule,
      priorSchedule: parsed.priorSchedule ?? null,
      selectedWeekStart:
        parsed.selectedWeekStart ?? toISODateString(getDefaultWeekStart()),
      shiftHours: normalizeShiftHours(parsed.shiftHours),
    };
  } catch {
    return createEmptyState();
  }
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppDataState>(createEmptyState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadStoredState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const setAvailability = useCallback((availability: AvailabilityData | null) => {
    setState((prev) => ({ ...prev, availability }));
  }, []);

  const setSchedule = useCallback((schedule: ScheduleData | null) => {
    setState((prev) => ({
      ...prev,
      schedule: schedule ? normalizeScheduleAssignments(schedule) : null,
    }));
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

  const removeAvailabilityEmployee = useCallback((index: number) => {
    setState((prev) => {
      if (!prev.availability) return prev;
      const employees = prev.availability.employees.filter((_, i) => i !== index);
      return {
        ...prev,
        availability: employees.length > 0 ? { employees } : null,
      };
    });
  }, []);

  const clearAvailability = useCallback(() => {
    setState((prev) => ({ ...prev, availability: null }));
  }, []);

  const clearSchedule = useCallback(() => {
    setState((prev) => ({ ...prev, schedule: null }));
  }, []);

  const clearPriorSchedule = useCallback(() => {
    setState((prev) => ({ ...prev, priorSchedule: null }));
  }, []);

  const clearAll = useCallback(() => {
    setState((prev) => ({
      ...createEmptyState(),
      shiftHours: prev.shiftHours,
    }));
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      setAvailability,
      setSchedule,
      setPriorSchedule,
      setSelectedWeekStart,
      setShiftHours,
      removeAvailabilityEmployee,
      clearAvailability,
      clearSchedule,
      clearPriorSchedule,
      clearAll,
    }),
    [
      state,
      setAvailability,
      setSchedule,
      setPriorSchedule,
      setSelectedWeekStart,
      setShiftHours,
      removeAvailabilityEmployee,
      clearAvailability,
      clearSchedule,
      clearPriorSchedule,
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
