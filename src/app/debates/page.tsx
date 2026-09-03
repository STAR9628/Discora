import type { Metadata } from "next";
import { BrowseDebates } from "@/features/debates/components/browse-debates";

export const metadata: Metadata = {
  title: "Debates | Discora",
  description: "Browse active and resolved structured debates on Discora.",
};

export default function DebatesPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <BrowseDebates />
    </main>
  );
}
