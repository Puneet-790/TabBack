"use client";

import {
  createExpenseAction,
  updateExpenseAction,
  type ExpenseActionState,
} from "@/app/(app)/expenses/actions";
import { Icon } from "@/components/icons";
import { SplitForm } from "@/components/expenses/split-form";
import { uncategorisedLabel, type Category } from "@/lib/categories";
import type { ExpenseRow, PersonRow } from "@/lib/data";
import {
  isValidDate,
  parseExpenseAmount,
  PAYMENT_METHODS,
  todayLocalIso,
  validateReceiptFile,
} from "@/lib/expenses";
import {
  initialSplitRows,
  splitFormError,
  type SplitRow,
} from "@/lib/split-form";
import { expenseLockMessage } from "@/lib/settlements";
import { formatINR } from "@/lib/money";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState, useActionState, type DragEvent, type FormEvent } from "react";

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
      {children}
    </label>
  );
}

export function ExpenseForm({
  mode,
  categories,
  people,
  expense,
  settledCount = 0,
}: {
  mode: "create" | "edit";
  categories: Category[];
  people: PersonRow[];
  expense?: ExpenseRow;
  settledCount?: number;
}) {
  const router = useRouter();
  const action = mode === "create" ? createExpenseAction : updateExpenseAction;
  const [state, formAction, pending] = useActionState<ExpenseActionState, FormData>(action, {});
  const locked = expense !== undefined && settledCount > 0;
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [date, setDate] = useState(expense?.date ?? todayLocalIso());
  const [paymentMethod, setPaymentMethod] = useState(expense?.paymentMethod ?? "UPI");
  const [categoryId, setCategoryId] = useState(expense?.categoryId ?? "");
  const [notes, setNotes] = useState(expense?.notes ?? "");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [removeReceipt, setRemoveReceipt] = useState(false);
  const [splitRows, setSplitRows] = useState<SplitRow[]>(() =>
    initialSplitRows(expense?.splits ?? []),
  );
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!state.ok) return;
    router.push(mode === "create" ? `/expenses/${state.id}` : `/expenses/${expense!.id}`);
  }, [state, router, mode, expense]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = parseExpenseAmount(amount);
    if (parsedAmount === null) {
      setLocalError("Enter a valid amount");
      return;
    }
    if (description.trim().length === 0) {
      setLocalError("Enter a description");
      return;
    }
    if (!isValidDate(date)) {
      setLocalError("Enter a valid date");
      return;
    }
    if (receiptFile) {
      const fileError = validateReceiptFile(receiptFile);
      if (fileError) {
        setLocalError(fileError);
        return;
      }
    }
    const splitError = splitFormError(parsedAmount, splitRows);
    if (splitError) {
      setLocalError(splitError);
      return;
    }
    setLocalError(null);
    const formData = new FormData();
    formData.set("amount", amount);
    formData.set("description", description);
    formData.set("date", date);
    formData.set("payment_method", paymentMethod);
    formData.set("category_id", categoryId);
    if (notes.trim()) formData.set("notes", notes);
    if (receiptFile) formData.set("receipt", receiptFile);
    if (mode === "edit") {
      formData.set("id", expense!.id);
      if (removeReceipt) formData.set("remove_receipt", "on");
    }
    if (!locked) {
      formData.set("split_submitted", "on");
      splitRows.forEach((row, index) => {
        formData.set(`split_person_ids_${index}`, row.personId);
        formData.set(`split_amounts_${index}`, row.amountText.trim());
        formData.set(`split_due_dates_${index}`, row.dueDate);
      });
    }
    startTransition(() => formAction(formData));
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0] ?? null;
    setReceiptFile(file);
  }

  const error = localError ?? state.error ?? null;

  return (
    <form onSubmit={handleSubmit} className="tb-card space-y-5 p-5" noValidate>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="expense-amount">Amount</FieldLabel>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-muted">
            ₹
          </span>
          <input
            id="expense-amount"
            type="text"
            inputMode="decimal"
            autoFocus
            disabled={locked}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
            className="h-16 w-full rounded-xl border border-border bg-surface pl-12 pr-4 text-3xl font-semibold tabular-nums text-foreground outline-none transition-shadow placeholder:text-muted/60 focus:border-accent focus:ring-4 focus:ring-accent/20 disabled:bg-surface-muted disabled:text-muted"
          />
        </div>
      </div>

      {locked && (
        <p
          role="status"
          className="rounded-lg border border-warning/30 bg-warning/5 px-3.5 py-2.5 text-sm text-warning"
        >
          {expenseLockMessage(settledCount)}
        </p>
      )}

      <div className="space-y-1.5">
        <FieldLabel htmlFor="expense-description">Description</FieldLabel>
        <input
          id="expense-description"
          type="text"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What did you spend on?"
          className="tb-input"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <FieldLabel htmlFor="expense-date">Date</FieldLabel>
          <input
            id="expense-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="tb-input"
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="expense-method">Payment method</FieldLabel>
          <select
            id="expense-method"
            disabled={locked}
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value)}
            className="tb-input disabled:bg-surface-muted disabled:text-muted"
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <FieldLabel htmlFor="expense-category">Category</FieldLabel>
        <select
          id="expense-category"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="tb-input"
        >
          <option value="">{uncategorisedLabel}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.isDefault ? category.name : `${category.name} (custom)`}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <FieldLabel htmlFor="expense-notes">Notes (optional)</FieldLabel>
        <textarea
          id="expense-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Anything worth remembering"
          rows={3}
          className="min-h-20 w-full rounded-lg border border-border bg-surface p-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted/60 focus:border-accent focus:ring-4 focus:ring-accent/20"
        />
      </div>

      {locked ? (
        <div className="space-y-2 rounded-xl border border-border bg-surface-muted p-3.5">
          <p className="text-sm font-medium text-foreground">Split (locked)</p>
          <ul className="space-y-1.5">
            {expense!.splits.map((share) => (
              <li key={share.id} className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {share.personName ?? "Unknown person"}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                  {formatINR(share.amount)}
                </span>
                {share.dueDate && (
                  <span className="shrink-0 text-xs text-muted">{share.dueDate}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <SplitForm
          people={people}
          amountText={amount}
          rows={splitRows}
          onChange={setSplitRows}
        />
      )}

      <div className="space-y-1.5">
        <span className="text-sm font-medium text-foreground">Receipt (optional)</span>
        <label
          htmlFor="expense-receipt"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
          className={`flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition-colors ${
            receiptFile
              ? "border-accent bg-accent-soft/50 text-accent"
              : "border-border text-muted hover:border-accent/50 hover:bg-surface-muted"
          }`}
        >
          <Icon name={receiptFile ? "check" : "image"} className="h-6 w-6" />
          <span className="text-sm font-medium">
            {receiptFile ? receiptFile.name : "Add a receipt"}
          </span>
          {receiptFile ? (
            <span className="text-xs">
              {(receiptFile.size / 1024 / 1024).toFixed(2)} MB
            </span>
          ) : (
            <span className="text-xs">Image or PDF, up to 5 MB</span>
          )}
          <input
            id="expense-receipt"
            type="file"
            accept="image/*,application/pdf"
            className="sr-only"
            onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)}
          />
        </label>
        {mode === "edit" && expense?.receiptPath && !receiptFile && (
          <label className="flex min-h-11 cursor-pointer items-center gap-2 px-1 text-sm text-muted">
            <input
              type="checkbox"
              checked={removeReceipt}
              onChange={(event) => setRemoveReceipt(event.target.checked)}
              className="h-5 w-5 accent-accent"
            />
            Remove the current receipt
          </label>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="tb-btn-primary min-h-12 w-full text-base"
      >
        {pending ? "Saving…" : mode === "create" ? "Save expense" : "Save changes"}
      </button>
    </form>
  );
}