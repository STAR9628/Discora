"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Compass, FileText, FileCheck, HelpCircle, MessageSquare, BookOpen, ChevronDown } from "lucide-react";
import { useDebateContext, normalizeDebateLens, type DebateSection } from "./debate-data-provider";

export function DebateSectionNav() {
  const {
    room,
    activeSection,
    propositionClaims,
    oppositionClaims,
    roomEvidence,
    inquiries,
    questions,
  } = useDebateContext();

  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const totalClaims = propositionClaims.length + oppositionClaims.length;
    const totalInquiries = inquiries.length + questions.length;

  const currentLens = normalizeDebateLens(activeSection);

  // In conversation view, lenses reveal on hover/focus/tap so conversation is dominant.
  // In specialized lenses (claims, evidence, etc.), stay revealed for seamless navigation.
  const isRevealed = currentLens !== "conversation" || isHovered || isFocused || isMobileOpen;

  const sections: { id: DebateSection; label: string; href: string; icon: React.ReactNode; count?: number }[] = [
    { id: "conversation", label: "Conversation", href: `/debates/${room.slug}`, icon: <MessageSquare className="h-4 w-4" /> },
    { id: "claims", label: "Claims", href: `/debates/${room.slug}/claims`, icon: <FileText className="h-4 w-4" />, count: totalClaims },
    { id: "evidence", label: "Evidence", href: `/debates/${room.slug}/evidence`, icon: <FileCheck className="h-4 w-4" />, count: roomEvidence.length },
    { id: "sources", label: "Sources", href: `/debates/${room.slug}/sources`, icon: <BookOpen className="h-4 w-4" /> },
    { id: "inquiries", label: "Inquiries", href: `/debates/${room.slug}/questions`, icon: <HelpCircle className="h-4 w-4" />, count: totalInquiries },
    { id: "understanding", label: "State of Understanding", href: `/debates/${room.slug}/understanding`, icon: <Compass className="h-4 w-4" /> },
  ];

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setIsFocused(false);
        }
      }}
      className="group/nav relative -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 transition-all"
    >
      {/* Subtle trigger in Conversation view when collapsed */}
      {currentLens === "conversation" && !isRevealed && (
        <div className="flex justify-start pb-1">
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 hover:bg-card/90 px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-xs"
          >
            <span>Debate Lenses</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Sleek Lens Navigation Bar */}
      <nav
        aria-label="Debate Section Navigation"
        className={`overflow-hidden transition-all duration-200 ease-out border-y border-border/70 bg-background/90 backdrop-blur-md ${
          isRevealed ? "max-h-24 opacity-100 py-2" : "max-h-0 opacity-0 pointer-events-none py-0 border-transparent"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2 sm:gap-3 overflow-x-auto no-scrollbar scroll-smooth min-w-max py-0.5">
            {sections.map((sec) => {
              const isActive = currentLens === sec.id;
              return (
                <Link
                  key={sec.id}
                  href={sec.href}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer select-none ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-card/40 border border-border/50 text-muted-foreground hover:bg-card/80 hover:text-foreground"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {sec.icon}
                  <span>{sec.label}</span>
                  {typeof sec.count === "number" && (
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {sec.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {currentLens === "conversation" && isRevealed && (
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 cursor-pointer shrink-0"
              title="Hide lenses"
            >
              Hide
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
