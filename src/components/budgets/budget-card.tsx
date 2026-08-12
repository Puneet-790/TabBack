import Link from "next/link";
import { BudgetProgress } from "@/components/budgets/budget-progress";
import { Icon } from "@/components/icons";
import { bandLabel, warningBand } from "@/lib/budgets";
import { monthLabel } from "@/lib/dashboard";
import { formatINR } from "@/lib/money";

export function BudgetCard({
  month,
  spent,
  limit,
  percent,
  remaining,
}: {
  month: string;
  spent: number;
  limit: number;
  percent: number;
  remaining: number | null;
}) {
  const band = warningBand(percent);
  return (
    <section className="tb-card flex flex-col gap-3 p-4" aria-labelledby="budget-card-heading">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-soft text-accent">
            <Icon name="target" className="h-4 w-4" />
          </span>
          <h2 id="budget-card-heading" className="text-sm font-medium text-muted">
            Budget — {monthLabel(month)}
          </h2>
        </div>
        <Link href="/budgets" className="shrink-0 text-sm font-medium text-accent">
          View budgets
        </Link>
      </div>
      <p className="text-xl font-semibold tabular-nums tracking-tight text-foreground">
        {formatINR(spent)} <span className="text-sm font-normal text-muted">of {formatINR(limit)}</span>
      </p>
      <BudgetProgress percent={percent} band={band} label={bandLabel(band)} remaining={remaining} />
    </section>
  );
}
