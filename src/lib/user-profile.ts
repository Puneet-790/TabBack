import type { User } from "@supabase/supabase-js";

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string | null;
  initials: string;
}

export function getInitials(name: string, email: string): string {
  const source = name.trim() || (email.split("@")[0] ?? "");
  const words = source.split(/[\s._-]+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1][0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

export function userProfile(user: User): UserProfile {
  const meta = user.user_metadata ?? {};
  const name = String(meta.full_name ?? meta.name ?? "").trim();
  const email = user.email ?? "";
  const avatarUrl =
    typeof meta.avatar_url === "string" && meta.avatar_url.length > 0 ? meta.avatar_url : null;
  return { name, email, avatarUrl, initials: getInitials(name, email) };
}