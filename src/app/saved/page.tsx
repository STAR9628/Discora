import { createServerSupabaseClient } from "@/services/supabase/server";
import { redirect } from "next/navigation";
import { SavedPageClient } from "@/features/saves/components/saved-page";

export default async function SavedPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectedFrom=/saved");
  }

  return <SavedPageClient />;
}
