"use client";

import {
  createPersonAction,
  deletePersonAction,
  updatePersonAction,
  type PersonActionState,
} from "@/app/(app)/people/actions";
import { Icon } from "@/components/icons";
import type { PersonRow } from "@/lib/data";
import { useActionState, useEffect, useState } from "react";

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
      {children}
    </label>
  );
}

export function PersonSheet({
  person,
  onClose,
  onSaved,
}: {
  person: PersonRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = person !== null;
  const [saveState, saveAction, saving] = useActionState<PersonActionState, FormData>(
    isEdit ? updatePersonAction : createPersonAction,
    {},
  );
  const [name, setName] = useState(person?.name ?? "");
  const [phone, setPhone] = useState(person?.phone ?? "");
  const [email, setEmail] = useState(person?.email ?? "");
  const [armed, setArmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  async function confirmDelete() {
    if (!person) return;
    setDeleting(true);
    setDeleteError(null);
    const formData = new FormData();
    formData.set("id", person.id);
    const result = await deletePersonAction({}, formData);
    if (result.ok) {
      onSaved();
      return;
    }
    setDeleteError(result.error ?? "Could not delete the person");
    setDeleting(false);
    setArmed(false);
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
        aria-labelledby="person-sheet-title"
        className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-surface p-5 pb-8 shadow-modal md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:max-h-[90dvh] md:w-full md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border md:hidden" />
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-base font-semibold text-accent-deep">
              {name.trim().charAt(0).toUpperCase() || "?"}
            </span>
            <div>
              <h2 id="person-sheet-title" className="text-lg font-semibold text-foreground">
                {isEdit ? "Edit person" : "Add person"}
              </h2>
              <p className="text-sm text-muted">
                {isEdit ? "Update details or remove this person." : "Who do you split money with?"}
              </p>
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

        <form action={saveAction} className="space-y-4">
          {isEdit && <input type="hidden" name="id" value={person.id} />}
          <div className="space-y-1.5">
            <FieldLabel htmlFor="person-name">Name</FieldLabel>
            <input
              id="person-name"
              name="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Rahul Gupta"
              className="tb-input min-h-11"
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="person-phone">Phone (optional)</FieldLabel>
            <input
              id="person-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+91 98765 43210"
              className="tb-input min-h-11"
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="person-email">Email (optional)</FieldLabel>
            <input
              id="person-email"
              name="email"
              type="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              className="tb-input min-h-11"
            />
          </div>
          {saveState.error && (
            <p role="alert" className="text-sm text-danger">
              {saveState.error}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving} className="tb-btn-primary min-h-11 flex-1">
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add person"}
            </button>
            <button type="button" onClick={onClose} disabled={saving} className="tb-btn-secondary min-h-11 flex-1">
              Cancel
            </button>
          </div>
        </form>

        {isEdit && (
          <div className="mt-6 border-t border-border pt-4">
            {deleteError && (
              <p role="alert" className="text-sm text-danger">
                {deleteError}
              </p>
            )}
            {!armed ? (
              <button
                type="button"
                onClick={() => setArmed(true)}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-danger transition-colors hover:bg-surface-muted"
              >
                <Icon name="trash" className="h-4 w-4" />
                Delete person
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted">
                  Delete {person.name}? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={confirmDelete}
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
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}