"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import { UserAvatar } from "@/components/user-avatar";
import { Wordmark } from "@/components/wordmark";
import type { UserProfile } from "@/lib/user-profile";

export function MobileHeader({ profile }: { profile: UserProfile }) {
  return (
    <header className="sticky top-0 z-header flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur md:hidden">
      <Link href="/dashboard" aria-label="TabBack home">
        <Wordmark size="sm" />
      </Link>
      <div className="flex items-center gap-1">
        <Link
          href="/settings"
          aria-label="Settings"
          className="grid h-10 w-10 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <Icon name="settings" className="h-5 w-5" />
        </Link>
        <Link
          href="/settings"
          aria-label={profile.name || profile.email || "Account"}
          className="rounded-full p-1 transition-colors hover:bg-surface-muted"
        >
          <UserAvatar profile={profile} size="sm" />
        </Link>
      </div>
    </header>
  );
}