import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createServerSupabaseClient } from "@/services/supabase/server";
import { CreateDiscussionForm } from "@/features/discussions/components/create-discussion-form";

export const metadata: Metadata = {
  title: "Create Discussion | Discora",
  description: "Start a new structured, open-exploration discussion on Discora.",
};

export default async function CreateDiscussionPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectedFrom=/discussions/create");
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <CreateDiscussionForm />
    </main>
  );
}
