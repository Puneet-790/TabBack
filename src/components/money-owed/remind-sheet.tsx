"use client";

import { recordReminderAction } from "@/app/(app)/money-owed/actions";
import { Icon } from "@/components/icons";
import { useEffect, useState } from "react";

export function RemindSheet({
  personName,
  phone,
  draft,
  waLink,
  debtType,
  debtId,
  personId,
  onClose,
}: {
  personName: string;
  phone: string | null;
  draft: string;
  waLink: string | null;
  debtType: "split" | "iou";
  debtId: string;
  personId: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function logReminder() {
    if (saving) return null;
    setSaving(true);
    setError(null);
    const formData = new FormData();
    formData.set("debt_type", debtType);
    formData.set("debt_id", debtId);
    formData.set("person_id", personId);
    const result = await recordReminderAction({}, formData);
    setSaving(false);
    if (result.ok) {
      setRecorded(true);
    } else {
      setError(result.error ?? "Could not save the reminder");
    }
    return result;
  }

  async function copy() {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
    } catch {
      setCopyError(
        "Couldn't copy automatically — long-press or select the message to copy it.",
      );
    }
    await logReminder();
  }

  async function openWhatsApp() {
    await logReminder();
  }

  return (
    <div className="fixed inset-0 z-modal">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-foreground/40"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="remind-sheet-title"
        className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-surface p-5 pb-8 shadow-modal md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:max-h-[90dvh] md:w-full md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border md:hidden" />
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-base font-semibold text-accent-deep">
              {personName.trim().charAt(0).toUpperCase() || "?"}
            </span>
            <div>
              <h2 id="remind-sheet-title" className="text-lg font-semibold text-foreground">
                Remind {personName}
              </h2>
              <p className="text-sm text-muted">A gentle nudge, saved to your history.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <textarea
            readOnly
            value={draft}
            onFocus={(event) => event.currentTarget.select()}
            aria-label="Reminder message draft"
            rows={3}
            className="w-full resize-none rounded-xl border border-border bg-surface-muted p-3.5 text-sm leading-relaxed text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/20"
          />

          {copied && <p className="text-sm text-success">Copied to clipboard</p>}
          {copyError && <p className="text-sm text-danger">{copyError}</p>}
          {recorded && (
            <p className="text-sm text-muted">Reminder logged — you can see it on the People page.</p>
          )}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          {phone && waLink ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copy}
                disabled={saving}
                className="tb-btn-secondary min-h-11 flex-1"
              >
                {copied ? "Copied" : "Copy message"}
              </button>
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={openWhatsApp}
                className="tb-btn-primary min-h-11 flex-1"
              >
                <Icon name="brand" className="h-4 w-4" />
                Open WhatsApp
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={copy}
                disabled={saving}
                className="tb-btn-primary min-h-11 w-full"
              >
                {copied ? "Copied" : "Copy message"}
              </button>
              <p className="text-sm text-muted">
                No phone saved for {personName} — copy the message and send it yourself.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg py-1 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}