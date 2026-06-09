import type { AvailabilityStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function getVariant(status: AvailabilityStatus) {
  const normalized = status.trim().toUpperCase();
  if (normalized === "OPEN") return "open" as const;
  if (normalized === "ONLY AM" || status === "Only AM") return "am" as const;
  if (normalized === "ONLY PM" || status === "Only PM") return "pm" as const;
  if (normalized === "OFF" || !status.trim()) return "off" as const;
  return "neutral" as const;
}

interface AvailabilityBadgeProps {
  status: AvailabilityStatus;
  className?: string;
}

export function AvailabilityBadge({ status, className }: AvailabilityBadgeProps) {
  const variant = getVariant(status);
  const label = status.trim() || "OFF";

  if (variant === "off") {
    return (
      <span className={cn("text-xs font-medium text-zinc-600", className)}>
        OFF
      </span>
    );
  }

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
