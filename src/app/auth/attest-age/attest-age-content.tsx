"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Loader2, CheckCircle } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { createBrowserSupabaseClient } from "@/services/supabase/client";

const CONFIRM_PHRASE = "I CONFIRM I AM 18 OR OLDER";

export function AttestAgePageContent() {
  const searchParams = useSearchParams();
  const { user, signOut } = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  const redirectTo = searchParams.get("redirectTo") || "/about";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (phrase.trim() !== CONFIRM_PHRASE) {
      setError(`Type "${CONFIRM_PHRASE}" exactly to continue.`);
      return;
    }

    if (!confirmed) {
      setError("You must check the confirmation box.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createBrowserSupabaseClient();

      // Update the profile with age_confirmed = true
      const { error } = await supabase
        .from("profiles")
        .update({ age_confirmed: true })
        .eq("id", user?.id);

      if (error) throw error;

      setSuccess(true);
      // Use a full-page navigation instead of router.push so that the
      // Next.js router cache is completely cleared and any server component
      // (e.g. /u/[username]) re-fetches with fresh cookies. This prevents
      // "Resource Not Found" caused by a stale router cache seeing the
      // pre-attestation state.
      setTimeout(() => {
        window.location.href = redirectTo;
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save confirmation. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {/* Navigation is intentionally locked until attestation is complete.
          All sidebar/header link clicks trigger the middleware age gate and
          redirect back here. Complete the form below to unlock navigation. */}
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Age Eligibility Confirmation</h1>
            <p className="text-sm text-muted-foreground">Required for OAuth signups</p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">Discora Public Beta is for users 18 years or older.</strong>
          </p>
          <p>
            You signed in with Google. To continue into Discora, you must explicitly confirm that you are at least 18 years old.
          </p>
          <div className="flex gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-600 dark:text-amber-400">
            <span className="shrink-0 mt-0.5">⚠</span>
            <span>
              <strong>Navigation is locked</strong> until you complete this step.
              Clicking other links will return you here. Complete the form below to unlock Discora.
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            This is a product eligibility attestation, not a legal age verification system.
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-start gap-2.5">
            <input
              id="confirmAge"
              type="checkbox"
              checked={confirmed}
              onChange={(e) => {
                setConfirmed(e.target.checked);
                if (e.target.checked) setError(null);
              }}
              disabled={busy}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border border-input bg-background accent-primary text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring cursor-pointer disabled:opacity-50"
            />
            <label
              htmlFor="confirmAge"
              className="text-sm leading-normal text-foreground cursor-pointer select-none"
            >
              I confirm that I am at least 18 years old.
            </label>
          </div>

          <label htmlFor="confirmPhrase" className="block text-xs font-semibold text-foreground">
            Type <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">{CONFIRM_PHRASE}</kbd> to continue
          </label>
          <input
            id="confirmPhrase"
            type="text"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            autoComplete="off"
            disabled={busy}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary disabled:opacity-50"
          />

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => signOut().then(() => { window.location.href = "/"; })}
              disabled={busy}
              className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !confirmed || phrase.trim() !== CONFIRM_PHRASE}
              className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving…
                </>
              ) : (
                "Confirm & Continue"
              )}
            </button>
          </div>
        </form>

        {success && (
          <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>Confirmation saved. Redirecting…</span>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By confirming, you agree to our{" "}
          <Link href="/terms" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
            Terms of Service
          </Link>{" "}
          and acknowledge our{" "}
          <Link href="/privacy" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
            Privacy Policy
          </Link>.
        </p>
      </div>
    </div>
  );
}