import { createBrowserSupabaseClient } from "@/services/supabase/client";
import { mapSupabaseError } from "@/lib/errors";
import type {
  ForgotPasswordFormValues,
  LoginFormValues,
  RegisterFormValues,
  ResetPasswordFormValues,
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
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  });

  return toAuthResult(
    error,
    "Registration started. Check your email to verify your account.",
  );
}

export async function loginWithGoogle(options?: { redirectTo?: string }): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: options?.redirectTo || `${getSiteUrl()}/auth/callback`,
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
