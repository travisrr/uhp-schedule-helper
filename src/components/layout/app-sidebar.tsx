"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  History,
  LayoutGrid,
  UserPlus,
  Settings2,
  BarChart3,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { cn, DAYS } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAppData } from "@/context/data-context";
import {
  AVAILABILITY_STATUS_OPTIONS,
  type AvailabilityStatusOption,
} from "@/lib/availability-utils";

const NAV_ITEMS = [
  {
    href: "/availability",
    label: "Employee Availability",
    icon: CalendarDays,
  },
  {
    href: "/schedule",
    label: "Shift Report",
    icon: LayoutGrid,
  },
  {
    href: "/prior-schedule",
    label: "Prior Schedule",
    icon: History,
  },
  {
    href: "/shift-hours",
    label: "Shift Hours",
    icon: Clock3,
  },
  {
    href: "/server-metrics",
    label: "Server Metrics",
    icon: BarChart3,
  },
  {
    href: "/settings",
    label: "Data Ingestion",
    icon: Settings2,
  },
] as const;

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { addAvailabilityEmployee } = useAppData();
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [employeeName, setEmployeeName] = useState("");
  const [role, setRole] = useState("");
  const [defaultStatus, setDefaultStatus] =
    useState<AvailabilityStatusOption>("OPEN");
  const [totalShifts, setTotalShifts] = useState("");

  function resetAddEmployeeForm() {
    setEmployeeName("");
    setRole("");
    setDefaultStatus("OPEN");
    setTotalShifts("");
  }

  function handleAddEmployeeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = employeeName.trim();
    if (!trimmedName) return;

    const trimmedShiftCount = totalShifts.trim();
    const parsedShiftCount = trimmedShiftCount
      ? Number.parseInt(trimmedShiftCount, 10)
      : null;
    const safeShiftCount =
      parsedShiftCount !== null && Number.isFinite(parsedShiftCount)
        ? Math.max(0, parsedShiftCount)
        : null;

    addAvailabilityEmployee({
      employee: trimmedName,
      role: role.trim() || "Staff",
      days: Object.fromEntries(
        DAYS.map((day) => [day, defaultStatus]),
      ) as Record<(typeof DAYS)[number], AvailabilityStatusOption>,
      totalShifts: safeShiftCount,
    });

    resetAddEmployeeForm();
    setAddEmployeeOpen(false);
    router.push("/availability");
  }

  return (
    <>
      <aside
        className={cn(
          "flex h-screen shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 transition-[width] duration-200 dark:border-zinc-800 dark:bg-zinc-950",
          collapsed ? "w-[68px]" : "w-64",
        )}
      >
        <div className="flex h-14 items-center justify-between px-3">
          {!collapsed ? (
            <div className="min-w-0 px-1">
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                UHP Schedule
              </p>
              <p className="truncate text-[11px] text-black dark:text-zinc-300">
                Hospitality Ops
              </p>
            </div>
          ) : (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-xs font-semibold text-emerald-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-emerald-400">
              U
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn("shrink-0", collapsed && "mx-auto")}
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <Separator />

        <nav className="flex-1 space-y-1 p-2">
          <Button
            type="button"
            variant="ghost"
            title={collapsed ? "Add Employee" : undefined}
            className={cn(
              "w-full justify-start px-3 text-black hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900/60",
              collapsed && "justify-center px-0",
            )}
            onClick={() => setAddEmployeeOpen(true)}
          >
            <UserPlus className="h-4 w-4 shrink-0 text-black dark:text-zinc-200" />
            {!collapsed ? <span className="truncate">Add Employee</span> : null}
          </Button>
          <Separator />
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                    : "text-black hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900/60",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-emerald-500" : "text-black dark:text-zinc-200",
                  )}
                />
                {!collapsed ? <span className="truncate">{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-zinc-200 p-2 dark:border-zinc-800">
          <ThemeToggle collapsed={collapsed} />
          {!collapsed ? (
            <p className="px-1 text-[11px] leading-relaxed text-black dark:text-zinc-300">
              Import availability in Settings and a prior schedule to seed future weeks.
            </p>
          ) : null}
        </div>
      </aside>

      <Dialog open={addEmployeeOpen} onOpenChange={setAddEmployeeOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleAddEmployeeSubmit}>
            <DialogHeader>
              <div>
                <DialogTitle>Add Employee</DialogTitle>
                <DialogDescription>
                  Add a one-off employee to the availability roster.
                </DialogDescription>
              </div>
              <DialogCloseButton />
            </DialogHeader>

            <DialogBody className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manual-employee-name">Employee name</Label>
                <input
                  id="manual-employee-name"
                  value={employeeName}
                  onChange={(event) => setEmployeeName(event.target.value)}
                  className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-600"
                  placeholder="First Last"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-employee-role">Role</Label>
                <input
                  id="manual-employee-role"
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-600"
                  placeholder="Staff"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="manual-employee-availability">
                    Default availability
                  </Label>
                  <select
                    id="manual-employee-availability"
                    value={defaultStatus}
                    onChange={(event) =>
                      setDefaultStatus(
                        event.target.value as AvailabilityStatusOption,
                      )
                    }
                    className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-600"
                  >
                    {AVAILABILITY_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manual-employee-total-shifts">
                    Shift count
                  </Label>
                  <input
                    id="manual-employee-total-shifts"
                    value={totalShifts}
                    onChange={(event) => setTotalShifts(event.target.value)}
                    type="number"
                    min="0"
                    step="1"
                    className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-600"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddEmployeeOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!employeeName.trim()}>
                Add Employee
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
