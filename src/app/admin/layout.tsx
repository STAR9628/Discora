import type { Metadata } from "next";
import { requireOwner } from "@/lib/security/owner-guard";

export const metadata: Metadata = {
  title: "Admin Console | Discora",
  description: "Operational Console & Platform Safety Oversight",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side security boundary: fails closed, returns notFound() for non-owners
  await requireOwner();

  return <>{children}</>;
}
