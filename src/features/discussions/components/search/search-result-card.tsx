"use client";

import Link from "next/link";
import { FileText, MessageSquare, Scale, Search, HelpCircle, Swords } from "lucide-react";
import type { SearchResult, SearchResultType } from "@/features/discussions/types";

const iconMap: Record<SearchResultType, React.ElementType> = {
  room: FileText,
  message: MessageSquare,
  claim: Scale,
  evidence: Search,
  question: HelpCircle,
};

const labelMap: Record<SearchResultType, string> = {
  room: "Room",
  message: "Message",
  claim: "Claim",
  evidence: "Evidence",
  question: "Question",
};

const highlightPrefixMap: Record<SearchResultType, string> = {
  message: "msg",
  claim: "claim",
  evidence: "ev",
  question: "q",
  room: "",
};

type SearchResultCardProps = {
  result: SearchResult;
};

function getResultHref(result: SearchResult): string {
  const isDebate = result.roomType === "debate";
  const base = isDebate ? `/debates/${result.roomSlug}` : `/discussions/${result.roomSlug}`;
  if (result.resultType === "room") return base;
  const prefix = highlightPrefixMap[result.resultType];
  return `${base}?highlight=${prefix}-${result.entityId}`;
}

function renderExcerpt(excerpt: string): React.ReactNode {
  const parts = excerpt.split(/(<mark>.*?<\/mark>)/g);
  return parts.map((part, i) => {
    if (part.startsWith("<mark>") && part.endsWith("</mark>")) {
      const inner = part.slice(6, -7);
      return <mark key={i}>{inner}</mark>;
    }
    return part;
  });
}

export function SearchResultCard({ result }: SearchResultCardProps) {
  const Icon = iconMap[result.resultType];
  const label = result.resultType === "room"
    ? result.roomType === "debate" ? "Debate Room" : "Discussion Room"
    : labelMap[result.resultType];
  const href = getResultHref(result);
  const isDebate = result.roomType === "debate";

  return (
    <Link
      href={href}
      className="group block rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/30"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background">
          {result.resultType === "room" && isDebate ? (
            <Swords aria-hidden="true" className="h-4 w-4 text-amber-400" />
          ) : (
            <Icon aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {label}
            </span>

            {/* Room type badge for claims, questions, evidence, messages */}
            {result.resultType !== "room" && (
              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                isDebate
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  : "bg-primary/10 text-primary border-primary/20"
              }`}>
                {isDebate ? "Debate" : "Discussion"}
              </span>
            )}

            <span className="text-[11px] text-muted-foreground/60">·</span>
            <span className="truncate text-[11px] text-muted-foreground/70">
              {result.roomTitle}
            </span>
          </div>
          {result.excerpt ? (
            <p className="mt-1 text-sm leading-relaxed text-foreground line-clamp-3 [&>mark]:bg-amber-200 [&>mark]:text-amber-900">
              {renderExcerpt(result.excerpt)}
            </p>
          ) : (
            <p className="mt-1 text-sm leading-relaxed text-foreground line-clamp-2">
              {result.content}
            </p>
          )}
          {result.authorUsername && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {result.authorUsername}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
