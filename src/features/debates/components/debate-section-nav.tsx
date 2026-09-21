"use client";

import React from "react";
import Link from "next/link";
import { Compass, FileText, FileCheck, HelpCircle, MessageSquare, BookOpen } from "lucide-react";
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

  const totalClaims = propositionClaims.length + oppositionClaims.length;
  const totalInquiries = inquiries.length + questions.length;

  const currentLens = normalizeDebateLens(activeSection);

  const sections: { id: DebateSection; label: string; href: string; icon: React.ReactNode; count?: number }[] = [
    { id: "conversation", label: "Conversation", href: `/debates/${room.slug}`, icon: <MessageSquare className="h-4 w-4" /> },
    { id: "claims", label: "Claims", href: `/debates/${room.slug}/claims`, icon: <FileText className="h-4 w-4" />, count: totalClaims },
    { id: "evidence", label: "Evidence", href: `/debates/${room.slug}/evidence`, icon: <FileCheck className="h-4 w-4" />, count: roomEvidence.length },
    { id: "sources", label: "Sources", href: `/debates/${room.slug}/sources`, icon: <BookOpen className="h-4 w-4" /> },
    { id: "inquiries", label: "Inquiries", href: `/debates/${room.slug}/questions`, icon: <HelpCircle className="h-4 w-4" />, count: totalInquiries },
    { id: "understanding", label: "State of Understanding", href: `/debates/${room.slug}/understanding`, icon: <Compass className="h-4 w-4" /> },
  ];

  return (
    <div className="relative -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 transition-all">
      <nav
        aria-label="Debate Section Navigation"
        className="border-y border-border/70 bg-background/90 backdrop-blur-md py-2"
      >
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div className="flex gap-1.5 sm:gap-2.5 overflow-x-auto no-scrollbar scroll-smooth overscroll-x-contain touch-pan-x min-w-max py-0.5 pr-8 sm:pr-0 [mask-image:linear-gradient(to_right,black_0%,black_calc(100%-2.5rem),transparent_100%)] sm:[mask-image:none]">
            {sections.map((sec) => {
              const isActive = currentLens === sec.id;
              return (
                <Link
                  key={sec.id}
                  href={sec.href}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 sm:py-1.5 min-h-[38px] sm:min-h-0 text-xs font-semibold transition-all cursor-pointer select-none shrink-0 ${
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
          {/* Subtle continuation cue on right edge for mobile touch devices */}
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent sm:hidden"
            aria-hidden="true"
          />
        </div>
      </nav>
    </div>
  );
}
