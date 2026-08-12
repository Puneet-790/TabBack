"use client";

import {
  createCategoryAction,
  deleteCategoryAction,
  renameCategoryAction,
  type CategoryActionState,
} from "@/app/(app)/settings/category-actions";
import { Icon } from "@/components/icons";
import type { Category } from "@/lib/categories";
import { useRouter } from "next/navigation";
import { useState, useActionState, type FormEvent } from "react";

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [addState, addAction, adding] = useActionState<CategoryActionState, FormData>(
    createCategoryAction,
    {},
  );
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const custom = categories.filter((category) => !category.isDefault);
  const defaults = categories.filter((category) => category.isDefault);

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("name", newName);
    addAction(formData);
    setNewName("");
    router.refresh();
  }

  async function saveRename(category: Category) {
    setRenameError(null);
    const formData = new FormData();
    formData.set("id", category.id);
    formData.set("name", renameValue);
    const result = await renameCategoryAction({}, formData);
    if (!result.ok) {
      setRenameError(result.error ?? "Could not rename the category");
      return;
    }
    setRenamingId(null);
    router.refresh();
  }

  async function confirmDelete(category: Category) {
    setDeleteError(null);
    const formData = new FormData();
    formData.set("id", category.id);
    const result = await deleteCategoryAction({}, formData);
    if (!result.ok) {
      setDeleteError(result.error ?? "Could not delete the category");
      setDeletingId(null);
      return;
    }
    setDeletingId(null);
    router.refresh();
  }

  return (
    <section className="tb-card space-y-4 p-6" aria-labelledby="categories-heading">
      <div>
        <h2 id="categories-heading" className="text-sm font-semibold text-foreground">
          Categories
        </h2>
        <p className="mt-0.5 text-xs text-muted">
          Defaults stay available to everyone; your own categories are private to you.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {defaults.map((category) => (
          <span key={category.id} className="tb-chip">
            {category.name}
          </span>
        ))}
      </div>

      <form onSubmit={handleAdd} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="new-category-name" className="sr-only">
          New category name
        </label>
        <input
          id="new-category-name"
          type="text"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="New category name"
          className="tb-input min-h-11 flex-1"
        />
        <button type="submit" disabled={adding} className="tb-btn-primary min-h-11">
          {adding ? "Adding…" : "Add category"}
        </button>
      </form>
      {addState.error && (
        <p role="alert" className="text-sm text-danger">
          {addState.error}
        </p>
      )}

      {custom.length > 0 && (
        <ul className="space-y-2" aria-label="Your categories">
          {custom.map((category) => (
            <li
              key={category.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
            >
              {renamingId === category.id ? (
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    aria-label={`Rename ${category.name}`}
                    className="tb-input min-h-10 min-w-40 flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => saveRename(category)}
                    className="tb-btn-primary min-h-10"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenamingId(null)}
                    className="tb-btn-secondary min-h-10"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <span className="min-w-0 truncate text-sm font-medium text-foreground">
                    {category.name}
                  </span>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingId(category.id);
                        setRenameValue(category.name);
                      }}
                      aria-label={`Rename ${category.name}`}
                      className="grid h-10 w-10 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
                    >
                      <Icon name="edit" className="h-4 w-4" />
                    </button>
                    {deletingId === category.id ? (
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => confirmDelete(category)}
                          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-danger px-3 text-sm font-medium text-surface"
                        >
                          Confirm delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(null)}
                          className="tb-btn-secondary min-h-10 px-3"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeletingId(category.id)}
                        aria-label={`Delete ${category.name}`}
                        className="grid h-10 w-10 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-danger"
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {deleteError && (
        <p role="alert" className="text-sm text-danger">
          {deleteError}
        </p>
      )}
      {renameError && (
        <p role="alert" className="text-sm text-danger">
          {renameError}
        </p>
      )}
    </section>
  );
}