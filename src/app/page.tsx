"use client";

import { useAuth } from "@/features/auth/hooks/use-auth";
import { GuestHomepage } from "@/features/homepage/components/guest-homepage";
import { LoggedInHomepage } from "@/features/homepage/components/logged-in-homepage";

function HomepageSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-5xl space-y-12 py-8 pb-16 animate-pulse"
      aria-busy="true"
      aria-label="Loading homepage"
    >
      {/* Hero / Header Skeleton */}
      <div className="space-y-4 text-center max-w-2xl mx-auto pt-4">
        <div className="h-9 w-3/4 mx-auto rounded-xl bg-card/60" />
        <div className="h-4 w-5/6 mx-auto rounded-lg bg-card/40" />
        <div className="h-4 w-2/3 mx-auto rounded-lg bg-card/30" />
        <div className="flex justify-center gap-3 pt-3">
          <div className="h-10 w-36 rounded-xl bg-card/50" />
          <div className="h-10 w-36 rounded-xl bg-card/50" />
        </div>
      </div>

      {/* Content Section Skeletons */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="h-5 w-40 rounded-lg bg-card/60" />
          <div className="h-4 w-16 rounded bg-card/40" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl border border-border/40 bg-card/30 p-5 space-y-3">
              <div className="h-4 w-3/4 rounded bg-muted/60" />
              <div className="h-3 w-1/2 rounded bg-muted/40" />
              <div className="h-3 w-5/6 rounded bg-muted/30" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-36 rounded-lg bg-card/60" />
          <div className="h-4 w-16 rounded bg-card/40" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl border border-border/40 bg-card/30 p-5 space-y-3">
              <div className="h-4 w-3/4 rounded bg-muted/60" />
              <div className="h-3 w-1/2 rounded bg-muted/40" />
              <div className="h-3 w-5/6 rounded bg-muted/30" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { status } = useAuth();

  if (status === "configuration_error") {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-6 px-4 py-24 sm:px-6 lg:px-8">
        <p className="text-sm text-destructive">Authentication configuration error.</p>
      </main>
    );
  }

  // P1.1: While auth session is resolving ("loading"), render a neutral, lightweight
  // skeleton shell ONLY. Do not mount GuestHomepage or LoggedInHomepage to prevent
  // unnecessary RPC fetches, layout shifts, or flash of guest data for authenticated users.
  if (status === "loading") {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 sm:px-6 lg:px-8">
        <HomepageSkeleton />
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 sm:px-6 lg:px-8">
      {status === "authenticated" ? <LoggedInHomepage /> : <GuestHomepage />}
    </main>
  );
}
