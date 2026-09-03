"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { changeEmail, changePassword } from "@/features/auth/services/auth-service";
import {
  changeEmailSchema,
  changePasswordSchema,
  type ChangeEmailFormValues,
  type ChangePasswordFormValues,
} from "@/features/auth/validation";
import { Loader2, AlertTriangle, CheckCircle, Mail, Lock } from "lucide-react";

export function AccountForm() {
  const { user } = useAuth();
  const [emailMessage, setEmailMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const emailForm = useForm<ChangeEmailFormValues>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: {
      email: "",
    },
  });

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onEmailSubmit = async (values: ChangeEmailFormValues) => {
    setEmailMessage(null);
    const result = await changeEmail(values);
    if (result.success) {
      setEmailMessage({ type: "success", text: result.message });
      emailForm.reset({ email: "" });
    } else {
      setEmailMessage({ type: "error", text: result.message });
    }
  };

  const onPasswordSubmit = async (values: ChangePasswordFormValues) => {
    setPasswordMessage(null);
    const result = await changePassword(values);
    if (result.success) {
      setPasswordMessage({ type: "success", text: result.message });
      passwordForm.reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } else {
      setPasswordMessage({ type: "error", text: result.message });
    }
  };

  return (
    <div className="space-y-8">
      {/* Email Section */}
      <div className="mx-auto max-w-xl rounded-xl border border-border bg-card/50 p-6 backdrop-blur-md md:p-8">
        <div className="mb-6 flex items-start gap-3">
          <Mail className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <h2 className="text-xl font-bold tracking-tight">Email Address</h2>
            <p className="text-sm text-muted-foreground">
              Current email: <span className="font-medium text-foreground">{user?.email || "Unknown"}</span>
            </p>
          </div>
        </div>

        <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-semibold">
              New Email Address
            </label>
            <input
              id="email"
              type="email"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring"
              placeholder="new@example.com"
              {...emailForm.register("email")}
            />
            {emailForm.formState.errors.email && (
              <p className="text-xs text-destructive">{emailForm.formState.errors.email.message}</p>
            )}
          </div>

          {emailMessage && (
            <div
              className={`flex gap-2 rounded-md p-3 text-xs ${
                emailMessage.type === "success"
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {emailMessage.type === "success" ? (
                <CheckCircle className="h-4 w-4 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              )}
              <span>{emailMessage.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={emailForm.formState.isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {emailForm.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Update Email
          </button>
        </form>
      </div>

      {/* Password Section */}
      <div className="mx-auto max-w-xl rounded-xl border border-border bg-card/50 p-6 backdrop-blur-md md:p-8">
        <div className="mb-6 flex items-start gap-3">
          <Lock className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <h2 className="text-xl font-bold tracking-tight">Password</h2>
            <p className="text-sm text-muted-foreground">
              Change your account password.
            </p>
          </div>
        </div>

        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="currentPassword" className="text-sm font-semibold">
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring"
              {...passwordForm.register("currentPassword")}
            />
            {passwordForm.formState.errors.currentPassword && (
              <p className="text-xs text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="newPassword" className="text-sm font-semibold">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring"
              {...passwordForm.register("newPassword")}
            />
            {passwordForm.formState.errors.newPassword && (
              <p className="text-xs text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-semibold">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring"
              {...passwordForm.register("confirmPassword")}
            />
            {passwordForm.formState.errors.confirmPassword && (
              <p className="text-xs text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
            )}
          </div>

          {passwordMessage && (
            <div
              className={`flex gap-2 rounded-md p-3 text-xs ${
                passwordMessage.type === "success"
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {passwordMessage.type === "success" ? (
                <CheckCircle className="h-4 w-4 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              )}
              <span>{passwordMessage.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={passwordForm.formState.isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {passwordForm.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
