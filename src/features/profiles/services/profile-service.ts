import type { SupabaseClient } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/services/supabase/client";
import { mapSupabaseError } from "@/lib/errors";
import type { UserProfile } from "@/types/domain";

export interface DbProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  default_identity_mode: "public" | "anonymous";
  last_username_change: string | null;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

// Helper to map DB snake_case columns to TS camelCase fields
export function mapProfileRow(row: DbProfileRow): UserProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name || null,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    defaultIdentityMode: row.default_identity_mode,
    lastUsernameChange: row.last_username_change,
    joinedAt: row.joined_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getClient(overrideClient?: SupabaseClient): SupabaseClient {
  return overrideClient || createBrowserSupabaseClient();
}

/**
 * Fetch public profile by username
 */
export async function getProfileByUsername(
  username: string,
  overrideClient?: SupabaseClient,
): Promise<UserProfile | null> {
  const supabase = getClient(overrideClient);
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load profile"));
  }

  return data ? mapProfileRow(data) : null;
}

/**
 * Fetch profile by user ID
 */
export async function getProfileByUserId(
  userId: string,
  overrideClient?: SupabaseClient,
): Promise<UserProfile | null> {
  const supabase = getClient(overrideClient);
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load profile"));
  }

  return data ? mapProfileRow(data) : null;
}

/**
 * Create a user profile (First-time setup)
 */
export async function createProfile(
  userId: string,
  data: {
    username: string;
    displayName?: string | null;
    bio?: string | null;
    defaultIdentityMode: "public" | "anonymous";
    avatarUrl?: string | null;
  },
  overrideClient?: SupabaseClient,
): Promise<UserProfile> {
  const supabase = getClient(overrideClient);
  const { data: inserted, error } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      username: data.username.toLowerCase(),
      display_name: data.displayName || null,
      bio: data.bio || null,
      avatar_url: data.avatarUrl || null,
      default_identity_mode: data.defaultIdentityMode,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to create profile"));
  }

  return mapProfileRow(inserted);
}

/**
 * Update user profile
 */
export async function updateProfile(
  userId: string,
  data: {
    username?: string;
    displayName?: string | null;
    bio?: string | null;
    defaultIdentityMode?: "public" | "anonymous";
    avatarUrl?: string | null;
  },
  overrideClient?: SupabaseClient,
): Promise<UserProfile> {
  const supabase = getClient(overrideClient);
  
  const updateData: {
    username?: string;
    display_name?: string | null;
    bio?: string | null;
    default_identity_mode?: "public" | "anonymous";
    avatar_url?: string | null;
  } = {};
  if (data.username !== undefined) {
    updateData.username = data.username.toLowerCase();
  }
  if (data.displayName !== undefined) {
    updateData.display_name = data.displayName;
  }
  if (data.bio !== undefined) {
    updateData.bio = data.bio;
  }
  if (data.defaultIdentityMode !== undefined) {
    updateData.default_identity_mode = data.defaultIdentityMode;
  }
  if (data.avatarUrl !== undefined) {
    updateData.avatar_url = data.avatarUrl;
  }

  const { data: updated, error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", userId)
    .select("*")
    .single();

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to update profile"));
  }

  return mapProfileRow(updated);
}

/**
 * Upload profile avatar to Supabase storage.
 * Replaces any existing avatar at {userId}/avatar.{ext} using upsert.
 */
export async function uploadAvatar(
  userId: string,
  file: File,
  overrideClient?: SupabaseClient,
): Promise<string> {
  // Validate size (5MB max)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error("File size must not exceed 5 MB");
  }

  // Validate type
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedMimeTypes.includes(file.type)) {
    throw new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
  }

  // Map type to extension
  let extension = "jpg";
  if (file.type === "image/png") {
    extension = "png";
  } else if (file.type === "image/webp") {
    extension = "webp";
  } else if (file.type === "image/jpeg" || file.type === "image/jpg") {
    extension = "jpg";
  } else {
    // Fallback extract from filename
    const parts = file.name.split(".");
    if (parts.length > 1) {
      const ext = parts.pop()?.toLowerCase();
      if (ext && ["jpg", "jpeg", "png", "webp"].includes(ext)) {
        extension = ext;
      }
    }
  }

  const supabase = getClient(overrideClient);
  const path = `${userId}/avatar.${extension}`;

  // Upload file (replacing existing)
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to upload avatar"));
  }

  // Get and return public URL
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error("Failed to retrieve public URL of uploaded avatar.");
  }

  return data.publicUrl;
}
