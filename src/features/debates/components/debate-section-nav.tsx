"use client";

import React from "react";
import Link from "next/link";
import { Compass, FileText, FileCheck, HelpCircle, MessageSquare } from "lucide-react";
import { useDebateContext, type DebateSection } from "./debate-data-provider";

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

  const sections: { id: DebateSection; label: string; href: string; icon: React.ReactNode; count?: number }[] = [
    { id: "overview", label: "Overview", href: `/debates/${room.slug}`, icon: <Compass className="h-4 w-4" /> },
    { id: "arguments", label: "Arguments", href: `/debates/${room.slug}/arguments`, icon: <FileText className="h-4 w-4" />, count: totalClaims },
    { id: "evidence", label: "Evidence", href: `/debates/${room.slug}/evidence`, icon: <FileCheck className="h-4 w-4" />, count: roomEvidence.length },
    { id: "inquiries", label: "Inquiries", href: `/debates/${room.slug}/questions`, icon: <HelpCircle className="h-4 w-4" />, count: totalInquiries },
    { id: "contributions", label: "Contributions", href: `/debates/${room.slug}/contributions`, icon: <MessageSquare className="h-4 w-4" /> },
  ];

  return (
    <nav
      className="sticky top-0 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-y border-border/70 bg-background/90 backdrop-blur-md transition-all py-2"
      aria-label="Debate Section Navigation"
    >
      <div className="flex gap-2 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth min-w-max">
        {sections.map((sec) => {
          const isActive = activeSection === sec.id;
          return (
            <Link
              key={sec.id}
              href={sec.href}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs md:text-sm font-bold transition-all cursor-pointer select-none ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card/40 border border-border/50 text-muted-foreground hover:bg-card/80 hover:text-foreground"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {sec.icon}
              <span>{sec.label}</span>
              {typeof sec.count === "number" && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
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
    </nav>
  );
}
