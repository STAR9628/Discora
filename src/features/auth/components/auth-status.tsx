"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useCurrentProfile } from "@/features/profiles/hooks/use-profile";

export function AuthStatus() {
  const { status, user, signOut } = useAuth();

  const { data: profile } = useCurrentProfile();

  if (status === "loading") {
    return (
      <div className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground">
        Checking session
      </div>
    );
  }

  if (status === "authenticated") {
    const displayName = profile?.username ? `@${profile.username}` : user?.email;
    const avatarUrl = profile?.avatarUrl;

    return (
      <div className="flex items-center gap-3">
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
