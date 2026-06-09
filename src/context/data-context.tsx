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
import type { AppDataState, AvailabilityData, ScheduleData } from "@/lib/types";
import { getDefaultWeekStart, toISODateString } from "@/lib/week-utils";

const STORAGE_KEY = "uhp-schedule-helper-data";

interface AppDataContextValue extends AppDataState {
  setAvailability: (data: AvailabilityData | null) => void;
  setSchedule: (data: ScheduleData | null) => void;
  setSelectedWeekStart: (weekStart: string | null) => void;
  removeAvailabilityEmployee: (index: number) => void;
  clearAvailability: () => void;
  clearSchedule: () => void;
  clearAll: () => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

function createEmptyState(): AppDataState {
  return {
    availability: null,
    schedule: null,
    selectedWeekStart: toISODateString(getDefaultWeekStart()),
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
    return {
      availability: parsed.availability ?? null,
      schedule: parsed.schedule ?? null,
      selectedWeekStart:
        parsed.selectedWeekStart ?? toISODateString(getDefaultWeekStart()),
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
    setState((prev) => ({ ...prev, schedule }));
  }, []);

  const setSelectedWeekStart = useCallback((selectedWeekStart: string | null) => {
    setState((prev) => ({ ...prev, selectedWeekStart }));
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

  const clearAll = useCallback(() => {
    setState(createEmptyState());
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      setAvailability,
      setSchedule,
      setSelectedWeekStart,
      removeAvailabilityEmployee,
      clearAvailability,
      clearSchedule,
      clearAll,
    }),
    [
      state,
      setAvailability,
      setSchedule,
      setSelectedWeekStart,
      removeAvailabilityEmployee,
      clearAvailability,
      clearSchedule,
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
