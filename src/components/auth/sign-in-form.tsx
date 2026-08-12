"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { GoogleIcon } from "@/components/icons";
import { isSupabaseConfigured } from "@/lib/env";
import { validateEmailForSignup, type EmailPolicyResult } from "@/lib/email-policy";
import { createClient } from "@/lib/supabase/client";

async function validateEmailOnServer(email: string): Promise<EmailPolicyResult> {
  try {
    const response = await fetch("/api/validate-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = (await response.json()) as { allowed: boolean; error?: string };
    return data.allowed ? { ok: true } : { ok: false, error: data.error ?? "Email not supported." };
  } catch {
    return { ok: true };
  }
}

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured. Check the notice above.");
      return;
    }
    setLoading(true);
    setError(null);
    const client = createClient();
    const policy = validateEmailForSignup(email);
    if (!policy.ok) {
      setError(policy.error);
      setLoading(false);
      return;
    }
    const serverPolicy = await validateEmailOnServer(email);
    if (!serverPolicy.ok) {
      setError(serverPolicy.error);
      setLoading(false);
      return;
    }
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  async function handleGoogleSignIn() {
    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured. Check the notice above.");
      return;
    }
    setLoading(true);
    setError(null);
    const client = createClient();
    const { error: oauthError } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="signin-email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="signin-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="tb-input"
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="signin-password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="signin-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="tb-input"
            placeholder="••••••••"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="tb-btn-primary w-full"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="tb-btn-secondary w-full"
      >
        <GoogleIcon className="h-5 w-5" />
        Continue with Google
      </button>
    </div>
  );
}