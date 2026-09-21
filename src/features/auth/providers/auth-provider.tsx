"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "@/features/auth/hooks/use-auth";
import { logout } from "@/features/auth/services/auth-service";
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

    const refreshSession = async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (data.session) {
          setAuthState({
            status: "authenticated",
            session: data.session,
            user: data.session.user,
            error: null,
          });
          return;
        }

        // If getSession returned null, but an auth cookie exists in document.cookie,
        // attempt getUser() to resolve session from server before falling back to guest.
        if (hasAuthCookie()) {
          const { data: userData } = await supabase.auth.getUser();
          if (!isMounted) return;
          if (userData?.user) {
            const { data: refreshedSession } = await supabase.auth.getSession();
            if (refreshedSession?.session) {
              setAuthState({
                status: "authenticated",
                session: refreshedSession.session,
                user: refreshedSession.session.user,
                error: null,
              });
              return;
            }
          }
        }

        // Only adopt guest if no session AND no valid auth cookie is present
        if (!hasAuthCookie()) {
          setAuthState({
            status: "guest",
            session: null,
            user: null,
            error: error?.message ?? null,
          });
        }
      } catch {
        // Silently ignore refresh errors
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
        // - If no session AND no auth cookie -> visitor is definitely guest, adopt guest immediately.
        // - If no session BUT auth cookie is present -> do NOT drop to guest yet; getSession() is concurrently restoring.
        if (event === "INITIAL_SESSION") {
          if (session) {
            setAuthState({
              status: "authenticated",
              session,
              user: session.user,
              error: null,
            });
          } else if (!hasAuthCookie()) {
            setAuthState({
              status: "guest",
              session: null,
              user: null,
              error: null,
            });
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
        await logout();
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
