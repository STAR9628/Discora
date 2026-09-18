import type { CommentNode } from "./build-comment-tree";
import type { DiscussionArgument, DiscussionEvidence } from "../types";
import type { InquiryItem } from "@/features/inquiries/types";

export type ConversationFeedItem =
  | { kind: "thread"; key: string; createdAt: string; node: CommentNode }
  | { kind: "evidence"; key: string; createdAt: string; evidence: DiscussionEvidence }
  | { kind: "argument"; key: string; createdAt: string; argument: DiscussionArgument }
  | { kind: "inquiry"; key: string; createdAt: string; inquiry: InquiryItem };

const KIND_ORDER: Record<ConversationFeedItem["kind"], number> = {
  thread: 0,
  evidence: 1,
  argument: 2,
  inquiry: 3,
};

/**
 * Interleave threaded messages with room evidence and arguments into one
 * chronological conversation feed. Threaded replies stay grouped under their
 * root; evidence/arguments join as top-level items at their own timestamps.
 * Stable for identical timestamps (threads, then evidence, then arguments).
 * Nodes only ever reflect the currently loaded message window — loading more
 * contributions interleaves earlier content naturally.
 */
export function buildConversationFeed(
  threads: CommentNode[],
  evidence: DiscussionEvidence[],
  args: DiscussionArgument[],
  inquiries: InquiryItem[] = [],
): ConversationFeedItem[] {
  const items: ConversationFeedItem[] = [
    ...threads.map(
      (node): ConversationFeedItem => ({
        kind: "thread",
        key: `msg-${node.message.id}`,
        createdAt: node.message.createdAt,
        node,
      }),
    ),
    ...evidence.map(
      (item): ConversationFeedItem => ({
        kind: "evidence",
        key: `evidence-${item.id}`,
        createdAt: item.createdAt,
        evidence: item,
      }),
    ),
    ...args.map(
      (item): ConversationFeedItem => ({
        kind: "argument",
        key: `argument-${item.id}`,
        createdAt: item.createdAt,
        argument: item,
      }),
    ),
    ...inquiries.map(
      (item): ConversationFeedItem => ({
        kind: "inquiry",
        key: `inquiry-${item.id}`,
        createdAt: item.createdAt,
        inquiry: item,
      }),
    ),
  ];

  items.sort((a, b) => {
    const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (timeDiff !== 0) return timeDiff;
    if (KIND_ORDER[a.kind] !== KIND_ORDER[b.kind]) return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });

  return items;
}

/** Shorten claim text for relationship lines, e.g. `↳ Evidence for "…"` */
export function truncateClaimLabel(content: string, maxLength = 80): string {
  const singleLine = content.replace(/\s+/g, " ").trim();
  if (singleLine.length <= maxLength) return singleLine;
  return `${singleLine.slice(0, maxLength - 1).trimEnd()}…`;
}
