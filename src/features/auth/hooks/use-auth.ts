"use client";

import { createContext, useContext } from "react";
import type { AuthState } from "@/features/auth/types";

export type AuthContextValue = AuthState & {
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
