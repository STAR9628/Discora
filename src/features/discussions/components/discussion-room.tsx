"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  usePostMessage,
  useUpdateMessage,
  useRetractQuestion,
} from "@/features/discussions/hooks/use-discussions";
import type { DiscussionFeedItem } from "@/features/discussions/services/discussion-service";
import type { DiscussionMessage, DiscussionQuestion } from "@/features/discussions/types";
import { MessageSquare, AlertCircle, Compass, Loader2, Send, HelpCircle, ArrowLeft, RotateCcw, X, Sparkles } from "lucide-react";
import { ClaimList } from "./claim-list";
import { ExtractClaimModal } from "./extract-claim-modal";
import { QuestionList } from "./question-list";
import { ReportDialog } from "./report-dialog";
import { toast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CommentItem } from "./comment-item";
import { buildCommentTree } from "@/features/discussions/utils/build-comment-tree";
import { DiscussionDataProvider, useDiscussionData } from "./discussion-data-provider";
import { DiscussionHeader } from "./discussion-header";
import { OpeningPremise } from "./opening-premise";
import { SectionNav } from "./section-nav";
import { RoomEvidenceSection } from "./room-evidence-section";
import { GuestContributionPrompt } from "@/features/rooms/components/guest-contribution-prompt";

interface DiscussionRoomProps {
  initialData: DiscussionFeedItem;
  highlightId?: string | null;
}

export function DiscussionRoom({ initialData, highlightId }: DiscussionRoomProps) {
  return (
    <DiscussionDataProvider roomId={initialData.room.id}>
      <DiscussionRoomInner initialData={initialData} highlightId={highlightId} />
    </DiscussionDataProvider>
  );
}

function DiscussionRoomInner({ initialData, highlightId }: DiscussionRoomProps) {
  const { room, discussion } = initialData;
  const { user } = useAuth();

  const {
    messages,
    isMessagesLoading,
    claims,
    roomEvidence,
    questions,
    claimQuestionMap,
    messageToClaimMap,
    messageEvidenceMap,
    claimedMessageIds,
  } = useDiscussionData();

  const postMutation = usePostMessage();
  const updateMutation = useUpdateMessage(room.id);
  const retractQuestionMutation = useRetractQuestion(room.id);

  const [scrollToClaimId, setScrollToClaimId] = useState<string | null>(null);
  const [showRetractConfirm, setShowRetractConfirm] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<DiscussionQuestion | null>(null);
  const [showPostFeedback, setShowPostFeedback] = useState(false);
  const highlightHandled = useRef(false);

  // URL Question filter parameter synchronization
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const qId = params.get("question");
    if (qId && questions) {
      const found = questions.find((q) => q.id === qId);
      if (found) {
        setSelectedQuestion(found);
      }
    }
  }, [questions]);

  const handleSelectQuestion = useCallback((q: DiscussionQuestion | null) => {
    setSelectedQuestion(q);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (q) {
        url.searchParams.set("question", q.id);
      } else {
        url.searchParams.delete("question");
      }
      window.history.pushState({}, "", url.toString());
    }
    const qSec = document.getElementById("questions");
    if (qSec) {
      qSec.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // Highlight message handling
  useEffect(() => {
    if (!highlightId || highlightHandled.current) return;

    const tryHighlight = (retries: number) => {
      const el = document.getElementById(highlightId);
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
      setMainError("Message exceeds the maximum limit of 2000 characters.");
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
        description: "Your contribution is part of the discussion. You can extract claims or attach evidence.",
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

    await updateMutation.mutateAsync({
      id: messageId,
      content: trimmed,
    });
    setActiveEditId(null);
    toast.success("Message updated.");
  }, [updateMutation]);

  const commentTree = useMemo(
    () => (messages ? buildCommentTree(messages) : []),
    [messages]
  );

  const handleNavigateToClaim = useCallback((claimId: string) => {
    setScrollToClaimId(claimId);
    const claimsEl = document.getElementById("claims");
    if (claimsEl) claimsEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleNavigateToClaims = useCallback(() => {
    const el = document.getElementById("claims");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleNavigateToEvidence = useCallback((_claimId: string) => {
    const evSec = document.getElementById("evidence");
    if (evSec) evSec.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const openQuestionsCount = useMemo(
    () => questions?.filter((q) => !q.isRetracted).length ?? 0,
    [questions]
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 pb-16">
      {/* Discussion Header */}
      <DiscussionHeader
        initialData={initialData}
        claimCount={claims?.length ?? 0}
        evidenceCount={roomEvidence?.length ?? 0}
        openQuestionCount={openQuestionsCount}
        contributionCount={messages?.length ?? 0}
      />

      {/* Opening Premise */}
      <OpeningPremise discussion={discussion} />

      {/* Sticky Section Navigation */}
      <SectionNav
        questionCount={openQuestionsCount}
        claimCount={claims?.length ?? 0}
        evidenceCount={roomEvidence?.length ?? 0}
        contributionCount={messages?.length ?? 0}
      />

      {/* SECTION 1: DISCUSSION QUESTIONS (P1.3 Progressive Disclosure) */}
      <section id="questions" aria-labelledby="questions-heading" className="space-y-4 pt-2">
        <div className="border-b border-border pb-2">
          <h2 id="questions-heading" className="text-lg font-bold text-foreground flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <span>Discussion Questions</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Open questions that help explore what this discussion is really about.
          </p>
        </div>

        {selectedQuestion ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card/40 p-5 space-y-3.5 shadow-md backdrop-blur-md">
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={() => handleSelectQuestion(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to All Questions</span>
                </button>
                {selectedQuestion.createdBy === user?.id && !selectedQuestion.isRetracted && (
                  <button
                    onClick={() => setShowRetractConfirm(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-destructive hover:opacity-85 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Retract Question</span>
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-violet-400 border border-violet-500/25">
                    {selectedQuestion.questionType}
                  </span>
                  {selectedQuestion.isRetracted && (
                    <span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-500">
                      Retracted
                    </span>
                  )}
                </div>
                <h3 className="text-base md:text-lg font-bold text-foreground leading-relaxed">
                  {selectedQuestion.content}
                </h3>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider">
                Claims Answering This Question
              </h4>
              <ClaimList
                roomId={room.id}
                questionId={selectedQuestion.id}
                claimQuestionMap={claimQuestionMap}
                onReportClaim={(c) =>
                  setReportState({ claimId: c.id, contentPreview: c.content, entityTypeLabel: "Claim" })
                }
                onReportEvidence={(ev) =>
                  setReportState({ evidenceId: ev.id, contentPreview: ev.content, entityTypeLabel: "Evidence" })
                }
                debateSide={null}
              />
            </div>
          </div>
        ) : (
          <QuestionList
            roomId={room.id}
            onSelectQuestion={handleSelectQuestion}
            onReportQuestion={(q) =>
              setReportState({ questionId: q.id, contentPreview: q.content, entityTypeLabel: "Question" })
            }
          />
        )}
      </section>

      {/* SECTION 2: CLAIMS */}
      <section id="claims" aria-labelledby="claims-heading" className="space-y-4 pt-4">
        <ClaimList
          roomId={room.id}
          scrollToClaimId={scrollToClaimId}
          onScrollComplete={() => setScrollToClaimId(null)}
          claimQuestionMap={claimQuestionMap}
          onReportClaim={(c) =>
            setReportState({ claimId: c.id, contentPreview: c.content, entityTypeLabel: "Claim" })
          }
          onReportEvidence={(ev) =>
            setReportState({ evidenceId: ev.id, contentPreview: ev.content, entityTypeLabel: "Evidence" })
          }
          debateSide={null}
        />
      </section>

      {/* SECTION 3: ROOM-WIDE EVIDENCE */}
      <RoomEvidenceSection
        roomId={room.id}
        claims={claims}
        onNavigateToClaim={handleNavigateToClaim}
        onReportEvidence={(ev) =>
          setReportState({ evidenceId: ev.id, contentPreview: ev.content, entityTypeLabel: "Evidence" })
        }
      />

      {/* SECTION 4: CONTRIBUTIONS */}
      <section id="contributions" aria-labelledby="contributions-heading" className="space-y-4 pt-4">
        <div className="border-b border-border pb-2">
          <h2 id="contributions-heading" className="text-lg font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <span>Contributions ({messages?.length ?? 0})</span>
          </h2>
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
                Next step (optional): If your post introduces a distinct factual claim, value judgment, or policy recommendation, you can click &ldquo;Extract Claim&rdquo; below your comment to elevate it into the formal Claims registry, or link supporting evidence.
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

        {isMessagesLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 rounded-xl border border-border/60 bg-card/25 p-5 animate-pulse flex gap-4">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 w-1/4 bg-muted rounded" />
                  <div className="h-12 w-full bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : commentTree.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-card/10 p-10 text-center max-w-md mx-auto space-y-3">
            <div className="mx-auto rounded-full bg-muted/40 p-3 w-fit text-muted-foreground">
              <Compass className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">No contributions yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Start the conversation — share your perspective or offer a thoughtful reflection.
              </p>
            </div>
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
                onReply={handlePostReply}
                onEdit={handleUpdateMessage}
                onExtractClaim={handleExtractClaim}
                onReport={handleReport}
                onNavigateToClaims={handleNavigateToClaims}
                onNavigateToClaim={handleNavigateToClaim}
                onNavigateToEvidence={handleNavigateToEvidence}
              />
            ))}
          </div>
        )}

        {/* P0.1 Post Form for Authenticated Users or Guest Prompt for Visitors */}
        {user ? (
          <div className="border-t border-border/40 pt-6 space-y-3">
            <h3 className="text-sm font-bold text-foreground">Contribute to Discussion</h3>
            <form onSubmit={handlePostMain} className="space-y-3">
              {mainError && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{mainError}</span>
                </div>
              )}

              <div className="relative">
                <textarea
                  rows={4}
                  value={mainContent}
                  onChange={(e) => setMainContent(e.target.value)}
                  placeholder="Share your structured insights or analysis..."
                  className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-xs md:text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-50"
                  disabled={postMutation.isPending}
                />
                <span className={`absolute bottom-3 right-3 text-[10px] font-semibold transition-colors ${
                  mainContent.length > 2000 ? "text-destructive" : "text-muted-foreground"
                }`}>
                  {mainContent.length} / 2000
                </span>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={mainAnonymous}
                    onChange={(e) => setMainAnonymous(e.target.checked)}
                    className="rounded border-input text-primary accent-primary h-4 w-4 cursor-pointer"
                    disabled={postMutation.isPending}
                  />
                  <div className="text-left">
                    <p className="text-xs font-semibold text-foreground">Contribute Anonymously</p>
                    <p className="text-[10px] text-muted-foreground leading-none">Redact your identity metadata from this post</p>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={postMutation.isPending || mainContent.trim().length === 0}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-md transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 self-end sm:self-auto cursor-pointer"
                >
                  {postMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Posting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Submit Post</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="border-t border-border/40 pt-6">
            <GuestContributionPrompt roomType="discussion" />
          </div>
        )}
      </section>

      {/* Shared Modals */}
      <ConfirmDialog
        open={showRetractConfirm}
        title="Retract question?"
        description="This action is irreversible. The question will be permanently retracted."
        confirmLabel="Retract"
        variant="danger"
        onConfirm={async () => {
          if (!selectedQuestion) return;
          try {
            await retractQuestionMutation.mutateAsync(selectedQuestion.id);
            setSelectedQuestion((prev) => (prev ? { ...prev, isRetracted: true } : null));
            toast.success("Question retracted.");
          } catch (err) {
            toast.error("Failed to retract question.", {
              description: err instanceof Error ? err.message : "Please try again.",
            });
          } finally {
            setShowRetractConfirm(false);
          }
        }}
        onCancel={() => setShowRetractConfirm(false)}
      />

      <ExtractClaimModal
        isOpen={isExtractOpen}
        onClose={() => {
          setIsExtractOpen(false);
          setExtractComment(null);
        }}
        roomId={room.id}
        comment={extractComment}
        questionId={selectedQuestion?.id}
        debateSide={null}
      />

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
