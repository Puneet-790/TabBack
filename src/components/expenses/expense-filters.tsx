"use client";

import { Icon } from "@/components/icons";
import type { Category } from "@/lib/categories";
import type { PersonRow } from "@/lib/data";
import { PAYMENT_METHODS } from "@/lib/expenses";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const FILTER_KEYS = [
  "from",
  "to",
  "category",
  "min",
  "max",
  "method",
  "person",
  "split",
  "status",
] as const;

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
      {children}
    </label>
  );
}

export function ExpenseFilters({
  categories,
  people,
}: {
  categories: Category[];
  people: PersonRow[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get("q") ?? "");
  const [open, setOpen] = useState(false);
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

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function selectValue(key: string): string {
    return searchParams.get(key) ?? "";
  }

  const activeCount = FILTER_KEYS.filter((key) => searchParams.has(key)).length;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Icon
          name="search"
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search expenses"
          aria-label="Search expenses"
          className="tb-input h-12 pl-10"
        />
      </div>
      <div className="flex items-center justify-between gap-3 md:justify-start">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="tb-btn-secondary min-h-11 md:hidden"
        >
          <Icon name="filter" className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-semibold text-accent-ink">
              {activeCount}
            </span>
          )}
        </button>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => router.replace(pathname, { scroll: false })}
            className="min-h-11 rounded-md px-3 text-sm font-medium text-accent"
          >
            Clear filters
          </button>
        )}
      </div>
      <fieldset
        className={`${open ? "block" : "hidden"} space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-card md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3`}
      >
        <div className="space-y-1.5">
          <FieldLabel htmlFor="filter-from">From date</FieldLabel>
          <input
            id="filter-from"
            type="date"
            value={selectValue("from")}
            onChange={(event) => updateParam("from", event.target.value)}
            className="tb-input"
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="filter-to">To date</FieldLabel>
          <input
            id="filter-to"
            type="date"
            value={selectValue("to")}
            onChange={(event) => updateParam("to", event.target.value)}
            className="tb-input"
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="filter-category">Category</FieldLabel>
          <select
            id="filter-category"
            value={selectValue("category")}
            onChange={(event) => updateParam("category", event.target.value)}
            className="tb-input"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.isDefault ? category.name : `${category.name} (custom)`}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="filter-min">Min amount (₹)</FieldLabel>
          <input
            id="filter-min"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={selectValue("min")}
            onChange={(event) => updateParam("min", event.target.value)}
            className="tb-input"
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="filter-max">Max amount (₹)</FieldLabel>
          <input
            id="filter-max"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={selectValue("max")}
            onChange={(event) => updateParam("max", event.target.value)}
            className="tb-input"
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="filter-method">Payment method</FieldLabel>
          <select
            id="filter-method"
            value={selectValue("method")}
            onChange={(event) => updateParam("method", event.target.value)}
            className="tb-input"
          >
            <option value="">All methods</option>
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="filter-person">Person</FieldLabel>
          <select
            id="filter-person"
            value={selectValue("person")}
            onChange={(event) => updateParam("person", event.target.value)}
            className="tb-input"
          >
            <option value="">All people</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="filter-split">Split</FieldLabel>
          <select
            id="filter-split"
            value={selectValue("split") || "all"}
            onChange={(event) =>
              updateParam("split", event.target.value === "all" ? null : event.target.value)
            }
            className="tb-input"
          >
            <option value="all">All</option>
            <option value="split">Split</option>
            <option value="not_split">Not split</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="filter-status">Status</FieldLabel>
          <select
            id="filter-status"
            value={selectValue("status") || "all"}
            onChange={(event) =>
              updateParam("status", event.target.value === "all" ? null : event.target.value)
            }
            className="tb-input"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </fieldset>
    </div>
  );
}