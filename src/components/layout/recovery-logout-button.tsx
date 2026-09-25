"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/use-auth";

/**
 * Minimal sign-out control for the recovery-only shell. Mirrors the header
 * logout behavior: server-side sign-out (clears session and one-time auth
 * state) then return home as guest.
 */
export function RecoveryLogoutButton() {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
    >
      Logout
    </button>
  );
}
