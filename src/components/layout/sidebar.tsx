"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useHasRole } from "@/features/auth/hooks/use-role";
import { useCurrentProfile } from "@/features/profiles/hooks/use-profile";
import { Bell, Home, MessageSquare, Scale, Search as SearchIcon, User, Settings, Shield } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { status } = useAuth();
  const { data: profile, isLoading: isProfileLoading, error: profileError } = useCurrentProfile();
  const { data: isModerator, isLoading: isRoleLoading } = useHasRole("moderator");

  // Resolve Profile URL dynamically
  // Unauthenticated users go to /settings/profile so middleware
  // can intercept and redirect to /login?redirectedFrom=/settings/profile.
  const profileHref = (() => {
    if (status === "loading") return "#";
    if (status !== "authenticated") return "/settings/profile";
    return profile?.username ? `/u/${profile.username}` : "/settings/profile";
  })();

  const sidebarItems: readonly {
    label: string;
    icon: React.ElementType;
    href: string;
    disabled?: boolean;
  }[] = [
    { label: "Home", icon: Home, href: "/" },
    { label: "Discussions", icon: MessageSquare, href: "/discussions" },
    { label: "Search", icon: SearchIcon, href: "/search" },
    { label: "Debates", icon: Scale, href: "#", disabled: true },
    { label: "Notifications", icon: Bell, href: "#", disabled: true },
    { label: "Profile", icon: User, href: profileHref },
  ];

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-card/40 px-3 py-4 md:block">
      <div className="px-3 py-2">
        <p className="text-lg font-semibold tracking-tight">Discora</p>
        <p className="text-xs text-muted-foreground">Understanding over engagement</p>
      </div>
      
      <nav aria-label="Primary navigation" className="mt-6 flex flex-col justify-between h-[calc(100%-4rem)]">
        <ul className="space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isProfileItem = item.label === "Profile";
            const isProfileActive = isProfileItem && profile?.username && pathname === `/u/${profile.username}`;
            const isActive = pathname === item.href || isProfileActive;

            if (item.disabled) {
              return (
                <li key={item.label}>
                  <div className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground/45 cursor-not-allowed">
                    <div className="flex items-center gap-3">
                      <Icon aria-hidden="true" className="h-4 w-4" />
                      <span>{item.label}</span>
                    </div>
                    <span className="text-[9px] font-semibold tracking-wide uppercase px-1.5 py-0.5 bg-muted rounded">Soon</span>
                  </div>
                </li>
              );
            }

            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                  }${isProfileItem && isProfileLoading ? " animate-pulse" : ""}`}
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  <span>{item.label}</span>
                  {isProfileItem && profileError && (
                    <span className="ml-auto text-[9px] font-semibold text-destructive uppercase">Error</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {status === "authenticated" && (
          <div className="border-t border-border pt-4 space-y-1">
            <Link
              href="/settings/profile"
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                pathname === "/settings/profile"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Link>

            {isRoleLoading ? (
              <div className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/50 animate-pulse">
                <Shield className="h-4 w-4" />
                <span>Moderation</span>
              </div>
            ) : isModerator ? (
              <Link
                href="/settings/moderation"
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === "/settings/moderation"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                }`}
              >
                <Shield className="h-4 w-4 text-destructive/80" />
                <span>Moderation</span>
              </Link>
            ) : null}
          </div>
        )}
      </nav>
    </aside>
  );
}

