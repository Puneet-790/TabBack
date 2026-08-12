"use client";

import {
  deleteBudgetAction,
  upsertBudgetAction,
  type BudgetActionState,
} from "@/app/(app)/budgets/actions";
import { Icon } from "@/components/icons";
import { parseBudgetAmount } from "@/lib/budgets";
import type { Category } from "@/lib/categories";
import type { BudgetRow } from "@/lib/data";
import { monthLabel } from "@/lib/dashboard";
import { startTransition, useActionState, useEffect, useState } from "react";

interface LimitRow {
  categoryId: string;
  amount: string;
}

export function BudgetEditor({
  month,
  budget,
  categories,
}: {
  month: string;
  budget: BudgetRow | null;
  categories: Category[];
}) {
  const [saveState, saveAction, saving] = useActionState<BudgetActionState, FormData>(
    upsertBudgetAction,
    {},
  );
  const [deleteState, deleteAction, deleting] = useActionState<BudgetActionState, FormData>(
    deleteBudgetAction,
    {},
  );
  const [overallLimit, setOverallLimit] = useState(
    budget && budget.overallLimit > 0 ? String(budget.overallLimit) : "",
  );
  const [rows, setRows] = useState<LimitRow[]>(() =>
    budget
      ? Object.entries(budget.categoryLimits).map(([categoryId, amount]) => ({
          categoryId,
          amount: String(amount),
        }))
      : [],
  );
  const [error, setError] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    setOverallLimit(budget && budget.overallLimit > 0 ? String(budget.overallLimit) : "");
    setRows(
      budget
        ? Object.entries(budget.categoryLimits).map(([categoryId, amount]) => ({
            categoryId,
            amount: String(amount),
          }))
        : [],
    );
    setArmed(false);
    setError(null);
  }, [budget]);

  function updateRow(index: number, patch: Partial<LimitRow>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (parseBudgetAmount(overallLimit) === null) {
      setError("Enter a valid overall limit");
      return;
    }
    for (const row of rows) {
      if (row.categoryId === "" && row.amount.trim() !== "") {
        setError("Choose a category for each limit");
        return;
      }
      if (row.categoryId !== "" && parseBudgetAmount(row.amount) === null) {
        setError("Enter a valid amount for each category limit");
        return;
      }
    }
    const formData = new FormData();
    formData.set("month", month);
    formData.set("overall_limit", overallLimit);
    const filled = rows.filter((row) => row.categoryId !== "" && row.amount.trim() !== "");
    filled.forEach((row, index) => {
      formData.set(`limit_categories_${index}`, row.categoryId);
      formData.set(`limit_amounts_${index}`, row.amount);
    });
    startTransition(() => saveAction(formData));
  }

  return (
    <section className="tb-card flex flex-col gap-4 p-4" aria-labelledby="budget-editor-heading">
      <div>
        <h2 id="budget-editor-heading" className="text-base font-semibold tracking-tight text-foreground">
          Edit budget
        </h2>
        <p className="text-sm text-muted">
          {budget
            ? `Limits for ${monthLabel(month)}. Spend counts from the 1st, even if you set this now.`
            : `No budget set for ${monthLabel(month)} yet.`}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="budget-overall" className="text-sm font-medium text-foreground">
            Overall monthly limit
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">
              ₹
            </span>
            <input
              id="budget-overall"
              name="overall_limit"
              type="text"
              inputMode="decimal"
              value={overallLimit}
              onChange={(event) => setOverallLimit(event.target.value)}
              placeholder="No overall limit"
              className="h-12 w-full rounded-lg border border-border bg-surface pl-8 pr-3 text-base font-semibold tabular-nums text-foreground outline-none transition-shadow placeholder:text-muted/60 focus:border-accent focus:ring-4 focus:ring-accent/20"
            />
          </div>
        </div>

        {rows.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">Per-category limits</span>
            <div className="space-y-2">
              {rows.map((row, index) => (
                <div key={index} className="flex items-center gap-2">
                  <select
                    aria-label={`Category ${index + 1}`}
                    value={row.categoryId}
                    onChange={(event) => updateRow(index, { categoryId: event.target.value })}
                    className="tb-input min-h-11 min-w-0 flex-1"
                  >
                    <option value="">Choose a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <div className="relative w-28 shrink-0">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">
                      ₹
                    </span>
                    <input
                      aria-label={`Limit amount ${index + 1}`}
                      type="text"
                      inputMode="decimal"
                      value={row.amount}
                      onChange={(event) => updateRow(index, { amount: event.target.value })}
                      placeholder="0"
                      className="h-12 w-full rounded-lg border border-border bg-surface pl-6 pr-2.5 text-sm font-semibold tabular-nums text-foreground outline-none transition-shadow placeholder:text-muted/60 focus:border-accent focus:ring-4 focus:ring-accent/20"
                    />
                  </div>
                  <button
                    type="button"
                    aria-label="Remove limit"
                    onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
                  >
                    <Icon name="x" className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setRows((current) => [...current, { categoryId: "", amount: "" }])}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 text-sm font-medium text-accent transition-colors hover:bg-accent-soft"
        >
          <Icon name="plus" className="h-4 w-4" />
          Add category limit
        </button>

        {(error || saveState.error) && (
          <p role="alert" className="text-sm text-danger">
            {error ?? saveState.error}
          </p>
        )}

        <button type="submit" disabled={saving} className="tb-btn-primary min-h-11 w-full">
          {saving ? "Saving…" : "Save budget"}
        </button>
      </form>

      {budget && (
        <div className="border-t border-border pt-4">
          {!armed ? (
            <button
              type="button"
              onClick={() => setArmed(true)}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-danger transition-colors hover:bg-surface-muted"
            >
              <Icon name="trash" className="h-4 w-4" />
              Delete budget
            </button>
          ) : (
            <form action={deleteAction} className="space-y-2">
              <input type="hidden" name="month" value={month} />
              <p className="text-sm text-muted">
                Delete the budget for {monthLabel(month)}? This clears all limits.
              </p>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={deleting}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-danger px-4 text-sm font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <Icon name="trash" className="h-4 w-4" />
                  {deleting ? "Deleting…" : "Confirm delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setArmed(false)}
                  disabled={deleting}
                  className="tb-btn-secondary min-h-11 flex-1"
                >
                  Cancel
                </button>
              </div>
              {deleteState.error && (
                <p role="alert" className="text-sm text-danger">
                  {deleteState.error}
                </p>
              )}
            </form>
          )}
        </div>
      )}
    </section>
  );
}
