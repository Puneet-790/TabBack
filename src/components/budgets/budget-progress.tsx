import type { BudgetBand } from "@/lib/budgets";
import { formatINR } from "@/lib/money";

const BAND_STYLES: Record<BudgetBand, { chip: string; bar: string }> = {
  ok: { chip: "bg-success/10 text-success", bar: "bg-success" },
  "nudge-75": { chip: "bg-warning/10 text-warning", bar: "bg-warning" },
  "nudge-90": { chip: "bg-warning/10 text-warning", bar: "bg-warning" },
  over: { chip: "bg-danger/10 text-danger", bar: "bg-danger" },
};

export function BudgetProgress({
  percent,
  band,
  label,
  remaining,
}: {
  percent: number;
  band: BudgetBand;
  label: string;
  remaining: number | null;
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  const style = BAND_STYLES[band];
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${style.chip}`}>
          {label}
        </span>
        <p className="text-xs tabular-nums text-muted">{percent}% used</p>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        className="h-2 w-full overflow-hidden rounded-full bg-border"
      >
        {clamped > 0 && (
          <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${clamped}%` }} />
        )}
      </div>
      {remaining !== null && remaining >= 0 && (
        <p className="text-xs text-muted">{formatINR(remaining)} left</p>
      )}
      {remaining !== null && remaining < 0 && (
        <p className="text-xs font-medium text-danger">Over by {formatINR(-remaining)}</p>
      )}
    </div>
  );
}
