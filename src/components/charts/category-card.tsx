import { categoryColor, donutStops, type CategorySlice } from "@/lib/dashboard";
import { formatINR } from "@/lib/money";

export function CategoryCard({ slices }: { slices: CategorySlice[] }) {
  if (slices.length === 0) return null;
  const stops = donutStops(
    slices.map((slice) => ({ value: slice.percent, categoryId: slice.categoryId })),
  );
  const gradient = stops.map((stop) => `${stop.color} ${stop.from}% ${stop.to}%`).join(", ");

  return (
    <section className="tb-card p-4" aria-labelledby="category-breakdown-heading">
      <h2 id="category-breakdown-heading" className="text-sm font-medium text-muted">
        Where it went
      </h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
        <div
          className="mx-auto h-36 w-36 rounded-full"
          style={{ background: `conic-gradient(${gradient})` }}
          role="img"
          aria-label="Category breakdown"
        />
        <ul className="space-y-2.5">
          {slices.map((slice) => (
            <li key={slice.categoryId ?? "uncategorized"} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: categoryColor(slice.categoryId) }}
              />
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{slice.name}</span>
              <span className="text-xs text-muted">{slice.percent.toFixed(1)}%</span>
              <span className="w-20 text-right text-sm font-medium tabular-nums text-foreground">
                {formatINR(slice.amount)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
