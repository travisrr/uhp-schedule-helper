"use client";

import { cn } from "@/lib/utils";

interface SlimToggleProps {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  title?: string;
  disabled?: boolean;
}

export function SlimToggle({
  label,
  checked,
  onCheckedChange,
  title,
  disabled = false,
}: SlimToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        disabled
          ? "text-zinc-400 dark:text-zinc-600"
          : "text-zinc-700 dark:text-zinc-300",
      )}
      title={title}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex h-3.5 w-7 shrink-0 items-center rounded-full border border-black/15 transition-colors",
          checked ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block size-2 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-3.5" : "translate-x-0.5",
          )}
        />
      </button>
      <span aria-hidden="true">{label}</span>
    </div>
  );
}
