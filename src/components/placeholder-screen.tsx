import { Icon, type IconName } from "@/components/icons";

export function PlaceholderScreen({
  icon,
  title,
  description,
}: {
  icon: IconName;
  title: string;
  description: string;
}) {
  return (
    <section className="tb-card flex flex-col items-center gap-6 px-6 py-16 text-center md:py-20">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
        <Icon name={icon} className="h-7 w-7" />
      </div>
      <div className="space-y-2">
        <span className="tb-chip uppercase tracking-[0.18em]">Coming soon</span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted">{description}</p>
      </div>
    </section>
  );
}