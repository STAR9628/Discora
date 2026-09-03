import type { Metadata } from "next";
import { LeaderboardPageClient } from "./leaderboard-page-client";

export const metadata: Metadata = {
  title: "Leaderboard | Discora",
  description: "Top contributors ranked by reputation, evidence, claims, and activity.",
};

export default function LeaderboardPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Leaderboard</h1>
      <LeaderboardPageClient />
    </main>
  );
}
