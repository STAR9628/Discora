"use client";

import { Compass, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import type { EpistemicClaimSummary, RoomSoUState } from "./understanding-utils";

const ROOM_STATE_COPY: Record<
  RoomSoUState["state"],
  { label: string; description: (s: RoomSoUState) => string }
> = {
  contested: {
    label: "Contested",
    description: (s) =>
      s.contestedClaimIds.length === 1
        ? "One claim faces an open dispute"
        : `${s.contestedClaimIds.length} claims face open disputes`,
  },
  unresolved: {
    label: "Unresolved",
    description: (s) => {
      const open = s.unresolvedClaimIds.length + s.unresolvedQuestionIds.length;
      return open === 1 ? "One open item awaits evidence" : `${open} open items await evidence`;
    },
  },
  supported: {
    label: "Supported",
    description: (s) =>
      s.supportedClaimIds.length === 1
        ? "One claim backed by citations, no open disputes"
        : `${s.supportedClaimIds.length} claims backed by citations, no open disputes`,
  },
};

/**
 * Room-level SoU banner (whole-room scopes only). Presence-derived, no scores,
 * no truth language: it names which pillar has open items, never why the room
 * is "right". Render nothing for framing scopes (empty-state copy owns those).
 */
export function RoomStateBanner({ roomState }: { roomState: RoomSoUState }) {
  if (roomState.framing) return null;
  const copy = ROOM_STATE_COPY[roomState.state];
  const Icon =
    roomState.state === "contested"
      ? AlertTriangle
      : roomState.state === "supported"
        ? CheckCircle2
        : HelpCircle;
  const tone =
    roomState.state === "contested"
      ? "border-amber-500/30 bg-amber-500/5 text-amber-400"
      : roomState.state === "supported"
        ? "border-slate-500/30 bg-slate-500/5 text-slate-400"
        : "border-sky-500/30 bg-sky-500/5 text-sky-400";

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${tone}`}
      role="status"
      aria-label={`Room understanding: ${copy.label}. ${copy.description(roomState)}.`}
      title="Room-level understanding across this room's claims. Not a truth verdict: contested means an open dispute exists, unresolved means items await evidence."
    >
      <Compass className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="font-semibold text-foreground">Room understanding: {copy.label}</span>
      <span className="text-muted-foreground">— {copy.description(roomState)}</span>
    </div>
  );
}

/**
 * Structured-connection context for a claim card: which claims it links to via
 * supports/contradicts/refines edges, plus evidenced challengers. Display only;
 * state effects (if any) are already reflected in the claim's statusReason.
 */
export function ClaimRelationChips({ summary }: { summary: EpistemicClaimSummary }) {
  const { connections, connectionCounts, challengedByClaimIds } = summary;
  if (connections.length === 0 && challengedByClaimIds.length === 0) return null;

  const parts: string[] = [];
  if (connectionCounts.supports > 0) parts.push(`${connectionCounts.supports} supports`);
  if (connectionCounts.contradicts > 0) parts.push(`${connectionCounts.contradicts} contradicts`);
  if (connectionCounts.refines > 0) parts.push(`${connectionCounts.refines} refines`);

  // Fragment: callers render this inside their existing chip flex containers.
  return (
    <>
      {parts.length > 0 && (
        <span
          className="inline-flex items-center gap-1 rounded bg-muted/50 px-1.5 py-0.5 font-medium text-muted-foreground border border-border"
          title={connections
            .slice(0, 6)
            .map(
              (c) =>
                `${c.direction === "outgoing" ? "→" : "←"} ${c.relationType}: ${c.content.slice(0, 60)}${c.content.length > 60 ? "…" : ""}`,
            )
            .join("\n")}
        >
          ⇄ {parts.join(" · ")}
        </span>
      )}
      {challengedByClaimIds.length > 0 && (
        <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 font-medium text-amber-400 border border-amber-500/20">
          Structurally challenged
        </span>
      )}
    </>
  );
}
