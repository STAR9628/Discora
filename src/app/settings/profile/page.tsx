import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/services/supabase/server";
import { SettingsPageClient } from "@/features/settings/components/settings-page-client";

export default async function ProfileSettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectedFrom=/settings/profile");
  }

  return <SettingsPageClient />;
}

export const metadata = {
  title: "Profile Settings | Discora",
  description: "Manage your Discora profile and preferences.",
};
