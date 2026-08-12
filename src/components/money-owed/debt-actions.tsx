"use client";

import { SettleDebt } from "@/components/expenses/settle-debt";
import { RemindSheet } from "@/components/money-owed/remind-sheet";
import { Icon } from "@/components/icons";
import type { SettlementRow } from "@/lib/data";
import type { DebtEntry } from "@/lib/money-owed";
import { reminderDraft, waMeLink } from "@/lib/reminders";
import { useState } from "react";

export function DebtActions({
  entry,
  settlements,
}: {
  entry: DebtEntry;
  settlements: readonly SettlementRow[];
}) {
  const [settleOpen, setSettleOpen] = useState(false);
  const [remindOpen, setRemindOpen] = useState(false);
  const draft = reminderDraft(entry.personName, entry.remaining, entry.contextLabel);

  return (
    <div className="flex flex-wrap gap-2">
      {entry.direction === "to_receive" && (
        <button
          type="button"
          onClick={() => setRemindOpen(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-accent transition-colors hover:bg-surface-muted"
        >
          <Icon name="brand" className="h-4 w-4" />
          Remind
        </button>
      )}
      {!settleOpen && (
        <button
          type="button"
          onClick={() => setSettleOpen(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-accent transition-colors hover:bg-surface-muted"
        >
          <Icon name="check" className="h-4 w-4" />
          Record payment
        </button>
      )}
      {settleOpen && (
        <button
          type="button"
          onClick={() => setSettleOpen(false)}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-muted transition-colors hover:bg-surface-muted"
        >
          <Icon name="x" className="h-4 w-4" />
          Close
        </button>
      )}
      {settleOpen && (
        <SettleDebt
          debtId={entry.debtId}
          amount={entry.amount}
          settlements={settlements}
          remainingAmount={entry.remaining}
          status={entry.status}
          expenseId={entry.expenseId}
        />
      )}
      {remindOpen && (
        <RemindSheet
          personName={entry.personName}
          phone={entry.phone}
          draft={draft}
          waLink={waMeLink(entry.phone ?? "", draft)}
          debtType={entry.debtType}
          debtId={entry.debtId}
          personId={entry.personId}
          onClose={() => setRemindOpen(false)}
        />
      )}
    </div>
  );
}