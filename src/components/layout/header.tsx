"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
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
      className="sticky top-0 z-20 border-b border-border/70 bg-background/95 px-4 py-2.5 backdrop-blur-md sm:px-6 lg:px-8"
    >
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 group cursor-pointer" title="Discora Home">
          <Image
            src="/discora-mark.png"
            alt=""
            width={28}
            height={28}
            className="h-[26px] w-[26px] sm:h-[28px] sm:w-[28px] shrink-0 transition-transform group-hover:scale-105"
            priority
          />
          <span>
            <p className="text-sm font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">Discora</p>
            <p className="text-[11px] text-muted-foreground leading-tight">Understanding over engagement</p>
          </span>
        </Link>
        <div className="flex items-center gap-2.5">
          <SearchTrigger />
          <AuthStatus />
        </div>
      </div>
    </header>
  );
}
