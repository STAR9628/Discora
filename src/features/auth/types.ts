import type { Session, User } from "@supabase/supabase-js";

export type AuthStatus =
  | "loading"
  | "authenticated"
  | "guest"
  | "configuration_error";

export type AuthState = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  error: string | null;
};

export type AuthActionResult = {
  success: boolean;
  message: string;
};
