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

const STORAGE_KEY = "uhp-schedule-helper-data";

interface AppDataContextValue extends AppDataState {
  setAvailability: (data: AvailabilityData | null) => void;
  setSchedule: (data: ScheduleData | null) => void;
  clearAvailability: () => void;
  clearSchedule: () => void;
  clearAll: () => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

function loadStoredState(): AppDataState {
  if (typeof window === "undefined") {
    return { availability: null, schedule: null };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { availability: null, schedule: null };
    return JSON.parse(raw) as AppDataState;
  } catch {
    return { availability: null, schedule: null };
  }
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppDataState>({
    availability: null,
    schedule: null,
  });
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

  const clearAvailability = useCallback(() => {
    setState((prev) => ({ ...prev, availability: null }));
  }, []);

  const clearSchedule = useCallback(() => {
    setState((prev) => ({ ...prev, schedule: null }));
  }, []);

  const clearAll = useCallback(() => {
    setState({ availability: null, schedule: null });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      setAvailability,
      setSchedule,
      clearAvailability,
      clearSchedule,
      clearAll,
    }),
    [
      state,
      setAvailability,
      setSchedule,
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
