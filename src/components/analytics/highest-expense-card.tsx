import Link from "next/link";
import { Icon } from "@/components/icons";
import { expenseDateLabel } from "@/lib/expenses";
import { formatINR } from "@/lib/money";

export interface HighestExpense {
  id: string;
  description: string;
  date: string;
  amount: number;
}

export function HighestExpenseCard({ expense }: { expense: HighestExpense }) {
  return (
    <Link
      href={`/expenses/${expense.id}`}
      className="tb-card flex min-h-20 items-center gap-3 px-4 py-3 transition-shadow hover:shadow-md"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-warning/10 text-warning">
        <Icon name="receipt" className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">
          {expense.description}
        </span>
        <span className="block text-xs text-muted">{expenseDateLabel(expense.date)}</span>
      </span>
      <span className="shrink-0 text-base font-semibold tabular-nums text-foreground">
        {formatINR(expense.amount)}
      </span>
    </Link>
  );
}
