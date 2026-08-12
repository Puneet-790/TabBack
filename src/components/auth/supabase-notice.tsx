import { isSupabaseConfigured } from "@/lib/env";

export function SupabaseNotice() {
  if (isSupabaseConfigured()) {
    return null;
  }

  return (
    <div className="mb-4 rounded-xl border border-border bg-surface-muted p-4 text-sm">
      <p className="font-medium text-foreground">Supabase is not configured</p>
      <p className="mt-1 text-muted">
        Copy <code className="rounded bg-surface px-1 py-0.5 text-xs">.env.example</code> to{" "}
        <code className="rounded bg-surface px-1 py-0.5 text-xs">.env.local</code> and add your
        project URL and anon key to enable sign in.
      </p>
    </div>
  );
}