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

export function RegisterForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof RegisterFormValues, string[]>>
  >({});
  const { register, handleSubmit, formState } = useForm<RegisterFormValues>();

  async function onSubmit(values: RegisterFormValues) {
    setMessage(null);
    setFieldErrors({});

    const parsed = registerSchema.safeParse(values);

    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed));
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
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <button
        type="submit"
        disabled={formState.isSubmitting}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {formState.isSubmitting ? "Creating account..." : "Register"}
      </button>
      <p className="text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="hover:text-foreground">
          Login
        </Link>
      </p>
    </form>
  );
}
