import { formatINR } from "@/lib/money";

export function reminderDraft(
  personName: string,
  remainingAmount: number,
  contextLabel: string | null,
): string {
  const context = contextLabel ? ` from ${contextLabel}` : "";
  return `Hi ${personName}! Just a gentle nudge on ${formatINR(remainingAmount)}${context} — let me know when it's on its way 🙂`;
}

export function waMeLink(phone: string, text: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 0) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function reminderTimeLabel(sentAt: string): string {
  const parsed = new Date(sentAt);
  if (Number.isNaN(parsed.getTime())) return sentAt;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}