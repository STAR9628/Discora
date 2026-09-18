import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { AppProviders } from "@/components/providers/app-providers";
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

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
