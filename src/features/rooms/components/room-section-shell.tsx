"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Compass, FileText, HelpCircle, Layers, Link2, MessageSquare, ChevronDown } from "lucide-react";

import { RoomGuideCard } from "@/features/onboarding";
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
};

export function normalizeRoomLens(section: RoomSection): RoomLens | null {
  switch (section) {
    case "overview":
      return null;
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
      return null;
  }
}

export function RoomSectionShell({
  roomType,
  slug,
  title,
  description,
  premise,
  section,
  children,
  beforeNav,
  headerAction,
}: RoomSectionShellProps) {
  const basePath = roomType === "debate" ? "/debates" : "/discussions";
  const activeLens = normalizeRoomLens(section);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // In overview or conversation view, lenses reveal on hover/focus/tap so main content is dominant.
  // When explicitly on specialized lenses (claims, evidence, etc.), remain revealed for easy navigation.
  const isRevealed =
    (activeLens !== null && activeLens !== "conversation") || isHovered || isFocused || isMobileOpen;

  const lenses: { id: RoomLens; label: string; href: string; icon: React.ElementType }[] = [
    {
      id: "conversation",
      label: roomType === "discussion" ? "Contributions" : "Conversation",
      href: roomType === "discussion" ? `${basePath}/${slug}/contributions` : `${basePath}/${slug}`,
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
    <div className="mx-auto w-full max-w-6xl space-y-5 pb-16 relative">
      {/* Scroll-awareness Sentinel */}
      <div ref={sentinelRef} className="h-px w-full pointer-events-none -mt-5" aria-hidden="true" />

      {/* Compact Sticky Contextual Header (Appears smoothly when scrolled past top header) */}
      <CompactStickyRoomHeader
        roomType={roomType}
        title={title}
        headerAction={headerAction}
        sentinelRef={sentinelRef}
      />

      {/* Dominant Room Header with subtle Lens Reveal on Hover/Focus/Tap */}
      <header
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsFocused(false);
          }
        }}
        className="group/header rounded-2xl border border-border/70 bg-card/40 p-4 shadow-sm backdrop-blur-md transition-all duration-200 md:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl md:text-3xl break-words leading-snug">
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
            {activeLens !== null && activeLens !== "conversation" && (premise || description) && (
              <p className="mt-2 max-w-4xl text-xs sm:text-sm leading-relaxed text-muted-foreground line-clamp-2 sm:line-clamp-none">
                {premise || description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start pt-1">
            {/* Mobile/Accessible Lens Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileOpen((prev) => !prev)}
              aria-expanded={isRevealed}
              aria-label="Toggle room lenses"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/60 hover:bg-card/90 px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-xs"
            >
              <span>Lenses</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isRevealed ? "rotate-180" : ""}`} />
            </button>
            {headerAction}
          </div>
        </div>

        {/* Subtle Lens Reveal Navigation */}
        <nav
          aria-label={`${roomType} room lenses`}
          className={`overflow-hidden transition-all duration-200 ease-out ${
            isRevealed ? "max-h-24 opacity-100 mt-3 pt-3 border-t border-border/40" : "max-h-0 opacity-0 pointer-events-none"
          }`}
        >
          <div className="flex min-w-max gap-2 overflow-x-auto no-scrollbar py-0.5">
            {lenses.map(({ id, label, href, icon: Icon }) => {
              const active = id === activeLens;
              return (
                <Link
                  key={id}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer after:absolute after:-inset-1.5 after:content-[''] ${
                    active
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "border border-border/50 bg-background/40 text-muted-foreground hover:bg-card/80 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Contextual Room Guide */}
      <RoomGuideCard roomType={roomType} />

      {beforeNav}

      {/* Lens Content */}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
