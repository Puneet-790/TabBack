"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { SignOutButton } from "@/components/sign-out-button";
import { UserAvatar } from "@/components/user-avatar";
import { Wordmark } from "@/components/wordmark";
import type { UserProfile } from "@/lib/user-profile";
import { allNav, type NavItem } from "@/lib/nav";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      className={`flex min-h-10 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "bg-accent-soft text-accent"
          : "text-muted hover:bg-surface-muted hover:text-foreground"
      }`}
    >
      <Icon name={item.icon} className="h-5 w-5 shrink-0" />
      {item.label}
    </Link>
  );
}

export function Sidebar({ profile }: { profile: UserProfile }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-sidebar hidden w-60 flex-col border-r border-border bg-surface md:flex">
      <Link href="/dashboard" className="flex h-16 shrink-0 items-center border-b border-border px-5">
        <Wordmark size="md" />
      </Link>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Primary navigation">
        {allNav.map((item) => (
          <SidebarLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>
      <div className="space-y-1 border-t border-border p-3">
        <Link
          href="/settings"
          className="flex min-h-12 items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-muted"
        >
          <UserAvatar profile={profile} size="sm" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-foreground">
              {profile.name || profile.email || "Account"}
            </span>
            {profile.email && (
              <span className="block truncate text-xs text-muted">{profile.email}</span>
            )}
          </span>
        </Link>
        <SidebarLink
          item={{ href: "/settings", label: "Settings", icon: "settings" }}
          pathname={pathname}
        />
        <SignOutButton variant="sidebar" />
      </div>
    </aside>
  );
}