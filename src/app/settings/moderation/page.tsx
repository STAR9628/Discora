import { redirect, notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/services/supabase/server";
import { ModerationDashboard } from "./moderation-dashboard";

export const metadata = {
  title: "Moderation Dashboard | Discora",
  description: "Review flagged content and manage moderation actions.",
};

export default async function ModerationDashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectedFrom=/settings/moderation");
  }

  const { data: hasRole } = await supabase.rpc("has_current_user_role_or_higher", {
    p_required_role: "moderator",
  });

  if (!hasRole) {
    notFound();
  }

  return <ModerationDashboard />;
}
