"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { updatePassword } from "@/features/auth/services/auth-service";
import { getFieldErrors } from "@/features/auth/utils/form-errors";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@/features/auth/validation";

export function ResetPasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ResetPasswordFormValues, string[]>>
  >({});
  const { register, handleSubmit, formState } =
    useForm<ResetPasswordFormValues>();

  async function onSubmit(values: ResetPasswordFormValues) {
    setMessage(null);
    setFieldErrors({});

    const parsed = resetPasswordSchema.safeParse(values);

    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed));
      return;
    }

    try {
      const result = await updatePassword(parsed.data);
      setMessage(result.message);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update your password right now.",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          New password
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
          Confirm password
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
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <button
        type="submit"
        disabled={formState.isSubmitting}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {formState.isSubmitting ? "Updating..." : "Update password"}
      </button>
      <Link href="/login" className="block text-xs text-muted-foreground hover:text-foreground">
        Back to login
      </Link>
    </form>
  );
}
