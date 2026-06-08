"use client";

import { GoogleSignInButton } from "@/components/auth/google-signin-button";

interface GoogleOneTapProps {
  redirectTo?: string;
}

export function GoogleOneTap({ redirectTo }: GoogleOneTapProps) {
  return <GoogleSignInButton redirectTo={redirectTo} />;
}
