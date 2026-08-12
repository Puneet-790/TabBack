"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({ variant = "default" }: { variant?: "default" | "sidebar" }) {
  const router = useRouter();

  async function handleSignOut() {
    await createClient().auth.signOut();
    router.replace("/signin");
    router.refresh();
  }

  if (variant === "sidebar") {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
      >
        <Icon name="logout" className="h-5 w-5 shrink-0" />
        Sign out
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="h-11 rounded-lg border border-border bg-surface px-5 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
    >
      Sign out
    </button>
  );
}