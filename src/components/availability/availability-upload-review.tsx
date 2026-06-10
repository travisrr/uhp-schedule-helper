"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  changeKeyForAdded,
  changeKeyForRoleChange,
  getAllChangeKeys,
  type AvailabilityChangeKey,
  type AvailabilityDiff,
} from "@/lib/availability-diff";
import { cn } from "@/lib/utils";

interface AvailabilityUploadReviewProps {
  open: boolean;
  fileName: string;
  diff: AvailabilityDiff;
  onApply: (acceptedKeys: ReadonlySet<AvailabilityChangeKey>) => void;
  onReject: () => void;
}

function DiffLine({
  kind,
  children,
  muted = false,
}: {
  kind: "add" | "remove" | "context";
  children: React.ReactNode;
  muted?: boolean;
}) {
  const styles = {
    add: "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
    remove:
      "bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200",
    context: "bg-zinc-50 text-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-300",
  }[kind];

  const prefix = kind === "add" ? "+" : kind === "remove" ? "−" : " ";

  return (
    <div
      className={cn(
        `flex gap-3 px-3 py-1 font-mono text-xs leading-5 ${styles}`,
        muted && "opacity-50",
      )}
    >
      <span className="w-3 shrink-0 select-none opacity-70">{prefix}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}

function ChangeToggle({
  checked,
  onCheckedChange,
  id,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex shrink-0 cursor-pointer items-center gap-2 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className="size-3.5 rounded border-zinc-300 accent-zinc-900 dark:border-zinc-600 dark:accent-zinc-100"
      />
      Apply
    </label>
  );
}

export function AvailabilityUploadReview({
  open,
  fileName,
  diff,
  onApply,
  onReject,
}: AvailabilityUploadReviewProps) {
  const allChangeKeys = useMemo(() => getAllChangeKeys(diff), [diff]);
  const [acceptedKeys, setAcceptedKeys] = useState<Set<AvailabilityChangeKey>>(
    () => new Set(allChangeKeys),
  );

  useEffect(() => {
    setAcceptedKeys(new Set(allChangeKeys));
  }, [allChangeKeys]);

  const changeCount = diff.added.length + diff.roleChanges.length;
  const acceptedCount = allChangeKeys.filter((key) => acceptedKeys.has(key)).length;

  function setChangeAccepted(key: AvailabilityChangeKey, accepted: boolean) {
    setAcceptedKeys((current) => {
      const next = new Set(current);
      if (accepted) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }

  function setAllAccepted(accepted: boolean) {
    setAcceptedKeys(accepted ? new Set(allChangeKeys) : new Set());
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onReject();
      }}
    >
      <DialogContent aria-describedby="availability-upload-review-description">
        <DialogHeader>
          <div className="space-y-1">
            <DialogTitle>Review roster changes</DialogTitle>
            <DialogDescription id="availability-upload-review-description">
              {fileName} introduces {changeCount}{" "}
              {changeCount === 1 ? "change" : "changes"} to employees or roles.
              Toggle each change on or off, then apply the ones you want to keep.
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogBody>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs text-zinc-500">
              {acceptedCount} of {changeCount} selected
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAllAccepted(true)}
              >
                Select all
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAllAccepted(false)}
              >
                Select none
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
            {diff.added.length > 0 ? (
              <section>
                <p className="border-b border-zinc-200 bg-zinc-100 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                  New employees
                </p>
                {diff.added.map((employee) => {
                  const changeKey = changeKeyForAdded(employee);
                  const accepted = acceptedKeys.has(changeKey);

                  return (
                    <div
                      key={changeKey}
                      className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800/80"
                    >
                      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50/80 px-3 py-2 dark:border-zinc-800/80 dark:bg-zinc-900/40">
                        <Label className="normal-case tracking-normal text-zinc-700 dark:text-zinc-200">
                          New employee
                        </Label>
                        <ChangeToggle
                          id={`availability-change-${changeKey}`}
                          checked={accepted}
                          onCheckedChange={(checked) =>
                            setChangeAccepted(changeKey, checked)
                          }
                        />
                      </div>
                      <DiffLine kind="add" muted={!accepted}>
                        <span className="font-semibold">{employee.employee}</span>
                        <span className="text-zinc-500 dark:text-zinc-400">
                          {" "}
                          · {employee.role.trim() || "—"}
                        </span>
                      </DiffLine>
                    </div>
                  );
                })}
              </section>
            ) : null}

            {diff.roleChanges.length > 0 ? (
              <section>
                <p className="border-b border-zinc-200 bg-zinc-100 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                  Role changes
                </p>
                {diff.roleChanges.map((change) => {
                  const changeKey = changeKeyForRoleChange(change);
                  const accepted = acceptedKeys.has(changeKey);

                  return (
                    <div
                      key={changeKey}
                      className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800/80"
                    >
                      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50/80 px-3 py-2 dark:border-zinc-800/80 dark:bg-zinc-900/40">
                        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                          {change.employee}
                        </span>
                        <ChangeToggle
                          id={`availability-change-${changeKey}`}
                          checked={accepted}
                          onCheckedChange={(checked) =>
                            setChangeAccepted(changeKey, checked)
                          }
                        />
                      </div>
                      <DiffLine kind="remove" muted={!accepted}>
                        {change.previousRole}
                      </DiffLine>
                      <DiffLine kind="add" muted={!accepted}>
                        {change.incomingRole}
                      </DiffLine>
                    </div>
                  );
                })}
              </section>
            ) : null}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onReject}>
            Discard upload
          </Button>
          <Button
            type="button"
            onClick={() => onApply(acceptedKeys)}
            disabled={acceptedCount === 0}
          >
            Apply {acceptedCount} {acceptedCount === 1 ? "change" : "changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
