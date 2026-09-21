"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useCurrentProfile } from "@/features/profiles/hooks/use-profile";
import { hasAuthCookie } from "@/features/auth/utils/auth-cookie";
import { Loader2, AlertTriangle } from "lucide-react";

export function AuthStatus() {
  const router = useRouter();
  const pathname = usePathname();
  const { status, user, signOut } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  const { data: profile, isLoading: isProfileLoading, error: profileError } = useCurrentProfile();

  if (status === "loading") {
    if (mounted && hasAuthCookie()) {
      return (
        <div className="flex items-center gap-2 animate-pulse py-1" aria-busy="true" aria-label="Loading profile">
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-border bg-muted/60 shrink-0" />
          <div className="hidden h-3 w-16 rounded bg-muted/40 sm:inline-block" />
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2" aria-busy="true" aria-label="Checking session">
        <div className="h-8 w-14 rounded-md border border-border/50 bg-card/40 animate-pulse" />
        <div className="h-8 w-16 rounded-md bg-muted/30 animate-pulse" />
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
                className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs text-muted-foreground font-semibold">
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
          onClick={() => void handleSignOut()}
          className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Logout
        </button>
      </div>
    );
  }

  const isAuthOrHome =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/auth/");
  const loginHref = isAuthOrHome
    ? "/login"
    : `/login?redirectedFrom=${encodeURIComponent(pathname)}`;

  return (
    <div className="flex items-center gap-2">
      <Link
        href={loginHref}
        className="rounded-md border border-border px-3 py-1.5 sm:py-1 min-h-[36px] sm:min-h-0 flex items-center justify-center text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        Login
      </Link>
      <Link
        href="/register"
        className="rounded-md bg-primary px-3 py-1.5 sm:py-1 min-h-[36px] sm:min-h-0 flex items-center justify-center text-xs text-primary-foreground font-semibold transition-opacity hover:opacity-90"
      >
        Register
      </Link>
    </div>
  );
}
