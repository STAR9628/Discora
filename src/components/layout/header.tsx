"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { AuthStatus } from "@/features/auth/components/auth-status";
import { SearchTrigger } from "@/features/discussions/components/search/search-trigger";

export function Header() {
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const setHeaderHeight = () => {
      document.documentElement.style.setProperty("--app-header-height", `${el.offsetHeight}px`);
    };

    setHeaderHeight();
    const observer = new ResizeObserver(setHeaderHeight);
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8"
    >
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Image
            src="/discora-mark.png"
            alt=""
            width={20}
            height={20}
            className="h-5 w-5 shrink-0"
            priority
          />
          <span>
            <p className="text-sm font-semibold">Discora</p>
            <p className="text-xs text-muted-foreground">Understanding over engagement</p>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <SearchTrigger />
          <AuthStatus />
        </div>
      </div>
    </header>
  );
}
