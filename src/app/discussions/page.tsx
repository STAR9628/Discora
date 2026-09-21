import type { Metadata } from "next";
import { DiscussionFeed } from "@/features/discussions/components/discussion-feed";

export const metadata: Metadata = {
  title: "Discussions",
  description: "Browse and join structured discussions on Discora. Evidence over popularity.",
};

export default function DiscussionsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <DiscussionFeed />
    </div>
  );
}
