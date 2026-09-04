"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { usePostMessage, useUpdateMessage, useRoomEvidence, usePaginatedEvidence, usePaginatedThreads, useRoomMessageCount, useThreadTarget } from "@/features/discussions/hooks/use-discussions";
import type { DiscussionMessage, DiscussionClaim } from "@/features/discussions/types";
import type { DebateRoomData } from "@/features/debates/services/debate-service";
import { MessageSquare, AlertCircle, Compass, Loader2, Send, X, Sparkles } from "lucide-react";
import { ExtractClaimModal } from "@/features/discussions/components/extract-claim-modal";
import { ReportDialog } from "@/features/discussions/components/report-dialog";
import { useAuthorsReputation } from "@/features/reputation/hooks/use-batch-reputation";
import { CommentItem } from "@/features/discussions/components/comment-item";
import { RoomEvidenceTab } from "@/features/discussions/components/room-evidence-tab";
import { buildCommentTree } from "@/features/discussions/utils/build-comment-tree";
import { DebateScorecard } from "@/features/debates/components/debate-scorecard";
import { DebateResolution } from "@/features/debates/components/debate-resolution";
import { PositionHistory } from "@/features/debates/components/position-history";
import { DebateDataProvider, useDebateContext } from "./debate-data-provider";
import { DebateHeaderV2 } from "./debate-header-v2";
import { DebatePremise } from "./debate-premise";
import { DebateSectionNav } from "./debate-section-nav";
import { DebateArgumentList } from "./debate-argument-list";
import { DebateInquiriesTab } from "./debate-inquiries-tab";
import { DebateSidePickerModal } from "./debate-side-picker-modal";
import { GuestContributionPrompt } from "@/features/rooms/components/guest-contribution-prompt";
import { toast } from "@/components/ui/toast";

interface DebateRoomProps {
  initialData: DebateRoomData;
  highlightId?: string | null;
  initialSection?: import("./debate-data-provider").DebateSection;
}

function InnerDebateRoom({ highlightId }: { highlightId?: string | null }) {
  const {
    room,
    debate,
    activeSection,
    setActiveSection,
    claims,
  } = useDebateContext();
  const { user } = useAuth();

  const isContributions = activeSection === "contributions";

  const {
    items: messages,
    isLoading: isMessagesLoading,

    hasMore: threadsHasMore,
    isLoadingMore: threadsLoadingMore,
    loadMore: loadMoreThreads,
  } = usePaginatedThreads(room.id, { enabled: isContributions });
  const { data: messageCount } = useRoomMessageCount(room.id, isContributions);
  const postMutation = usePostMessage();
  const updateMutation = useUpdateMessage(room.id);
  const { data: roomEvidence } = useRoomEvidence(room.id, isContributions);

  const debateEvidence = usePaginatedEvidence(room.id, { enabled: activeSection === "evidence" });

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
    if (roomEvidence) {
      for (const c of claims) {
        if (c.originMessageId) {
          const count = roomEvidence.filter((ev) => ev.claimId === c.id).length;
          if (count > 0) {
            map.set(c.originMessageId, count);
          }
        }
      }
    }
    return map;
  }, [roomEvidence, claims]);

  const msgAuthorIds = useMemo(
    () => messages?.filter((m) => m.userId && m.identityMode !== "anonymous").map((m) => m.userId!) || [],
    [messages],
  );
  const { data: msgAuthorRepScores } = useAuthorsReputation(msgAuthorIds);

  const [extractComment, setExtractComment] = useState<DiscussionMessage | null>(null);
  const [isExtractOpen, setIsExtractOpen] = useState(false);

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

  const [mainContent, setMainContent] = useState("");
  const [mainAnonymous, setMainAnonymous] = useState(false);
  const [mainError, setMainError] = useState<string | null>(null);
  const [showPostFeedback, setShowPostFeedback] = useState(false);

  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [activeEditId, setActiveEditId] = useState<string | null>(null);

  const handlePostMain = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setMainError(null);

    const trimmed = mainContent.trim();
    if (trimmed.length < 1) {
      setMainError("Message content cannot be empty.");
      return;
    }
    if (trimmed.length > 2000) {
      setMainError("Message exceeds limit of 2000 characters.");
      return;
    }

    try {
      await postMutation.mutateAsync({
        roomId: room.id,
        content: trimmed,
        identityMode: mainAnonymous ? "anonymous" : "public",
      });
      setMainContent("");
      setMainAnonymous(false);
      setShowPostFeedback(true);
      toast.success("Contribution posted successfully.", {
        description: "Your contribution is part of the debate. You can elevate key points into claims or inquiries.",
      });
    } catch (err) {
      setMainError(err instanceof Error ? err.message : "Failed to post message.");
    }
  }, [mainContent, mainAnonymous, postMutation, room.id]);

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

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Compact Header Banner */}
      <DebateHeaderV2 />

      {/* 2. Opening Premise */}
      <DebatePremise />

      {/* 3. Sticky Section Navigation */}
      <DebateSectionNav />

      {/* 4. Main Section Render */}
      {activeSection === "overview" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <DebateScorecard roomId={room.id} debateId={debate.id} />
          <DebateResolution roomId={room.id} debate={debate} roomCreatedBy={room.createdBy} />
          <PositionHistory roomId={room.id} />
          <div className="rounded-xl border border-border/60 bg-card/25 p-4 text-sm text-muted-foreground">Inspect the Arguments section to compare the current proposition and opposition claims.</div>
        </div>
      )}

      {activeSection === "arguments" && (
        <DebateArgumentList highlightId={highlightId} />
      )}

      {activeSection === "evidence" && (
        <div className="animate-in fade-in duration-200">
          <RoomEvidenceTab
            roomId={room.id}
            onGoToClaims={() => setActiveSection("arguments")}
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

      {activeSection === "inquiries" && (
        <DebateInquiriesTab />
      )}

      {activeSection === "contributions" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span>Contributions</span>
              <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {messageCount ?? messages.length}
              </span>
            </h2>
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
                  Next step (optional): If your post makes a distinct empirical or logical assertion, you can click &ldquo;Extract Claim&rdquo; below your comment to elevate it into debate arguments, or submit a Structured Inquiry.
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
            ) : commentTree.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-card/20 p-8 text-center space-y-2">
                <Compass className="h-6 w-6 text-muted-foreground mx-auto" />
                <p className="text-xs font-semibold text-foreground">No contributions posted yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {commentTree.map((node) => (
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
                    authorRepScores={msgAuthorRepScores}
                    onReply={handlePostReply}
                    onEdit={handleUpdateMessage}
                    onExtractClaim={handleExtractClaim}
                    onReport={handleReport}
                    onNavigateToClaims={() => setActiveSection("arguments")}
                    onNavigateToClaim={() => setActiveSection("arguments")}
                    onNavigateToEvidence={() => setActiveSection("evidence")}
                  />
                ))}
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

          {/* P0.1 Authenticated Form or Guest Participation Prompt */}
          {user ? (
            <div className="border-t border-border/50 pt-6 space-y-4">
              <h3 className="text-sm font-bold text-foreground">Contribute to the Discussion Thread</h3>
              <form onSubmit={handlePostMain} className="space-y-4">
                {mainError && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{mainError}</span>
                  </div>
                )}

                <div className="relative">
                  <textarea
                    rows={3}
                    value={mainContent}
                    onChange={(e) => setMainContent(e.target.value)}
                    placeholder="State your argument, reference evidence, or respond to the thread..."
                    className="w-full rounded-xl border border-input bg-background/50 p-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    disabled={postMutation.isPending}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={mainAnonymous}
                      onChange={(e) => setMainAnonymous(e.target.checked)}
                      className="rounded border-input text-primary accent-primary h-3.5 w-3.5 cursor-pointer"
                      disabled={postMutation.isPending}
                    />
                    <span>Post Anonymously</span>
                  </label>

                  <button
                    type="submit"
                    disabled={postMutation.isPending || mainContent.trim().length === 0}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  >
                    {postMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Submit Post</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="border-t border-border/50 pt-6">
              <GuestContributionPrompt roomType="debate" />
            </div>
          )}
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
    </div>
  );
}

export function DebateRoom({ initialData, highlightId, initialSection }: DebateRoomProps) {
  return (
    <DebateDataProvider initialData={initialData} initialSection={initialSection}>
      <InnerDebateRoom highlightId={highlightId} />
    </DebateDataProvider>
  );
}
