"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { toast } from "@/components/ui/toast";
import {
  deleteMyAccount,
  getDeletionStepUpMethod,
  requestDeletionOtp,
  type StepUpMethod,
} from "@/features/settings/services/account-deletion-actions";

type Step = "explain" | "stepup" | "working" | "done" | "error";

const CONFIRM_PHRASE = "DELETE MY ACCOUNT";

/**
 * Phase 9C.4 — Account deletion dialog (Option C, Hybrid De-Identification).
 * Destructive, deliberate, plain-language. No technical internals exposed.
 */
export function DeleteAccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();
  const [step, setStep] = useState<Step>("explain");
  const [phrase, setPhrase] = useState("");
  const [method, setMethod] = useState<StepUpMethod | null>(null);
  const [password, setPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const reset = () => {
    setStep("explain");
    setPhrase("");
    setMethod(null);
    setPassword("");
    setOtpSent(false);
    setOtp("");
    setError(null);
    setBusy(false);
  };

  const handleClose = () => {
    if (busy || step === "working") return;
    reset();
    onClose();
  };

  const handleContinue = async () => {
    if (phrase.trim() !== CONFIRM_PHRASE) {
      setError(`Type ${CONFIRM_PHRASE} exactly to continue.`);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const { method: m } = await getDeletionStepUpMethod();
      setMethod(m);
      setStep("stepup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleSendCode = async () => {
    setError(null);
    setBusy(true);
    try {
      await requestDeletionOtp();
      setOtpSent(true);
      toast.success("A verification code was sent to your email.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setError(null);
    setBusy(true);
    setStep("working");
    try {
      await deleteMyAccount({ phrase: CONFIRM_PHRASE, password: method === "password" ? password : undefined, otp: method === "otp" ? otp : undefined });
      queryClient.clear();
      await signOut().catch(() => {});
      setStep("done");
      toast.success("Your account has been deleted.");
      router.push("/");
      router.refresh();
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account deletion could not be completed. Please try again.");
      setStep("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-destructive/30 bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <h2 id="delete-account-title" className="text-lg font-bold text-foreground">
            Delete your account?
          </h2>
        </div>

        {step === "explain" && (
          <div className="mt-4 space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Deleting your account is <strong className="text-foreground">permanent and cannot be undone</strong>.
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Your name, bio, photo, and personal settings are removed.</li>
              <li>Things you wrote in discussions stay readable so conversations keep making sense, but they will show <strong className="text-foreground">“Deleted User”</strong> instead of your name.</li>
              <li>Your username is retired forever and can never be used again by anyone.</li>
              <li>You will be signed out on every device.</li>
            </ul>
            <label htmlFor="delete-confirm-phrase" className="block text-xs font-semibold text-foreground pt-1">
              Type {CONFIRM_PHRASE} to continue
            </label>
            <input
              id="delete-confirm-phrase"
              type="text"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              autoComplete="off"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-destructive"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={handleClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium cursor-pointer">
                Keep my account
              </button>
              <button
                type="button"
                onClick={handleContinue}
                disabled={busy}
                className="rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
              </button>
            </div>
          </div>
        )}

        {step === "stepup" && (
          <div className="mt-4 space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>For your safety, confirm it&apos;s really you before we delete your account.</p>
            {method === "password" ? (
              <>
                <label htmlFor="delete-password" className="block text-xs font-semibold text-foreground">
                  Enter your password
                </label>
                <input
                  id="delete-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-destructive"
                />
              </>
            ) : (
              <>
                <p>
                  We&apos;ll send a verification code to <strong className="text-foreground">{user?.email}</strong>.
                </p>
                {!otpSent ? (
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={busy}
                    className="rounded-xl border border-border px-4 py-2 text-sm font-semibold cursor-pointer disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send verification code"}
                  </button>
                ) : (
                  <>
                    <label htmlFor="delete-otp" className="block text-xs font-semibold text-foreground">
                      Enter the 6-digit code (valid for 5 minutes)
                    </label>
                    <input
                      id="delete-otp"
                      type="text"
                      inputMode="numeric"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
                      autoComplete="one-time-code"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm tracking-widest outline-none focus:border-destructive"
                    />
                  </>
                )}
              </>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={handleClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium cursor-pointer">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy || (method === "password" && !password) || (method === "otp" && (!otpSent || !otp))}
                className="rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete my account"}
              </button>
            </div>
          </div>
        )}

        {step === "working" && (
          <div className="mt-6 flex flex-col items-center gap-3 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-destructive" />
            <p>Deleting your account… Please keep this open.</p>
          </div>
        )}

        {step === "error" && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">{error ?? "Account deletion could not be completed. Please try again."}</p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={handleClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium cursor-pointer">
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("explain");
                  setError(null);
                }}
                className="rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-white cursor-pointer"
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
