"use client";

import { deleteExpenseAction } from "@/app/(app)/expenses/actions";
import { Icon } from "@/components/icons";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ExpenseDeleteButton({
  expenseId,
  blockedReason = null,
}: {
  expenseId: string;
  blockedReason?: string | null;
}) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setBusy(true);
    setError(null);
    const formData = new FormData();
    formData.set("id", expenseId);
    const result = await deleteExpenseAction(formData);
    if (result.ok) {
      router.push("/expenses");
      return;
    }
    setError(result.error ?? "Could not delete the expense");
    setBusy(false);
    setArmed(false);
  }

  if (blockedReason) {
    return (
      <div className="w-full space-y-2 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 sm:w-auto">
        <p className="text-sm text-warning">{blockedReason}</p>
        <p className="text-xs text-muted">
          Settlements hold the money trail. Undo them from the split above, then delete.
        </p>
      </div>
    );
  }

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-danger transition-colors hover:bg-surface-muted"
      >
        <Icon name="trash" className="h-4 w-4" />
        Delete
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">Delete this expense? This cannot be undone.</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={confirmDelete}
          disabled={busy}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-danger px-4 text-sm font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Icon name="trash" className="h-4 w-4" />
          {busy ? "Deleting…" : "Confirm delete"}
        </button>
        <button
          type="button"
          onClick={() => setArmed(false)}
          disabled={busy}
          className="tb-btn-secondary min-h-11 flex-1"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}