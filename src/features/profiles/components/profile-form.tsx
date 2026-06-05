"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  useCurrentProfile,
  useCreateProfile,
  useUpdateProfile,
} from "@/features/profiles/hooks/use-profile";
import { uploadAvatar } from "@/features/profiles/services/profile-service";
import { profileSchema, type ProfileFormValues } from "@/features/profiles/validation";
import { Camera, AlertTriangle, CheckCircle, Info, Loader2 } from "lucide-react";

export function ProfileForm() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile, isLoading: isProfileLoading, error: profileError, refetch } = useCurrentProfile();
  const createProfileMutation = useCreateProfile();
  const updateProfileMutation = useUpdateProfile();

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isNewProfile = !profile;

  // Calculate username cooldown
  const canChangeUsername = (() => {
    if (isNewProfile) return true;
    if (!profile?.lastUsernameChange) return true;
    
    const lastChange = new Date(profile.lastUsernameChange).getTime();
    const cooldownPeriod = 30 * 24 * 60 * 60 * 1000; // 30 days
    return Date.now() - lastChange >= cooldownPeriod;
  })();

  const cooldownRemainingDays = (() => {
    if (isNewProfile || !profile?.lastUsernameChange) return 0;
    const lastChange = new Date(profile.lastUsernameChange).getTime();
    const expiry = lastChange + 30 * 24 * 60 * 60 * 1000;
    const diff = expiry - Date.now();
    return Math.ceil(diff / (24 * 60 * 60 * 1000));
  })();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: "",
      bio: "",
      defaultIdentityMode: "public",
    },
  });

  // Load existing profile values
  useEffect(() => {
    if (profile) {
      reset({
        username: profile.username,
        bio: profile.bio || "",
        defaultIdentityMode: profile.defaultIdentityMode,
      });
      if (profile.avatarUrl) {
        setAvatarPreview(profile.avatarUrl);
      }
    }
  }, [profile, reset]);

  // Handle avatar file selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Client-side validations
    if (file.size > 5 * 1024 * 1024) {
      setFormMessage({ type: "error", text: "File size must not exceed 5 MB" });
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setFormMessage({ type: "error", text: "Invalid file type. Only JPEG, PNG, and WebP are allowed." });
      return;
    }

    setAvatarFile(file);
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setFormMessage(null);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const onSubmit = async (values: ProfileFormValues) => {
    setFormMessage(null);
    let finalAvatarUrl = profile?.avatarUrl || null;

    try {
      // 1. Upload avatar if selected
      if (avatarFile && user?.id) {
        setUploadingAvatar(true);
        finalAvatarUrl = await uploadAvatar(user.id, avatarFile);
        setUploadingAvatar(false);
      }

      const payload = {
        username: values.username,
        bio: values.bio || null,
        defaultIdentityMode: values.defaultIdentityMode,
        avatarUrl: finalAvatarUrl,
      };

      // 2. Insert or update profile
      if (isNewProfile) {
        await createProfileMutation.mutateAsync(payload);
        setFormMessage({ type: "success", text: "Your profile has been created successfully!" });
      } else {
        // Only submit username if changed and allowed
        const updatePayload: {
          username?: string;
          bio: string | null;
          defaultIdentityMode: "public" | "anonymous";
          avatarUrl: string | null;
        } = {
          bio: payload.bio,
          defaultIdentityMode: payload.defaultIdentityMode,
          avatarUrl: payload.avatarUrl,
        };
        
        if (values.username.toLowerCase() !== profile.username && canChangeUsername) {
          updatePayload.username = values.username;
        }

        await updateProfileMutation.mutateAsync(updatePayload);
        setFormMessage({ type: "success", text: "Your profile has been updated successfully!" });
      }

      await refetch();
      
      // Redirect to public profile after a short delay on success
      setTimeout(() => {
        router.push(`/u/${values.username.toLowerCase()}`);
      }, 1500);
      
    } catch (err) {
      setUploadingAvatar(false);
      setFormMessage({
        type: "error",
        text: err instanceof Error ? err.message : "An unexpected error occurred while saving your profile.",
      });
    }
  };

  if (isProfileLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading profile settings...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl rounded-xl border border-border bg-card/50 p-6 backdrop-blur-md md:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight">
          {isNewProfile ? "Set up your public profile" : "Profile settings"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isNewProfile
            ? "Create your Discora profile to start participating in structured discussions."
            : "Update your public avatar, bio, and identity preferences."}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Avatar Upload Preview Section */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
          <div
            onClick={handleAvatarClick}
            className="group relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-border bg-muted/50 transition-all hover:border-primary"
          >
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarPreview}
                alt="Avatar Preview"
                className="h-full w-full object-cover transition-opacity group-hover:opacity-75"
              />
            ) : (
              <span className="text-xs text-muted-foreground text-center px-2">No Image</span>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <button
              type="button"
              onClick={handleAvatarClick}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent"
            >
              Choose Avatar Image
            </button>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              Supports JPEG, PNG, and WebP. Max file size 5MB.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
          </div>
        </div>

        {/* Username field */}
        <div className="space-y-2">
          <label htmlFor="username" className="text-sm font-semibold">
            Username
          </label>
          <input
            id="username"
            type="text"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canChangeUsername}
            {...register("username")}
          />
          {errors.username && (
            <p className="text-xs text-destructive">{errors.username.message}</p>
          )}

          {!canChangeUsername && profile?.lastUsernameChange && (
            <div className="flex gap-2 rounded-md bg-amber-500/10 p-3 text-xs text-amber-500">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Username locked</p>
                <p>
                  You changed your username recently. You can change it again in{" "}
                  <span className="font-bold">{cooldownRemainingDays} days</span> (last changed{" "}
                  {new Date(profile.lastUsernameChange).toLocaleDateString()}).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bio field */}
        <div className="space-y-2">
          <label htmlFor="bio" className="text-sm font-semibold">
            Bio
          </label>
          <textarea
            id="bio"
            rows={4}
            maxLength={500}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring"
            placeholder="Tell us about yourself..."
            {...register("bio")}
          />
          {errors.bio && (
            <p className="text-xs text-destructive">{errors.bio.message}</p>
          )}
          <p className="text-right text-[10px] text-muted-foreground">Max 500 characters</p>
        </div>

        {/* Default Identity Mode */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-semibold">Default Identity Preference</label>
            <p className="text-xs text-muted-foreground">
              Your default identity setting when posting new messages (you can toggle this per post).
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex flex-1 cursor-pointer items-center justify-between rounded-lg border border-border bg-card p-3 hover:bg-accent/40">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  value="public"
                  className="accent-primary"
                  {...register("defaultIdentityMode")}
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
                  value="anonymous"
                  className="accent-primary"
                  {...register("defaultIdentityMode")}
                />
                <div className="text-left">
                  <p className="text-xs font-semibold">Anonymous Mode</p>
                  <p className="text-[10px] text-muted-foreground">Post as &quot;Anonymous&quot;</p>
                </div>
              </div>
            </label>
          </div>
          {errors.defaultIdentityMode && (
            <p className="text-xs text-destructive">{errors.defaultIdentityMode.message}</p>
          )}
          <div className="flex gap-2 rounded-md bg-blue-500/10 p-3 text-xs text-blue-400">
            <Info className="h-4 w-4 shrink-0" />
            <p>
              <strong>Note:</strong> Storing this preference is preparation for future sprints. Discora does not support posting yet.
            </p>
          </div>
        </div>

        {/* Save button and status message */}
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
            disabled={isSubmitting || uploadingAvatar}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {(isSubmitting || uploadingAvatar) && <Loader2 className="h-4 w-4 animate-spin" />}
            {isNewProfile ? "Complete Setup" : "Save Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
