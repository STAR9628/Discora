import type { Metadata } from "next";
import { CreateDiscussionForm } from "@/features/discussions/components/create-discussion-form";

export const metadata: Metadata = {
  title: "Create Discussion | Discora",
  description: "Start a new structured, open-exploration discussion on Discora.",
};

export default function CreateDiscussionPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <CreateDiscussionForm />
    </main>
  );
}
