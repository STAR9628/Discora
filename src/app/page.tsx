"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { hasAuthCookie } from "@/features/auth/utils/auth-cookie";
import { GuestHomepage } from "@/features/homepage/components/guest-homepage";
import { LoggedInHomepage } from "@/features/homepage/components/logged-in-homepage";
import {
  LoggedInHomepageSkeleton,
  NeutralAuthResolutionSkeleton,
  GuestHomepageSkeleton,
} from "@/features/homepage/components/home-skeletons";

export default function HomePage() {
  const { status } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (status === "configuration_error") {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-6 px-4 py-24 sm:px-6 lg:px-8">
        <p className="text-sm text-destructive">Authentication configuration error.</p>
      </div>
    );
  }

  // Auth resolution loading state:
  // - During SSR and initial client hydration pass (!mounted):
  //   Render NeutralAuthResolutionSkeleton. Server and client output agree 100% (zero hydration error).
  // - Once mounted on client:
  //   - If auth session cookie is present -> LoggedInHomepageSkeleton (matches LoggedInHomepage)
  //   - If no auth cookie -> GuestHomepageSkeleton (matches GuestHomepage)
  if (status === "loading") {
    if (!mounted) {
      return (
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 sm:px-6 lg:px-8">
          <NeutralAuthResolutionSkeleton />
        </div>
      );
    }

    const isLikelyAuthenticated = hasAuthCookie();
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 sm:px-6 lg:px-8">
        {isLikelyAuthenticated ? (
          <LoggedInHomepageSkeleton />
        ) : (
          <GuestHomepageSkeleton />
        )}
      </div>
    );
  }

  // State B (authenticated) vs State A (guest)
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 sm:px-6 lg:px-8">
      {status === "authenticated" ? <LoggedInHomepage /> : <GuestHomepage />}
    </div>
  );
}
