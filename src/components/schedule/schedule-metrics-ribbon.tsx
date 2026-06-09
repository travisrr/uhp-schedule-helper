"use client";

import type { ComponentType } from "react";
import { DollarSign, Clock, TrendingUp, Percent } from "lucide-react";
import { useAppData } from "@/context/data-context";
import { cn } from "@/lib/utils";

function MetricCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  accent?: "emerald" | "blue";
}) {
  return (
    <div className="flex min-w-[180px] flex-1 items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900",
          accent === "emerald" && "text-emerald-400",
          accent === "blue" && "text-blue-400",
          !accent && "text-zinc-400",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
          {label}
        </p>
        <p className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
          {value}
        </p>
      </div>
    </div>
  );
}

function formatCurrency(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatHours(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(1)} hrs`;
}

function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(1)}%`;
}

export function ScheduleMetricsRibbon() {
  const { schedule } = useAppData();
  const metrics = schedule?.metrics;

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Total Hours"
        value={formatHours(metrics?.totalHours ?? null)}
        icon={Clock}
        accent="emerald"
      />
      <MetricCard
        label="Total Pay"
        value={formatCurrency(metrics?.totalPay ?? null)}
        icon={DollarSign}
        accent="blue"
      />
      <MetricCard
        label="Forecasted Sales"
        value={formatCurrency(metrics?.forecastedSales ?? null)}
        icon={TrendingUp}
      />
      <MetricCard
        label="Actual Labor Cost %"
        value={formatPercent(metrics?.actualLaborCostPercent ?? null)}
        icon={Percent}
      />
    </div>
  );
}
