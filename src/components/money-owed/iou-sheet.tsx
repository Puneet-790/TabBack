"use client";

import { createIouAction, type MoneyOwedActionState } from "@/app/(app)/money-owed/actions";
import { Icon } from "@/components/icons";
import type { PersonRow } from "@/lib/data";
import { parseExpenseAmount, todayLocalIso } from "@/lib/expenses";
import { iouDirectionLabel } from "@/lib/ious";
import type { DebtDirection } from "@/lib/ledger";
import Link from "next/link";
import { startTransition, useActionState, useEffect, useState } from "react";

export function IouSheet({
  people,
  onClose,
  onSaved,
}: {
  people: PersonRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saveState, saveAction, saving] = useActionState<MoneyOwedActionState, FormData>(
    createIouAction,
    {},
  );
  const [personId, setPersonId] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<DebtDirection>("to_receive");
  const [date, setDate] = useState(todayLocalIso());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (saveState.ok) onSaved();
  }, [saveState, onSaved]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!personId) {
      setError("Choose a person");
      return;
    }
    const parsed = parseExpenseAmount(amount);
    if (parsed === null || parsed <= 0) {
      setError("Enter a valid amount");
      return;
    }
    startTransition(() => saveAction(new FormData(event.currentTarget)));
  }

  return (
    <div className="fixed inset-0 z-modal">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-foreground/40"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="iou-sheet-title"
        className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-surface p-5 pb-8 shadow-modal md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:max-h-[90dvh] md:w-full md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border md:hidden" />
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
              <Icon name="coins" className="h-5 w-5" />
            </span>
            <div>
              <h2 id="iou-sheet-title" className="text-lg font-semibold text-foreground">
                Add a manual IOU
              </h2>
              <p className="text-sm text-muted">A debt that isn&apos;t tied to an expense.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        {people.length === 0 ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted">
              Add a person first, then log the money you lent or borrowed.
            </p>
            <Link href="/people" className="tb-btn-primary min-h-11 w-full">
              <Icon name="users" className="h-4 w-4" />
              Go to People
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="iou-person" className="text-sm font-medium text-foreground">
                Person
              </label>
              <select
                id="iou-person"
                name="person_id"
                value={personId}
                onChange={(event) => setPersonId(event.target.value)}
                className="tb-input min-h-11"
              >
                <option value="">Choose a person</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Direction</span>
              <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Who owes whom">
                {(["to_receive", "to_pay"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={direction === option}
                    onClick={() => setDirection(option)}
                    className={`min-h-11 rounded-lg border px-3 text-sm font-medium transition-colors ${
                      direction === option
                        ? "border-accent bg-accent-soft text-accent-deep"
                        : "border-border bg-surface text-muted hover:bg-surface-muted"
                    }`}
                  >
                    {iouDirectionLabel(option)}
                  </button>
                ))}
              </div>
              <input type="hidden" name="direction" value={direction} />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="iou-amount" className="text-sm font-medium text-foreground">
                Amount
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">
                  ₹
                </span>
                <input
                  id="iou-amount"
                  name="amount"
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  className="h-12 w-full rounded-lg border border-border bg-surface pl-8 pr-3 text-base font-semibold tabular-nums text-foreground outline-none transition-shadow placeholder:text-muted/60 focus:border-accent focus:ring-4 focus:ring-accent/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="iou-date" className="text-sm font-medium text-foreground">
                Date
              </label>
              <input
                id="iou-date"
                name="date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="tb-input min-h-11"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="iou-note" className="text-sm font-medium text-foreground">
                Note (optional)
              </label>
              <input
                id="iou-note"
                name="note"
                type="text"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="e.g. cab fare for the trip"
                className="tb-input min-h-11"
              />
            </div>

            {(error || saveState.error) && (
              <p role="alert" className="text-sm text-danger">
                {error ?? saveState.error}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="tb-btn-primary min-h-11 flex-1">
                {saving ? "Saving…" : "Add IOU"}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="tb-btn-secondary min-h-11 flex-1"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}