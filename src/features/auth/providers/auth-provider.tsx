"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "@/features/auth/hooks/use-auth";
import { signOutAndClearAuthState } from "@/features/auth/services/auth-session-actions";
import type { AuthState } from "@/features/auth/types";
import { hasAuthCookie } from "@/features/auth/utils/auth-cookie";
import { createBrowserSupabaseClient } from "@/services/supabase/client";

type AuthProviderProps = {
  children: ReactNode;
};

const initialAuthState: AuthState = {
  status: "loading",
  session: null,
  user: null,
  error: null,
};

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);

  useEffect(() => {
    let isMounted = true;
    // Initialization barrier: the provider settles to guest only after BOTH
    // the active probe (refreshSession) and the authoritative INITIAL_SESSION
    // snapshot have run without yielding a session. Either source promoting
    // to authenticated wins immediately. This keeps the terminal fallback
    // (no indefinite "loading") without letting a stale probe overwrite a
    // concurrently arriving valid session (e.g. right after OAuth return).
    let refreshDone = false;
    let initialEventSeen = false;
    let refreshSeq = 0;

    const settleGuest = (errorMessage: string | null) => {
      if (!isMounted) return;
      if (!refreshDone || !initialEventSeen) return;
      setAuthState({
        status: "guest",
        session: null,
        user: null,
        error: errorMessage,
      });
    };

    const adoptAuthenticated = (
      session: NonNullable<AuthState["session"]>,
    ) => {
      if (!isMounted) return;
      refreshDone = true;
      initialEventSeen = true;
      setAuthState({
        status: "authenticated",
        session,
        user: session.user,
        error: null,
      });
    };

    const refreshSession = async () => {
      const seq = ++refreshSeq;
      const stillLatest = () => isMounted && seq === refreshSeq;
      try {
        const supabase = createBrowserSupabaseClient();
        const { data, error } = await supabase.auth.getSession();
        if (!stillLatest()) return;

        if (data.session) {
          adoptAuthenticated(data.session);
          return;
        }

        // If getSession returned null, but an auth cookie exists in document.cookie,
        // attempt getUser() to resolve session from server before falling back to guest.
        if (hasAuthCookie()) {
          const { data: userData } = await supabase.auth.getUser();
          if (!stillLatest()) return;
          if (userData?.user) {
            const { data: refreshedSession } = await supabase.auth.getSession();
            if (!stillLatest()) return;
            if (refreshedSession?.session) {
              adoptAuthenticated(refreshedSession.session);
              return;
            }
          }
        }

        // Terminal fallback: no session recovered. Settles to guest only
        // once the INITIAL_SESSION snapshot has also run, so an early probe
        // can never overwrite a concurrently arriving valid session.
        // A later onAuthStateChange event still promotes to authenticated.
        refreshDone = true;
        settleGuest(error?.message ?? null);
      } catch {
        // Recovery threw (network/storage failure). Do not destroy any
        // potentially valid session and do not leave status as "loading".
        if (!stillLatest()) return;
        refreshDone = true;
        settleGuest(null);
      }
    };

    // Initial session fetch
    refreshSession();

    // Subscribe to auth state changes
    try {
      const supabase = createBrowserSupabaseClient();

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (!isMounted) return;

        // When INITIAL_SESSION fires:
        // - If session present -> adopt session immediately.
        // - If no session -> record the snapshot; settle to guest only once
        //   the active probe (refreshSession) has also completed, so neither
        //   signal can prematurely overwrite the other.
        if (event === "INITIAL_SESSION") {
          if (session) {
            adoptAuthenticated(session);
          } else {
            initialEventSeen = true;
            if (!hasAuthCookie()) {
              refreshDone = true;
            }
            settleGuest(null);
          }
          return;
        }

        if (event === "SIGNED_OUT") {
          queryClient.clear();
        }

        setAuthState({
          status: session ? "authenticated" : "guest",
          session,
          user: session?.user ?? null,
          error: null,
        });
      });

      // Refresh session on window focus to handle cross-tab changes
      const handleFocus = () => {
        refreshSession();
      };
      window.addEventListener("focus", handleFocus);

      return () => {
        isMounted = false;
        subscription.unsubscribe();
        window.removeEventListener("focus", handleFocus);
      };
    } catch (error) {
      setAuthState({
        status: "configuration_error",
        session: null,
        user: null,
        error:
          error instanceof Error
            ? error.message
            : "Authentication is not configured.",
      });
    }

    return () => {
      isMounted = false;
    };
  }, [queryClient]);

  const value = useMemo(
    () => ({
      ...authState,
      async signOut() {
        // Server-side sign-out invalidates the session and expires the
        // httpOnly one-time auth cookies (recovery marker, OAuth
        // destination), which browser JS cannot delete itself.
        await signOutAndClearAuthState();
        queryClient.clear();
        setAuthState({
          status: "guest",
          session: null,
          user: null,
          error: null,
        });
      },
    }),
    [authState, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
