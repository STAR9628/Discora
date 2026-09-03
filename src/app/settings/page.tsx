import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/services/supabase/server";
import { SettingsPageClient } from "@/features/settings/components/settings-page-client";

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectedFrom=/settings");
  }

  return <SettingsPageClient />;
}

export const metadata = {
  title: "Settings | Discora",
  description: "Manage your Discora account, profile, and preferences.",
};
