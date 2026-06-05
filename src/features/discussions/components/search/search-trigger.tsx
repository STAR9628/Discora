"use client";

import Link from "next/link";
import { Search } from "lucide-react";

export function SearchTrigger() {
  return (
    <Link
      href="/search"
      className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      aria-label="Open search"
    >
      <Search aria-hidden="true" className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Search...</span>
      <kbd className="ml-auto hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/70 sm:inline-block">
        Ctrl+K
      </kbd>
    </Link>
  );
}
