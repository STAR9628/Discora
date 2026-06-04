import type { Metadata } from "next";
import { DiscussionFeed } from "@/features/discussions/components/discussion-feed";

export const metadata: Metadata = {
  title: "Discussions | Discora",
  description: "Browse and join structured, open-exploration discussions under standard categories on Discora.",
};

export default function DiscussionsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <DiscussionFeed />
    </main>
  );
}
