"use client";

import { Loader2, Link2, AlertCircle } from "lucide-react";
import type { DiscussionClaim, DiscussionEvidence, DiscussionMessage, DiscussionQuestion } from "../types";

/**
 * Shared off-page target resolution card. Renders the single record a user
 * navigated to (via ?highlight= or ?question=) that lives beyond the first
 * paginated page, so it is fetched individually rather than by scanning the
 * whole collection.
 */
export function SectionTargetCard({
  label,
  content,
  meta,
}: {
  label: string;
  content: string;
  meta: string;
  kind?: string;
}) {
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-4 space-y-2 shadow-sm">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-primary" />
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">Linked {label}</span>
        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary border border-primary/20">
          {meta}
        </span>
      </div>
      <p className="text-sm text-foreground leading-relaxed">{content}</p>
      <p className="text-xs text-muted-foreground">
        This record is on a later page. Use the list below to continue browsing, or reload to see it in context.
      </p>
    </div>
  );
}

export function SectionTargetLoader({ kind }: { kind: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card/30 p-4 text-xs text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>Locating linked {kind}…</span>
    </div>
  );
}

export function SectionTargetError({ kind, message }: { kind: string; message?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-xs text-destructive">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>Could not locate linked {kind}.{message ? ` ${message}` : ""}</span>
    </div>
  );
}

export function targetMetaForClaim(claim: DiscussionClaim): string {
  const parts: string[] = [claim.claimType];
  if (claim.isRetracted) parts.push("Retracted");
  return parts.join(" · ");
}

export function targetMetaForEvidence(evidence: DiscussionEvidence): string {
  const parts: string[] = [evidence.direction];
  if (evidence.isRetracted) parts.push("Retracted");
  return parts.join(" · ");
}

export function targetMetaForQuestion(question: DiscussionQuestion): string {
  const parts: string[] = [question.questionType];
  if (question.isRetracted) parts.push("Retracted");
  return parts.join(" · ");
}

export function targetMetaForMessage(message: DiscussionMessage): string {
  const parts: string[] = [message.messageType];
  if (message.isModerated) parts.push("Moderated");
  return parts.join(" · ");
}
