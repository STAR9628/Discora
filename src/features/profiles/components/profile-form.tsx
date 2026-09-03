"use client";

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
import { Camera, AlertTriangle, CheckCircle, Loader2, AtSign } from "lucide-react";

export function ProfileForm() {
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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: "",
      displayName: "",
      bio: "",
      defaultIdentityMode: "public",
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        username: profile.username,
        displayName: profile.displayName || "",
        bio: profile.bio || "",
        defaultIdentityMode: profile.defaultIdentityMode,
      });
      if (profile.avatarUrl) {
        setAvatarPreview(profile.avatarUrl);
      }
    }
  }, [profile, reset]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

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
      if (avatarFile && user?.id) {
        setUploadingAvatar(true);
        finalAvatarUrl = await uploadAvatar(user.id, avatarFile);
        setUploadingAvatar(false);
      }

      const payload = {
        username: profile?.username || values.username,
        displayName: values.displayName || null,
        bio: values.bio || null,
        defaultIdentityMode: values.defaultIdentityMode,
        avatarUrl: finalAvatarUrl,
      };

      if (isNewProfile) {
        await createProfileMutation.mutateAsync(payload);
        setFormMessage({ type: "success", text: "Your profile has been created successfully!" });
      } else {
        await updateProfileMutation.mutateAsync({
          displayName: payload.displayName,
          bio: payload.bio,
          defaultIdentityMode: payload.defaultIdentityMode,
          avatarUrl: payload.avatarUrl,
        });
        setFormMessage({ type: "success", text: "Your profile has been updated successfully!" });
      }

      await refetch();
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
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <h3 className="text-sm font-semibold text-destructive">Unable to load profile</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {profileError instanceof Error ? profileError.message : "An unexpected error occurred."}
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

  return (
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
        {isNewProfile ? (
          <div className="relative">
            <AtSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              id="username"
              type="text"
              className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none transition-colors focus:border-ring"
              placeholder="e.g. qatester012"
              {...register("username")}
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            <AtSign className="h-4 w-4 shrink-0" />
            <span className="font-medium">{profile?.username}</span>
          </div>
        )}
        {errors.username && (
          <p className="text-xs text-destructive">{errors.username.message}</p>
        )}
      </div>

      {/* Display name field */}
      <div className="space-y-2">
        <label htmlFor="displayName" className="text-sm font-semibold">
          Display Name
        </label>
        <input
          id="displayName"
          type="text"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring"
          placeholder="Your display name (optional)"
          {...register("displayName")}
        />
        {errors.displayName && (
          <p className="text-xs text-destructive">{errors.displayName.message}</p>
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
  );
}
