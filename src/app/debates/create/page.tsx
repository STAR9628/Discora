import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createServerSupabaseClient } from "@/services/supabase/server";
import { CreateDebateForm } from "@/features/debates/components/create-debate-form";

export const metadata: Metadata = {
  title: "Create a Debate | Discora",
  description: "Set up a structured debate with proposition and opposition sides on Discora.",
};

export default async function CreateDebatePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectedFrom=/debates/create");
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <CreateDebateForm />
    </main>
  );
}
