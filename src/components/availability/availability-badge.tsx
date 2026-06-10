import {
  formatAvailabilityLabel,
  isAmOnlyStatus,
  isPmOnlyStatus,
  normalizeAvailabilityStatus,
} from "@/lib/availability-utils";
import type { AvailabilityStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export { formatAvailabilityLabel };

function normalizeStatus(status: AvailabilityStatus) {
  const canonical = normalizeAvailabilityStatus(status);
  if (canonical === "OFF") return "off" as const;
  if (canonical === "OPEN") return "open" as const;
  if (isAmOnlyStatus(canonical)) return "am" as const;
  if (isPmOnlyStatus(canonical)) return "pm" as const;
  return "neutral" as const;
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
