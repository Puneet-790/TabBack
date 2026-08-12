"use client";

import {
  createSettlementAction,
  deleteSettlementAction,
} from "@/app/(app)/expenses/settle-actions";
import { Icon } from "@/components/icons";
import type { SettlementRow } from "@/lib/data";
import { expenseDateLabel, isPaymentMethod, PAYMENT_METHODS, parseExpenseAmount, todayLocalIso } from "@/lib/expenses";
import { settlementError } from "@/lib/ledger";
import { formatINR } from "@/lib/money";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SettleDebt({
  debtId,
  amount,
  settlements,
  remainingAmount,
  status,
  expenseId,
}: {
  debtId: string;
  amount: number;
  settlements: readonly SettlementRow[];
  remainingAmount: number;
  status: "pending" | "paid";
  expenseId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amountValue, setAmountValue] = useState("");
  const [method, setMethod] = useState("UPI");
  const [date, setDate] = useState(todayLocalIso());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [armedId, setArmedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function submitPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsed = parseExpenseAmount(amountValue);
    const message = settlementError(parsed === null ? NaN : parsed, remainingAmount);
    if (message) {
      setError(message);
      return;
    }
    if (!isPaymentMethod(method)) {
      setError("Choose a payment method");
      return;
    }
    setBusy(true);
    const formData = new FormData();
    formData.set("debt_id", debtId);
    if (expenseId) formData.set("expense_id", expenseId);
    formData.set("amount", amountValue);
    formData.set("method", method);
    formData.set("date", date);
    if (note.trim()) formData.set("note", note);
    const result = await createSettlementAction({}, formData);
    if (!result.ok) {
      setError(result.error ?? "Could not save the settlement");
      setBusy(false);
      return;
    }
    setOpen(false);
    setAmountValue("");
    setNote("");
    setBusy(false);
    router.refresh();
  }

  async function confirmDelete(settlementId: string) {
    setDeleting(true);
    setError(null);
    const formData = new FormData();
    formData.set("id", settlementId);
    if (expenseId) formData.set("expense_id", expenseId);
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

  const paid = settlements.reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="tabular-nums">
          {formatINR(paid)} of {formatINR(amount)} received
        </span>
        <span
          className={`tb-chip ${
            status === "pending"
              ? "border-warning/25 bg-warning/10 text-warning"
              : "border-success/25 bg-success/10 text-success"
          }`}
        >
          {status === "pending" ? `${formatINR(remainingAmount)} left` : "Fully paid"}
        </span>
      </div>

      {status === "pending" &&
        (open ? (
          <form onSubmit={submitPayment} className="space-y-2.5 rounded-xl bg-surface-muted p-3">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">
                ₹
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={amountValue}
                onChange={(event) => setAmountValue(event.target.value)}
                placeholder={formatINR(remainingAmount)}
                aria-label="Settlement amount"
                className="h-12 w-full rounded-lg border border-border bg-surface pl-8 pr-3 text-base font-semibold tabular-nums text-foreground outline-none transition-shadow placeholder:text-muted/60 focus:border-accent focus:ring-4 focus:ring-accent/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <select
                value={method}
                onChange={(event) => setMethod(event.target.value)}
                aria-label="Payment method"
                className="tb-input min-h-11"
              >
                {PAYMENT_METHODS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                aria-label="Settlement date"
                className="tb-input min-h-11"
              />
            </div>
            <input
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Note (optional)"
              className="tb-input min-h-11"
            />
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className="tb-btn-primary min-h-11 flex-1">
                {busy ? "Saving…" : "Record payment"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="tb-btn-secondary min-h-11 flex-1"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-accent transition-colors hover:bg-surface-muted"
          >
            <Icon name="check" className="h-4 w-4" />
            Record payment
          </button>
        ))}

      {settlements.length > 0 && (
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
  );
}