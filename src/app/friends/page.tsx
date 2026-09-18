import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/services/supabase/server";
import { FriendsPageClient } from "@/features/friends/components/friends-page-client";

export const metadata: Metadata = {
  title: "Friends | Discora",
  description: "Manage your private Discora connections.",
  robots: { index: false },
};

export default async function FriendsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectedFrom=/friends");
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Friends</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your connections are private — only you can see this page.
        </p>
      </div>
      <FriendsPageClient />
    </main>
  );
}
