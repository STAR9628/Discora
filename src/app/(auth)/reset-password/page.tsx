import Link from "next/link";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/services/supabase/server";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import {
  RECOVERY_VERIFIED_COOKIE_NAME,
  hasRecoveryContext,
} from "@/features/auth/utils/recovery-context";

export default async function ResetPasswordPage() {
  // Recovery gate: the server-set verification marker PLUS a live session.
  // Normal logged-in sessions (no marker) and marker-less visitors see the
  // invalid-link state instead of a working password-change form.
  let recoveryAllowed = false;
  try {
    const cookieStore = await cookies();
    const marker = cookieStore.get(RECOVERY_VERIFIED_COOKIE_NAME)?.value ?? null;
    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    recoveryAllowed = hasRecoveryContext(marker, session?.user?.id ?? null);
  } catch {
    // Fail closed: without verifiable recovery context the form stays hidden.
    recoveryAllowed = false;
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 sm:px-6">
      <section className="rounded-lg border border-border bg-card p-6 text-card-foreground">
        <p className="text-sm font-medium text-primary">Account recovery</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal">
          Choose a new password
        </h1>
        {recoveryAllowed ? (
          <>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Update the password for the verified recovery session.
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground/80">
              Complete this step to return to Discora — other pages stay
              unavailable until your new password is set.
            </p>
            <div className="mt-6">
              <ResetPasswordForm />
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This password reset link is invalid or has expired.
            </p>
            <div className="mt-6 flex flex-col gap-3 text-sm">
              <Link
                href="/forgot-password"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 font-semibold text-primary-foreground transition-all hover:opacity-90"
              >
                Request a new reset link
              </Link>
              <Link
                href="/login"
                className="text-center text-xs text-muted-foreground hover:text-foreground"
              >
                Back to login
              </Link>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
