import type { ExpenseRow } from "@/lib/data";
import type { SplitState } from "@/lib/expenses";
import { uncategorisedLabel } from "@/lib/categories";

export function CategoryChip({ row }: { row: ExpenseRow }) {
  return (
    <span className="tb-chip border-accent-soft bg-accent-soft text-accent">
      {row.category?.name ?? uncategorisedLabel}
    </span>
  );
}

export function PaymentMethodChip({ method }: { method: string }) {
  return <span className="tb-chip">{method}</span>;
}

export function SplitChip({ state }: { state: SplitState }) {
  if (state === "none") return <span className="tb-chip">Not split</span>;
  return <span className="tb-chip border-accent-soft bg-accent-soft text-accent">Split</span>;
}

export function StatusChip({ state }: { state: SplitState }) {
  if (state === "none") return null;
  if (state === "pending") {
    return <span className="tb-chip border-warning/25 bg-warning/10 text-warning">Pending</span>;
  }
  return <span className="tb-chip border-success/25 bg-success/10 text-success">Paid</span>;
}