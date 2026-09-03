import type { Metadata } from "next";
import { CreateDebateForm } from "@/features/debates/components/create-debate-form";

export const metadata: Metadata = {
  title: "Create a Debate | Discora",
  description: "Set up a structured debate with proposition and opposition sides on Discora.",
};

export default function CreateDebatePage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <CreateDebateForm />
    </main>
  );
}
