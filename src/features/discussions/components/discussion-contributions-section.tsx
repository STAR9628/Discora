"use client";

import { useMemo, useState } from "react";
import { Compass, Loader2, MessageSquare, Sparkles, X } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { usePaginatedMessages, usePostMessage, useUpdateMessage } from "@/features/discussions/hooks/use-discussions";
import type { DiscussionMessage } from "@/features/discussions/types";
import { buildCommentTree } from "@/features/discussions/utils/build-comment-tree";
import { CommentItem } from "./comment-item";
import { ExtractClaimModal } from "./extract-claim-modal";
import { ReportDialog } from "./report-dialog";
import { GuestContributionPrompt } from "@/features/rooms/components/guest-contribution-prompt";
import { toast } from "@/components/ui/toast";

/** Contributions-only route boundary with claim extraction support and guest onboarding prompt. */
export function DiscussionContributionsSection({ roomId }: { roomId: string }) {
  const { user } = useAuth();
  const { items: messages, isLoading, error, hasMore, isLoadingMore, loadMore } = usePaginatedMessages(roomId);
  const post = usePostMessage();
  const update = useUpdateMessage(roomId);
  const [content, setContent] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [activeEditId, setActiveEditId] = useState<string | null>(null);
  const [showPostFeedback, setShowPostFeedback] = useState(false);
  const [extractComment, setExtractComment] = useState<DiscussionMessage | null>(null);
  const [reportState, setReportState] = useState<{
    messageId: string;
    contentPreview: string;
    entityTypeLabel: string;
  } | null>(null);

  const tree = useMemo(() => (messages ? buildCommentTree(messages) : []), [messages]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!content.trim()) return;
    await post.mutateAsync({ roomId, content: content.trim(), identityMode: anonymous ? "anonymous" : "public" });
    setContent("");
    setAnonymous(false);
    setShowPostFeedback(true);
    toast.success("Contribution posted successfully.", {
      description: "Your contribution is part of the discussion. You can extract claims or attach evidence.",
    });
  };

  const reply = async (parentMessageId: string, text: string, isAnonymous: boolean) => {
    await post.mutateAsync({ roomId, parentMessageId, content: text, identityMode: isAnonymous ? "anonymous" : "public" });
    setActiveReplyId(null);
    setShowPostFeedback(true);
    toast.success("Reply posted.");
  };

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Contributions ({messages?.length ?? 0})</h2>
      </div>

      {/* P1.2 Contextual Post-Contribution Guidance Banner */}
      {showPostFeedback && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-xs animate-in fade-in duration-200">
          <div className="space-y-1">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Your contribution is now part of the discussion.</span>
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Next step (optional): If your post introduces a distinct factual assertion or argument, you can click &ldquo;Extract Claim&rdquo; below your comment to elevate it into the room&apos;s Claims registry.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPostFeedback(false)}
            className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer p-0.5"
            aria-label="Dismiss notice"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="h-28 animate-pulse rounded-xl border border-border bg-card/20" />
      ) : error ? (
        <p className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">
          Failed to load contributions: {(error as Error).message}
        </p>
      ) : tree.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <Compass className="mx-auto mb-2 h-6 w-6" />
          No contributions yet
        </div>
      ) : (
        <div className="space-y-4">
          {tree.map((node) => (
            <CommentItem
              key={node.message.id}
              node={node}
              level={0}
              currentUserId={user?.id}
              activeReplyId={activeReplyId}
              setActiveReplyId={setActiveReplyId}
              activeEditId={activeEditId}
              setActiveEditId={setActiveEditId}
              claimedMessageIds={new Set()}
              messageToClaimMap={new Map()}
              messageEvidenceMap={new Map()}
              roomId={roomId}
              onReply={reply}
              onEdit={async (id, value) => {
                await update.mutateAsync({ id, content: value });
                setActiveEditId(null);
              }}
              onExtractClaim={(msg) => setExtractComment(msg)}
              onReport={(msg) =>
                setReportState({
                  messageId: msg.id,
                  contentPreview: msg.content,
                  entityTypeLabel: "Message",
                })
              }
              onNavigateToClaims={() => undefined}
              onNavigateToClaim={() => undefined}
              onNavigateToEvidence={() => undefined}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={isLoadingMore}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card/30 px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-card/50 transition-colors cursor-pointer disabled:opacity-50"
        >
          {isLoadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          <span>{isLoadingMore ? "Loading…" : "Load more contributions"}</span>
        </button>
      )}

      {/* P0.1 Authenticated Form or Guest Prompt */}
      {user ? (
        <form onSubmit={submit} className="space-y-3 border-t border-border pt-5">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Share your structured insights or analysis..."
            className="w-full rounded-xl border border-input bg-background/50 p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
            Contribute anonymously
          </label>
          <button
            disabled={post.isPending || !content.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {post.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {post.isPending ? "Posting…" : "Post contribution"}
          </button>
        </form>
      ) : (
        <div className="border-t border-border pt-5">
          <GuestContributionPrompt roomType="discussion" />
        </div>
      )}

      {/* P1.2 Wired Claim Extraction Modal for the dedicated contributions route */}
      <ExtractClaimModal
        isOpen={!!extractComment}
        onClose={() => setExtractComment(null)}
        roomId={roomId}
        comment={extractComment}
      />

      {/* P1.3 Report Dialog for dedicated contributions route */}
      <ReportDialog
        isOpen={!!reportState}
        onClose={() => setReportState(null)}
        messageId={reportState?.messageId || null}
        contentPreview={reportState?.contentPreview || ""}
        entityTypeLabel={reportState?.entityTypeLabel || ""}
        roomId={roomId}
      />
    </section>
  );
}
