"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { AuthContext } from "@/features/auth/hooks/use-auth";
import { logout } from "@/features/auth/services/auth-service";
import type { AuthState } from "@/features/auth/types";
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
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);

  useEffect(() => {
    let isMounted = true;

    try {
      const supabase = createBrowserSupabaseClient();

      supabase.auth.getSession().then(({ data, error }) => {
        if (!isMounted) {
          return;
        }

        setAuthState({
          status: data.session ? "authenticated" : "guest",
          session: data.session,
          user: data.session?.user ?? null,
          error: error?.message ?? null,
        });
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setAuthState({
          status: session ? "authenticated" : "guest",
          session,
          user: session?.user ?? null,
          error: null,
        });
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
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
  }, []);

  const value = useMemo(
    () => ({
      ...authState,
      async signOut() {
        await logout();
        setAuthState({
          status: "guest",
          session: null,
          user: null,
          error: null,
        });
      },
    }),
    [authState],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
