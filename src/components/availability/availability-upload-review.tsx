"use client";

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
import type { AvailabilityDiff } from "@/lib/availability-diff";

interface AvailabilityUploadReviewProps {
  open: boolean;
  fileName: string;
  diff: AvailabilityDiff;
  onAccept: () => void;
  onReject: () => void;
}

function DiffLine({
  kind,
  children,
}: {
  kind: "add" | "remove" | "context";
  children: React.ReactNode;
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
      className={`flex gap-3 px-3 py-1 font-mono text-xs leading-5 ${styles}`}
    >
      <span className="w-3 shrink-0 select-none opacity-70">{prefix}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}

export function AvailabilityUploadReview({
  open,
  fileName,
  diff,
  onAccept,
  onReject,
}: AvailabilityUploadReviewProps) {
  const changeCount = diff.added.length + diff.roleChanges.length;

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
              Accept to apply the full upload, or reject to keep the current
              roster.
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogBody>
          <div className="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
            {diff.added.length > 0 ? (
              <section>
                <p className="border-b border-zinc-200 bg-zinc-100 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                  New employees
                </p>
                {diff.added.map((employee) => (
                  <DiffLine
                    key={`add-${employee.employee}-${employee.role}`}
                    kind="add"
                  >
                    <span className="font-semibold">{employee.employee}</span>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {" "}
                      · {employee.role.trim() || "—"}
                    </span>
                  </DiffLine>
                ))}
              </section>
            ) : null}

            {diff.roleChanges.length > 0 ? (
              <section>
                <p className="border-b border-zinc-200 bg-zinc-100 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                  Role changes
                </p>
                {diff.roleChanges.map((change) => (
                  <div key={`role-${change.employee}`}>
                    <DiffLine kind="context">
                      <span className="font-semibold">{change.employee}</span>
                    </DiffLine>
                    <DiffLine kind="remove">{change.previousRole}</DiffLine>
                    <DiffLine kind="add">{change.incomingRole}</DiffLine>
                  </div>
                ))}
              </section>
            ) : null}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onReject}>
            Reject upload
          </Button>
          <Button type="button" onClick={onAccept}>
            Accept changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
