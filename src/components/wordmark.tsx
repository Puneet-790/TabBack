import { Icon } from "@/components/icons";

export const TAGLINE = "Track your spending. Split the bill. Get paid back.";

const MARK_STYLES = {
  sm: "h-8 w-8 rounded-lg",
  md: "h-9 w-9 rounded-xl",
  lg: "h-12 w-12 rounded-xl",
} as const;

const ICON_STYLES = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
} as const;

const TEXT_STYLES = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl",
} as const;

export type WordmarkSize = keyof typeof MARK_STYLES;

export function WordmarkMark({
  size = "md",
  className = "",
}: {
  size?: WordmarkSize;
  className?: string;
}) {
  return (
    <span
      className={`grid shrink-0 place-items-center bg-accent text-accent-ink shadow-sm ${MARK_STYLES[size]} ${className}`}
    >
      <Icon name="brand" className={ICON_STYLES[size]} />
    </span>
  );
}

export function Wordmark({
  size = "md",
  mark = true,
  className = "",
}: {
  size?: WordmarkSize;
  mark?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 text-foreground ${className}`}>
      {mark && <WordmarkMark size={size} />}
      <span className={`font-semibold tracking-tight ${TEXT_STYLES[size]}`}>TabBack</span>
    </span>
  );
}

export function Tagline({ className = "text-xs text-muted" }: { className?: string }) {
  return <p className={`leading-relaxed ${className}`}>{TAGLINE}</p>;
}