"use client";

import { useAuth } from "@/features/auth/hooks/use-auth";
import { GuestHomepage } from "@/features/homepage/components/guest-homepage";
import { LoggedInHomepage } from "@/features/homepage/components/logged-in-homepage";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-6 px-4 py-24 sm:px-6 lg:px-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (status === "configuration_error") {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-6 px-4 py-24 sm:px-6 lg:px-8">
        <p className="text-sm text-destructive">Authentication configuration error.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 sm:px-6 lg:px-8">
      {status === "authenticated" ? <LoggedInHomepage /> : <GuestHomepage />}
    </main>
  );
}
