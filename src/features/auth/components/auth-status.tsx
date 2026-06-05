"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useCurrentProfile } from "@/features/profiles/hooks/use-profile";
import { Loader2, AlertTriangle } from "lucide-react";

export function AuthStatus() {
  const { status, user, signOut } = useAuth();

  const { data: profile, isLoading: isProfileLoading, error: profileError } = useCurrentProfile();

  if (status === "loading") {
    return (
      <div className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground">
        Checking session
      </div>
    );
  }

  if (status === "authenticated") {
    if (isProfileLoading) {
      return (
        <div className="flex items-center gap-2 rounded-md border border-border px-3 py-1">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Loading profile...</span>
        </div>
      );
    }

    const displayName = profile?.username ? `@${profile.username}` : user?.email;
    const avatarUrl = profile?.avatarUrl;

    return (
      <div className="flex items-center gap-3">
        {profileError ? (
          <div className="flex items-center gap-1.5 rounded-md border border-destructive/20 bg-destructive/5 px-2 py-1">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            <span className="text-xs text-destructive font-medium">Profile error</span>
          </div>
        ) : (
          <Link
            href={profile?.username ? `/u/${profile.username}` : "/settings/profile"}
            className="flex items-center gap-2 transition-opacity hover:opacity-85"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="Avatar"
                className="h-6 w-6 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-muted text-[10px] text-muted-foreground font-semibold">
                U
              </div>
            )}
            <span className="hidden max-w-48 truncate text-xs text-muted-foreground sm:inline">
              {displayName}
            </span>
          </Link>
        )}
        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/login"
        className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        Login
      </Link>
      <Link
        href="/register"
        className="rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground transition-opacity hover:opacity-90"
      >
        Register
      </Link>
    </div>
  );
}
