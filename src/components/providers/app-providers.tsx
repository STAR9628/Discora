"use client";

import type { ReactNode } from "react";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/features/auth/providers/auth-provider";
import { ToasterProvider } from "@/components/providers/toaster-provider";

import { MotionConfig } from "motion/react";
import { NetworkStatusProvider } from "@/components/providers/network-status-provider";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <MotionConfig reducedMotion="user">
        <QueryProvider>
          <AuthProvider>
            <NetworkStatusProvider>{children}</NetworkStatusProvider>
          </AuthProvider>
        </QueryProvider>
        <ToasterProvider />
      </MotionConfig>
    </ThemeProvider>
  );
}
