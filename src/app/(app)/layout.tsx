import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { MobileHeader } from "@/components/mobile-header";
import { Sidebar } from "@/components/sidebar";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { userProfile } from "@/lib/user-profile";

export default async function AppLayout({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured()) {
    redirect("/signin");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  const profile = userProfile(user);

  return (
    <div className="min-h-dvh">
      <Sidebar profile={profile} />
      <div className="pb-24 md:pb-0 md:pl-60">
        <MobileHeader profile={profile} />
        <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-10 md:py-10">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}