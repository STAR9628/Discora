import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/services/supabase/server";

export async function requireAuth() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
