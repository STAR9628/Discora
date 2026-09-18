import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/services/supabase/server";

/**
 * Retrieves the configured platform owner UUID from server-side environment.
 * Never exposed via NEXT_PUBLIC_*. Fails closed if unset.
 */
export function getOwnerUserId(): string | null {
  const ownerId = process.env.DISCORA_OWNER_USER_ID?.trim();
  if (!ownerId || ownerId.length < 10) {
    return null;
  }
  return ownerId;
}

/**
 * Verifies whether a given user ID exactly matches the configured owner UUID.
 * Fails closed if the owner environment variable is missing.
 */
export function isConfiguredOwner(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const ownerId = getOwnerUserId();
  if (!ownerId) return false;

  // Constant-time length and character comparison
  if (userId.length !== ownerId.length) return false;
  let mismatch = 0;
  for (let i = 0; i < userId.length; i++) {
    mismatch |= userId.charCodeAt(i) ^ ownerId.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Server-side check that validates the authenticated Supabase session
 * against the configured owner identity.
 */
export async function verifyOwnerAccess(): Promise<{ isOwner: boolean; userId: string | null }> {
  const ownerId = getOwnerUserId();
  if (!ownerId) {
    return { isOwner: false, userId: null };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { isOwner: false, userId: null };
    }

    const isOwner = isConfiguredOwner(user.id);
    return { isOwner, userId: isOwner ? user.id : null };
  } catch {
    return { isOwner: false, userId: null };
  }
}

/**
 * Server guard: throws notFound() or an error if the authenticated user
 * is not the configured platform owner.
 */
export async function requireOwner(): Promise<string> {
  const { isOwner, userId } = await verifyOwnerAccess();
  if (!isOwner || !userId) {
    notFound();
  }
  return userId;
}
