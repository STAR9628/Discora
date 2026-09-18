"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Compass, Loader2, Sparkles, X } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  usePaginatedMessages,
  usePostMessage,
  useUpdateMessage,
  useReactions,
  useToggleReaction,
  useClaimRequests,
  useCreateClaimRequest,
  useDecideClaimRequest,
  useConvertMessageToClaim,
  useRoomEvidence,
  useRoomArguments,
  useRetractRoomEvidence,
  useRetractArgument,
  useClaims,
} from "@/features/discussions/hooks/use-discussions";
import type { DiscussionClaim, DiscussionMessage, ReactionType } from "@/features/discussions/types";
import type { SectionPage } from "@/features/discussions/services/discussion-service";
import { buildCommentTree } from "@/features/discussions/utils/build-comment-tree";
import { buildConversationFeed, truncateClaimLabel } from "@/features/discussions/utils/build-conversation-feed";
import { CommentItem } from "./comment-item";
import { ExtractClaimModal } from "./extract-claim-modal";
import { ReportDialog } from "./report-dialog";
import { StructuredContributionNode } from "./structured-contribution-node";
import { CreateArgumentDialog } from "./create-argument-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { InquiryConversationNode } from "@/features/inquiries/components/inquiry-conversation-node";
import { InquiryCreateDialog } from "@/features/debates/components/inquiry-create-dialog";
import { useInquiries } from "@/features/inquiries/hooks/use-inquiries";
import { UnifiedComposer } from "@/features/rooms/components/unified-composer";
import { useOptionalDiscussionData } from "./discussion-data-provider";
import { toast } from "@/components/ui/toast";

interface DiscussionContributionsSectionProps {
  roomId: string;
  slug?: string;
  highlightId?: string | null;
  /**
   * Server-rendered first pages (public rooms only). Seed SSR HTML with real
   * conversation substance while client interactivity continues unchanged.
   */
  initialMessagesPage?: SectionPage<DiscussionMessage>;
  initialClaims?: DiscussionClaim[];
}

/** Conversation lens component displaying chronological discussion messages with claim/evidence linkages. */
export function DiscussionContributionsSection({
  roomId,
  slug,
  highlightId,
  initialMessagesPage,
  initialClaims,
}: DiscussionContributionsSectionProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { items: messages, isLoading, error, hasMore, isLoadingMore, loadMore } = usePaginatedMessages(roomId, { initialPage: initialMessagesPage });
  const post = usePostMessage();
  const update = useUpdateMessage(roomId);

  // Message IDs for batch reaction & claim request fetching
  const messageIds = useMemo(() => (messages || []).map((m) => m.id), [messages]);

  // Reactions
  const { data: reactionsData } = useReactions("message", messageIds, messageIds.length > 0);
  const toggleReactionMutation = useToggleReaction("message", roomId);

  // Claim Requests & in-place conversion
  const { requestsMap, myRequests } = useClaimRequests(roomId, messageIds, messageIds.length > 0);
  const createClaimRequestMutation = useCreateClaimRequest(roomId);
  const decideClaimRequestMutation = useDecideClaimRequest(roomId);
  const convertMessageMutation = useConvertMessageToClaim(roomId);

  // Evidence + Arguments as chronological conversation citizens (Phase G)
  const { data: roomEvidence } = useRoomEvidence(roomId, messageIds.length > 0);
  const { data: roomArguments } = useRoomArguments(roomId, messageIds.length > 0);
  const { data: roomInquiries } = useInquiries(roomId, messageIds.length > 0);
  const { data: roomClaims } = useClaims(roomId, undefined, true, initialClaims);
  const retractEvidenceMutation = useRetractRoomEvidence(roomId);
  const retractArgumentMutation = useRetractArgument(roomId);

  const evidenceIds = useMemo(() => (roomEvidence || []).map((ev) => ev.id), [roomEvidence]);
  const argumentIds = useMemo(() => (roomArguments || []).map((arg) => arg.id), [roomArguments]);
  const { data: evidenceReactions } = useReactions("evidence", evidenceIds, evidenceIds.length > 0);
  const { data: argumentReactions } = useReactions("argument", argumentIds, argumentIds.length > 0);
  const toggleEvidenceReaction = useToggleReaction("evidence", roomId);
  const toggleArgumentReaction = useToggleReaction("argument", roomId);

  const claimById = useMemo(() => {
    const map = new Map<string, DiscussionClaim>();
    for (const claim of roomClaims || []) {
      map.set(claim.id, claim);
    }
    return map;
  }, [roomClaims]);

  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [activeEditId, setActiveEditId] = useState<string | null>(null);
  const [showPostFeedback, setShowPostFeedback] = useState(false);
  const [extractComment, setExtractComment] = useState<DiscussionMessage | null>(null);
  const [argumentClaim, setArgumentClaim] = useState<DiscussionClaim | null>(null);
  const [inquiryClaim, setInquiryClaim] = useState<DiscussionClaim | null>(null);
  const [pendingRetract, setPendingRetract] = useState<{
    kind: "evidence" | "argument";
    id: string;
    label: string;
  } | null>(null);
  const [reportState, setReportState] = useState<{
    messageId?: string | null;
    evidenceId?: string | null;
    contentPreview: string;
    entityTypeLabel: string;
  } | null>(null);

  // Consume shared room data boundary if inside DiscussionDataProvider
  const discussionData = useOptionalDiscussionData();

  const claimedMessageIds = discussionData?.claimedMessageIds ?? new Set<string>();
  const messageToClaimMap = discussionData?.messageToClaimMap ?? new Map();
  const messageEvidenceMap = discussionData?.messageEvidenceMap ?? new Map();

  const tree = useMemo(() => (messages ? buildCommentTree(messages) : []), [messages]);

  // Chronological feed: threaded messages interleaved with evidence/argument nodes.
  const visibleEvidence = useMemo(
    () => (roomEvidence || []).filter((ev) => !ev.isRetracted),
    [roomEvidence],
  );
  const feed = useMemo(
    () => buildConversationFeed(tree, visibleEvidence, roomArguments || [], roomInquiries || []),
    [tree, visibleEvidence, roomArguments, roomInquiries],
  );
  const loadedMessageIdSet = useMemo(() => new Set(messageIds), [messageIds]);

  const jumpToClaimInConversation = (claimId: string) => {
    const claim = claimById.get(claimId);
    const originId = claim?.originMessageId;
    const target =
      (originId ? document.getElementById(`msg-${originId}`) : null) ||
      document.getElementById(`claim-${claimId}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("ring-2", "ring-primary", "rounded-lg", "transition-all", "duration-1000");
      setTimeout(() => {
        target.classList.remove("ring-2", "ring-primary", "rounded-lg");
      }, 4000);
    } else {
      router.push(`/discussions/${currentSlug}/claims?highlight=${claimId}`);
    }
  };

  const replyToStructured = async (claimId: string, text: string, isAnonymous: boolean) => {
    const originId = claimById.get(claimId)?.originMessageId;
    if (originId && loadedMessageIdSet.has(originId)) {
      await reply(originId, text, isAnonymous);
      return;
    }
    await post.mutateAsync({ roomId, content: text, identityMode: isAnonymous ? "anonymous" : "public" });
    setShowPostFeedback(true);
    toast.success("Reply posted.");
  };

  // Highlight scroll handling
  const highlightHandled = useRef(false);
  useEffect(() => {
    if (!highlightId || highlightHandled.current) return;
    const tryHighlight = (retries: number) => {
      const el = document.getElementById(highlightId) || document.getElementById(`msg-${highlightId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-primary", "rounded-lg", "transition-all", "duration-1000");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-primary", "rounded-lg");
        }, 4000);
        highlightHandled.current = true;
      } else if (retries > 0) {
        setTimeout(() => tryHighlight(retries - 1), 300);
      }
    };
    tryHighlight(10);
  }, [highlightId, messages]);

  const reply = async (parentMessageId: string, text: string, isAnonymous: boolean) => {
    await post.mutateAsync({ roomId, parentMessageId, content: text, identityMode: isAnonymous ? "anonymous" : "public" });
    setActiveReplyId(null);
    setShowPostFeedback(true);
    toast.success("Reply posted.");
  };

  const currentSlug = slug || roomId;

  return (
    <section className="space-y-4 pb-36 sm:pb-44">
      <div className="flex items-center justify-between px-1 text-xs text-muted-foreground/75 select-none">
        <span className="font-semibold tracking-tight">
          {feed.length} {feed.length === 1 ? "contribution" : "contributions"}
        </span>
      </div>

      {/* Contextual Post-Contribution Guidance Banner */}
      {showPostFeedback && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-xs animate-in fade-in duration-200">
          <div className="space-y-1">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Your contribution is now part of the discussion.</span>
            </p>
            <p className="text-muted-foreground leading-relaxed">
              If your post introduces a distinct factual assertion or argument, you can click &ldquo;Make this a Claim&rdquo; below your comment to elevate it into the room&apos;s Claims registry.
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
      ) : feed.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <Compass className="mx-auto mb-2 h-6 w-6" />
          No contributions yet
        </div>
      ) : (
        <div className="space-y-4">
          {feed.map((item) => {
            if (item.kind === "thread") {
              const node = item.node;
              return (
            <CommentItem
              key={node.message.id}
              node={node}
              level={0}
              currentUserId={user?.id}
              activeReplyId={activeReplyId}
              setActiveReplyId={setActiveReplyId}
              activeEditId={activeEditId}
              setActiveEditId={setActiveEditId}
              claimedMessageIds={claimedMessageIds}
              messageToClaimMap={messageToClaimMap}
              messageEvidenceMap={messageEvidenceMap}
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
              onNavigateToClaims={() => router.push(`/discussions/${currentSlug}/claims`)}
              onNavigateToClaim={(claimId) => router.push(`/discussions/${currentSlug}/claims?highlight=${claimId}`)}
              onNavigateToEvidence={() => router.push(`/discussions/${currentSlug}/evidence`)}
              reactions={reactionsData || []}
              onToggleReaction={(targetId, reactionType) => {
                if (!user) return;
                toggleReactionMutation.mutate({ targetId, reactionType });
              }}
              claimRequestState={requestsMap.get(node.message.id)}
              hasUserRequestedClaim={myRequests.has(node.message.id)}
              claimRequestsMap={requestsMap}
              myClaimRequests={myRequests}
              isRequestActionPending={decideClaimRequestMutation.isPending}
              onRequestClaim={(msgId) => {
                if (!user) return;
                createClaimRequestMutation.mutate(msgId, {
                  onSuccess: () => {
                    toast.success("Claim requested.", {
                      description: "The author has been notified to examine this as a Claim.",
                    });
                  },
                  onError: (e) => {
                    toast.error("Request failed.", {
                      description: (e as Error).message,
                    });
                  },
                });
              }}
              onDecideClaimRequest={(msgId, decision) => {
                decideClaimRequestMutation.mutate({ messageId: msgId, decision }, {
                  onSuccess: () => {
                    if (decision === "accept") {
                      toast.success("Converted to Claim.", {
                        description: "Your message is now an examined Claim in this room.",
                      });
                    } else if (decision === "skip") {
                      toast.info("Request skipped.");
                    } else {
                      toast.info("Request declined.");
                    }
                  },
                  onError: (e) => {
                    toast.error("Decision failed.", {
                      description: (e as Error).message,
                    });
                  },
                });
              }}
              onConvertToClaim={(msgId) => {
                convertMessageMutation.mutate({ messageId: msgId, claimType: "opinion", contextType: "observation" }, {
                  onSuccess: () => {
                    toast.success("Converted to Claim.", {
                      description: "Your contribution is now an examined Claim in this room.",
                    });
                  },
                  onError: (e) => {
                    toast.error("Conversion failed.", {
                      description: (e as Error).message,
                    });
                  },
                });
              }}
              onNavigateToInquiries={(claimId) => {
                const claim = claimById.get(claimId);
                if (claim) {
                  setInquiryClaim(claim);
                } else {
                  router.push(`/discussions/${currentSlug}/questions`);
                }
              }}
              onCreateArgument={(claim) => setArgumentClaim(claim)}
            />
              );
            }

            if (item.kind === "evidence") {
              const ev = item.evidence;
              const claim = claimById.get(ev.claimId);
              const relationLabel =
                ev.direction === "contradict"
                  ? "Evidence challenging"
                  : ev.direction === "context"
                    ? "Context for"
                    : "Evidence for";
              return (
                <StructuredContributionNode
                  key={item.key}
                  kind="evidence"
                  id={ev.id}
                  content={ev.content}
                  createdAt={ev.createdAt}
                  username={ev.username}
                  avatarUrl={ev.avatarUrl}
                  isAnonymous={ev.identityMode === "anonymous"}
                  isAuthor={Boolean(user?.id && ev.createdBy && ev.createdBy === user.id)}
                  currentUserId={user?.id}
                  claimLabel={claim ? truncateClaimLabel(claim.content) : "this claim"}
                  relationLabel={relationLabel}
                  sourceTitle={ev.sourceTitle}
                  sourceUrl={ev.sourceUrl}
                  reactions={evidenceReactions || []}
                  onToggleReaction={(targetId, reactionType: ReactionType) => {
                    if (!user) return;
                    toggleEvidenceReaction.mutate({ targetId, reactionType });
                  }}
                  onReply={user ? (text, isAnonymous) => replyToStructured(ev.claimId, text, isAnonymous) : undefined}
                  onJumpToClaim={() => jumpToClaimInConversation(ev.claimId)}
                  onReport={user ? () => setReportState({
                    evidenceId: ev.id,
                    contentPreview: ev.content,
                    entityTypeLabel: "Evidence",
                  }) : undefined}
                  onRetract={
                    user?.id && ev.createdBy && ev.createdBy === user.id
                      ? () => setPendingRetract({ kind: "evidence", id: ev.id, label: "this evidence" })
                      : undefined
                  }
                  isPendingAction={retractEvidenceMutation.isPending}
                />
              );
            }

            if (item.kind === "inquiry") {
              const inquiry = item.inquiry;
              const claim = claimById.get(inquiry.targetClaimId);
              return (
                <InquiryConversationNode
                  key={item.key}
                  inquiry={inquiry}
                  currentUserId={user?.id}
                  claimLabel={claim ? truncateClaimLabel(claim.content) : "this claim"}
                  onJumpToClaim={() => jumpToClaimInConversation(inquiry.targetClaimId)}
                />
              );
            }

            const arg = item.argument;
            const claim = claimById.get(arg.claimId);
            return (
              <StructuredContributionNode
                key={item.key}
                kind="argument"
                id={arg.id}
                content={arg.content}
                createdAt={arg.createdAt}
                username={arg.username}
                avatarUrl={arg.avatarUrl}
                isAnonymous={arg.identityMode === "anonymous"}
                isAuthor={Boolean(user?.id && arg.createdBy && arg.createdBy === user.id)}
                currentUserId={user?.id}
                claimLabel={claim ? truncateClaimLabel(claim.content) : "this claim"}
                relationLabel={arg.stance === "challenging" ? "Argument challenging" : "Argument supporting"}
                reactions={argumentReactions || []}
                onToggleReaction={(targetId, reactionType: ReactionType) => {
                  if (!user) return;
                  toggleArgumentReaction.mutate({ targetId, reactionType });
                }}
                onReply={user ? (text, isAnonymous) => replyToStructured(arg.claimId, text, isAnonymous) : undefined}
                onJumpToClaim={() => jumpToClaimInConversation(arg.claimId)}
                onRetract={
                  user?.id && arg.createdBy && arg.createdBy === user.id
                    ? () => setPendingRetract({ kind: "argument", id: arg.id, label: "this reasoning" })
                    : undefined
                }
                isPendingAction={retractArgumentMutation.isPending}
              />
            );
          })}
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

      {/* Unified Message / Claim / Question Composer (Fixed to viewport bottom) */}
      <UnifiedComposer
        roomId={roomId}
        roomType="discussion"
        onSuccess={() => setShowPostFeedback(true)}
      />

      {/* Claim Extraction Modal */}
      <ExtractClaimModal
        isOpen={!!extractComment}
        onClose={() => setExtractComment(null)}
        roomId={roomId}
        comment={extractComment}
      />

      {/* Report Dialog */}
      <ReportDialog
        isOpen={!!reportState}
        onClose={() => setReportState(null)}
        messageId={reportState?.messageId || null}
        evidenceId={reportState?.evidenceId || null}
        contentPreview={reportState?.contentPreview || ""}
        entityTypeLabel={reportState?.entityTypeLabel || ""}
        roomId={roomId}
      />

      {/* Claim-contextual argument creation */}
      {argumentClaim && (
        <CreateArgumentDialog
          isOpen={!!argumentClaim}
          onClose={() => setArgumentClaim(null)}
          roomId={roomId}
          claimId={argumentClaim.id}
          claimPreview={argumentClaim.content}
        />
      )}

      {/* Claim-contextual targeted inquiry creation (preserves claim context) */}
      {inquiryClaim && (
        <InquiryCreateDialog
          roomId={roomId}
          targetClaimId={inquiryClaim.id}
          isOpen={!!inquiryClaim}
          onClose={() => setInquiryClaim(null)}
        />
      )}

      {/* Retract confirmation for conversation nodes */}
      <ConfirmDialog
        open={!!pendingRetract}
        title={pendingRetract?.kind === "evidence" ? "Retract evidence?" : "Retract reasoning?"}
        description={
          pendingRetract?.kind === "evidence"
            ? "This evidence will be retracted. The claim relationship is preserved for context."
            : "This reasoning will be retracted. The claim relationship is preserved for context."
        }
        confirmLabel="Retract"
        variant="danger"
        onCancel={() => setPendingRetract(null)}
        onConfirm={() => {
          if (!pendingRetract) return;
          if (pendingRetract.kind === "evidence") {
            retractEvidenceMutation.mutate(pendingRetract.id, {
              onSuccess: () => {
                toast.success("Evidence retracted.");
                setPendingRetract(null);
              },
              onError: (e) => {
                toast.error("Retraction failed.", { description: (e as Error).message });
              },
            });
          } else {
            retractArgumentMutation.mutate(pendingRetract.id, {
              onSuccess: () => {
                toast.success("Reasoning retracted.");
                setPendingRetract(null);
              },
              onError: (e) => {
                toast.error("Retraction failed.", { description: (e as Error).message });
              },
            });
          }
        }}
      />
    </section>
  );
}
