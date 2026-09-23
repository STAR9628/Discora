"use client";

import { useRef } from "react";
import Link from "next/link";
import { Compass, FileText, HelpCircle, Layers, Link2, MessageSquare } from "lucide-react";

import { RoomGuideCard } from "@/features/onboarding";
import { InviteGuidance } from "@/features/founding/components/invite-guidance";
import { CompactStickyRoomHeader } from "./compact-sticky-room-header";

export type RoomLens = "conversation" | "claims" | "evidence" | "sources" | "questions" | "understanding";
export type RoomSection = RoomLens | "overview" | "arguments" | "contributions" | "inquiries";

type RoomSectionShellProps = {
  roomType: "discussion" | "debate";
  slug: string;
  title: string;
  description?: string;
  premise?: string | null;
  section: RoomSection;
  children: React.ReactNode;
  beforeNav?: React.ReactNode;
  headerAction?: React.ReactNode;
  /** Room visibility. Invite guidance renders on public overviews only. */
  visibility?: "public" | "private";
};

export function normalizeRoomLens(section: RoomSection): RoomLens | null {
  switch (section) {
    case "overview":
    case "contributions":
    case "conversation":
      return "conversation";
    case "arguments":
    case "claims":
      return "claims";
    case "evidence":
      return "evidence";
    case "sources":
      return "sources";
    case "inquiries":
    case "questions":
      return "questions";
    case "understanding":
      return "understanding";
    default:
      return "conversation";
  }
}

export function RoomSectionShell({
  roomType,
  slug,
  title,
  description,
  section,
  children,
  beforeNav,
  headerAction,
  visibility,
}: RoomSectionShellProps) {
  const basePath = roomType === "debate" ? "/debates" : "/discussions";
  const activeLens = normalizeRoomLens(section);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const lenses: { id: RoomLens; label: string; href: string; icon: React.ElementType }[] = [
    {
      id: "conversation",
      label: "Conversation",
      href: `${basePath}/${slug}`,
      icon: MessageSquare,
    },
    { id: "claims", label: "Claims", href: `${basePath}/${slug}/claims`, icon: FileText },
    { id: "evidence", label: "Evidence", href: `${basePath}/${slug}/evidence`, icon: Layers },
    { id: "sources", label: "Sources", href: `${basePath}/${slug}/sources`, icon: Link2 },
    {
      id: "questions",
      label: roomType === "debate" ? "Inquiries" : "Questions",
      href: `${basePath}/${slug}/questions`,
      icon: HelpCircle,
    },
    { id: "understanding", label: "State of Understanding", href: `${basePath}/${slug}/understanding`, icon: Compass },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-3 sm:space-y-5 pb-16 relative">
      {/* Scroll-awareness Sentinel */}
      <div ref={sentinelRef} className="h-px w-full pointer-events-none -mt-3 sm:-mt-5" aria-hidden="true" />

      {/* Compact Sticky Contextual Header (Appears smoothly when scrolled past top header) */}
      <CompactStickyRoomHeader
        roomType={roomType}
        title={title}
        headerAction={headerAction}
        sentinelRef={sentinelRef}
      />

      {/* Dominant Room Header */}
      <header className="rounded-2xl border border-border/70 bg-card/40 p-3.5 sm:p-4 md:p-5 shadow-sm backdrop-blur-md transition-all duration-200">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl md:text-3xl font-extrabold tracking-tight text-foreground break-words leading-snug">
              {title}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary">
                {roomType}
              </span>
              {activeLens !== null && activeLens !== "conversation" && (
                <span className="text-xs font-semibold text-muted-foreground">
                  · {lenses.find((l) => l.id === activeLens)?.label}
                </span>
              )}
            </div>
            {/* Creator-entered Room Description — Always visible near the top */}
            {description && (
              <p className="mt-1.5 sm:mt-2.5 max-w-4xl text-xs sm:text-sm leading-relaxed text-foreground/85 font-normal">
                {description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start pt-0.5">
            {headerAction}
          </div>
        </div>

        {/* Structured Lenses Navigation — Discoverable, sleek pill strip with intentional edge fade */}
        <div className="relative mt-2.5 sm:mt-3.5 pt-2 sm:pt-3 border-t border-border/40">
          <nav
            aria-label={`${roomType} room lenses`}
            className="overflow-x-auto no-scrollbar scroll-smooth overscroll-x-contain touch-pan-x [mask-image:linear-gradient(to_right,black_0%,black_calc(100%-2.5rem),transparent_100%)] sm:[mask-image:none]"
          >
            <div className="flex min-w-max items-center gap-1.5 py-0.5 pr-8 sm:pr-0">
              {lenses.map(({ id, label, href, icon: Icon }) => {
                const active = id === activeLens;
                return (
                  <Link
                    key={id}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`relative inline-flex items-center gap-1.5 rounded-xl px-3 py-2 sm:py-1.5 min-h-[38px] sm:min-h-0 text-xs font-semibold transition-colors cursor-pointer select-none shrink-0 ${
                      active
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "border border-border/40 bg-card/30 text-muted-foreground hover:bg-card/80 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
          {/* Subtle continuation cue on right edge for mobile touch devices */}
          <div
            className="pointer-events-none absolute right-0 top-2 bottom-0 w-8 bg-gradient-to-l from-card/90 to-transparent sm:hidden"
            aria-hidden="true"
          />
        </div>
      </header>

      {/* Contextual Room Guide */}
      <RoomGuideCard roomType={roomType} />

      {/* Invite guidance: public room overviews only (private rooms have dedicated invite UI) */}
      {(section === "overview" || section === "conversation") && visibility === "public" && (
        <InviteGuidance roomType={roomType} roomSlug={slug} roomTitle={title} />
      )}

      {beforeNav}

      {/* Lens Content */}
      <div className="min-w-0 lens-transition">{children}</div>
    </div>
  );
}
