import Link from "next/link";
import {
  CategoryChip,
  PaymentMethodChip,
  SplitChip,
} from "@/components/expenses/expense-chips";
import { Icon } from "@/components/icons";
import type { ExpenseRow } from "@/lib/data";
import { expenseDateLabel } from "@/lib/expenses";
import { formatINR } from "@/lib/money";

export function ExpenseRowItem({ expense }: { expense: ExpenseRow }) {
  return (
    <li>
      <Link
        href={`/expenses/${expense.id}`}
        className="tb-card flex min-h-20 flex-col justify-center gap-1.5 px-4 py-3 transition-shadow hover:shadow-md"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="min-w-0 truncate text-sm font-semibold text-foreground">
            {expense.description}
          </h3>
          <span className="shrink-0 text-base font-semibold tabular-nums text-foreground">
            {formatINR(expense.amount)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <CategoryChip row={expense} />
          <PaymentMethodChip method={expense.paymentMethod} />
          <SplitChip state={expense.splitState} />
          {expense.notes && (
            <span className="grid h-7 w-7 place-items-center text-muted" aria-label="Has notes">
              <Icon name="notes" className="h-4 w-4" />
            </span>
          )}
          {expense.receiptPath && (
            <span className="grid h-7 w-7 place-items-center text-muted" aria-label="Has receipt">
              <Icon name="receipt" className="h-4 w-4" />
            </span>
          )}
        </div>
        <span className="text-xs text-muted">{expenseDateLabel(expense.date)}</span>
      </Link>
    </li>
  );
}