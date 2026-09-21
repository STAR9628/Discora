"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { requestPasswordReset } from "@/features/auth/services/auth-service";
import { getFieldErrors } from "@/features/auth/utils/form-errors";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/features/auth/validation";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ForgotPasswordFormValues, string[]>>
  >({});
  const { register, handleSubmit, formState } =
    useForm<ForgotPasswordFormValues>();

  async function onSubmit(values: ForgotPasswordFormValues) {
    setMessage(null);
    setFieldErrors({});

    const parsed = forgotPasswordSchema.safeParse(values);

    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed));
      return;
    }

    try {
      const result = await requestPasswordReset(parsed.data);
      setMessage(result.message);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to request password reset right now.",
      );
    }
  }

  return (
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
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <button
        type="submit"
        disabled={formState.isSubmitting}
        className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
      >
        {formState.isSubmitting ? "Sending..." : "Send reset instructions"}
      </button>
      <Link href="/login" className="block text-xs text-muted-foreground hover:text-foreground">
        Back to login
      </Link>
    </form>
  );
}
