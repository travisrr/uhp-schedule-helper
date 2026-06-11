"use client";

import {
  formatAvailabilityLabel,
  getAvailabilityCellClass,
} from "@/components/availability/availability-badge";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/context/data-context";
import {
  AVAILABILITY_STATUS_OPTIONS,
  normalizeAvailabilityStatus,
  type AvailabilityStatusOption,
} from "@/lib/availability-utils";
import { DayLockToggle } from "@/components/ui/day-lock-toggle";
import {
  getAvailabilityDayLockToggleState,
  isAvailabilityDayLocked,
} from "@/lib/availability-day-lock";
import type { EmployeeAvailability } from "@/lib/types";
import { cn, DAYS, type DayKey } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

const cellBorder =
  "border border-[#d4d4d4] dark:border-zinc-700";
const headerClass = `${cellBorder} bg-[#e8e8e8] px-2 py-1.5 text-left text-sm font-bold text-black dark:bg-zinc-800 dark:text-zinc-100`;
const stickyHeaderClass = `${headerClass} sticky top-0 z-20`;
const stickyCornerHeaderClass = `${headerClass} sticky left-0 top-0 z-30 min-w-[12rem] shadow-[2px_2px_4px_-2px_rgba(0,0,0,0.12)] dark:shadow-[2px_2px_4px_-2px_rgba(0,0,0,0.4)]`;
const bodyClass = `${cellBorder} px-2 py-1 text-left text-sm text-black dark:text-zinc-100`;
const stickyRowHeaderClass = `${bodyClass} sticky left-0 z-10 min-w-[12rem] whitespace-nowrap bg-white dark:bg-zinc-950 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.12)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.4)]`;
const matrixScrollClass =
  "max-h-[calc(100dvh-12rem)] overflow-auto [overflow-anchor:none]";
const interactiveCellClass =
  "cursor-context-menu hover:ring-1 hover:ring-inset hover:ring-zinc-400/60 dark:hover:ring-zinc-500/60";

type AvailabilityRow = EmployeeAvailability & { sourceIndex: number };

type ContextMenuTarget = {
  employeeIndex: number;
  day: DayKey;
  currentStatus: AvailabilityStatusOption;
  x: number;
  y: number;
};

function getEmployeeRole(employee: EmployeeAvailability): string {
  return employee.role?.trim() || "";
}

function groupByRole(employees: EmployeeAvailability[]): AvailabilityRow[] {
  const roleOrder: string[] = [];
  const byRole = new Map<string, AvailabilityRow[]>();

  employees.forEach((employee, sourceIndex) => {
    const row: AvailabilityRow = { ...employee, sourceIndex };
    const role = getEmployeeRole(row) || "Staff";
    if (!byRole.has(role)) {
      roleOrder.push(role);
      byRole.set(role, []);
    }
    byRole.get(role)!.push(row);
  });

  return roleOrder.flatMap((role) => byRole.get(role)!);
}

function toStatusOption(status: string): AvailabilityStatusOption {
  const normalized = normalizeAvailabilityStatus(status);
  if (
    AVAILABILITY_STATUS_OPTIONS.includes(
      normalized as AvailabilityStatusOption,
    )
  ) {
    return normalized as AvailabilityStatusOption;
  }
  return "OFF";
}

function DataLoadingPlaceholder() {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-100/50 dark:border-zinc-800 dark:bg-zinc-950/50">
      <p className="text-sm text-zinc-500">Loading saved data…</p>
    </div>
  );
}

export function AvailabilityMatrix() {
  const {
    availability,
    hydrated,
    removeAvailabilityEmployee,
    setAvailabilityDayLocked,
    updateAvailabilityStatus,
  } = useAppData();
  const [menu, setMenu] = useState<ContextMenuTarget | null>(null);

  useEffect(() => {
    if (!menu) return;

    function closeMenu() {
      setMenu(null);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu();
    }

    window.addEventListener("click", closeMenu);
    window.addEventListener("contextmenu", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("contextmenu", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menu]);

  if (!hydrated) {
    return <DataLoadingPlaceholder />;
  }

  if (!availability || availability.employees.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-100/50 dark:border-zinc-800 dark:bg-zinc-950/50">
        <p className="text-sm text-zinc-500">
          Upload an availability sheet in Settings to populate the roster matrix.
        </p>
      </div>
    );
  }

  const rows = groupByRole(availability.employees);
  const hasUploadProtectedDays = DAYS.some(
    (day) => availability.uploadProtectedDays?.[day],
  );

  function openStatusMenu(
    event: React.MouseEvent,
    employeeIndex: number,
    day: DayKey,
    status: string,
  ) {
    event.preventDefault();
    event.stopPropagation();
    setMenu({
      employeeIndex,
      day,
      currentStatus: toStatusOption(status),
      x: event.clientX,
      y: event.clientY,
    });
  }

  function handleStatusSelect(status: AvailabilityStatusOption) {
    if (!menu) return;
    updateAvailabilityStatus(menu.employeeIndex, menu.day, status);
    setMenu(null);
  }

  return (
    <>
      <div className="rounded-sm border border-[#d4d4d4] bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-950">
        {hasUploadProtectedDays ? (
          <p className="border-b border-[#d4d4d4] px-3 py-2 text-xs text-sky-800 dark:border-zinc-700 dark:text-sky-300">
            Blue toggles kept your locked days when the latest availability upload
            tried to change them.
          </p>
        ) : null}
        <div className={matrixScrollClass}>
        <table className="w-full min-w-[900px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className={stickyCornerHeaderClass}>Employee</th>
              <th className={stickyHeaderClass}>Role</th>
              {DAYS.map((day) => (
                <th key={day} className={stickyHeaderClass}>
                  <div className="flex flex-col items-center gap-1">
                    <span>{day}</span>
                    <DayLockToggle
                      state={getAvailabilityDayLockToggleState(availability, day)}
                      onToggle={() =>
                        setAvailabilityDayLocked(
                          day,
                          !isAvailabilityDayLocked(availability, day),
                        )
                      }
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((employee, index) => (
              <tr key={`${employee.employee}-${employee.role}-${employee.sourceIndex}-${index}`}>
                <td className={stickyRowHeaderClass}>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                      onClick={() => removeAvailabilityEmployee(employee.sourceIndex)}
                      aria-label={`Remove ${employee.employee}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                    <span>{employee.employee}</span>
                  </div>
                </td>
                <td className={`${bodyClass} bg-white dark:bg-zinc-950`}>
                  {getEmployeeRole(employee) || "—"}
                </td>
                {DAYS.map((day) => {
                  const dayLocked = isAvailabilityDayLocked(availability, day);

                  return (
                    <td
                      key={day}
                      className={cn(
                        cellBorder,
                        "px-2 py-1 text-left text-sm text-black dark:text-zinc-100",
                        getAvailabilityCellClass(employee.days[day]),
                        dayLocked
                          ? availability.uploadProtectedDays?.[day]
                            ? "ring-1 ring-inset ring-sky-500/35"
                            : "ring-1 ring-inset ring-emerald-500/25"
                          : interactiveCellClass,
                      )}
                      title={
                        dayLocked
                          ? "Day locked — unlock the column toggle to edit"
                          : "Right-click to change availability"
                      }
                      onContextMenu={
                        dayLocked
                          ? undefined
                          : (event) =>
                              openStatusMenu(
                                event,
                                employee.sourceIndex,
                                day,
                                employee.days[day],
                              )
                      }
                    >
                      {formatAvailabilityLabel(employee.days[day])}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {menu ? (
        <div
          className="fixed z-50 min-w-[160px] overflow-hidden rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
          style={{ left: menu.x, top: menu.y }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          {AVAILABILITY_STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              type="button"
              className={cn(
                "flex w-full items-center px-3 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900",
                menu.currentStatus === status && "bg-zinc-100 font-medium dark:bg-zinc-900",
              )}
              onClick={() => handleStatusSelect(status)}
            >
              {status}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
