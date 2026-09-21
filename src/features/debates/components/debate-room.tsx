"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  usePostMessage,
  useUpdateMessage,
  useRoomEvidence,
  usePaginatedEvidence,
  usePaginatedThreads,
  useRoomMessageCount,
  useThreadTarget,
  useReactions,
  useToggleReaction,
  useClaimRequests,
  useCreateClaimRequest,
  useDecideClaimRequest,
  useConvertMessageToClaim,
  useRoomArguments,
  useRetractRoomEvidence,
  useRetractArgument,
} from "@/features/discussions/hooks/use-discussions";
import type { DiscussionMessage, DiscussionClaim, ReactionType } from "@/features/discussions/types";
import type { DebateRoomData } from "@/features/debates/services/debate-service";
import { AlertCircle, Loader2, X, Sparkles, MessageSquare, FileText, Layers, Swords, Shield } from "lucide-react";
import { ExtractClaimModal } from "@/features/discussions/components/extract-claim-modal";
import { ReportDialog } from "@/features/discussions/components/report-dialog";
import { CommentItem } from "@/features/discussions/components/comment-item";
import { StructuredContributionNode } from "@/features/discussions/components/structured-contribution-node";
import { CreateArgumentDialog } from "@/features/discussions/components/create-argument-dialog";
import { InquiryConversationNode } from "@/features/inquiries/components/inquiry-conversation-node";
import { InquiryCreateDialog } from "@/features/debates/components/inquiry-create-dialog";
import { useInquiries } from "@/features/inquiries/hooks/use-inquiries";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { buildConversationFeed, truncateClaimLabel } from "@/features/discussions/utils/build-conversation-feed";
import { RoomEvidenceTab } from "@/features/discussions/components/room-evidence-tab";
import { RoomSourcesTab } from "@/features/discussions/components/room-sources-tab";
import { buildCommentTree } from "@/features/discussions/utils/build-comment-tree";
import { ArgumentEvidenceOverview } from "./argument-evidence-overview";
import { DebateDataProvider, useDebateContext, normalizeDebateLens } from "./debate-data-provider";
import { DebateHeaderV2 } from "./debate-header-v2";
import { DebatePremise } from "./debate-premise";
import { DebateSectionNav } from "./debate-section-nav";
import { DebateClaimsLensSection } from "./debate-claims-lens-section";
import { DebateInquiriesTab } from "./debate-inquiries-tab";
import { DebateSidePickerModal } from "./debate-side-picker-modal";
import { UnifiedComposer } from "@/features/rooms/components/unified-composer";
import { PrivateDebateManagement } from "./private-debate-management";
import { PrivateAccessGate } from "./private-access-gate";
import { RoomGuideCard } from "@/features/onboarding";
import { toast } from "@/components/ui/toast";
import { CompactStickyRoomHeader } from "@/features/rooms/components/compact-sticky-room-header";
import { SaveButton } from "@/features/saves/components/save-button";
import { ShareButton } from "@/components/share/share-button";
import { RoomHeaderActions } from "@/components/share/room-header-actions";

interface DebateRoomProps {
  initialData: DebateRoomData;
  highlightId?: string | null;
  autoOpenEvidence?: boolean;
  initialSection?: import("./debate-data-provider").DebateSection;
  gateMode?: boolean;
  /**
   * Server-rendered first pages (public rooms only). Seeds SSR HTML with real
   * debate substance; client interactivity continues unchanged. Never pass
   * private-room data here.
   */
  initialThreadsPage?: import("@/features/discussions/hooks/use-discussions").ThreadPage;
  initialCollections?: import("./debate-data-provider").DebateInitialCollections;
  initialRoomArguments?: import("@/features/discussions/types").DiscussionArgument[];
  initialEvidencePage?: import("@/features/discussions/services/discussion-service").SectionPage<
    import("@/features/discussions/types").DiscussionEvidence
  >;
  initialPropositionPage?: import("@/features/discussions/services/discussion-service").SectionPage<
    import("@/features/discussions/types").DiscussionClaim
  >;
  initialOppositionPage?: import("@/features/discussions/services/discussion-service").SectionPage<
    import("@/features/discussions/types").DiscussionClaim
  >;
}

function InnerDebateRoom({
  highlightId,
  autoOpenEvidence,
  initialThreadsPage,
  initialRoomArguments,
  initialEvidencePage,
  initialPropositionPage,
  initialOppositionPage,
}: {
  highlightId?: string | null;
  autoOpenEvidence?: boolean;
  initialThreadsPage?: import("@/features/discussions/hooks/use-discussions").ThreadPage;
  initialRoomArguments?: import("@/features/discussions/types").DiscussionArgument[];
  initialEvidencePage?: import("@/features/discussions/services/discussion-service").SectionPage<
    import("@/features/discussions/types").DiscussionEvidence
  >;
  initialPropositionPage?: import("@/features/discussions/services/discussion-service").SectionPage<
    import("@/features/discussions/types").DiscussionClaim
  >;
  initialOppositionPage?: import("@/features/discussions/services/discussion-service").SectionPage<
    import("@/features/discussions/types").DiscussionClaim
  >;
}) {
  const {
    room,
    activeSection,
    setActiveSection,
    claims,
    propositionClaims,
    oppositionClaims,
    roomEvidence,
    inquiries,
    userParticipation,
    setIsSideModalOpen,
    setTargetSideToJoin,
  } = useDebateContext();
  const { user } = useAuth();
  const [composerMode, setComposerMode] = useState<import("@/features/rooms/components/unified-composer").ComposerMode>("message");
  const [expandTrigger, setExpandTrigger] = useState(0);
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  const currentLens = normalizeDebateLens(activeSection);
  const isContributions = currentLens === "conversation";

  const {
    items: messages,
    isLoading: isMessagesLoading,

    hasMore: threadsHasMore,
    isLoadingMore: threadsLoadingMore,
    loadMore: loadMoreThreads,
  } = usePaginatedThreads(room.id, { enabled: isContributions, initialPage: initialThreadsPage });
  const { data: messageCount } = useRoomMessageCount(room.id, isContributions);
  const postMutation = usePostMessage();
  const updateMutation = useUpdateMessage(room.id);
  const { data: contributionsRoomEvidence } = useRoomEvidence(room.id, isContributions);
  const { data: contributionsRoomArguments } = useRoomArguments(room.id, isContributions || currentLens === "understanding", initialRoomArguments);
  const { data: contributionsRoomInquiries } = useInquiries(room.id, isContributions);
  const retractEvidenceMutation = useRetractRoomEvidence(room.id);
  const retractArgumentMutation = useRetractArgument(room.id);

  const claimById = useMemo(() => {
    const map = new Map<string, DiscussionClaim>();
    for (const c of claims) {
      map.set(c.id, c);
    }
    return map;
  }, [claims]);

  // Message IDs for reactions and claim requests in Debate conversation
  const messageIds = useMemo(() => (messages || []).map((m) => m.id), [messages]);
  const { data: reactionsData } = useReactions("message", messageIds, isContributions && messageIds.length > 0);
  const toggleReactionMutation = useToggleReaction("message", room.id);

  // Evidence + Argument nodes: chronological conversation citizens (Phase G)
  const visibleDebateEvidence = useMemo(
    () => (contributionsRoomEvidence || []).filter((ev) => !ev.isRetracted),
    [contributionsRoomEvidence],
  );
  const debateEvidenceIds = useMemo(() => visibleDebateEvidence.map((ev) => ev.id), [visibleDebateEvidence]);
  const debateArgumentIds = useMemo(() => (contributionsRoomArguments || []).map((arg) => arg.id), [contributionsRoomArguments]);
  const { data: debateEvidenceReactions } = useReactions("evidence", debateEvidenceIds, isContributions && debateEvidenceIds.length > 0);
  const { data: debateArgumentReactions } = useReactions("argument", debateArgumentIds, isContributions && debateArgumentIds.length > 0);
  const toggleDebateEvidenceReaction = useToggleReaction("evidence", room.id);
  const toggleDebateArgumentReaction = useToggleReaction("argument", room.id);
  const { requestsMap, myRequests } = useClaimRequests(room.id, messageIds, isContributions && messageIds.length > 0);
  const createClaimRequestMutation = useCreateClaimRequest(room.id);
  const decideClaimRequestMutation = useDecideClaimRequest(room.id);
  const convertMessageMutation = useConvertMessageToClaim(room.id);

  const debateEvidence = usePaginatedEvidence(room.id, { enabled: currentLens === "evidence", initialPage: initialEvidencePage });

  const highlightInLoadedThread = messages.some((m) => m.id === highlightId);
  const threadTargetQuery = useThreadTarget(!highlightInLoadedThread ? highlightId : null, room.id);
  const resolvedThread = threadTargetQuery.data;

  React.useEffect(() => {
    if (!highlightId) return;
    let cancelled = false;
    const target = `msg-${highlightId}`;
    const tryHighlight = (retries: number) => {
      if (cancelled) return;
      const el = document.getElementById(target) || document.getElementById(highlightId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-primary", "shadow-lg", "shadow-primary/20", "transition-all", "duration-300");
        setTimeout(() => { if (!cancelled) el.classList.add("animate-pulse"); }, 600);
        setTimeout(() => { if (!cancelled) el.classList.remove("ring-2", "ring-primary", "shadow-lg", "shadow-primary/20", "animate-pulse"); }, 4000);
      } else if (retries > 0 && isContributions) {
        setTimeout(() => tryHighlight(retries - 1), 300);
      }
    };
    tryHighlight(12);
    return () => { cancelled = true; };
  }, [highlightId, isContributions, resolvedThread?.targetId, messages]);

  const claimedMessageIds = useMemo(
    () => new Set(claims.map((c) => c.originMessageId).filter(Boolean) as string[]),
    [claims],
  );

  const messageToClaimMap = useMemo(() => {
    const map = new Map<string, DiscussionClaim>();
    for (const c of claims) {
      if (c.originMessageId) {
        map.set(c.originMessageId, c);
      }
    }
    return map;
  }, [claims]);

  const messageEvidenceMap = useMemo(() => {
    const map = new Map<string, number>();
    if (contributionsRoomEvidence) {
      for (const c of claims) {
        if (c.originMessageId) {
          const count = contributionsRoomEvidence.filter((ev) => ev.claimId === c.id).length;
          if (count > 0) {
            map.set(c.originMessageId, count);
          }
        }
      }
    }
    return map;
  }, [contributionsRoomEvidence, claims]);

  const [extractComment, setExtractComment] = useState<DiscussionMessage | null>(null);
  const [isExtractOpen, setIsExtractOpen] = useState(false);
  const [argumentClaim, setArgumentClaim] = useState<DiscussionClaim | null>(null);
  const [inquiryClaim, setInquiryClaim] = useState<DiscussionClaim | null>(null);
  const [pendingRetract, setPendingRetract] = useState<{
    kind: "evidence" | "argument";
    id: string;
  } | null>(null);

  const handleExtractClaim = useCallback((msg: DiscussionMessage) => {
    setExtractComment(msg);
    setIsExtractOpen(true);
  }, []);

  const [reportState, setReportState] = useState<{
    messageId?: string | null;
    questionId?: string | null;
    claimId?: string | null;
    evidenceId?: string | null;
    contentPreview: string;
    entityTypeLabel: string;
  } | null>(null);

  const handleReport = useCallback((msg: DiscussionMessage) => {
    setReportState({
      messageId: msg.id,
      contentPreview: msg.content,
      entityTypeLabel: "Message",
    });
  }, []);

  const [showPostFeedback, setShowPostFeedback] = useState(false);

  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [activeEditId, setActiveEditId] = useState<string | null>(null);

  const handlePostReply = useCallback(async (parentId: string, content: string, anonymous: boolean) => {
    const trimmed = content.trim();
    if (trimmed.length < 1) throw new Error("Reply content cannot be empty.");
    if (trimmed.length > 2000) throw new Error("Reply exceeds 2000 characters.");

    await postMutation.mutateAsync({
      roomId: room.id,
      parentMessageId: parentId,
      content: trimmed,
      identityMode: anonymous ? "anonymous" : "public",
    });
    setActiveReplyId(null);
    setShowPostFeedback(true);
    toast.success("Reply posted.");
  }, [postMutation, room.id]);

  const handleUpdateMessage = useCallback(async (messageId: string, content: string) => {
    const trimmed = content.trim();
    if (trimmed.length < 1) throw new Error("Edited content cannot be empty.");
    if (trimmed.length > 2000) throw new Error("Edited content exceeds 2000 characters.");

    await updateMutation.mutateAsync({ id: messageId, content: trimmed });
    setActiveEditId(null);
    toast.success("Message updated.");
  }, [updateMutation]);

  const commentTree = useMemo(
    () => buildCommentTree(resolvedThread && !highlightInLoadedThread ? [...messages, ...resolvedThread.thread] : messages),
    [messages, resolvedThread, highlightInLoadedThread],
  );

  // Chronological feed: threaded messages interleaved with evidence/argument/inquiry nodes.
  const debateFeed = useMemo(
    () => buildConversationFeed(commentTree, visibleDebateEvidence, contributionsRoomArguments || [], contributionsRoomInquiries || []),
    [commentTree, visibleDebateEvidence, contributionsRoomArguments, contributionsRoomInquiries],
  );
  const loadedDebateMessageIds = useMemo(() => new Set(messages.map((m) => m.id)), [messages]);

  const jumpToDebateClaim = useCallback((claimId: string) => {
    const originId = claimById.get(claimId)?.originMessageId;
    const target =
      (originId ? document.getElementById(`msg-${originId}`) : null) ||
      document.getElementById(`claim-${claimId}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("ring-2", "ring-primary", "shadow-lg", "shadow-primary/20", "transition-all", "duration-300");
      setTimeout(() => target.classList.remove("ring-2", "ring-primary", "shadow-lg", "shadow-primary/20"), 4000);
    } else {
      setActiveSection("claims");
    }
  }, [claimById, setActiveSection]);

  const replyToDebateStructured = useCallback(async (claimId: string, text: string, isAnonymous: boolean) => {
    const trimmed = text.trim();
    if (trimmed.length < 1) throw new Error("Reply content cannot be empty.");
    if (trimmed.length > 2000) throw new Error("Reply exceeds 2000 characters.");
    const originId = claimById.get(claimId)?.originMessageId;
    const anchor = originId && loadedDebateMessageIds.has(originId) ? originId : null;
    await postMutation.mutateAsync({
      roomId: room.id,
      parentMessageId: anchor,
      content: trimmed,
      identityMode: isAnonymous ? "anonymous" : "public",
    });
    setActiveReplyId(null);
    setShowPostFeedback(true);
    toast.success("Reply posted.");
  }, [claimById, loadedDebateMessageIds, postMutation, room.id]);

  // Private room access gate (client-side fallback if user is removed or not participant)
  if (room.visibility === "private" && !userParticipation) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <PrivateAccessGate
          roomId={room.id}
          roomSlug={room.slug}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-5 md:space-y-6 max-w-6xl mx-auto relative">
      {/* Scroll Sentinel for Compact Sticky Header */}
      <div ref={sentinelRef} className="h-px w-full pointer-events-none -mt-3 sm:-mt-5 md:-mt-6" aria-hidden="true" />

      {/* Compact Sticky Contextual Header */}
      <CompactStickyRoomHeader
        roomType="debate"
        title={room.title}
        headerAction={
          <RoomHeaderActions showLabel={false}>
            <SaveButton targetType="debate" targetId={room.id} showLabel={false} />
            {room.visibility === "public" && (
              <ShareButton
                ariaLabel="Share this debate"
                shareTitle={room.title}
                shareText="I think this debate would be interesting to discuss together."
                sharePath={`/debates/${room.slug}`}
                showLabel={false}
              />
            )}
          </RoomHeaderActions>
        }
        sentinelRef={sentinelRef}
      />

      {/* 1. Compact Header Banner */}
      <DebateHeaderV2 />

      {/* 2. Opening Premise & Context */}
      <DebatePremise />

      {/* 3. Contextual Room Guide — Compact progressive disclosure */}
      <RoomGuideCard roomType="debate" />

      {/* 4. Sticky Section Navigation */}
      <DebateSectionNav />

      {/* 4. Main Section Render */}
      {currentLens === "understanding" && (
        <div className="space-y-6 lens-transition">
          <ArgumentEvidenceOverview
            roomId={room.id}
            claims={claims}
            propositionClaims={propositionClaims}
            oppositionClaims={oppositionClaims}
            roomEvidence={roomEvidence}
            inquiries={inquiries}
            arguments={contributionsRoomArguments}
            onNavigateToClaim={jumpToDebateClaim}
          />
          <div className="rounded-xl border border-border/60 bg-card/25 p-4 text-sm text-muted-foreground">Inspect the Claims section to compare the current proposition and opposition claims.</div>
        </div>
      )}

      {currentLens === "claims" && (
        <div className="lens-transition">
          <DebateClaimsLensSection
            highlightId={highlightId}
            autoOpenEvidence={autoOpenEvidence}
            initialPropositionPage={initialPropositionPage}
            initialOppositionPage={initialOppositionPage}
          />
        </div>
      )}

      {currentLens === "evidence" && (
        <div className="lens-transition">
          <RoomEvidenceTab
            roomId={room.id}
            onGoToClaims={() => setActiveSection("claims")}
            evidenceList={debateEvidence.items}
            isLoading={debateEvidence.isLoading}
          />
          {debateEvidence.hasMore && (
            <div className="mt-4">
              <button
                onClick={debateEvidence.loadMore}
                disabled={debateEvidence.isLoadingMore}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card/30 px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-card/50 transition-colors cursor-pointer disabled:opacity-50"
              >
                {debateEvidence.isLoadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{debateEvidence.isLoadingMore ? "Loading…" : "Load more evidence"}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {currentLens === "sources" && (
        <div className="lens-transition">
          <RoomSourcesTab roomId={room.id} evidenceLensBasePath={`/debates/${room.slug}`} />
        </div>
      )}

      {(currentLens === "inquiries" || currentLens === "questions") && (
        <div className="lens-transition">
          <DebateInquiriesTab />
        </div>
      )}

      {currentLens === "conversation" && (
        <div className="space-y-6 pb-36 sm:pb-44 lens-transition">
          <div className="flex items-center justify-between px-1 text-xs text-muted-foreground/75 select-none">
            <span className="font-semibold tracking-tight">
              {messageCount ?? messages.length} {(messageCount ?? messages.length) === 1 ? "contribution" : "contributions"}
            </span>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
              <span>Proposition / Opposition feed</span>
            </div>
          </div>

          {/* P1.2 Contextual Post-Contribution Guidance Banner */}
          {showPostFeedback && (
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-xs animate-in fade-in duration-200">
              <div className="space-y-1">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Your contribution is now part of the debate.</span>
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Next step (optional): If your post makes a distinct empirical or logical assertion, you can click &ldquo;Make this a Claim&rdquo; below your comment to elevate it into debate arguments, or submit a Structured Inquiry.
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

          <div className="space-y-4">
            {isMessagesLoading && messages.length === 0 ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-28 rounded-xl border border-border bg-card/20 p-4 animate-pulse" />
                ))}
              </div>
            ) : debateFeed.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-card/20 sm:bg-card/25 p-4 sm:p-8 text-center space-y-2.5 sm:space-y-4 animate-in fade-in duration-200">
                <div className="mx-auto flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-amber-500/10 text-amber-400">
                  <Swords className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="max-w-sm sm:max-w-md mx-auto space-y-1">
                  <h2 className="text-sm sm:text-base font-bold text-foreground">Start the debate</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    This debate is just getting started. Choose a side (Proposition or Opposition), state your reasoning, or bring evidence to test the premise.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5 sm:pt-1">
                  {!userParticipation ? (
                    <button
                      type="button"
                      onClick={() => {
                        setTargetSideToJoin("proposition");
                        setIsSideModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-2.5 py-1.5 sm:px-3 sm:py-1.5 text-xs font-bold text-primary-foreground shadow-xs hover:opacity-90 transition-all cursor-pointer min-h-[36px] sm:min-h-0"
                    >
                      <Shield className="h-3.5 w-3.5" />
                      <span>Join Debate / Pick Side</span>
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setComposerMode("message");
                      setExpandTrigger((prev) => prev + 1);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/60 hover:bg-card/90 px-2.5 py-1.5 sm:px-3 sm:py-1.5 text-xs font-semibold text-foreground transition-colors cursor-pointer shadow-xs min-h-[36px] sm:min-h-0"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-primary" />
                    <span>Contribute an argument</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection("claims")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/60 hover:bg-card/90 px-2.5 py-1.5 sm:px-3 sm:py-1.5 text-xs font-semibold text-foreground transition-colors cursor-pointer shadow-xs min-h-[36px] sm:min-h-0"
                  >
                    <FileText className="h-3.5 w-3.5 text-blue-400" />
                    <span>Inspect Claims</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection("evidence")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/60 hover:bg-card/90 px-2.5 py-1.5 sm:px-3 sm:py-1.5 text-xs font-semibold text-foreground transition-colors cursor-pointer shadow-xs min-h-[36px] sm:min-h-0"
                  >
                    <Layers className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Inspect Evidence</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {debateFeed.map((item) => {
                  if (item.kind === "inquiry") {
                    const inquiry = item.inquiry;
                    const claim = claimById.get(inquiry.targetClaimId);
                    return (
                      <InquiryConversationNode
                        key={item.key}
                        inquiry={inquiry}
                        currentUserId={user?.id}
                        claimLabel={claim ? truncateClaimLabel(claim.content) : "this claim"}
                        onJumpToClaim={() => jumpToDebateClaim(inquiry.targetClaimId)}
                      />
                    );
                  }
                  if (item.kind !== "thread") {
                    const isEvidence = item.kind === "evidence";
                    const entry = isEvidence ? item.evidence : item.argument;
                    const claim = claimById.get(entry.claimId);
                    const relationLabel = isEvidence
                      ? item.evidence.direction === "contradict"
                        ? "Evidence challenging"
                        : item.evidence.direction === "context"
                          ? "Context for"
                          : "Evidence for"
                      : item.argument.stance === "challenging"
                        ? "Argument challenging"
                        : "Argument supporting";
                    return (
                      <StructuredContributionNode
                        key={item.key}
                        kind={item.kind}
                        id={entry.id}
                        content={entry.content}
                        createdAt={entry.createdAt}
                        username={entry.username}
                        avatarUrl={entry.avatarUrl}
                        isAnonymous={entry.identityMode === "anonymous"}
                        isAuthor={Boolean(user?.id && entry.createdBy && entry.createdBy === user.id)}
                        currentUserId={user?.id}
                        claimLabel={claim ? truncateClaimLabel(claim.content) : "this claim"}
                        relationLabel={relationLabel}
                        sourceTitle={isEvidence ? item.evidence.sourceTitle : null}
                        sourceUrl={isEvidence ? item.evidence.sourceUrl : null}
                        reactions={isEvidence ? debateEvidenceReactions || [] : debateArgumentReactions || []}
                        onToggleReaction={(targetId, reactionType: ReactionType) => {
                          if (!user) return;
                          (isEvidence ? toggleDebateEvidenceReaction : toggleDebateArgumentReaction).mutate({ targetId, reactionType });
                        }}
                        onReply={user ? (text, isAnonymous) => replyToDebateStructured(entry.claimId, text, isAnonymous) : undefined}
                        onJumpToClaim={() => jumpToDebateClaim(entry.claimId)}
                        onReport={user && isEvidence ? () => setReportState({
                          evidenceId: item.evidence.id,
                          contentPreview: item.evidence.content,
                          entityTypeLabel: "Evidence",
                        }) : undefined}
                        onRetract={
                          user?.id && entry.createdBy && entry.createdBy === user.id
                            ? () => setPendingRetract({ kind: item.kind, id: entry.id })
                            : undefined
                        }
                        isPendingAction={isEvidence ? retractEvidenceMutation.isPending : retractArgumentMutation.isPending}
                      />
                    );
                  }
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
                    roomId={room.id}
                    onReply={handlePostReply}
                    onEdit={handleUpdateMessage}
                    onExtractClaim={handleExtractClaim}
                    onReport={handleReport}
                    onNavigateToClaims={() => setActiveSection("claims")}
                    onNavigateToClaim={() => setActiveSection("claims")}
                    onNavigateToEvidence={() => setActiveSection("evidence")}
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
                              description: "Your message is now an examined Claim in this debate.",
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
                            description: "Your contribution is now an examined Claim in this debate.",
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
                        setActiveSection("inquiries");
                      }
                    }}
                    onCreateArgument={(claim) => setArgumentClaim(claim)}
                  />
                  );
                })}
              </div>
            )}

            {highlightId && !highlightInLoadedThread && threadTargetQuery.isLoading && (
              <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/25 p-4 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Locating the highlighted contribution…</span>
              </div>
            )}

            {highlightId && !highlightInLoadedThread && !threadTargetQuery.isLoading && threadTargetQuery.isError && (
              <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Failed to locate the highlighted contribution.</span>
              </div>
            )}

            {highlightId && !highlightInLoadedThread && !threadTargetQuery.isLoading && !threadTargetQuery.isError && threadTargetQuery.data === null && (
              <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/25 p-4 text-xs text-muted-foreground">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>The highlighted contribution could not be found.</span>
              </div>
            )}

            {threadsHasMore && (
              <button
                onClick={loadMoreThreads}
                disabled={threadsLoadingMore}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card/30 px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-card/50 transition-colors cursor-pointer disabled:opacity-50"
              >
                {threadsLoadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{threadsLoadingMore ? "Loading…" : "Load more contributions"}</span>
              </button>
            )}
          </div>

          {/* Unified Message / Claim / Question Composer (Fixed to viewport bottom) */}
          <UnifiedComposer
            roomId={room.id}
            roomType="debate"
            participantSide={userParticipation?.side}
            externalMode={composerMode}
            expandTrigger={expandTrigger}
            onSuccess={() => setShowPostFeedback(true)}
          />
        </div>
      )}

      {/* Side Switch / Join Stance Modal */}
      <DebateSidePickerModal />

      {/* Extract Claim Modal */}
      <ExtractClaimModal
        isOpen={isExtractOpen}
        onClose={() => { setIsExtractOpen(false); setExtractComment(null); }}
        roomId={room.id}
        comment={extractComment}
      />

      {/* Report Dialog */}
      <ReportDialog
        isOpen={!!reportState}
        onClose={() => setReportState(null)}
        messageId={reportState?.messageId}
        questionId={reportState?.questionId}
        claimId={reportState?.claimId}
        evidenceId={reportState?.evidenceId}
        contentPreview={reportState?.contentPreview || ""}
        entityTypeLabel={reportState?.entityTypeLabel || ""}
        roomId={room.id}
      />

      {/* Claim-contextual argument creation */}
      {argumentClaim && (
        <CreateArgumentDialog
          isOpen={!!argumentClaim}
          onClose={() => setArgumentClaim(null)}
          roomId={room.id}
          claimId={argumentClaim.id}
          claimPreview={argumentClaim.content}
        />
      )}

      {/* Claim-contextual targeted inquiry creation (preserves claim context) */}
      {inquiryClaim && (
        <InquiryCreateDialog
          roomId={room.id}
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

      {/* Private Debate Management */}
      {room.visibility === "private" && userParticipation && (
        <div className="mt-8 pt-6 border-t border-border/50">
          <PrivateDebateManagement />
        </div>
      )}
    </div>
  );
}

export function DebateRoom({
  initialData,
  highlightId,
  autoOpenEvidence,
  initialSection,
  gateMode,
  initialThreadsPage,
  initialCollections,
  initialRoomArguments,
  initialEvidencePage,
  initialPropositionPage,
  initialOppositionPage,
}: DebateRoomProps) {
  if (gateMode) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <PrivateAccessGate
          roomId={initialData.room.id}
          roomSlug={initialData.room.slug}
        />
      </div>
    );
  }

  return (
    <DebateDataProvider
      key={initialData.room.id}
      initialData={initialData}
      initialSection={initialSection}
      initialCollections={initialCollections}
    >
      <InnerDebateRoom
        highlightId={highlightId}
        autoOpenEvidence={autoOpenEvidence}
        initialThreadsPage={initialThreadsPage}
        initialRoomArguments={initialRoomArguments}
        initialEvidencePage={initialEvidencePage}
        initialPropositionPage={initialPropositionPage}
        initialOppositionPage={initialOppositionPage}
      />
    </DebateDataProvider>
  );
}
