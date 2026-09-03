"use client";

import Link from "next/link";
import { FileText, HelpCircle, LayoutDashboard, MessageSquare } from "lucide-react";

export type RoomSection = "overview" | "claims" | "arguments" | "evidence" | "questions" | "contributions";

type RoomSectionShellProps = {
  roomType: "discussion" | "debate";
  slug: string;
  title: string;
  description?: string;
  premise?: string | null;
  section: RoomSection;
  children: React.ReactNode;
};

export function RoomSectionShell({ roomType, slug, title, description, premise, section, children }: RoomSectionShellProps) {
  const basePath = roomType === "debate" ? "/debates" : "/discussions";
  const reasoning = roomType === "debate" ? "arguments" : "claims";
  const sections = [
    { id: "overview", label: "Overview", href: `${basePath}/${slug}`, icon: LayoutDashboard },
    { id: reasoning, label: roomType === "debate" ? "Arguments" : "Claims", href: `${basePath}/${slug}/${reasoning}`, icon: FileText },
    { id: "evidence", label: "Evidence", href: `${basePath}/${slug}/evidence`, icon: FileText },
    { id: "questions", label: "Questions", href: `${basePath}/${slug}/questions`, icon: HelpCircle },
    { id: "contributions", label: "Contributions", href: `${basePath}/${slug}/contributions`, icon: MessageSquare },
  ] as const;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-16">
      <header className="rounded-2xl border border-border/80 bg-card/50 p-5 shadow-lg backdrop-blur-md md:p-6">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-primary">
          <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1">{roomType}</span>
          {section !== "overview" && <span className="text-muted-foreground">{section === "arguments" ? "Arguments" : section}</span>}
        </div>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">{title}</h1>
        {(premise || description) && <p className="mt-2 max-w-4xl text-sm leading-relaxed text-muted-foreground">{premise || description}</p>}
      </header>

      <nav aria-label={`${roomType} room sections`} className="sticky top-0 z-30 -mx-4 overflow-hidden border-y border-border/70 bg-background/90 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex min-w-max gap-2 overflow-x-auto no-scrollbar">
          {sections.map(({ id, label, href, icon: Icon }) => {
            const active = id === section;
            return <Link key={id} href={href} aria-current={active ? "page" : undefined} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${active ? "bg-primary text-primary-foreground shadow" : "border border-border/60 bg-card/40 text-muted-foreground hover:text-foreground"}`}><Icon className="h-3.5 w-3.5" />{label}</Link>;
          })}
        </div>
      </nav>
      {children}
    </div>
  );
}
