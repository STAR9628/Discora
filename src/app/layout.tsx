import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { RecoveryShell } from "@/components/layout/recovery-shell";
import { AppProviders } from "@/components/providers/app-providers";
import { createServerSupabaseClient } from "@/services/supabase/server";
import {
  RECOVERY_VERIFIED_COOKIE_NAME,
  hasRecoveryContext,
} from "@/features/auth/utils/recovery-context";
import { getOrganizationSchema, getWebSiteSchema } from "@/lib/seo/structured-data";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const [webSiteSchema, organizationSchema] = await Promise.all([
    getWebSiteSchema(),
    getOrganizationSchema(),
  ]);

  return {
    title: {
      default: "Discora",
      template: "%s | Discora",
    },
    description:
      "A structured discourse platform for discussion, debate, and evidence-based understanding. Evidence over popularity. Understanding over engagement.",
    icons: {
      icon: "/discora-mark.png",
      apple: "/discora-mark.png",
    },
    openGraph: {
      siteName: "Discora",
      type: "website",
    },
    other: {
      "script:ld+json": [JSON.stringify(webSiteSchema), JSON.stringify(organizationSchema)].join(""),
    },
  };
}

type RootLayoutProps = {
  children: ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
  // Recovery-only shell: a verified recovery session (marker + live user)
  // renders a minimal shell without normal navigation. Guests and normal
  // sessions always render the full AppShell. Fail-closed on read errors.
  let inRecoveryMode = false;
  try {
    const cookieStore = await cookies();
    const marker = cookieStore.get(RECOVERY_VERIFIED_COOKIE_NAME)?.value ?? null;
    if (marker) {
      const supabase = await createServerSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      inRecoveryMode = hasRecoveryContext(marker, session?.user?.id ?? null);
    }
  } catch {
    inRecoveryMode = false;
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppProviders>
          {inRecoveryMode ? (
            <RecoveryShell>{children}</RecoveryShell>
          ) : (
            <AppShell>{children}</AppShell>
          )}
        </AppProviders>
      </body>
    </html>
  );
}
