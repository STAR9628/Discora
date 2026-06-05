"use client";

import { useEffect, useState } from "react";
import { SearchInput } from "./search-input";
import { SearchResults } from "./search-results";
import { useSearch, useSearchNavigation } from "@/features/discussions/hooks/use-search";

export function SearchPageClient() {
  const { query: urlQuery, setQuery: setUrlQuery } = useSearchNavigation();
  const [inputValue, setInputValue] = useState(urlQuery);

  // Sync input value when URL changes (e.g. browser back/forward)
  useEffect(() => {
    setInputValue(urlQuery);
  }, [urlQuery]);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isLoading, isError, error, isFetching } = useSearch(urlQuery, {
    limit: pageSize * (page + 1),
  });

  const results = data?.results ?? [];
  const totalCount = data?.totalCount ?? 0;
  const hasMore = data?.hasMore ?? false;

  const handleValueChange = (value: string) => {
    setInputValue(value);
    setUrlQuery(value);
    setPage(0);
  };

  const handleLoadMore = () => {
    setPage((p) => p + 1);
  };

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="sr-only">Search</h1>
      <SearchInput
        onValueChange={handleValueChange}
        initialValue={inputValue}
      />
      <div className="mt-6">
        <SearchResults
          results={results}
          totalCount={totalCount}
          query={urlQuery}
          isLoading={isLoading && urlQuery.trim().length >= 2}
          isError={isError}
          error={error}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
          isFetchingNextPage={isFetching}
        />
      </div>
    </main>
  );
}
