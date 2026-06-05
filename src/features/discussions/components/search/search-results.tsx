"use client";

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

  return (
    <div className="space-y-8">
      <p className="text-xs text-muted-foreground">
        {totalCount} result{totalCount !== 1 ? "s" : ""} for &quot;{query}&quot;
      </p>
      <div className="space-y-2">
        {results.map((result) => (
          <SearchResultCard key={`${result.resultType}-${result.entityId}`} result={result} />
        ))}
      </div>
      {hasMore && (
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
