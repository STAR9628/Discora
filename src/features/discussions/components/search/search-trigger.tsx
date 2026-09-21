"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function SearchTrigger() {
  const router = useRouter();
  const [shortcutText, setShortcutText] = useState("Ctrl+K");

  useEffect(() => {
    // Platform-aware keyboard shortcut badge
    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
      const isMac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent || navigator.platform || "");
      if (isMac) {
        setShortcutText("⌘K");
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Trigger search navigation on Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K" || e.code === "KeyK")) {
        // Do not intercept if user is typing in a textarea or input (unless it's search itself)
        const target = e.target as HTMLElement;
        const isEditing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
        if (!isEditing || target.getAttribute("type") === "search") {
          e.preventDefault();
          router.push("/search");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return (
    <Link
      href="/search"
      className="group flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 sm:py-1.5 min-h-[38px] sm:min-h-0 text-xs text-muted-foreground transition-all duration-150 hover:border-primary/40 hover:bg-muted/60 hover:text-foreground active:scale-[0.98]"
      aria-label="Open search"
      aria-keyshortcuts="Control+K Meta+K"
    >
      <Search aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-primary" />
      <span className="hidden sm:inline">Search...</span>
      <kbd className="ml-1.5 hidden rounded border border-border/70 bg-card/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/80 group-hover:text-foreground sm:inline-block">
        {shortcutText}
      </kbd>
    </Link>
  );
}
