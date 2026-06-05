import { Suspense } from "react";
import { SearchPageClient } from "@/features/discussions/components/search/search-page-client";

export const metadata = {
  title: "Search — Discora",
  description: "Full-text search across discussions, claims, evidence, and questions.",
};

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8"><p className="text-sm text-muted-foreground">Loading search...</p></div>}>
      <SearchPageClient />
    </Suspense>
  );
}
