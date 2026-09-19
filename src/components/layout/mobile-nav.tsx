"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useCurrentProfile } from "@/features/profiles/hooks/use-profile";
import { useOnboarding } from "@/features/onboarding";
import { CirclePlus, Home, Search, User, Users, Loader2, MessageSquare, Scale, Settings, Bookmark, MoreHorizontal, Info, Compass } from "lucide-react";
import { IncomingRequestsBadge } from "@/features/friends/components/friends-page-client";
import { useState, useRef, useEffect } from "react";

interface MobileNavProps {
  onOpenFeedback?: () => void;
}

export function MobileNav({ onOpenFeedback }: MobileNavProps = {}) {
  const pathname = usePathname();
  const { status } = useAuth();
  const { data: profile, isLoading: isProfileLoading, error: profileError } = useCurrentProfile();
  const { openDeck } = useOnboarding();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  const profileHref = (() => {
    if (status === "loading") return "#";
    if (status !== "authenticated") return "/settings/profile";
    return profile?.username ? `/u/${profile.username}` : "/settings/profile";
  })();

  const primaryItems = [
    { label: "Home", icon: Home, href: "/" },
    { label: "Discussions", icon: MessageSquare, href: "/discussions" },
    { label: "Debates", icon: Scale, href: "/debates" },
  ];

  const moreItems = [
    { label: "New Discussion", icon: CirclePlus, href: "/discussions/create" },
    { label: "Search", icon: Search, href: "/search" },
    ...(status === "authenticated" ? [{ label: "Friends", icon: Users, href: "/friends" }] : []),
    ...(status === "authenticated" ? [{ label: "Saved", icon: Bookmark, href: "/saved" }] : []),
    { label: "Profile", icon: User, href: profileHref },
    { label: "Settings", icon: Settings, href: "/settings" },
    { label: "About Discora", icon: Info, href: "/about" },
  ];

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && moreOpen) {
        setMoreOpen(false);
        moreBtnRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [moreOpen]);

  return (
    <>
      {/* Subtle backdrop overlay for mobile more menu */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-150 md:hidden"
          onClick={() => setMoreOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Floating More Menu */}
      {moreOpen && (
        <div
          className="fixed bottom-20 right-3 z-50 w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md shadow-2xl p-1.5 md:hidden"
          role="menu"
          aria-label="More navigation options"
        >
          <ul className="space-y-0.5">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const isProfileItem = item.label === "Profile";
              const isProfileActive = isProfileItem && profile?.username && pathname === `/u/${profile.username}`;
              const isSettingsItem = item.label === "Settings";
              const isActive = pathname === item.href || isProfileActive || (isSettingsItem && pathname.startsWith("/settings"));

              return (
                <li key={item.label} role="none">
                  <Link
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex min-h-[44px] items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground active:bg-accent"
                    }${isProfileItem && isProfileLoading ? " animate-pulse" : ""}`}
                    role="menuitem"
                  >
                    {isProfileItem && isProfileLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                    )}
                    <span>{isProfileItem && profileError ? "Error" : item.label}</span>
                    {item.label === "Friends" && status === "authenticated" && (
                      <IncomingRequestsBadge />
                    )}
                  </Link>
                </li>
              );
            })}
            <li role="none">
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  openDeck();
                }}
                className="flex min-h-[44px] w-full items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-accent/60 hover:text-foreground active:bg-accent transition-colors cursor-pointer"
                role="menuitem"
              >
                <Compass aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
                <span>How Discora Works</span>
              </button>
            </li>
            {onOpenFeedback && (
              <li role="none">
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    onOpenFeedback();
                  }}
                  className="flex min-h-[44px] w-full items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-accent/60 hover:text-foreground active:bg-accent transition-colors cursor-pointer"
                  role="menuitem"
                >
                  <MessageSquare aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
                  <span>Feedback</span>
                </button>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/95 backdrop-blur-md md:hidden"
      >
        <ul className="grid grid-cols-4">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = (() => {
              if (item.href === "/") return pathname === "/";
              return pathname.startsWith(item.href);
            })();

            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`flex h-16 w-full flex-col items-center justify-center gap-1 transition-colors active:scale-[0.97] ${
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon aria-hidden="true" className="h-5 w-5" />
                  <span className="text-[10px] leading-none font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              ref={moreBtnRef}
              type="button"
              onClick={() => setMoreOpen(!moreOpen)}
              className={`flex h-16 w-full flex-col items-center justify-center gap-1 transition-colors cursor-pointer active:scale-[0.97] ${
                moreOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
              aria-expanded={moreOpen}
              aria-haspopup="true"
              aria-label="More navigation options"
            >
              <MoreHorizontal aria-hidden="true" className="h-5 w-5" />
              <span className="text-[10px] leading-none font-medium">More</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
