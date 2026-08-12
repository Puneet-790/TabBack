"use client";

import { createPersonAction } from "@/app/(app)/people/actions";
import { Icon } from "@/components/icons";
import type { PersonRow } from "@/lib/data";
import { parseExpenseAmount } from "@/lib/expenses";
import { formatINR } from "@/lib/money";
import { cleanPersonFields, validatePersonFields } from "@/lib/people";
import {
  addSplitPerson,
  distributeSplitRows,
  removeSplitPerson,
  setSplitAmount,
  setSplitDueDate,
  splitSummary,
  type SplitRow,
} from "@/lib/split-form";
import { useState } from "react";

export function SplitForm({
  people,
  amountText,
  rows,
  onChange,
}: {
  people: PersonRow[];
  amountText: string;
  rows: SplitRow[];
  onChange: (rows: SplitRow[]) => void;
}) {
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [quickError, setQuickError] = useState<string | null>(null);
  const [savingPerson, setSavingPerson] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [addedNames, setAddedNames] = useState<Record<string, string>>({});

  const amount = parseExpenseAmount(amountText);
  const canSplit = amount !== null && amount > 0;
  const summary = splitSummary(amount ?? Number.NaN, rows);

  const availablePeople = people.filter((person) => !rows.some((row) => row.personId === person.id));
  const personName = (personId: string): string =>
    addedNames[personId] ??
    people.find((person) => person.id === personId)?.name ??
    "New person";

  function commit(nextRows: SplitRow[]) {
    onChange(distributeSplitRows(amount ?? 0, nextRows));
  }

  function addPerson(personId: string) {
    const next = addSplitPerson(rows, personId);
    if (next.length === rows.length) {
      setNotice("Already added");
      return;
    }
    commit(next);
    setNotice(null);
  }

  async function handleQuickAdd() {
    if (savingPerson) return;
    const cleaned = cleanPersonFields(quickName, quickPhone, "");
    const validationError = validatePersonFields(cleaned);
    if (validationError) {
      setQuickError(validationError);
      return;
    }
    setSavingPerson(true);
    setQuickError(null);
    setNotice(null);
    const formData = new FormData();
    formData.set("name", cleaned.name);
    formData.set("phone", cleaned.phone);
    const result = await createPersonAction({}, formData);
    setSavingPerson(false);
    if (!result.ok || !result.id) {
      setQuickError(result.error ?? "Could not add the person");
      return;
    }
    const personId = result.id;
    if (!people.some((person) => person.id === personId)) {
      setAddedNames((previous) => ({ ...previous, [personId]: cleaned.name }));
    }
    addPerson(personId);
    setQuickName("");
    setQuickPhone("");
  }

  const autoMode = rows.length > 0 && !rows.some((row) => row.custom);

  return (
    <section className="space-y-2.5">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Split with others (optional)</h2>
        <p className="text-xs text-muted">Add people — their shares come off the total, and the rest becomes your share.</p>
      </div>

      {!canSplit && (
        <p className="text-sm text-muted">Enter the expense amount to split it.</p>
      )}

      {canSplit && (
        <>
          <div className="space-y-2">
            <select
              aria-label="Add a person"
              value=""
              onChange={(event) => {
                if (event.target.value !== "") addPerson(event.target.value);
              }}
              className="tb-input min-h-11 w-full"
            >
              <option value="">Add a person…</option>
              {availablePeople.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={quickName}
                onChange={(event) => setQuickName(event.target.value)}
                placeholder="New person's name (tap + to add)"
                aria-label="New person's name"
                className="tb-input min-h-11 min-w-0 flex-1"
              />
              <div className="flex gap-2">
                <input
                  type="tel"
                  inputMode="tel"
                  value={quickPhone}
                  onChange={(event) => setQuickPhone(event.target.value)}
                  placeholder="Phone (optional)"
                  aria-label="New person's phone"
                  className="tb-input min-h-11 min-w-0 flex-1 sm:w-36"
                />
                <button
                  type="button"
                  onClick={handleQuickAdd}
                  disabled={savingPerson}
                  aria-label="Add person"
                  className="tb-btn-primary min-h-11 shrink-0 px-4"
                >
                  <Icon name="plus" className="h-4 w-4" />
                  {savingPerson ? "Adding…" : "Add"}
                </button>
              </div>
            </div>

            {people.length === 0 && (
              <p className="text-xs text-muted">
                No saved people yet — quick-add friends above, or add them on the People page.
              </p>
            )}
          </div>

          {(quickError || notice) && (
            <p role="alert" className={`text-sm ${quickError ? "text-danger" : "text-accent"}`}>
              {quickError ?? notice}
            </p>
          )}

          {rows.length > 0 && (
            <>
              {autoMode && (
                <p className="text-xs text-accent">
                  Divided equally between {rows.length} {rows.length === 1 ? "person" : "people"} — edit any amount to set shares manually.
                </p>
              )}
              <ul className="space-y-2">
                {rows.map((row) => {
                  const name = personName(row.personId);
                  return (
                  <li key={row.personId} className="rounded-xl border border-border bg-surface p-3">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {name}
                      </span>
                      <div className="relative w-32 shrink-0">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">
                          ₹
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.amountText}
                          onChange={(event) =>
                            commit(setSplitAmount(rows, row.personId, event.target.value))
                          }
                          aria-label={`Share for ${name}`}
                          className="h-11 w-full rounded-lg border border-border bg-surface pl-7 pr-2 text-right text-sm font-semibold tabular-nums text-foreground outline-none transition-shadow placeholder:text-muted/60 focus:border-accent focus:ring-4 focus:ring-accent/20"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => commit(removeSplitPerson(rows, row.personId))}
                        aria-label={`Remove ${name}`}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-danger"
                      >
                        <Icon name="x" className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Icon name="calendar" className="h-4 w-4 shrink-0 text-muted" />
                      <input
                        type="date"
                        value={row.dueDate}
                        onChange={(event) =>
                          commit(setSplitDueDate(rows, row.personId, event.target.value))
                        }
                        aria-label={`Due date for ${name}`}
                        className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-surface px-2 text-sm text-foreground outline-none transition-shadow focus:border-accent focus:ring-4 focus:ring-accent/20"
                      />
                      <span className="shrink-0 text-xs text-muted">optional</span>
                    </div>
                  </li>
                );
              })}
              </ul>
            </>
          )}

          {rows.length > 0 && (
            <div
              className={`flex items-center justify-between gap-3 rounded-xl p-3.5 ${
                summary.ok ? "bg-surface-muted" : "bg-danger/10"
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm text-muted">Your share</p>
                {summary.ok ? (
                  <p className="text-lg font-semibold tabular-nums tracking-tight text-foreground">
                    {formatINR(summary.userShare)}
                  </p>
                ) : (
                  <p role="alert" className="text-sm font-medium text-danger">
                    {summary.error}
                  </p>
                )}
              </div>
              {summary.ok && summary.userShare === 0 && (
                <p className="max-w-40 text-right text-xs text-muted">
                  You paid the whole round
                </p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
