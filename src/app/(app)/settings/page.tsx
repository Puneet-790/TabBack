import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CategoryManager } from "@/components/categories/category-manager";
import { SignOutButton } from "@/components/sign-out-button";
import { UserAvatar } from "@/components/user-avatar";
import { listCategories } from "@/lib/categories";
import { formatINR } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { userProfile } from "@/lib/user-profile";

export const metadata: Metadata = { title: "Settings" };

const MONEY_SAMPLES = [0, 0.1, 1, 123, 1234, 1234567.89, 0.999] as const;

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const profile = userProfile(user);
  const categories = await listCategories(supabase, user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted">
          Account, categories and app preferences.
        </p>
      </div>
      <section className="tb-card mx-auto w-full max-w-2xl p-6">
        <div className="flex items-center gap-4">
          <UserAvatar profile={profile} size="lg" />
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-foreground">
              {profile.name || "TabBack account"}
            </h2>
            {profile.email && (
              <p className="truncate text-sm text-muted">{profile.email}</p>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          {profile.avatarUrl
            ? "Profile picture synced from your Google account."
            : "Sign in with Google to sync your profile picture."}
        </p>
      </section>
      <CategoryManager categories={categories} />
      <section className="tb-card mx-auto w-full max-w-2xl p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Money formatting</h2>
            <p className="mt-0.5 text-xs text-muted">
              Every figure renders via formatINR — ₹ prefix, exactly 2 decimals, Indian grouping.
            </p>
          </div>
          <span className="tb-chip">₹ INR</span>
        </div>
        <ul className="mt-4">
          {MONEY_SAMPLES.map((value) => (
            <li
              key={value}
              className="flex items-center justify-between gap-4 border-t border-border py-2.5"
            >
              <span className="font-mono text-xs text-muted">{value}</span>
              <span className="font-mono text-sm font-medium tabular-nums text-foreground">
                {formatINR(value)}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <div className="flex justify-center">
        <SignOutButton />
      </div>
    </div>
  );
}