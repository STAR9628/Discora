"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useCurrentProfile } from "@/features/profiles/hooks/use-profile";
import {
  Home,
  MessageSquare,
  Scale,
  User,
  Users,
  Settings,
  Bookmark,
  ChevronDown,
  ChevronRight,
  FileText,
  FileCheck,
  BookOpen,
  HelpCircle,
  Compass,
  Info,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { OnboardingTriggerButton } from "@/features/onboarding";
import { getDiscussionBySlug } from "@/features/discussions/services/discussion-service";
import { getDebateBySlug } from "@/features/debates/services/debate-service";
import { useSavedRoomAlias } from "@/features/saves/hooks/use-saves";

import { Tooltip } from "@/components/ui/tooltip";
import { IncomingRequestsBadge } from "@/features/friends/components/friends-page-client";

interface SidebarProps {
  onOpenFeedback?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  onOpenFeedback,
  isCollapsed = true,
  onToggleCollapse,
}: SidebarProps = {}) {
  const pathname = usePathname();
  const { status } = useAuth();
  const { data: profile, isLoading: isProfileLoading, error: profileError } = useCurrentProfile();

  const segments = pathname.split("/").filter(Boolean);
  const isDiscussionRoom = segments[0] === "discussions" && segments.length >= 2 && segments[1] !== "create";
  const isDebateRoom = segments[0] === "debates" && segments.length >= 2 && segments[1] !== "create";
  const roomSlug = isDiscussionRoom || isDebateRoom ? segments[1] : null;

  const [isRoomNavCollapsed, setIsRoomNavCollapsed] = useState(false);

  const { data: roomInfo } = useQuery({
    queryKey: ["sidebar-room-info", isDiscussionRoom ? "discussion" : "debate", roomSlug],
    queryFn: async () => {
      if (!roomSlug) return null;
      if (isDiscussionRoom) {
        const res = await getDiscussionBySlug(roomSlug);
        return res ? { id: res.room.id, title: res.room.title } : null;
      } else {
        const res = await getDebateBySlug(roomSlug);
        return res ? { id: res.room.id, title: res.room.title } : null;
      }
    },
    enabled: (isDiscussionRoom || isDebateRoom) && Boolean(roomSlug),
    staleTime: 60_000,
  });

  const { data: savedAlias } = useSavedRoomAlias(
    isDiscussionRoom ? "discussion" : "debate",
    roomInfo?.id ?? ""
  );
  const displayTitle = savedAlias || roomInfo?.title || roomSlug || "Current Room";

  // Epistemic Room Lenses: Discussion Questions remain Questions, Debate Questions are Inquiries
  const roomLenses = (isDiscussionRoom || isDebateRoom) && roomSlug ? [
    {
      label: isDiscussionRoom ? "Contributions" : "Conversation",
      href: isDiscussionRoom ? `/discussions/${roomSlug}/contributions` : `/debates/${roomSlug}`,
      icon: MessageSquare,
      isActive: isDiscussionRoom
        ? pathname === `/discussions/${roomSlug}/contributions`
        : pathname === `/debates/${roomSlug}` || pathname === `/debates/${roomSlug}/contributions`,
    },
    {
      label: "Claims",
      href: isDiscussionRoom ? `/discussions/${roomSlug}/claims` : `/debates/${roomSlug}/claims`,
      icon: FileText,
      isActive: isDiscussionRoom
        ? pathname === `/discussions/${roomSlug}/claims`
        : pathname === `/debates/${roomSlug}/claims` || pathname === `/debates/${roomSlug}/arguments`,
    },
    {
      label: "Evidence",
      href: isDiscussionRoom ? `/discussions/${roomSlug}/evidence` : `/debates/${roomSlug}/evidence`,
      icon: FileCheck,
      isActive: isDiscussionRoom
        ? pathname === `/discussions/${roomSlug}/evidence`
        : pathname === `/debates/${roomSlug}/evidence`,
    },
    {
      label: "Sources",
      href: isDiscussionRoom ? `/discussions/${roomSlug}/sources` : `/debates/${roomSlug}/sources`,
      icon: BookOpen,
      isActive: isDiscussionRoom
        ? pathname === `/discussions/${roomSlug}/sources`
        : pathname === `/debates/${roomSlug}/sources`,
    },
    {
      label: isDebateRoom ? "Inquiries" : "Questions",
      href: isDiscussionRoom ? `/discussions/${roomSlug}/questions` : `/debates/${roomSlug}/questions`,
      icon: HelpCircle,
      isActive: isDiscussionRoom
        ? pathname === `/discussions/${roomSlug}/questions`
        : pathname === `/debates/${roomSlug}/questions`,
    },
    {
      label: "State of Understanding",
      href: isDiscussionRoom ? `/discussions/${roomSlug}/understanding` : `/debates/${roomSlug}/understanding`,
      icon: Compass,
      isActive: isDiscussionRoom
        ? pathname === `/discussions/${roomSlug}/understanding`
        : pathname === `/debates/${roomSlug}/understanding`,
    },
  ] : [];

  // Resolve Profile URL dynamically
  const profileHref = (() => {
    if (status === "loading") return "#";
    if (status !== "authenticated") return "/settings/profile";
    return profile?.username ? `/u/${profile.username}` : "/settings/profile";
  })();

  // Primary Navigation (Search is global, admin is in admin panel)
  const sidebarItems: readonly {
    label: string;
    icon: React.ElementType;
    href: string;
    disabled?: boolean;
  }[] = [
    { label: "Home", icon: Home, href: "/" },
    { label: "Discussions", icon: MessageSquare, href: "/discussions" },
    { label: "Debates", icon: Scale, href: "/debates" },
    ...(status === "authenticated"
      ? [
          { label: "Friends", icon: Users, href: "/friends" },
          { label: "Saved", icon: Bookmark, href: "/saved" },
        ]
      : []),
    { label: "Profile", icon: User, href: profileHref },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col fixed top-0 left-0 h-screen z-40 border-r border-border/50 bg-card/25 backdrop-blur-md transition-[width,padding] duration-200 ease-in-out select-none overflow-hidden ${
        isCollapsed ? "w-16 px-2 py-3.5" : "w-64 px-3 py-4"
      }`}
      aria-label="Sidebar navigation"
    >
      {/* 1. TOP REGION: Branding & Restrained Collapse/Expand Toggle.
          Collapsed state stacks brand above toggle (flex-col, items-center)
          so every rail element shares one vertical center axis. Previously
          brand + toggle shared a single centered row, pushing both off-axis. */}
      <div
        className={`flex items-center shrink-0 mb-4 ${
          isCollapsed ? "flex-col justify-center gap-1.5" : "justify-between px-2"
        }`}
      >
        {!isCollapsed ? (
          <div className="min-w-0 flex-1">
            <Link href="/" className="group flex items-center gap-2" title="Discora Home">
              <Image
                src="/discora-mark.png"
                alt=""
                width={24}
                height={24}
                className="h-6 w-6 shrink-0"
                priority
              />
              <span className="min-w-0">
                <p className="text-sm font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                  Discora
                </p>
                <p className="text-[11px] text-muted-foreground/70 truncate">
                  Understanding over engagement
                </p>
              </span>
            </Link>
          </div>
        ) : (
          <Tooltip content="Discora Home" side="right" align="center">
            <Link
              href="/"
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent/40 transition-colors group active:scale-[0.96]"
              aria-label="Discora Home"
            >
              <Image
                src="/discora-mark.png"
                alt=""
                width={22}
                height={22}
                className="h-[22px] w-[22px] shrink-0"
                priority
              />
            </Link>
          </Tooltip>
        )}

        {onToggleCollapse && (
          <Tooltip
            content={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            side="right"
            align="center"
          >
            <button
              type="button"
              onClick={onToggleCollapse}
              className="text-muted-foreground/60 hover:text-foreground hover:bg-accent/50 p-1.5 rounded-lg transition-colors cursor-pointer active:scale-[0.96]"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!isCollapsed}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </Tooltip>
        )}
      </div>

      {/* 2. MAIN NAVIGATION: Scrollable only when content genuinely exceeds height */}
      <nav
        aria-label="Primary navigation"
        className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col"
      >
        <ul className="space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isProfileItem = item.label === "Profile";
            const isProfileActive = isProfileItem && profile?.username && pathname === `/u/${profile.username}`;
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)) || isProfileActive;

            const isDiscussionsItem = item.label === "Discussions";
            const isDebatesItem = item.label === "Debates";
            const showRoomSubsection =
              (isDiscussionsItem && isDiscussionRoom) || (isDebatesItem && isDebateRoom);

            if (item.disabled) {
              const disabledContent = (
                <div
                  className={`flex items-center rounded-lg text-[13px] font-medium leading-5 text-muted-foreground/45 cursor-not-allowed ${
                    isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2"
                  }`}
                >
                  <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </div>
              );

              return (
                <li key={item.label} className={isCollapsed ? "flex justify-center" : undefined}>
                  {isCollapsed ? (
                    <Tooltip content={item.label} side="right" align="center">
                      {disabledContent}
                    </Tooltip>
                  ) : (
                    disabledContent
                  )}
                </li>
              );
            }

            const linkContent = (
              <Link
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center rounded-lg text-[13px] font-medium leading-5 transition-all duration-150 active:scale-[0.98] ${
                  isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2"
                } ${
                  isActive
                    ? "bg-accent/80 text-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                }${isProfileItem && isProfileLoading ? " animate-pulse" : ""}`}
              >
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="truncate">{item.label}</span>
                    {isProfileItem && profileError && (
                      <span className="ml-auto text-[9px] font-semibold text-destructive uppercase">Error</span>
                    )}
                    {item.label === "Friends" && status === "authenticated" && (
                      <IncomingRequestsBadge />
                    )}
                  </>
                )}
              </Link>
            );

            // Collapsed rail: center the Tooltip trigger span on the rail axis.
            // (The shared Tooltip wraps its child in a shrink-wrapped
            // inline-flex span, which would otherwise pin items left.)
            return (
              <li key={item.label} className={isCollapsed ? "flex justify-center" : undefined}>
                {isCollapsed ? (
                  <Tooltip content={item.label} side="right" align="center">
                    {linkContent}
                  </Tooltip>
                ) : (
                  linkContent
                )}

                {/* Room-local subsection: appears only when inside that room */}
                {showRoomSubsection && roomLenses.length > 0 && !isCollapsed && (
                  <div className="my-1.5 ml-3 pl-2.5 border-l border-primary/25 space-y-1">
                    <div className="flex items-center justify-between py-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setIsRoomNavCollapsed(!isRoomNavCollapsed)}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-foreground/90 hover:text-primary transition-colors truncate w-full text-left cursor-pointer group"
                        title={displayTitle}
                        aria-expanded={!isRoomNavCollapsed}
                        aria-label={`Toggle room lenses for ${displayTitle}`}
                      >
                        {isRoomNavCollapsed ? (
                          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-primary transition-transform" />
                        ) : (
                          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-primary transition-transform" />
                        )}
                        <span className="truncate">{displayTitle}</span>
                      </button>
                    </div>
                    {!isRoomNavCollapsed && (
                      <ul className="space-y-0.5" role="group" aria-label="Room lenses">
                        {roomLenses.map((lens) => {
                          const LensIcon = lens.icon;
                          return (
                            <li key={lens.label}>
                              <Link
                                href={lens.href}
                                className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150 active:scale-[0.98] ${
                                  lens.isActive
                                    ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                                }`}
                                aria-current={lens.isActive ? "page" : undefined}
                              >
                                <LensIcon className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{lens.label}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {/* 2b. Intentional black-space / empty area interaction:
            When expanded, clicking this intentional empty space collapses the sidebar.
            When collapsed, clicking this empty rail area expands the sidebar. */}
        {onToggleCollapse && (
          <div
            onClick={onToggleCollapse}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggleCollapse();
              }
            }}
            className="flex-1 min-h-[48px] cursor-pointer transition-colors duration-200"
            title={isCollapsed ? "Click rail to expand sidebar" : "Click empty area to collapse sidebar"}
            aria-label={isCollapsed ? "Click rail to expand sidebar" : "Click empty area to collapse sidebar"}
          >
            <span className="sr-only">
              {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            </span>
          </div>
        )}
      </nav>

      {/* 3. BOTTOM UTILITY REGION: Firmly anchored toward bottom via mt-auto */}
      <div
        className={`mt-auto shrink-0 pt-3 border-t border-border/40 space-y-1 ${
          isCollapsed ? "px-0" : "px-1"
        }`}
      >
        {isCollapsed ? (
          <div className="flex justify-center">
            <Tooltip content="Settings" side="right" align="center">
              <Link
                href="/settings"
                aria-label="Settings"
                className={`flex items-center rounded-lg text-[13px] font-medium leading-5 transition-all duration-150 active:scale-[0.98] justify-center p-2.5 ${
                  pathname.startsWith("/settings")
                    ? "bg-accent/80 text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                }`}
              >
                <Settings className="h-4 w-4 shrink-0" />
              </Link>
            </Tooltip>
          </div>
        ) : (
          <Link
            href="/settings"
            aria-label="Settings"
            className={`flex items-center rounded-lg text-[13px] font-medium leading-5 transition-all duration-150 active:scale-[0.98] gap-3 px-3 py-2 ${
              pathname.startsWith("/settings")
                ? "bg-accent/80 text-foreground font-semibold"
                : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
            }`}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span>Settings</span>
          </Link>
        )}

        {isCollapsed ? (
          <div className="flex justify-center">
            <Tooltip content="About Discora" side="right" align="center">
              <Link
                href="/about"
                aria-label="About Discora"
                className={`flex items-center rounded-lg text-[13px] font-medium leading-5 transition-all duration-150 active:scale-[0.98] justify-center p-2.5 ${
                  pathname === "/about"
                    ? "bg-accent/80 text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                }`}
              >
                <Info className="h-4 w-4 shrink-0" />
              </Link>
            </Tooltip>
          </div>
        ) : (
          <Link
            href="/about"
            aria-label="About Discora"
            className={`flex items-center rounded-lg text-[13px] font-medium leading-5 transition-all duration-150 active:scale-[0.98] gap-3 px-3 py-2 ${
              pathname === "/about"
                ? "bg-accent/80 text-foreground font-semibold"
                : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
            }`}
          >
            <Info className="h-4 w-4 shrink-0" />
            <span>About Discora</span>
          </Link>
        )}

        <OnboardingTriggerButton
          compact={isCollapsed}
          className={`flex items-center rounded-lg text-[13px] font-medium leading-5 text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-all duration-150 active:scale-[0.98] cursor-pointer ${
            isCollapsed ? "w-full justify-center p-2.5" : "w-full gap-3 px-3 py-2"
          }`}
        />

        {onOpenFeedback && (
          isCollapsed ? (
            <div className="flex justify-center">
              <Tooltip content="Feedback" side="right" align="center">
                <button
                  type="button"
                  onClick={onOpenFeedback}
                  aria-label="Feedback"
                  className="flex items-center rounded-lg text-[13px] font-medium leading-5 text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-all duration-150 active:scale-[0.98] cursor-pointer justify-center p-2.5"
                >
                  <MessageSquare className="h-4 w-4 shrink-0" />
                </button>
              </Tooltip>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenFeedback}
              aria-label="Feedback"
              className="flex items-center rounded-lg text-[13px] font-medium leading-5 text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-all duration-150 active:scale-[0.98] cursor-pointer w-full gap-3 px-3 py-2"
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span>Feedback</span>
            </button>
          )
        )}
      </div>
    </aside>
  );
}
