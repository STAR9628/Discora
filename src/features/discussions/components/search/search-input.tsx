"use client";

import { useEffect } from "react";
import { Search, X } from "lucide-react";
import { useSearchInput, useSearchShortcut } from "@/features/discussions/hooks/use-search";

type SearchInputProps = {
  onValueChange: (value: string) => void;
  initialValue?: string;
  placeholder?: string;
};

export function SearchInput({
  onValueChange,
  initialValue = "",
  placeholder = "Search discussions, debates, claims, evidence...",
}: SearchInputProps) {
  const { value, setValue, inputRef, clear, debouncedValue } = useSearchInput(initialValue);

  useSearchShortcut(inputRef);

  useEffect(() => {
    onValueChange(debouncedValue);
  }, [debouncedValue, onValueChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const handleClear = () => {
    clear();
  };

  return (
    <div className="relative">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        aria-label="Search"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
