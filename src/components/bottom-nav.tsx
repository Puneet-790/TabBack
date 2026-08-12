"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { primaryNav, type NavItem } from "@/lib/nav";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function TabLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      className={`flex h-14 min-h-14 flex-col items-center justify-center gap-0.5 ${
        active ? "text-accent" : "text-muted"
      }`}
    >
      <Icon name={item.icon} className="h-6 w-6" />
      <span className="max-w-full truncate px-0.5 text-[11px] font-medium">{item.label}</span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const [home, expenses, people, moneyOwed, analytics] = primaryNav;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-tabbar border-t border-border bg-surface shadow-nav pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-6">
        <li>
          <TabLink item={home} pathname={pathname} />
        </li>
        <li>
          <TabLink item={expenses} pathname={pathname} />
        </li>
        <li>
          <Link
            href="/expenses/new"
            aria-label="Add expense"
            className="flex h-14 min-h-14 flex-col items-center justify-center gap-0.5 text-muted"
          >
            <span className="grid h-12 w-12 -translate-y-3 place-items-center rounded-full bg-accent text-accent-ink shadow-fab">
              <Icon name="plus" className="h-6 w-6" />
            </span>
            <span className="-mt-2 text-[11px] font-medium">Add</span>
          </Link>
        </li>
        <li>
          <TabLink item={people} pathname={pathname} />
        </li>
        <li>
          <TabLink item={moneyOwed} pathname={pathname} />
        </li>
        <li>
          <TabLink item={analytics} pathname={pathname} />
        </li>
      </ul>
    </nav>
  );
}