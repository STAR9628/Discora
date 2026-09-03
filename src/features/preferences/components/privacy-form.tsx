"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUserPreferences, useUpsertUserPreferences } from "@/features/preferences/hooks/use-preferences";
import { privacySchema, type PrivacyFormValues } from "@/features/preferences/validation";
import { Loader2, AlertTriangle, CheckCircle, Info } from "lucide-react";

export function PrivacyForm() {
  const { data: preferences, isLoading, error, refetch } = useUserPreferences();
  const upsertMutation = useUpsertUserPreferences();

  const {
    handleSubmit,
    formState: { isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<PrivacyFormValues>({
    resolver: zodResolver(privacySchema),
    defaultValues: {
      showReputation: true,
      showExpertise: true,
      showSideSwitches: true,
    },
  });

  useEffect(() => {
    if (preferences) {
      reset({
        showReputation: preferences.showReputation,
        showExpertise: preferences.showExpertise,
        showSideSwitches: preferences.showSideSwitches,
      });
    }
  }, [preferences, reset]);

  const [formMessage, setFormMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <h3 className="text-sm font-semibold text-destructive">Unable to load preferences</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "An unexpected error occurred."}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-3 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const onSubmit = async (values: PrivacyFormValues) => {
    setFormMessage(null);
    try {
      await upsertMutation.mutateAsync(values);
      setFormMessage({ type: "success", text: "Privacy settings saved." });
    } catch (err) {
      setFormMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save preferences.",
      });
    }
  };

  return (
    <div className="mx-auto max-w-xl rounded-xl border border-border bg-card/50 p-6 backdrop-blur-md md:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight">Privacy Settings</h2>
        <p className="text-sm text-muted-foreground">
          Control what appears on your public profile.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <ToggleField
            id="showReputation"
            label="Show reputation score"
            description="Display your overall reputation score on your public profile."
            checked={watch("showReputation")}
            onChange={(checked) => setValue("showReputation", checked)}
          />
          <ToggleField
            id="showExpertise"
            label="Show expertise areas"
            description="Display your expertise breakdown by topic on your public profile."
            checked={watch("showExpertise")}
            onChange={(checked) => setValue("showExpertise", checked)}
          />
          <ToggleField
            id="showSideSwitches"
            label="Show side-switch history"
            description="Display your debate side change history on your public profile."
            checked={watch("showSideSwitches")}
            onChange={(checked) => setValue("showSideSwitches", checked)}
          />
        </div>

        <div className="flex gap-2 rounded-md bg-blue-500/10 p-3 text-xs text-blue-400">
          <Info className="h-4 w-4 shrink-0" />
          <p>
            Changes only affect future profile page views. Your contributions remain visible to other participants within debates.
          </p>
        </div>

        <div className="space-y-4 pt-2">
          {formMessage && (
            <div
              className={`flex gap-2 rounded-md p-3 text-xs ${
                formMessage.type === "success"
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {formMessage.type === "success" ? (
                <CheckCircle className="h-4 w-4 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              )}
              <span>{formMessage.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Privacy Settings
          </button>
        </div>
      </form>
    </div>
  );
}

function ToggleField({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
      <div className="flex-1 pr-4">
        <label htmlFor={id} className="text-sm font-semibold cursor-pointer">
          {label}
        </label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <label className="relative inline-flex h-6 w-11 cursor-pointer items-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-full bg-muted-foreground/30 transition-colors peer-checked:bg-primary peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring" />
        <span className="absolute left-0.5 h-5 w-5 rounded-full bg-background transition-transform peer-checked:translate-x-5" />
      </label>
    </div>
  );
}
