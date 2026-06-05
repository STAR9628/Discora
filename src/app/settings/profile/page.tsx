import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/services/supabase/server";
import { ProfileForm } from "@/features/profiles/components/profile-form";

export default async function ProfileSettingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectedFrom=/settings/profile");
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <ProfileForm />
    </main>
  );
}
