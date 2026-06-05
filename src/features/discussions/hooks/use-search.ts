import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { searchContent } from "@/features/discussions/services/discussion-service";

/**
 * React Query hook wrapping the search_content RPC.
 * Automatically disabled when query is shorter than 2 characters.
 */
export function useSearch(query: string, options?: { limit?: number }) {
  return useQuery({
    queryKey: ["search", query, options?.limit],
    queryFn: () => searchContent(query, { ...options }),
    enabled: query.trim().length >= 2,
    staleTime: 60_000,
  });
}

/**
 * URL-synced search state via ?q= query parameter.
 */
export function useSearchNavigation() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const query = searchParams.get("q") ?? "";

  const setQuery = useCallback(
    (q: string) => {
      const params = new URLSearchParams(searchParams);
      if (q) {
        params.set("q", q);
      } else {
        params.delete("q");
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return { query, setQuery };
}

/**
 * Debounced search input state with focus management.
 */
export function useSearchInput(initialValue = "") {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), 300);
    return () => clearTimeout(timer);
  }, [value]);

  const clear = useCallback(() => {
    setValue("");
    setDebouncedValue("");
    inputRef.current?.focus();
  }, []);

  return {
    value,
    setValue,
    debouncedValue,
    isFocused,
    setIsFocused,
    inputRef,
    clear,
    query: debouncedValue.trim(),
  };
}

/**
 * Global keyboard shortcut listener for search activation.
 * Listens for "/" and Ctrl+K / Cmd+K to focus the search input.
 */
export function useSearchShortcut(inputRef: React.RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isEditing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (e.key === "/" && !isEditing) {
        e.preventDefault();
        inputRef.current?.focus();
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [inputRef]);
}
