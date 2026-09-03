"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useCurrentProfile, useUpdateProfile } from "@/features/profiles/hooks/use-profile";
import { ProfileForm } from "@/features/profiles/components/profile-form";
import { ReportHistory } from "@/features/safety/components/report-history";
import { useUserPreferences, useUpsertUserPreferences } from "@/features/preferences/hooks/use-preferences";
import {
  User,
  Eye,
  ShieldAlert,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Info,
  Settings,
} from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { privacySchema, type PrivacyFormValues } from "@/features/preferences/validation";

const SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "privacy", label: "Privacy", icon: Eye },
  { id: "safety", label: "Data & Safety", icon: ShieldAlert },
  { id: "danger", label: "Danger Zone", icon: Trash2 },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

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

function IdentityModeField({
  value,
  onChange,
}: {
  value: "public" | "anonymous";
  onChange: (value: "public" | "anonymous") => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <label className="flex flex-1 cursor-pointer items-center justify-between rounded-lg border border-border bg-card p-3 hover:bg-accent/40">
        <div className="flex items-center gap-2">
          <input
            type="radio"
            checked={value === "public"}
            onChange={() => onChange("public")}
            className="accent-primary"
          />
          <div className="text-left">
            <p className="text-xs font-semibold">Public Mode</p>
            <p className="text-[10px] text-muted-foreground">Post using your @username</p>
          </div>
        </div>
      </label>
      <label className="flex flex-1 cursor-pointer items-center justify-between rounded-lg border border-border bg-card p-3 hover:bg-accent/40">
        <div className="flex items-center gap-2">
          <input
            type="radio"
            checked={value === "anonymous"}
            onChange={() => onChange("anonymous")}
            className="accent-primary"
          />
          <div className="text-left">
            <p className="text-xs font-semibold">Anonymous Mode</p>
            <p className="text-[10px] text-muted-foreground">Post as &quot;Anonymous&quot;</p>
          </div>
        </div>
      </label>
    </div>
  );
}

function ProfilePanel() {
  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h2 className="text-xl font-bold tracking-tight">Profile</h2>
        <p className="text-sm text-muted-foreground">
          Manage your avatar, display name, and bio.
        </p>
      </div>
      <ProfileForm />
    </div>
  );
}

function PrivacyPanel() {
  const { data: profile, isLoading: isProfileLoading, refetch: refetchProfile } = useCurrentProfile();
  const updateProfileMutation = useUpdateProfile();
  const { data: preferences, isLoading: isPrefsLoading, refetch: refetchPrefs } = useUserPreferences();
  const upsertMutation = useUpsertUserPreferences();

  const [identityMode, setIdentityMode] = useState<"public" | "anonymous">("public");
  const [identityMessage, setIdentityMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [savingIdentity, setSavingIdentity] = useState(false);

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
    if (profile) {
      setIdentityMode(profile.defaultIdentityMode);
    }
  }, [profile]);

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

  const onSaveIdentityMode = async () => {
    setIdentityMessage(null);
    setSavingIdentity(true);
    try {
      await updateProfileMutation.mutateAsync({ defaultIdentityMode: identityMode });
      setIdentityMessage({ type: "success", text: "Identity preference saved." });
      await refetchProfile();
    } catch (err) {
      setIdentityMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save identity preference.",
      });
    } finally {
      setSavingIdentity(false);
    }
  };

  const onSavePrivacy = async (values: PrivacyFormValues) => {
    setFormMessage(null);
    try {
      await upsertMutation.mutateAsync(values);
      setFormMessage({ type: "success", text: "Privacy settings saved." });
      await refetchPrefs();
    } catch (err) {
      setFormMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save privacy settings.",
      });
    }
  };

  const isLoading = isProfileLoading || isPrefsLoading;

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card/50">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h2 className="text-xl font-bold tracking-tight">Privacy</h2>
        <p className="text-sm text-muted-foreground">
          Control your identity visibility and what appears on your public profile.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card/50 p-6 backdrop-blur-md md:p-8">
        <div className="mb-6 flex items-start gap-3">
          <Eye className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <h3 className="text-lg font-bold tracking-tight">Default Identity Mode</h3>
            <p className="text-sm text-muted-foreground">
              Choose how you appear when posting new messages. You can toggle this per post.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <IdentityModeField value={identityMode} onChange={setIdentityMode} />

          <div className="flex gap-2 rounded-md bg-blue-500/10 p-3 text-xs text-blue-400">
            <Info className="h-4 w-4 shrink-0" />
            <p>
              <strong>Note:</strong> Storing this preference is preparation for future sprints. Discora does not support posting yet.
            </p>
          </div>

          {identityMessage && (
            <div
              className={`flex gap-2 rounded-md p-3 text-xs ${
                identityMessage.type === "success"
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {identityMessage.type === "success" ? (
                <CheckCircle className="h-4 w-4 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              )}
              <span>{identityMessage.text}</span>
            </div>
          )}

          <button
            type="button"
            onClick={onSaveIdentityMode}
            disabled={savingIdentity}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingIdentity && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Identity Preference
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/50 p-6 backdrop-blur-md md:p-8">
        <div className="mb-6">
          <h3 className="text-lg font-bold tracking-tight">Profile Visibility</h3>
          <p className="text-sm text-muted-foreground">
            Control what appears on your public profile.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSavePrivacy)} className="space-y-6">
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
    </div>
  );
}

function SafetyPanel() {
  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h2 className="text-xl font-bold tracking-tight">Data &amp; Safety</h2>
        <p className="text-sm text-muted-foreground">
          Track your reports and manage your data.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card/50 p-6 backdrop-blur-md md:p-8">
        <div className="mb-6 flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <h3 className="text-lg font-bold tracking-tight">Report History</h3>
            <p className="text-sm text-muted-foreground">
              Track the reports you have submitted.
            </p>
          </div>
        </div>
        <ReportHistory />
      </div>

      <div className="rounded-xl border border-border bg-card/50 p-6 backdrop-blur-md md:p-8">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="text-lg font-bold tracking-tight">Data Export</h3>
            <p className="text-sm text-muted-foreground">
              Export your data from Discora. This feature will be implemented in a future release.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DangerZonePanel() {
  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h2 className="text-xl font-bold tracking-tight">Danger Zone</h2>
        <p className="text-sm text-muted-foreground">
          Irreversible account actions.
        </p>
      </div>

      <div className="rounded-xl border border-destructive/20 bg-card/50 p-6 backdrop-blur-md md:p-8">
        <div className="flex items-start gap-3">
          <Trash2 className="mt-0.5 h-5 w-5 text-destructive" />
          <div className="flex-1">
            <h3 className="text-lg font-bold tracking-tight">Delete Account</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <div className="mt-4 flex gap-2 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <p>
                Account deletion is not yet available. This feature will be implemented in a future release.
              </p>
            </div>
            <button
              type="button"
              disabled
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-destructive/50 py-2.5 text-sm font-semibold text-destructive-foreground cursor-not-allowed opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SettingsPageClient() {
  const [activeSection, setActiveSection] = useState<SectionId>("profile");

  const panelContent: Record<SectionId, React.ReactNode> = {
    profile: <ProfilePanel />,
    privacy: <PrivacyPanel />,
    safety: <SafetyPanel />,
    danger: <DangerZonePanel />,
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl">
      {/* Sidebar — hidden on mobile, visible md+ */}
      <nav className="hidden w-56 shrink-0 border-r border-border py-8 pr-4 md:block">
        <div className="mb-6 flex items-center gap-2 px-3">
          <Settings className="h-5 w-5 text-primary" />
          <span className="text-sm font-bold tracking-tight">Settings</span>
        </div>
        <ul className="space-y-1">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{section.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Mobile tab bar */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur md:hidden">
        <div className="flex items-center gap-1 overflow-x-auto px-4 py-2">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{section.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content panel */}
      <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
        {panelContent[activeSection]}
      </div>
    </div>
  );
}
