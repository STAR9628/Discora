"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { updatePassword } from "@/features/auth/services/auth-service";
import { getFieldErrors } from "@/features/auth/utils/form-errors";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@/features/auth/validation";

export function ResetPasswordForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [didSucceed, setDidSucceed] = useState(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ResetPasswordFormValues, string[]>>
  >({});
  const { register, handleSubmit, formState } =
    useForm<ResetPasswordFormValues>();

  async function onSubmit(values: ResetPasswordFormValues) {
    setMessage(null);
    setDidSucceed(false);
    setFieldErrors({});

    const parsed = resetPasswordSchema.safeParse(values);

    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed));
      return;
    }

    try {
      const result = await updatePassword(parsed.data);
      if (result.success) {
        // Recovery is complete: expire the one-time marker via a plain API
        // call (NOT a Server Action — action responses re-render this route
        // and would discard the success state below). Cleanup failure must
        // not block the redirect (Max-Age bounds it).
        await fetch("/api/auth/clear-auth-state", { method: "POST" }).catch(() => {});
        setDidSucceed(true);
        setMessage(
          "Password reset successfully. Your new password has been updated. Please log in with your new password.",
        );
        setIsRedirecting(true);
        redirectTimer.current = setTimeout(() => {
          router.push("/login");
        }, 1800);
      } else {
        setMessage(result.message);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update your password right now.",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} method="post" className="space-y-4">
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
          Confirm password
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
        didSucceed ? (
          <p
            role="status"
            className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-foreground"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <span>{message}</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{message}</p>
        )
      ) : null}
        <button
          type="submit"
          disabled={formState.isSubmitting || isRedirecting}
        className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
      >
        {formState.isSubmitting
          ? "Updating..."
          : isRedirecting
            ? "Redirecting to login…"
            : "Update password"}
      </button>
      <Link href="/login" className="block text-xs text-muted-foreground hover:text-foreground">
        Back to login
      </Link>
    </form>
  );
}
