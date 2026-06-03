"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useCurrentProfile } from "@/features/profiles/hooks/use-profile";
import { Bell, CirclePlus, Home, Search, User } from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();
  const { status } = useAuth();
  const { data: profile } = useCurrentProfile();

  // Resolve Profile URL dynamically
  const profileHref = (() => {
    if (status === "loading") return "#";
    if (status !== "authenticated") return "/login";
    return profile?.username ? `/u/${profile.username}` : "/settings/profile";
  })();

  const mobileItems: readonly {
    label: string;
    icon: React.ElementType;
    href: string;
    disabled?: boolean;
  }[] = [
    { label: "Home", icon: Home, href: "/" },
    { label: "Search", icon: Search, href: "#", disabled: true },
    { label: "Create", icon: CirclePlus, href: "#", disabled: true },
    { label: "Notifications", icon: Bell, href: "#", disabled: true },
    { label: "Profile", icon: User, href: profileHref },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const isProfileActive = item.label === "Profile" && profile?.username && pathname === `/u/${profile.username}`;
          const isActive = pathname === item.href || isProfileActive;

          if (item.disabled) {
            return (
              <li key={item.label}>
                <div className="flex h-16 w-full flex-col items-center justify-center gap-1 text-muted-foreground/35 cursor-not-allowed">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                  <span className="text-[10px] leading-none">{item.label}</span>
                </div>
              </li>
            );
          }

          return (
            <li key={item.label}>
              <Link
                href={item.href}
                className={`flex h-16 w-full flex-col items-center justify-center gap-1 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon aria-hidden="true" className="h-5 w-5" />
                <span className="text-[10px] leading-none font-medium">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

