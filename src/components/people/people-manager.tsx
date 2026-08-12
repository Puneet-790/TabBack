"use client";

import { Icon } from "@/components/icons";
import { deletePersonAction } from "@/app/(app)/people/actions";
import { PersonHistory } from "@/components/people/person-history";
import { PersonSheet } from "@/components/people/person-sheet";
import type { PersonRow, ReminderRow, SettlementRow } from "@/lib/data";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export function PeopleManager({
  people,
  q,
  settlements,
  reminders,
}: {
  people: PersonRow[];
  q: string;
  settlements: Record<string, SettlementRow[]>;
  reminders: Record<string, ReminderRow[]>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(q);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<PersonRow | null>(null);
  const [armedDeleteId, setArmedDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const queryString = searchParams.toString();

  useEffect(() => {
    setSearchValue(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(queryString);
      const current = params.get("q") ?? "";
      if (searchValue === current) return;
      if (searchValue.trim() === "") {
        params.delete("q");
      } else {
        params.set("q", searchValue);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [queryString, searchValue, pathname, router]);

  const editingKey = editing?.id ?? "new";
  const hasQuery = q.trim() !== "";

  function openCreate() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(person: PersonRow) {
    setEditing(person);
    setSheetOpen(true);
  }

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setEditing(null);
  }, []);

  const onSaved = useCallback(() => {
    closeSheet();
    router.refresh();
  }, [closeSheet, router]);

  async function confirmDelete(person: PersonRow) {
    setDeleting(true);
    setDeleteError(null);
    const formData = new FormData();
    formData.set("id", person.id);
    const result = await deletePersonAction({}, formData);
    if (result.ok) {
      router.refresh();
      return;
    }
    setDeleteError(result.error ?? "Could not delete the person");
    setDeleting(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search people"
            aria-label="Search people"
            className="tb-input h-12 pl-10"
          />
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="tb-btn-primary min-h-11 sm:shrink-0"
        >
          <Icon name="plus" className="h-4 w-4" />
          Add person
        </button>
      </div>

      {people.length === 0 ? (
        <section className="tb-card flex flex-col items-center gap-4 px-6 py-14 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
            <Icon name="users" className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">
              {hasQuery ? "No people match" : "No people yet"}
            </h2>
            <p className="text-sm text-muted">
              {hasQuery
                ? "Try a different name, phone or email."
                : "Add the friends you split money with."}
            </p>
          </div>
          {!hasQuery && (
            <button type="button" onClick={openCreate} className="tb-btn-primary min-h-11">
              Add a person
            </button>
          )}
        </section>
      ) : (
        <ul className="space-y-3">
          {people.map((person) => (
            <li key={person.id}>
              <div className="tb-card px-3 py-3 transition-shadow hover:shadow-md">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openEdit(person)}
                    className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg text-left"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent-deep">
                      {person.name.trim().charAt(0).toUpperCase() || "?"}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {person.name}
                      </span>
                      {(person.phone || person.email) && (
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                          {person.phone && (
                            <span className="truncate text-xs tabular-nums text-muted">
                              {person.phone}
                            </span>
                          )}
                          {person.email && (
                            <span className="truncate text-xs text-muted">{person.email}</span>
                          )}
                        </span>
                      )}
                    </span>
                  </button>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(person)}
                      aria-label={`Edit ${person.name}`}
                      className="grid h-10 w-10 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
                    >
                      <Icon name="edit" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setArmedDeleteId((current) => (current === person.id ? null : person.id))
                      }
                      aria-label={`Delete ${person.name}`}
                      className="grid h-10 w-10 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-danger"
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <PersonHistory
                  settlements={settlements[person.id] ?? []}
                  reminders={reminders[person.id] ?? []}
                />
                {armedDeleteId === person.id && (
                  <div className="mt-3 space-y-2 rounded-lg border border-border bg-surface-muted p-3">
                    {deleteError && (
                      <p role="alert" className="text-sm text-danger">
                        {deleteError}
                      </p>
                    )}
                    <p className="text-sm text-muted">
                      Delete {person.name}? This cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => confirmDelete(person)}
                        disabled={deleting}
                        className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-danger px-4 text-sm font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        <Icon name="trash" className="h-4 w-4" />
                        {deleting ? "Deleting…" : "Confirm delete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setArmedDeleteId(null)}
                        disabled={deleting}
                        className="tb-btn-secondary min-h-10 flex-1"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {sheetOpen && (
        <PersonSheet
          key={editingKey}
          person={editing}
          onClose={closeSheet}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}