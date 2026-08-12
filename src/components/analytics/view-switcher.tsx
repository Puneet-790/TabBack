import Link from "next/link";
import { ANALYTICS_VIEWS, type View } from "@/lib/analytics";

const VIEW_LABELS: Record<View, string> = {
  month: "Month",
  quarter: "Quarter",
  year: "Year",
};

export function ViewSwitcher({ active }: { active: View }) {
  return (
    <nav className="tb-card grid grid-cols-3 gap-1 p-1" aria-label="View granularity">
      {ANALYTICS_VIEWS.map((view) => {
        const isActive = view === active;
        return (
          <Link
            key={view}
            href={view === "month" ? "/analytics" : `/analytics?view=${view}`}
            aria-current={isActive ? "page" : undefined}
            className={`grid min-h-11 place-items-center rounded-lg text-sm font-medium transition-colors ${
              isActive ? "bg-accent text-accent-ink" : "text-muted hover:bg-surface-muted"
            }`}
          >
            {VIEW_LABELS[view]}
          </Link>
        );
      })}
    </nav>
  );
}
