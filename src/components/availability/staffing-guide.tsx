"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppData } from "@/context/data-context";
import { DAYS } from "@/lib/utils";

export function StaffingGuideSection() {
  const { availability } = useAppData();

  if (!availability?.staffingGuide.length) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-medium text-zinc-100">Staffing Guide</h2>
        <p className="text-xs text-zinc-500">
          Base headcount requirements by day and meal period.
        </p>
      </div>
      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Meal Period</TableHead>
              {DAYS.map((day) => (
                <TableHead key={day} className="text-center">
                  {day}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {availability.staffingGuide.map((row) => (
              <TableRow key={row.mealPeriod}>
                <TableCell className="font-medium text-zinc-200">
                  {row.mealPeriod}
                </TableCell>
                {DAYS.map((day) => (
                  <TableCell
                    key={day}
                    className="text-center tabular-nums text-zinc-300"
                  >
                    {row.days[day] ?? "—"}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
