"use client";

import { useState } from "react";
import { Loader2, SearchX } from "lucide-react";
import type { SearchResult } from "@/features/discussions/types";
import { SearchResultCard } from "./search-result-card";

type SearchResultsProps = {
  results: SearchResult[];
  totalCount: number;
  query: string;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onLoadMore: () => void;
  hasMore: boolean;
  isFetchingNextPage: boolean;
};

type FilterCategory = "all" | "discussions" | "debates" | "claims" | "questions" | "evidence";

const filterTabs: { id: FilterCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "discussions", label: "Discussions" },
  { id: "debates", label: "Debates" },
  { id: "claims", label: "Claims" },
  { id: "questions", label: "Questions" },
  { id: "evidence", label: "Evidence" },
];

export function SearchResults({
  results,
  totalCount,
  query,
  isLoading,
  isError,
  error,
  onLoadMore,
  hasMore,
  isFetchingNextPage,
}: SearchResultsProps) {
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-sm font-medium text-destructive">
          {error?.message || "Search failed. Please try again."}
        </p>
      </div>
    );
  }

  if (query.trim().length < 2) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Enter at least 2 characters to search.
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <SearchX aria-hidden="true" className="mb-3 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium text-foreground">No results found</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Try different keywords for &quot;{query}&quot;
        </p>
      </div>
    );
  }

  const counts: Record<FilterCategory, number> = {
    all: totalCount,
    discussions: results.filter(r => r.resultType === "room" && r.roomType === "discussion").length,
    debates: results.filter(r => r.resultType === "room" && r.roomType === "debate").length,
    claims: results.filter(r => r.resultType === "claim").length,
    questions: results.filter(r => r.resultType === "question").length,
    evidence: results.filter(r => r.resultType === "evidence").length,
  };

  const filteredResults = results.filter((r) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "discussions") return r.resultType === "room" && r.roomType === "discussion";
    if (activeFilter === "debates") return r.resultType === "room" && r.roomType === "debate";
    if (activeFilter === "claims") return r.resultType === "claim";
    if (activeFilter === "questions") return r.resultType === "question";
    if (activeFilter === "evidence") return r.resultType === "evidence";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Category filter pills bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-border/40">
        {filterTabs.map((tab) => {
          const count = counts[tab.id];
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card border border-border/60 text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        {filteredResults.length > 0 ? (
          filteredResults.map((result) => (
            <SearchResultCard key={`${result.resultType}-${result.entityId}`} result={result} />
          ))
        ) : (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No results found under the &quot;{filterTabs.find(t => t.id === activeFilter)?.label}&quot; filter.
            </p>
          </div>
        )}
      </div>

      {hasMore && activeFilter === "all" && (
        <div className="flex justify-center pb-8">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load more"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
