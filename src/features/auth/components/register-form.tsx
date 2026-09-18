"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { registerWithEmail } from "@/features/auth/services/auth-service";
import { getFieldErrors } from "@/features/auth/utils/form-errors";
import {
  registerSchema,
  type RegisterFormValues,
} from "@/features/auth/validation";
import { GoogleOneTap } from "@/features/auth/components/google-one-tap";

export function RegisterForm() {
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
      <GoogleOneTap redirectTo="/about" />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring"
          {...register("email")}
        />
        {fieldErrors.email?.map((error) => (
          <p key={error} className="text-xs text-destructive">
            {error}
          </p>
        ))}
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring"
          {...register("password")}
        />
        {fieldErrors.password?.map((error) => (
          <p key={error} className="text-xs text-destructive">
            {error}
          </p>
        ))}
      </div>
      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring"
          {...register("confirmPassword")}
        />
        {fieldErrors.confirmPassword?.map((error) => (
          <p key={error} className="text-xs text-destructive">
            {error}
          </p>
        ))}
      </div>
      {message ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">{message}</p>
          <p>Please check your inbox and click the verification link to activate your account.</p>
        </div>
      ) : null}
      <button
        type="submit"
        disabled={formState.isSubmitting}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
