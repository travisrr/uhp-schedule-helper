"use client";

import type { DayLockToggleState } from "@/lib/day-lock-toggle-state";
import { cn } from "@/lib/utils";

export type { DayLockToggleState };

const TRACK_CLASS: Record<DayLockToggleState, string> = {
  unlocked: "bg-yellow-400",
  locked: "bg-emerald-500",
  "upload-protected": "bg-sky-500 ring-1 ring-sky-700/35",
};

const TITLE: Record<DayLockToggleState, string> = {
  unlocked: "Set and lock — freeze this day against bulk updates",
  locked: "Locked — this day will not change when you regenerate or apply bulk updates",
  "upload-protected":
    "Locked — kept your values when the latest availability upload tried to change this day",
};

const ARIA_LABEL: Record<DayLockToggleState, string> = {
  unlocked: "Set and lock this day",
  locked: "Day locked — click to unlock",
  "upload-protected": "Day locked and protected from upload — click to unlock",
};

interface DayLockToggleProps {
  state: DayLockToggleState;
  onToggle: () => void;
  title?: string;
  ariaLabel?: string;
}

export function DayLockToggle({
  state,
  onToggle,
  title,
  ariaLabel,
}: DayLockToggleProps) {
  const locked = state !== "unlocked";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={locked}
      aria-label={ariaLabel ?? ARIA_LABEL[state]}
      title={title ?? TITLE[state]}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className={cn(
        "relative inline-flex h-3.5 w-7 shrink-0 items-center rounded-full border border-black/15 transition-colors",
        TRACK_CLASS[state],
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block size-2 rounded-full bg-white shadow-sm transition-transform",
          locked ? "translate-x-3.5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
