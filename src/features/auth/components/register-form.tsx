"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { registerWithEmail } from "@/features/auth/services/auth-service";
import { getFieldErrors } from "@/features/auth/utils/form-errors";
import {
  registerSchema,
  type RegisterFormValues,
} from "@/features/auth/validation";
import { GoogleOneTap } from "@/features/auth/components/google-one-tap";
import { getSafeRedirectUrl } from "@/lib/security/safe-redirect";

export function RegisterForm() {
  const searchParams = useSearchParams();
  const safeRedirect = getSafeRedirectUrl(searchParams.get("redirectedFrom"), "/");
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof RegisterFormValues, string[]>>
  >({});
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [ageError, setAgeError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<RegisterFormValues>();

  async function onSubmit(values: RegisterFormValues) {
    setMessage(null);
    setFieldErrors({});
    setAgeError(null);

    let hasError = false;

    if (!ageConfirmed) {
      setAgeError("You must confirm that you are at least 18 years old to create a Discora Public Beta account.");
      hasError = true;
    }

    const parsed = registerSchema.safeParse(values);

    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed));
      hasError = true;
    }

    if (hasError || !parsed.success) {
      return;
    }

    try {
      const result = await registerWithEmail(parsed.data);
      setMessage(result.message);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to create an account right now.",
      );
    }
  }

  return (
    <div className="space-y-6">
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
            autoComplete="new-password"
            className="w-full rounded-xl border border-input bg-card/60 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus-visible:outline-none"
            {...register("password")}
          />
          {fieldErrors.password?.map((error) => (
            <p key={error} className="text-xs text-destructive mt-1">
              {error}
            </p>
          ))}
        </div>
        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className="w-full rounded-xl border border-input bg-card/60 px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus-visible:outline-none"
            {...register("confirmPassword")}
          />
          {fieldErrors.confirmPassword?.map((error) => (
            <p key={error} className="text-xs text-destructive mt-1">
              {error}
            </p>
          ))}
        </div>
        {message ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">{message}</p>
            <p>Please check your inbox and click the verification link to activate your account.</p>
          </div>
        ) : null}
        <button
          type="submit"
          disabled={formState.isSubmitting}
          className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          {formState.isSubmitting ? "Creating account..." : "Register"}
        </button>

      {/* Legal & 18+ Eligibility Area */}
      <div className="space-y-3 pt-1">
        <div className="space-y-1.5">
          <div className="flex items-start gap-2.5">
            <input
              id="confirmAge"
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => {
                setAgeConfirmed(e.target.checked);
                if (e.target.checked) {
                  setAgeError(null);
                }
              }}
              aria-invalid={!!ageError}
              aria-describedby={ageError ? "confirmAge-error" : undefined}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border border-input bg-background accent-primary text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring cursor-pointer"
            />
            <label
              htmlFor="confirmAge"
              className="text-xs leading-normal text-muted-foreground select-none cursor-pointer"
            >
              I confirm that I am at least 18 years old.
            </label>
          </div>
          {ageError && (
            <p id="confirmAge-error" className="text-xs text-destructive pl-6.5">
              {ageError}
            </p>
          )}
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          By creating a Discora account, you agree to our{" "}
          <Link
            href="/terms"
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
          >
            Terms of Service
          </Link>{" "}
          and acknowledge our{" "}
          <Link
            href="/privacy"
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
          >
            Privacy Policy
          </Link>.
        </p>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Login
        </Link>
      </p>
    </form>
    </div>
  );
}
