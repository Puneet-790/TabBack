"use client";

import Link from "next/link";
import { useState } from "react";
import { ExpenseRowItem } from "@/components/expenses/expense-row";
import { Icon } from "@/components/icons";
import { EXPENSE_PAGE_SIZE, type ExpensePageResult, type ExpenseRow } from "@/lib/data";

function SkeletonRow() {
  return (
    <li className="tb-card flex min-h-20 flex-col justify-center gap-2 px-4 py-3">
      <div className="h-4 w-2/3 animate-pulse rounded bg-surface-muted" />
      <div className="h-3 w-1/3 animate-pulse rounded bg-surface-muted" />
      <div className="h-3 w-1/4 animate-pulse rounded bg-surface-muted" />
    </li>
  );
}

export function ExpenseList({
  initialItems,
  initialOffset,
  initialHasMore,
  hasQuery,
}: {
  initialItems: ExpenseRow[];
  initialOffset: number;
  initialHasMore: boolean;
  hasQuery: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [offset, setOffset] = useState(initialOffset);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const filters = new URLSearchParams(window.location.search);
      const response = await fetch(`/api/expenses?${filters}&offset=${offset}`, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("Could not load more expenses");
      const page: ExpensePageResult = await response.json();
      setItems((current) => [...current, ...page.items]);
      setOffset(page.offset);
      setHasMore(page.hasMore);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load more expenses");
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <section className="tb-card flex flex-col items-center gap-4 px-6 py-14 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
          <Icon name="wallet" className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">
            {hasQuery ? "No expenses match" : "No expenses yet"}
          </h2>
          <p className="text-sm text-muted">
            {hasQuery
              ? "Try adjusting your search or filters."
              : "Track your first spend in under 10 seconds."}
          </p>
        </div>
        {!hasQuery && (
          <Link href="/expenses/new" className="tb-btn-primary min-h-11">
            Add your first expense
          </Link>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {items.map((expense) => (
          <ExpenseRowItem key={expense.id} expense={expense} />
        ))}
        {loading && (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        )}
      </ul>
      {error && (
        <p role="alert" className="text-center text-sm text-danger">
          {error}
        </p>
      )}
      {hasMore && !loading && (
        <button
          type="button"
          onClick={loadMore}
          className="tb-btn-secondary w-full min-h-11"
        >
          Load more
        </button>
      )}
      {!hasMore && items.length >= EXPENSE_PAGE_SIZE && (
        <p className="text-center text-xs text-muted">You have reached the end</p>
      )}
    </div>
  );
}