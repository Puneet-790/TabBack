"use client";

import { DebtActions } from "@/components/money-owed/debt-actions";
import { IouSheet } from "@/components/money-owed/iou-sheet";
import { Icon } from "@/components/icons";
import type { PersonRow, SettlementRow } from "@/lib/data";
import { expenseDateLabel } from "@/lib/expenses";
import { formatINR } from "@/lib/money";
import { debtContextLabel, daysPendingLabel, totalRemaining, type DebtEntry } from "@/lib/money-owed";
import { useRouter } from "next/navigation";
import { useState } from "react";

function DebtRow({
  entry,
  settlements,
}: {
  entry: DebtEntry;
  settlements: readonly SettlementRow[];
}) {
  const initial = entry.personName.trim().charAt(0).toUpperCase() || "?";
  const pending = entry.status === "pending";

  return (
    <li>
      <div className={`tb-card px-3 py-3 ${pending ? "" : "opacity-70"}`}>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent-deep">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{entry.personName}</p>
            <p className="truncate text-xs text-muted">{debtContextLabel(entry)}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
              <span className="tabular-nums">{expenseDateLabel(entry.anchorDate)}</span>
              <span
                className={`tb-chip ${
                  entry.daysPending < 7
                    ? "border-border/60 bg-surface text-muted"
                    : "border-warning/25 bg-warning/10 text-warning"
                }`}
              >
                {daysPendingLabel(entry.daysPending)}
              </span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p
              className={`text-sm font-semibold tabular-nums ${
                pending ? "text-foreground" : "text-muted"
              }`}
            >
              {pending ? formatINR(entry.remaining) : formatINR(entry.amount)}
            </p>
            <span
              className={`tb-chip mt-1 ${
                pending
                  ? "border-warning/25 bg-warning/10 text-warning"
                  : "border-success/25 bg-success/10 text-success"
              }`}
            >
              {pending
                ? `${formatINR(entry.remaining)} of ${formatINR(entry.amount)}`
                : "Paid"}
            </span>
          </div>
        </div>

        {pending && (
          <div className="mt-3 border-t border-border/60 pt-3">
            <DebtActions entry={entry} settlements={settlements} />
          </div>
        )}
      </div>
    </li>
  );
}

function DebtSection({
  title,
  entries,
  settlementsByDebt,
  emptyMessage,
}: {
  title: string;
  entries: DebtEntry[];
  settlementsByDebt: Record<string, SettlementRow[]>;
  emptyMessage: string;
}) {
  const outstanding = totalRemaining(entries);
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="text-sm tabular-nums text-muted">
          {outstanding > 0 ? `${formatINR(outstanding)} outstanding` : "All settled"}
        </p>
      </div>
      {entries.length === 0 ? (
        <p className="tb-card px-4 py-6 text-sm text-muted">{emptyMessage}</p>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <DebtRow
              key={`${entry.debtType}:${entry.debtId}`}
              entry={entry}
              settlements={settlementsByDebt[entry.debtId] ?? []}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export function MoneyOwedManager({
  toReceive,
  toPay,
  settlementsByDebt,
  people,
}: {
  toReceive: DebtEntry[];
  toPay: DebtEntry[];
  settlementsByDebt: Record<string, SettlementRow[]>;
  people: PersonRow[];
}) {
  const [iouOpen, setIouOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Money Owed</h1>
          <p className="text-sm text-muted">Everything pending, in one place.</p>
        </div>
        <button type="button" onClick={() => setIouOpen(true)} className="tb-btn-primary min-h-11">
          <Icon name="plus" className="h-4 w-4" />
          Add IOU
        </button>
      </div>

      {toReceive.length === 0 && toPay.length === 0 ? (
        <section className="tb-card flex flex-col items-center gap-4 px-6 py-14 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
            <Icon name="coins" className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">No debts yet</h2>
            <p className="text-sm text-muted">
              Split an expense with friends or add a manual IOU.
            </p>
          </div>
          <button type="button" onClick={() => setIouOpen(true)} className="tb-btn-primary min-h-11">
            Add a manual IOU
          </button>
        </section>
      ) : (
        <>
          <DebtSection
            title="Money to receive"
            entries={toReceive}
            settlementsByDebt={settlementsByDebt}
            emptyMessage="Nothing owed to you right now."
          />
          <DebtSection
            title="Money to pay"
            entries={toPay}
            settlementsByDebt={settlementsByDebt}
            emptyMessage="Nothing you owe right now."
          />
        </>
      )}

      {iouOpen && (
        <IouSheet
          people={people}
          onClose={() => setIouOpen(false)}
          onSaved={() => {
            setIouOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}