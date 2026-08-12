import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";
import { Tagline, Wordmark } from "@/components/wordmark";

const BULLETS: { icon: IconName; text: string }[] = [
  { icon: "wallet", text: "Track every spend, category by category" },
  { icon: "users", text: "Split bills with friends in seconds" },
  { icon: "coins", text: "Collect what you are owed, on time" },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div className="tb-glow pointer-events-none absolute inset-x-0 top-0 h-96 -z-10" aria-hidden="true" />
      <header className="flex h-16 items-center justify-center md:h-20">
        <Wordmark size="md" />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-12">
        <div className="grid w-full max-w-4xl items-center gap-12 md:grid-cols-2">
          <div className="hidden md:block">
            <div className="space-y-8">
              <div className="space-y-3">
                <Wordmark size="lg" />
                <Tagline className="max-w-sm text-base" />
              </div>
              <ul className="space-y-4">
                {BULLETS.map(({ icon, text }) => (
                  <li key={text} className="flex items-center gap-3 text-sm font-medium">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface text-accent shadow-sm">
                      <Icon name={icon} className="h-4 w-4" />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
              <span className="tb-chip">One currency · ₹</span>
            </div>
          </div>
          <div className="mx-auto w-full max-w-sm">{children}</div>
        </div>
      </main>
      <footer className="pb-6 text-center md:hidden">
        <Tagline className="px-6" />
      </footer>
    </div>
  );
}