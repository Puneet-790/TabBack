import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CategoryChip,
  PaymentMethodChip,
  SplitChip,
  StatusChip,
} from "@/components/expenses/expense-chips";
import { ExpenseDeleteButton } from "@/components/expenses/expense-delete-button";
import { SettleDebt } from "@/components/expenses/settle-debt";
import { Icon } from "@/components/icons";
import {
  countSettlementsForExpense,
  fetchExpenseById,
  listSettlementsForSplits,
  type SettlementRow,
} from "@/lib/data";
import { expenseDateLabel, type SplitShare } from "@/lib/expenses";
import { remaining, status, type Debt, type Settlement } from "@/lib/ledger";
import { formatINR } from "@/lib/money";
import { expenseDeleteBlockMessage } from "@/lib/settlements";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Expense" };

function splitDebt(share: SplitShare, expenseDate: string): Debt {
  return {
    id: share.id,
    personId: share.personId,
    amount: share.amount,
    type: "split",
    expenseDate,
    dueDate: share.dueDate,
  };
}

function rowsAsSettlements(rows: readonly SettlementRow[]): Settlement[] {
  return rows.map((row) => ({ id: row.id, debtId: row.debtId, amount: row.amount }));
}

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const { id } = await params;
  const expense = await fetchExpenseById(supabase, user.id, id);
  if (!expense) notFound();

  const settledCount = await countSettlementsForExpense(supabase, user.id, id);
  const settlementsBySplit = await listSettlementsForSplits(
    supabase,
    user.id,
    expense.splits.map((share) => share.id),
  );

  let signedUrl: string | null = null;
  if (expense.receiptPath) {
    try {
      const { data } = await supabase.storage
        .from("receipts")
        .createSignedUrl(expense.receiptPath, 3600);
      signedUrl = data?.signedUrl ?? null;
    } catch {
      signedUrl = null;
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <Link
        href="/expenses"
        className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        <Icon name="back" className="h-4 w-4" />
        Back to expenses
      </Link>

      <section className="tb-card space-y-5 p-5 md:p-6">
        <div className="space-y-1">
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {formatINR(expense.amount)}
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {expense.description}
          </h1>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <Icon name="calendar" className="h-4 w-4" />
            {expenseDateLabel(expense.date)}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <CategoryChip row={expense} />
          <PaymentMethodChip method={expense.paymentMethod} />
          <SplitChip state={expense.splitState} />
          <StatusChip state={expense.splitState} />
        </div>

        {expense.splits.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Split</h2>
            <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
              {expense.splits.map((share) => {
                const debt = splitDebt(share, expense.date);
                const rowSettlements = settlementsBySplit.get(share.id) ?? [];
                const shareStatus = status(debt, rowsAsSettlements(rowSettlements));
                const remainingAmount = remaining(debt, rowsAsSettlements(rowSettlements));
                return (
                  <li key={share.id} className="p-3.5 md:p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent-deep">
                        {(share.personName ?? "?").trim().charAt(0).toUpperCase() || "?"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {share.personName ?? "Unknown person"}
                        </p>
                        <p className="text-xs text-muted">
                          {share.dueDate
                            ? `Due ${expenseDateLabel(share.dueDate)}`
                            : "No due date"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold tabular-nums text-foreground">
                          {formatINR(share.amount)}
                        </p>
                        <span
                          className={`tb-chip mt-1 ${
                            shareStatus === "pending"
                              ? "border-warning/25 bg-warning/10 text-warning"
                              : "border-success/25 bg-success/10 text-success"
                          }`}
                        >
                          {shareStatus === "pending" ? "Pending" : "Paid"}
                        </span>
                      </div>
                    </div>
                    <SettleDebt
                      debtId={share.id}
                      amount={share.amount}
                      settlements={rowSettlements}
                      remainingAmount={remainingAmount}
                      status={shareStatus}
                      expenseId={expense.id}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {expense.notes && (
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold text-foreground">Notes</h2>
            <p className="whitespace-pre-wrap rounded-lg bg-surface-muted p-3 text-sm text-foreground">
              {expense.notes}
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <h2 className="text-sm font-semibold text-foreground">Receipt</h2>
          {signedUrl ? (
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-accent transition-colors hover:bg-surface-muted"
            >
              <Icon name="receipt" className="h-4 w-4" />
              View receipt
            </a>
          ) : (
            <p className="text-sm text-muted">
              {expense.receiptPath ? "Receipt unavailable" : "No receipt attached"}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Link href={`/expenses/${expense.id}/edit`} className="tb-btn-secondary min-h-11">
            <Icon name="edit" className="h-4 w-4" />
            Edit
          </Link>
          <ExpenseDeleteButton
            expenseId={expense.id}
            blockedReason={
              settledCount > 0 ? expenseDeleteBlockMessage(settledCount) : null
            }
          />
        </div>
      </section>
    </div>
  );
}