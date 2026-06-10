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
import type { EmployeeAvailability } from "@/lib/types";
import { cn, DAYS, type DayKey } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

const cellBorder =
  "border border-[#d4d4d4] dark:border-zinc-700";
const headerClass = `${cellBorder} bg-[#e8e8e8] px-2 py-1.5 text-left text-sm font-bold text-black dark:bg-zinc-800 dark:text-zinc-100`;
const bodyClass = `${cellBorder} px-2 py-1 text-left text-sm text-black dark:text-zinc-100`;
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

export function AvailabilityMatrix() {
  const { availability, removeAvailabilityEmployee, updateAvailabilityStatus } =
    useAppData();
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
      <div className="overflow-auto rounded-sm border border-[#d4d4d4] bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-950">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr>
              <th className={headerClass}>Employee</th>
              <th className={headerClass}>Role</th>
              {DAYS.map((day) => (
                <th key={day} className={headerClass}>
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((employee, index) => (
              <tr key={`${employee.employee}-${employee.role}-${employee.sourceIndex}-${index}`}>
                <td className={`${bodyClass} bg-white dark:bg-zinc-950`}>
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
                {DAYS.map((day) => (
                  <td
                    key={day}
                    className={cn(
                      cellBorder,
                      "px-2 py-1 text-left text-sm text-black dark:text-zinc-100",
                      getAvailabilityCellClass(employee.days[day]),
                      interactiveCellClass,
                    )}
                    title="Right-click to change availability"
                    onContextMenu={(event) =>
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
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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
