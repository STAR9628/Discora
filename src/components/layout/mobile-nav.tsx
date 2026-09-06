"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useCurrentProfile } from "@/features/profiles/hooks/use-profile";
import { CirclePlus, Home, Search, User, Loader2, MessageSquare, Scale, Settings, Bookmark } from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();
  const { status } = useAuth();
  const { data: profile, isLoading: isProfileLoading, error: profileError } = useCurrentProfile();

  const profileHref = (() => {
    if (status === "loading") return "#";
    if (status !== "authenticated") return "/settings/profile";
    return profile?.username ? `/u/${profile.username}` : "/settings/profile";
  })();

  const mobileItems: readonly {
    label: string;
    icon: React.ElementType;
    href: string;
  }[] = [
    { label: "Home", icon: Home, href: "/" },
    { label: "Discussions", icon: MessageSquare, href: "/discussions" },
    { label: "Search", icon: Search, href: "/search" },
    { label: "Debates", icon: Scale, href: "/debates" },
    { label: "Create", icon: CirclePlus, href: "/discussions/create" },
    ...(status === "authenticated" ? [{ label: "Saved", icon: Bookmark, href: "/saved" }] : []),
    { label: "Profile", icon: User, href: profileHref },
    { label: "Settings", icon: Settings, href: "/settings" },
  ];

  const isSettingsActive = pathname.startsWith("/settings");
  const cols = mobileItems.length === 8 ? "grid-cols-8" : "grid-cols-7";

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur md:hidden"
    >
      <ul className={`grid ${cols}`}>
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const isProfileItem = item.label === "Profile";
          const isProfileActive = isProfileItem && profile?.username && pathname === `/u/${profile.username}`;
          const isSettingsItem = item.label === "Settings";
          const isActive = pathname === item.href || isProfileActive || (isSettingsItem && isSettingsActive);

          return (
            <li key={item.label}>
              <Link
                href={item.href}
                className={`flex h-16 w-full flex-col items-center justify-center gap-1 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }${isProfileItem && isProfileLoading ? " animate-pulse" : ""}`}
              >
                {isProfileItem && isProfileLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Icon aria-hidden="true" className="h-5 w-5" />
                )}
                <span className="text-[10px] leading-none font-medium">
                  {isProfileItem && profileError ? "Error" : item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

