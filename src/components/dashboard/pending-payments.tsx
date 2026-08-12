import { DebtActions } from "@/components/money-owed/debt-actions";
import type { SettlementRow } from "@/lib/data";
import { formatINR } from "@/lib/money";
import { debtContextLabel } from "@/lib/money-owed";
import type { DebtEntry } from "@/lib/money-owed";

export function PendingPaymentRow({
  entry,
  settlements,
}: {
  entry: DebtEntry;
  settlements: readonly SettlementRow[];
}) {
  const initial = entry.personName.trim().charAt(0).toUpperCase() || "?";

  return (
    <li>
      <div className="rounded-xl border border-border bg-surface px-3 py-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent-deep">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{entry.personName}</p>
            <p className="truncate text-xs text-muted">{debtContextLabel(entry)}</p>
          </div>
          <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
            {formatINR(entry.remaining)}
          </p>
        </div>
        <div className="mt-3 border-t border-border/60 pt-3">
          <DebtActions entry={entry} settlements={settlements} />
        </div>
      </div>
    </li>
  );
}