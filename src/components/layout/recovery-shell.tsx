import type { ReactNode } from "react";
import { RecoveryLogoutButton } from "@/components/layout/recovery-logout-button";

type RecoveryShellProps = {
  children: ReactNode;
};

/**
 * Minimal application shell shown exclusively during a verified password
 * recovery session (marker + live session, decided in the root layout).
 * Normal Discora navigation is intentionally absent: middleware already
 * confines recovery sessions to /reset-password, and this shell makes that
 * state explicit instead of presenting unusable navigation.
 */
export function RecoveryShell({ children }: RecoveryShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border/60">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="text-sm font-bold tracking-tight">Discora</span>
            <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[11px] font-medium text-primary">
              Account recovery
            </span>
          </div>
          <RecoveryLogoutButton />
        </div>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
