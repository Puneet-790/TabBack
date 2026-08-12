import type { Metadata } from "next";
import Link from "next/link";
import { SupabaseNotice } from "@/components/auth/supabase-notice";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <div className="w-full max-w-sm">
      <SupabaseNotice />
      <div className="tb-card p-6 sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-muted">
          Split bills, track spending and get paid back.
        </p>
        <SignUpForm />
        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/signin" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}