import { createBrowserSupabaseClient } from "@/services/supabase/client";
import { mapSupabaseError } from "@/lib/errors";
import { getSafeRedirectUrl, stripOAuthResidue } from "@/lib/security/safe-redirect";
import {
  OAUTH_NEXT_COOKIE_NAME,
  OAUTH_NEXT_COOKIE_MAX_AGE,
} from "@/lib/security/oauth-destination";
import type {
  ForgotPasswordFormValues,
  LoginFormValues,
  RegisterFormValues,
  ResetPasswordFormValues,
  ChangePasswordFormValues,
} from "@/features/auth/validation";
import type { AuthActionResult } from "@/features/auth/types";

function getSiteUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.location.origin;
}

function toAuthResult(error: { message: string } | null, successMessage: string) {
  if (error) {
    return {
      success: false,
      message: mapSupabaseError(error, successMessage),
    };
  }
  return {
    success: true,
    message: successMessage,
  };
}

export async function registerWithEmail(
  values: RegisterFormValues,
): Promise<AuthActionResult> {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/about`,
      // 18+ attestation for the server-side signup boundary (Auth
      // before-user-created hook). The registration form gates on the
      // checkbox; this carries the attestation to the backend so direct
      // API signups without it are rejected. Must be boolean true.
      data: { age_confirmed: true },
    },
  });

  return toAuthResult(
    error,
    "Registration started. Check your email to verify your account.",
  );
}

export async function loginWithGoogle(options?: { redirectTo?: string }): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const siteUrl = getSiteUrl();

  // Validate the intended destination, then carry it outside redirectTo in a
  // short-lived cookie: Supabase must receive an EXACT query-free callback
  // URL, which the Next.js callback resolves back to this destination.
  const rawTarget = options?.redirectTo;
  const destination = rawTarget
    ? getSafeRedirectUrl(stripOAuthResidue(rawTarget), "/")
    : "/";
  if (typeof document !== "undefined") {
    const secure = window.location.protocol === "https:";
    document.cookie =
      `${OAUTH_NEXT_COOKIE_NAME}=${encodeURIComponent(destination)}` +
      `; Path=/; Max-Age=${OAUTH_NEXT_COOKIE_MAX_AGE}; SameSite=Lax${secure ? "; Secure" : ""}`;
  }

  const callbackUrl = `${siteUrl}/auth/callback`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to sign in with Google."));
  }
}

export async function loginWithEmail(
  values: LoginFormValues,
): Promise<AuthActionResult> {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: values.email,
    password: values.password,
  });

  return toAuthResult(error, "You are logged in.");
}

export async function logout(): Promise<AuthActionResult> {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.auth.signOut();

  return toAuthResult(error, "You are logged out.");
}

export async function requestPasswordReset(
  values: ForgotPasswordFormValues,
): Promise<AuthActionResult> {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
  });

  return toAuthResult(error, "Password reset instructions have been sent.");
}

export async function updatePassword(
  values: ResetPasswordFormValues,
): Promise<AuthActionResult> {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.auth.updateUser({
    password: values.password,
  });

  return toAuthResult(error, "Your password has been updated.");
}

export async function changeEmail(
  values: { email: string },
): Promise<AuthActionResult> {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.auth.updateUser({
    email: values.email,
  });

  return toAuthResult(
    error,
    "Verification email sent to your new address. Please confirm to complete the change.",
  );
}

export async function changePassword(
  values: ChangePasswordFormValues,
): Promise<AuthActionResult> {
  const supabase = createBrowserSupabaseClient();

  // Verify current password by attempting to re-authenticate
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return { success: false, message: "Unable to verify your identity. Please log out and log in again." };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: values.currentPassword,
  });

  if (signInError) {
    return { success: false, message: "Current password is incorrect." };
  }

  const { error } = await supabase.auth.updateUser({
    password: values.newPassword,
  });

  return toAuthResult(error, "Your password has been updated.");
}
