"use client";

import { deleteSettlementAction } from "@/app/(app)/expenses/settle-actions";
import { Icon } from "@/components/icons";
import type { ReminderRow, SettlementRow } from "@/lib/data";
import { expenseDateLabel } from "@/lib/expenses";
import { formatINR } from "@/lib/money";
import { reminderTimeLabel } from "@/lib/reminders";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function PersonHistory({
  settlements,
  reminders,
}: {
  settlements: readonly SettlementRow[];
  reminders?: readonly ReminderRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [armedId, setArmedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete(settlementId: string) {
    setDeleting(true);
    setError(null);
    const formData = new FormData();
    formData.set("id", settlementId);
    const result = await deleteSettlementAction({}, formData);
    if (!result.ok) {
      setError(result.error ?? "Could not delete the settlement");
      setDeleting(false);
      setArmedId(null);
      return;
    }
    setDeleting(false);
    setArmedId(null);
    router.refresh();
  }

  const reminderLog = reminders ?? [];

  return (
    <div className="mt-3 border-t border-border/60 pt-3">
      {settlements.length === 0 ? (
        <p className="text-xs text-muted">No settlements yet</p>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            className="inline-flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-1 text-sm font-medium text-accent transition-colors hover:text-accent-deep"
          >
            <span>
              Settlement history ({settlements.length})
            </span>
            <Icon
              name="chevron-down"
              className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
          {open && (
            <ul className="space-y-1.5">
              {settlements.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center gap-3 rounded-lg bg-surface-muted px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium tabular-nums text-foreground">
                      {formatINR(row.amount)}
                      <span className="ml-2 text-xs font-normal text-muted">
                        {expenseDateLabel(row.date)}
                      </span>
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="tb-chip border-border/60 bg-surface text-muted">
                        {row.paymentMethod}
                      </span>
                      {row.notes && <span className="truncate text-xs text-muted">{row.notes}</span>}
                    </div>
                  </div>
                  {armedId === row.id ? (
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        onClick={() => confirmDelete(row.id)}
                        disabled={deleting}
                        className="inline-flex min-h-10 items-center justify-center rounded-lg bg-danger px-3 text-sm font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {deleting ? "Undoing…" : "Undo"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setArmedId(null)}
                        disabled={deleting}
                        className="tb-btn-secondary min-h-10"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setArmedId(row.id)}
                      aria-label={`Undo payment of ${formatINR(row.amount)}`}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-danger"
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {reminderLog.length > 0 && (
        <div className="mt-2 space-y-2">
          <button
            type="button"
            onClick={() => setReminderOpen((current) => !current)}
            aria-expanded={reminderOpen}
            className="inline-flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-1 text-sm font-medium text-accent transition-colors hover:text-accent-deep"
          >
            <span>
              Reminders ({reminderLog.length})
            </span>
            <Icon
              name="chevron-down"
              className={`h-4 w-4 transition-transform ${reminderOpen ? "rotate-180" : ""}`}
            />
          </button>
          {reminderOpen && (
            <ul className="space-y-1.5">
              {reminderLog.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center gap-3 rounded-lg bg-surface-muted px-3 py-2"
                >
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                    <Icon name="brand" className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Reminder sent
                      <span className="ml-2 text-xs font-normal text-muted">
                        {reminderTimeLabel(row.sentAt)}
                      </span>
                    </p>
                    <span className="tb-chip border-border/60 bg-surface text-muted">
                      {row.debtType === "split" ? "Split" : "IOU"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}