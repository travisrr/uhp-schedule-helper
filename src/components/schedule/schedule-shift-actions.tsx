"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ArrowLeftRight, Clock3, ListPlus, UserMinus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAppData } from "@/context/data-context";
import { listAddableRoles } from "@/lib/schedule-role-catalog";
import { periodHoursForShift } from "@/lib/shift-hours";
import {
  addRoleToPeriod,
  addShiftToRole,
  assignShiftEmployee,
  clearShiftEmployee,
  formatShiftTimeRange,
  getShiftTimeRange,
  isValidTimeToken,
  listAllEmployees,
  listShiftsInPeriod,
  parseShiftTimeRange,
  shiftsMatch,
  swapShiftEmployees,
  updateShiftTimeRange,
  type EmployeeOption,
  type RoleRef,
  type ShiftListing,
  type ShiftRef,
} from "@/lib/schedule-mutations";
import type { ScheduleData } from "@/lib/types";
import type { ScheduleUpdater } from "@/context/data-context";
import { cn } from "@/lib/utils";

type ContextMenuTarget =
  | { kind: "employee"; ref: ShiftRef; employee: string }
  | { kind: "time"; ref: ShiftRef; timeRange: string }
  | { kind: "role"; ref: RoleRef };

interface ScheduleShiftActionHandlers {
  openEmployeeMenu: (
    event: React.MouseEvent,
    ref: ShiftRef,
    employee: string,
  ) => void;
  openTimeMenu: (
    event: React.MouseEvent,
    ref: ShiftRef,
    timeRange: string,
  ) => void;
  openTimeEditor: (ref: ShiftRef, timeRange: string) => void;
  openRoleMenu: (event: React.MouseEvent, ref: RoleRef) => void;
}

const ScheduleShiftActionContext =
  createContext<ScheduleShiftActionHandlers | null>(null);

export function useScheduleShiftActions() {
  return useContext(ScheduleShiftActionContext);
}

export function ScheduleShiftActionProvider({
  schedule,
  onScheduleChange,
  children,
}: {
  schedule: ScheduleData;
  onScheduleChange: (data: ScheduleUpdater) => void;
  children: ReactNode;
}) {
  const [menu, setMenu] = useState<
    (ContextMenuTarget & { x: number; y: number }) | null
  >(null);
  const [swapTarget, setSwapTarget] = useState<ContextMenuTarget | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ContextMenuTarget | null>(
    null,
  );
  const [timeTarget, setTimeTarget] = useState<ContextMenuTarget | null>(null);
  const [addRoleTarget, setAddRoleTarget] = useState<RoleRef | null>(null);
  const [addNewRoleTarget, setAddNewRoleTarget] = useState<RoleRef | null>(null);
  const { availability, priorSchedule, shiftHours } = useAppData();

  const isAssigning =
    swapTarget?.kind === "employee" && !swapTarget.employee.trim();

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

  const assignShiftContext = useMemo(() => {
    if (addRoleTarget) {
      return { day: addRoleTarget.day, period: addRoleTarget.period };
    }
    if (swapTarget?.kind === "employee" && isAssigning) {
      return { day: swapTarget.ref.day, period: swapTarget.ref.period };
    }
    return null;
  }, [addRoleTarget, isAssigning, swapTarget]);

  const assignCandidates = useMemo(() => {
    if (!assignShiftContext) return [];
    return listAllEmployees(availability, schedule, assignShiftContext);
  }, [assignShiftContext, availability, schedule]);

  const swapCandidates = useMemo(() => {
    if (!swapTarget || swapTarget.kind !== "employee" || isAssigning) return [];

    return listShiftsInPeriod(schedule, swapTarget.ref.day, swapTarget.ref.period).filter(
      (entry) => !shiftsMatch(entry, swapTarget.ref),
    );
  }, [isAssigning, schedule, swapTarget]);

  const parsedTimeRange = useMemo(() => {
    if (!timeTarget || timeTarget.kind !== "time") return null;
    return parseShiftTimeRange(timeTarget.timeRange);
  }, [timeTarget]);

  const standardPeriodHours = useMemo(() => {
    if (!timeTarget || timeTarget.kind !== "time") return shiftHours.am;
    return periodHoursForShift(
      shiftHours,
      timeTarget.ref.day,
      timeTarget.ref.period,
    );
  }, [shiftHours, timeTarget]);

  const addableRoles = useMemo(() => {
    if (!addNewRoleTarget) return [];
    return listAddableRoles(
      schedule,
      availability,
      priorSchedule?.schedule,
      {
        day: addNewRoleTarget.day,
        period: addNewRoleTarget.period,
      },
    );
  }, [addNewRoleTarget, availability, priorSchedule?.schedule, schedule]);

  const handlers = useMemo<ScheduleShiftActionHandlers>(
    () => ({
      openEmployeeMenu(event, ref, employee) {
        event.preventDefault();
        event.stopPropagation();
        setMenu({
          kind: "employee",
          ref,
          employee,
          x: event.clientX,
          y: event.clientY,
        });
      },
      openTimeMenu(event, ref, timeRange) {
        event.preventDefault();
        event.stopPropagation();
        setMenu({
          kind: "time",
          ref,
          timeRange,
          x: event.clientX,
          y: event.clientY,
        });
      },
      openTimeEditor(ref, timeRange) {
        setTimeTarget({
          kind: "time",
          ref,
          timeRange,
        });
      },
      openRoleMenu(event, ref) {
        event.preventDefault();
        event.stopPropagation();
        setMenu({
          kind: "role",
          ref,
          x: event.clientX,
          y: event.clientY,
        });
      },
    }),
    [],
  );

  function handleAssignSelect(candidate: EmployeeOption) {
    if (!swapTarget || swapTarget.kind !== "employee") return;
    onScheduleChange((current) =>
      current
        ? assignShiftEmployee(
            current,
            swapTarget.ref,
            candidate.employee,
            shiftHours,
          )
        : current,
    );
    setSwapTarget(null);
  }

  function handleSwapSelect(candidate: ShiftListing) {
    if (!swapTarget || swapTarget.kind !== "employee") return;
    onScheduleChange((current) =>
      current ? swapShiftEmployees(current, swapTarget.ref, candidate) : current,
    );
    setSwapTarget(null);
  }

  function handleRemoveConfirm() {
    if (!removeTarget || removeTarget.kind !== "employee") return;
    onScheduleChange((current) =>
      current ? clearShiftEmployee(current, removeTarget.ref) : current,
    );
    setRemoveTarget(null);
  }

  function handleAddRoleSelect(candidate: EmployeeOption) {
    if (!addRoleTarget) return;
    onScheduleChange((current) =>
      current
        ? addShiftToRole(current, addRoleTarget, candidate.employee, shiftHours)
        : current,
    );
    setAddRoleTarget(null);
  }

  function handleAddNewRoleSelect(roleName: string) {
    if (!addNewRoleTarget) return;
    onScheduleChange((current) =>
      current ? addRoleToPeriod(current, addNewRoleTarget, roleName) : current,
    );
    setAddNewRoleTarget(null);
  }

  return (
    <ScheduleShiftActionContext.Provider value={handlers}>
      {children}

      {menu ? (
        <div
          className="fixed z-50 min-w-[220px] overflow-hidden rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
          style={{ left: menu.x, top: menu.y }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          {menu.kind === "role" ? (
            <>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900"
                onClick={() => {
                  setAddRoleTarget(menu.ref);
                  setMenu(null);
                }}
              >
                <UserPlus className="size-4 shrink-0 text-zinc-500" />
                Add employee to shift
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900"
                onClick={() => {
                  setAddNewRoleTarget(menu.ref);
                  setMenu(null);
                }}
              >
                <ListPlus className="size-4 shrink-0 text-zinc-500" />
                Add role section
              </button>
            </>
          ) : menu.kind === "employee" ? (
            <>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900"
                onClick={() => {
                  setSwapTarget(menu);
                  setMenu(null);
                }}
              >
                <ArrowLeftRight className="size-4 shrink-0 text-zinc-500" />
                {menu.employee.trim()
                  ? "Swap with another employee"
                  : "Assign an employee"}
              </button>
              {menu.employee.trim() ? (
                <>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900"
                    onClick={() => {
                      setTimeTarget({
                        kind: "time",
                        ref: menu.ref,
                        timeRange: getShiftTimeRange(schedule, menu.ref),
                      });
                      setMenu(null);
                    }}
                  >
                    <Clock3 className="size-4 shrink-0 text-zinc-500" />
                    Adjust shift times
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                    onClick={() => {
                      setRemoveTarget(menu);
                      setMenu(null);
                    }}
                  >
                    <UserMinus className="size-4 shrink-0" />
                    Remove from shift
                  </button>
                </>
              ) : null}
            </>
          ) : (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900"
              onClick={() => {
                setTimeTarget(menu);
                setMenu(null);
              }}
            >
              <Clock3 className="size-4 shrink-0 text-zinc-500" />
              Adjust shift times
            </button>
          )}
        </div>
      ) : null}

      <EmployeePickerDialog
        open={swapTarget?.kind === "employee" || addRoleTarget !== null}
        mode={
          addRoleTarget ? "add" : isAssigning ? "assign" : "swap"
        }
        roleName={addRoleTarget?.role}
        sourceEmployee={
          swapTarget?.kind === "employee" ? swapTarget.employee : ""
        }
        assignCandidates={assignCandidates}
        swapCandidates={swapCandidates}
        onOpenChange={(open) => {
          if (!open) {
            setSwapTarget(null);
            setAddRoleTarget(null);
          }
        }}
        onAssign={
          addRoleTarget ? handleAddRoleSelect : handleAssignSelect
        }
        onSwap={handleSwapSelect}
      />

      <RemoveEmployeeDialog
        open={removeTarget?.kind === "employee"}
        employeeName={
          removeTarget?.kind === "employee" ? removeTarget.employee : ""
        }
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        onConfirm={handleRemoveConfirm}
      />

      <RolePickerDialog
        open={addNewRoleTarget !== null}
        anchorRole={addNewRoleTarget?.role}
        period={addNewRoleTarget?.period}
        roles={addableRoles}
        onOpenChange={(open) => {
          if (!open) setAddNewRoleTarget(null);
        }}
        onSelect={handleAddNewRoleSelect}
      />

      <AdjustShiftTimeDialog
        open={timeTarget?.kind === "time"}
        initialStart={parsedTimeRange?.start ?? ""}
        initialEnd={parsedTimeRange?.end ?? ""}
        standardStart={standardPeriodHours.start}
        standardEnd={standardPeriodHours.end}
        onOpenChange={(open) => {
          if (!open) setTimeTarget(null);
        }}
        onSave={(start, end, timeOverride) => {
          if (!timeTarget || timeTarget.kind !== "time") return;
          onScheduleChange((current) =>
            current
              ? updateShiftTimeRange(
                  current,
                  timeTarget.ref,
                  formatShiftTimeRange(start, end),
                  { timeOverride },
                )
              : current,
          );
          setTimeTarget(null);
        }}
      />
    </ScheduleShiftActionContext.Provider>
  );
}

function RolePickerDialog({
  open,
  anchorRole,
  period,
  roles,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  anchorRole?: string;
  period?: "AM" | "PM";
  roles: string[];
  onOpenChange: (open: boolean) => void;
  onSelect: (roleName: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="space-y-1">
            <DialogTitle>Add role section</DialogTitle>
            <DialogDescription>
              {anchorRole && period
                ? `Choose a role to add after ${anchorRole} in the ${period} block.`
                : "Choose a role to add to this meal period."}
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogBody>
          {roles.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Every known role is already in this meal period. Upload
              availability or a prior schedule in Settings to expand the role
              list.
            </p>
          ) : (
            <div className="max-h-[min(24rem,60vh)] space-y-2 overflow-y-auto">
              {roles.map((role) => (
                <button
                  key={role}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 rounded-md border border-zinc-200 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                  onClick={() => onSelect(role)}
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {role}
                  </span>
                </button>
              ))}
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemoveEmployeeDialog({
  open,
  employeeName,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  employeeName: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="space-y-1">
            <DialogTitle>Remove from shift</DialogTitle>
            <DialogDescription>
              Remove {employeeName || "this employee"} from this shift? The
              shift slot will stay open so you can assign someone else.
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
            onClick={onConfirm}
          >
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmployeePickerDialog({
  open,
  mode,
  roleName,
  sourceEmployee,
  assignCandidates,
  swapCandidates,
  onOpenChange,
  onAssign,
  onSwap,
}: {
  open: boolean;
  mode: "assign" | "swap" | "add";
  roleName?: string;
  sourceEmployee: string;
  assignCandidates: EmployeeOption[];
  swapCandidates: ShiftListing[];
  onOpenChange: (open: boolean) => void;
  onAssign: (candidate: EmployeeOption) => void;
  onSwap: (candidate: ShiftListing) => void;
}) {
  const isAssigning = mode === "assign" || mode === "add";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="space-y-1">
            <DialogTitle>
              {mode === "add"
                ? "Add employee to shift"
                : isAssigning
                  ? "Assign employee"
                  : "Swap employee"}
            </DialogTitle>
            <DialogDescription>
              {mode === "add"
                ? `Choose an employee to add to ${roleName || "this role"}. Names in red are outside their availability for this shift, but you can still select them.`
                : isAssigning
                  ? "Choose an employee to assign to this shift. Names in red are outside their availability, but you can still select them."
                  : `Choose another shift on the same day and meal period to swap with ${sourceEmployee || "this employee"}.`}
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogBody>
          {isAssigning ? (
            assignCandidates.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No employees are available. Upload an availability sheet in
                Settings to populate the roster.
              </p>
            ) : (
              <div className="max-h-[min(24rem,60vh)] space-y-2 overflow-y-auto">
                {assignCandidates.map((candidate) => {
                  const outsideAvailability = candidate.availableForShift === false;

                  return (
                    <button
                      key={candidate.employee}
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900",
                        outsideAvailability
                          ? "border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/30"
                          : "border-zinc-200 dark:border-zinc-800",
                      )}
                      onClick={() => onAssign(candidate)}
                    >
                      <span
                        className={cn(
                          "font-medium",
                          outsideAvailability
                            ? "text-red-700 dark:text-red-400"
                            : "text-zinc-900 dark:text-zinc-100",
                        )}
                      >
                        {candidate.employee}
                      </span>
                      <span
                        className={cn(
                          "text-xs",
                          outsideAvailability
                            ? "text-red-600 dark:text-red-400"
                            : "text-zinc-500",
                        )}
                      >
                        {outsideAvailability
                          ? "Outside availability"
                          : candidate.role || null}
                      </span>
                    </button>
                  );
                })}
              </div>
            )
          ) : swapCandidates.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No other shifts are available to swap on this day.
            </p>
          ) : (
            <div className="space-y-2">
              {swapCandidates.map((candidate) => (
                <button
                  key={`${candidate.role}-${candidate.shiftIndex}-${candidate.employee}`}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 rounded-md border border-zinc-200 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                  onClick={() => onSwap(candidate)}
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {candidate.employee.trim() || "—"}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {candidate.role} · {candidate.timeRange}
                  </span>
                </button>
              ))}
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdjustShiftTimeDialog({
  open,
  initialStart,
  initialEnd,
  standardStart,
  standardEnd,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  initialStart: string;
  initialEnd: string;
  standardStart: string;
  standardEnd: string;
  onOpenChange: (open: boolean) => void;
  onSave: (start: string, end: string, timeOverride: boolean) => void;
}) {
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);

  useEffect(() => {
    if (open) {
      setStart(initialStart);
      setEnd(initialEnd);
    }
  }, [open, initialStart, initialEnd]);

  const startValid = isValidTimeToken(start);
  const endValid = isValidTimeToken(end);
  const canSave = startValid && endValid;
  const standardRange = formatShiftTimeRange(standardStart, standardEnd);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="space-y-1">
            <DialogTitle>Adjust shift times</DialogTitle>
            <DialogDescription>
              Set a one-off start and end time for this employee. Custom times
              are kept when you apply standard shift hours to the schedule.
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogBody>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="shift-start-time">Start time</Label>
              <input
                id="shift-start-time"
                value={start}
                onChange={(event) => setStart(event.target.value)}
                placeholder="10:30 AM"
                className={cn(
                  "h-9 w-full rounded-md border bg-white px-3 text-sm text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100",
                  startValid
                    ? "border-zinc-200 dark:border-zinc-800"
                    : "border-red-400 dark:border-red-500",
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift-end-time">End time</Label>
              <input
                id="shift-end-time"
                value={end}
                onChange={(event) => setEnd(event.target.value)}
                placeholder="4:00 PM"
                className={cn(
                  "h-9 w-full rounded-md border bg-white px-3 text-sm text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100",
                  endValid
                    ? "border-zinc-200 dark:border-zinc-800"
                    : "border-red-400 dark:border-red-500",
                )}
              />
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="text-zinc-600 dark:text-zinc-400"
            onClick={() => {
              setStart(standardStart);
              setEnd(standardEnd);
            }}
          >
            Use standard ({standardRange})
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!canSave}
              onClick={() => {
                const matchesStandard =
                  start.trim() === standardStart.trim() &&
                  end.trim() === standardEnd.trim();
                onSave(start, end, !matchesStandard);
              }}
            >
              Save times
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
