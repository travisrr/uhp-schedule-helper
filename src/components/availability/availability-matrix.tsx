"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AvailabilityBadge } from "@/components/availability/availability-badge";
import { useAppData } from "@/context/data-context";
import { DAYS } from "@/lib/utils";

export function AvailabilityMatrix() {
  const { availability } = useAppData();

  if (!availability || availability.employees.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-zinc-800 bg-zinc-950/50">
        <p className="text-sm text-zinc-500">
          Upload an availability sheet in Settings to populate the roster matrix.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="sticky left-0 z-10 bg-zinc-950">Employee</TableHead>
            <TableHead>Ratings</TableHead>
            {DAYS.map((day) => (
              <TableHead key={day} className="text-center">
                {day}
              </TableHead>
            ))}
            <TableHead className="text-right">Total Shifts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {availability.employees.map((employee) => (
            <TableRow key={employee.employee}>
              <TableCell className="sticky left-0 z-10 bg-zinc-950 font-medium text-zinc-100">
                {employee.employee}
              </TableCell>
              <TableCell className="text-zinc-400">{employee.ratings || "—"}</TableCell>
              {DAYS.map((day) => (
                <TableCell key={day} className="text-center">
                  <AvailabilityBadge status={employee.days[day]} />
                </TableCell>
              ))}
              <TableCell className="text-right tabular-nums text-zinc-300">
                {employee.totalShifts ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
