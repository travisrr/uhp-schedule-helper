"use client";

import {
  formatAvailabilityLabel,
  getAvailabilityCellClass,
} from "@/components/availability/availability-badge";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/context/data-context";
import type { EmployeeAvailability } from "@/lib/types";
import { DAYS } from "@/lib/utils";
import { Trash2 } from "lucide-react";

const cellBorder =
  "border border-[#d4d4d4] dark:border-zinc-700";
const headerClass = `${cellBorder} bg-[#e8e8e8] px-2 py-1.5 text-left text-sm font-bold text-black dark:bg-zinc-800 dark:text-zinc-100`;
const bodyClass = `${cellBorder} px-2 py-1 text-left text-sm text-black dark:text-zinc-100`;

type AvailabilityRow = EmployeeAvailability & { sourceIndex: number };

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

export function AvailabilityMatrix() {
  const { availability, removeAvailabilityEmployee } = useAppData();

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

  return (
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
                  className={`${cellBorder} px-2 py-1 text-left text-sm text-black dark:text-zinc-100 ${getAvailabilityCellClass(employee.days[day])}`}
                >
                  {formatAvailabilityLabel(employee.days[day])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
