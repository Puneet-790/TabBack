import type { Metadata } from "next";
import Link from "next/link";
import { SupabaseNotice } from "@/components/auth/supabase-notice";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <div className="w-full max-w-sm">
      <SupabaseNotice />
      <div className="tb-card p-6 sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Sign in to track, split and collect.</p>
        <SignInForm />
        <p className="mt-6 text-center text-sm text-muted">
          No account yet?{" "}
          <Link href="/signup" className="font-medium text-accent hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}