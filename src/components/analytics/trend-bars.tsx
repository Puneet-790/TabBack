import { formatINR } from "@/lib/money";

export interface TrendBarRow {
  label: string;
  amount: number;
  percent: number;
}

export function TrendBars({
  rows,
  highlight,
}: {
  rows: TrendBarRow[];
  highlight?: string | null;
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <div className="flex h-36 items-end gap-1 overflow-x-hidden">
        {rows.map((row) => (
          <div
            key={row.label}
            className={`min-w-0 flex-1 rounded-t-md ${
              highlight === row.label ? "bg-accent-deep" : "bg-chart-1"
            }`}
            style={{ height: `${Math.max(row.percent, row.amount > 0 ? 3 : 0)}%` }}
            title={`${row.label}: ${formatINR(row.amount)}`}
            aria-label={`${row.label}: ${formatINR(row.amount)}`}
          />
        ))}
      </div>
      <div className="mt-1 flex gap-1 overflow-x-hidden">
        {rows.map((row, index) => (
          <span
            key={row.label}
            className={`min-w-0 flex-1 truncate text-center text-[10px] leading-tight text-muted ${
              index === 0 || index === rows.length - 1 ? "" : "invisible"
            }`}
          >
            {row.label}
          </span>
        ))}
      </div>
    </div>
  );
}
