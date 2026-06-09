import type { AvailabilityStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

function normalizeStatus(status: AvailabilityStatus) {
  const trimmed = status.trim();
  const upper = trimmed.toUpperCase();
  if (!trimmed || upper === "OFF") return "off" as const;
  if (upper === "OPEN") return "open" as const;
  if (/only\s*am/i.test(trimmed)) return "am" as const;
  if (/only\s*pm/i.test(trimmed)) return "pm" as const;
  return "neutral" as const;
}

export function formatAvailabilityLabel(status: AvailabilityStatus): string {
  const trimmed = status.trim();
  if (!trimmed) return "OFF";
  if (/only\s*am/i.test(trimmed)) return "Only AM";
  if (/only\s*pm/i.test(trimmed)) return "Only PM";
  if (trimmed.toUpperCase() === "OPEN") return "OPEN";
  if (trimmed.toUpperCase() === "OFF") return "OFF";
  return trimmed;
}

export function getAvailabilityCellClass(status: AvailabilityStatus): string {
  const variant = normalizeStatus(status);
  if (variant === "open") return "bg-[#c6efce] dark:bg-emerald-950/50";
  if (variant === "off") return "bg-[#bfbfbf] dark:bg-zinc-700";
  if (variant === "am" || variant === "pm") return "bg-[#f2f2f2] dark:bg-zinc-800";
  return "bg-white dark:bg-zinc-950";
}

interface AvailabilityBadgeProps {
  status: AvailabilityStatus;
  className?: string;
}

export function AvailabilityBadge({ status, className }: AvailabilityBadgeProps) {
  return (
    <span
      className={cn(
        "block text-sm font-normal text-black dark:text-zinc-100",
        getAvailabilityCellClass(status),
        className,
      )}
    >
      {formatAvailabilityLabel(status)}
    </span>
  );
}
