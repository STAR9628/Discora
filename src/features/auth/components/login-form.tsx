"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { AlertTriangle } from "lucide-react";
import { loginWithEmail } from "@/features/auth/services/auth-service";
import { getFieldErrors } from "@/features/auth/utils/form-errors";
import { loginSchema, type LoginFormValues } from "@/features/auth/validation";
import { GoogleOneTap } from "@/features/auth/components/google-one-tap";
import { getSafeRedirectUrl } from "@/lib/security/safe-redirect";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const safeRedirect = getSafeRedirectUrl(searchParams.get("redirectedFrom"), "/");
  const authError = searchParams.get("authError");
  const authErrorMessage =
    authError === "verification"
      ? "Authentication verification failed. Please try signing in again."
      : authError
      ? "An authentication error occurred. Please try again."
      : null;
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof LoginFormValues, string[]>>
  >({});
  const { register, handleSubmit, formState } = useForm<LoginFormValues>();

  async function onSubmit(values: LoginFormValues) {
    setMessage(null);
    setFieldErrors({});

    const parsed = loginSchema.safeParse(values);

    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed));
      return;
    }

    try {
      const result = await loginWithEmail(parsed.data);
      setMessage(result.message);

      if (result.success) {
        router.replace(safeRedirect);
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to log in right now.",
      );
    }
  }

  return (
    <div className="space-y-6">
      {authErrorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{authErrorMessage}</span>
        </div>
      )}

      <GoogleOneTap redirectTo={safeRedirect} />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} method="post" className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            suppressHydrationWarning
            className="w-full rounded-xl border border-input bg-card/60 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus-visible:outline-none"
            {...register("email")}
          />
          {fieldErrors.email?.map((error) => (
            <p key={error} className="text-xs text-destructive mt-1">
              {error}
            </p>
          ))}
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            suppressHydrationWarning
            className="w-full rounded-xl border border-input bg-card/60 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus-visible:outline-none"
            {...register("password")}
          />
          {fieldErrors.password?.map((error) => (
            <p key={error} className="text-xs text-destructive mt-1">
              {error}
            </p>
          ))}
        </div>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        <button
          type="submit"
          disabled={formState.isSubmitting}
          className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          {formState.isSubmitting ? "Logging in..." : "Login"}
        </button>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <Link href="/forgot-password" className="hover:text-foreground">
          Forgot password?
        </Link>
        <Link href="/register" className="hover:text-foreground">
          Create account
        </Link>
      </div>
    </form>
    </div>
  );
}
