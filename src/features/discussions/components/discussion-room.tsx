"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useMessages, usePostMessage, useUpdateMessage, useRoomEvidence, useRetractQuestion } from "@/features/discussions/hooks/use-discussions";
import type { DiscussionFeedItem } from "@/features/discussions/services/discussion-service";
import type { DiscussionMessage, DiscussionQuestion } from "@/features/discussions/types";
import { MessageSquare, Calendar, User, Quote, AlertCircle, Compass, Reply, Edit3, Check, Loader2, Send, Clock, Award, Link2, FileText, ArrowLeft, RotateCcw, Flag } from "lucide-react";
import { ClaimList } from "./claim-list";
import { ExtractClaimModal } from "./extract-claim-modal";
import { QuestionList } from "./question-list";
import { ReportDialog } from "./report-dialog";
import { toast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface DiscussionRoomProps {
  initialData: DiscussionFeedItem;
  highlightId?: string | null;
}

interface CommentNode {
  message: DiscussionMessage;
  children: CommentNode[];
}

// Client-side tree-builder to turn flat messages into nested structures
function buildCommentTree(messages: DiscussionMessage[]): CommentNode[] {
  const nodeMap = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  // Initialize nodes
  messages.forEach((msg) => {
    nodeMap.set(msg.id, { message: msg, children: [] });
  });

  // Build relationships
  messages.forEach((msg) => {
    const node = nodeMap.get(msg.id)!;
    if (msg.parentMessageId && nodeMap.has(msg.parentMessageId)) {
      const parentNode = nodeMap.get(msg.parentMessageId)!;
      parentNode.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export function DiscussionRoom({ initialData, highlightId }: DiscussionRoomProps) {
  const { room, topic, discussion } = initialData;
  const { user } = useAuth();
  const { data: messages, isLoading: isMessagesLoading, error: messagesError } = useMessages(room.id);
  const postMutation = usePostMessage();
  const updateMutation = useUpdateMessage(room.id);
  const retractQuestionMutation = useRetractQuestion(room.id);

  // Tab switching state
  const [activeTab, setActiveTab] = useState<"discussion" | "questions" | "claims" | "evidence" | "sources">("discussion");

  const [showRetractConfirm, setShowRetractConfirm] = useState(false);

  // Scroll-to-highlight: parse highlightId to determine tab and entity id
  const [selectedQuestion, setSelectedQuestion] = useState<DiscussionQuestion | null>(null);
  const highlightHandled = useRef(false);

  useEffect(() => {
    if (!highlightId || highlightHandled.current) return;

    const prefixMap: Record<string, "discussion" | "claims" | "evidence" | "questions"> = {
      msg: "discussion",
      claim: "claims",
      ev: "evidence",
      q: "questions",
    };

    const sepIndex = highlightId.indexOf("-");
    const prefix = sepIndex > 0 ? highlightId.slice(0, sepIndex) : "";
    const tab = prefixMap[prefix];

    if (tab) {
      setActiveTab(tab);
    }

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

  // Claim Extraction modal state
  const [extractComment, setExtractComment] = useState<DiscussionMessage | null>(null);
  const [isExtractOpen, setIsExtractOpen] = useState(false);

  // Report modal state
  const [reportState, setReportState] = useState<{
    messageId?: string | null;
    questionId?: string | null;
    claimId?: string | null;
    evidenceId?: string | null;
    contentPreview: string;
    entityTypeLabel: string;
  } | null>(null);

  // Main input state
  const [mainContent, setMainContent] = useState("");
  const [mainAnonymous, setMainAnonymous] = useState(false);
  const [mainError, setMainError] = useState<string | null>(null);

  // Active reply & edit node state
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [activeEditId, setActiveEditId] = useState<string | null>(null);

  const formattedDate = new Date(room.createdAt).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Post root message
  const handlePostMain = async (e: React.FormEvent) => {
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
    } catch (err) {
      setMainError(err instanceof Error ? err.message : "Failed to post message.");
    }
  };

  // Post nested reply
  const handlePostReply = async (parentId: string, content: string, anonymous: boolean) => {
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
  };

  // Edit existing message
  const handleUpdateMessage = async (messageId: string, content: string) => {
    const trimmed = content.trim();
    if (trimmed.length < 1) throw new Error("Edited content cannot be empty.");
    if (trimmed.length > 2000) throw new Error("Edited content exceeds 2000 characters.");

    await updateMutation.mutateAsync({
      id: messageId,
      content: trimmed,
    });
    setActiveEditId(null);
  };

  const commentTree = messages ? buildCommentTree(messages) : [];

  return (
    <div className="space-y-8">
      {/* 1. Room Header Card */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/50 p-6 md:p-8 backdrop-blur-md shadow-xl">
        <div className="absolute top-0 right-0 h-40 w-40 bg-primary/5 blur-3xl rounded-full" />

        <div className="space-y-4">
          {topic && (
            <span className="inline-flex rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              {topic.name}
            </span>
          )}

          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
            {room.title}
          </h1>

          {room.description && (
            <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
              {room.description}
            </p>
          )}

          <div className="flex flex-wrap gap-4 pt-2 text-xs text-muted-foreground border-t border-border/40">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>Started on {formattedDate}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4" />
              <span>{messages?.length ?? 0} contributions</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Opening Statement context block */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
          <Quote className="h-4 w-4 text-primary" />
          <span>Opening Premise</span>
        </h2>

        <div className="rounded-2xl border border-border bg-card/30 p-6 space-y-4 shadow-sm backdrop-blur-sm">
          {discussion?.summary && (
            <div className="rounded-xl border border-primary/15 bg-primary/[0.02] p-4 text-sm leading-relaxed italic text-foreground/90 relative">
              <span className="not-italic uppercase tracking-wider text-[9px] font-bold text-primary block mb-1">
                Summary Preview
              </span>
              <p>&ldquo;{discussion.summary}&rdquo;</p>
            </div>
          )}

          <div className="text-sm leading-relaxed text-foreground/80 space-y-4 whitespace-pre-wrap pl-3 border-l-2 border-primary/50">
            {discussion?.openingStatement}
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="border-b border-border/60 mt-6">
        <div className="flex gap-6">
          {(["discussion", "questions", "claims", "evidence", "sources"] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab !== "questions" && tab !== "discussion") {
                    setSelectedQuestion(null);
                  }
                }}
                className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="capitalize">{tab}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "discussion" && (
        <>
          {/* 3. Contributions thread and list */}
          <div className="space-y-4 pt-4">
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span>Contributions ({messages?.length ?? 0})</span>
            </h2>

            {isMessagesLoading ? (
              <div className="space-y-4">
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
            ) : messagesError ? (
              <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="font-medium">Failed to load contributions: {(messagesError as Error).message}</p>
              </div>
            ) : commentTree.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-card/10 p-12 text-center max-w-md mx-auto space-y-4">
                <div className="mx-auto rounded-full bg-muted/40 p-3.5 w-fit text-muted-foreground">
                  <Compass className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">No contributions yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Be the first to contribute to this discussion.
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
                    onReply={handlePostReply}
                    onEdit={handleUpdateMessage}
                    onExtractClaim={(msg) => {
                      setExtractComment(msg);
                      setIsExtractOpen(true);
                    }}
                    onReport={(msg) => {
                      setReportState({
                        messageId: msg.id,
                        contentPreview: msg.content,
                        entityTypeLabel: "Message",
                      });
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 4. Root Posting input box */}
          {user && (
            <div className="border-t border-border/40 pt-8 space-y-4">
              <h3 className="text-base font-bold text-foreground">Contribute to the Discussion</h3>
              <form onSubmit={handlePostMain} className="space-y-4">
                {mainError && (
                  <div className="flex items-center gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
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
                    className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-50"
                    disabled={postMutation.isPending}
                  />
                  <span className={`absolute bottom-3 right-3 text-[10px] font-semibold transition-colors ${
                    mainContent.length > 2000 ? "text-destructive" : "text-muted-foreground"
                  }`}>
                    {mainContent.length} / 2000
                  </span>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Anonymous Mode Switch */}
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={mainAnonymous}
                      onChange={(e) => setMainAnonymous(e.target.checked)}
                      className="rounded border-input text-primary accent-primary h-4 w-4 cursor-pointer"
                      disabled={postMutation.isPending}
                    />
                    <div className="text-left">
                      <p className="text-xs font-semibold text-foreground">Contribute Anonymously</p>
                      <p className="text-[10px] text-muted-foreground leading-none">Scrub your profile metadata from this post</p>
                    </div>
                  </label>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={postMutation.isPending || mainContent.trim().length === 0}
                    className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 self-end sm:self-auto"
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
          )}
        </>
      )}

      {activeTab === "questions" && (
        selectedQuestion ? (
          <div className="space-y-6">
            {/* Question detail header */}
            <div className="rounded-2xl border border-border bg-card/30 p-6 space-y-4 shadow-md backdrop-blur-md relative">
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={() => setSelectedQuestion(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Questions</span>
                </button>

                {/* Retraction option inside detail view */}
                {selectedQuestion.createdBy === user?.id && !selectedQuestion.isRetracted && (
                  <button
                    onClick={() => setShowRetractConfirm(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-destructive hover:opacity-85 transition-opacity cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Retract Question</span>
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`rounded-lg border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                    selectedQuestion.questionType === "information" ? "bg-blue-500/10 border-blue-500/25 text-blue-400" :
                    selectedQuestion.questionType === "clarification" ? "bg-purple-500/10 border-purple-500/25 text-purple-400" :
                    selectedQuestion.questionType === "perspective" ? "bg-orange-500/10 border-orange-500/25 text-orange-400" :
                    selectedQuestion.questionType === "evidence" ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" :
                    selectedQuestion.questionType === "directional" ? "bg-amber-500/10 border-amber-500/25 text-amber-400" :
                    "bg-pink-500/10 border-pink-500/25 text-pink-400"
                  }`}>
                    {selectedQuestion.questionType}
                  </span>
                  {selectedQuestion.isRetracted && (
                    <span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-500">
                      Retracted
                    </span>
                  )}
                </div>

                <h3 className="text-lg md:text-xl font-bold text-foreground leading-relaxed">
                  {selectedQuestion.content}
                </h3>
              </div>

              {/* Author & Date metadata */}
              <div className="flex items-center gap-2 pt-3 border-t border-border/20 text-xs text-muted-foreground">
                <div className="h-5 w-5 overflow-hidden rounded-full border border-border/60 bg-muted flex items-center justify-center">
                  {selectedQuestion.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedQuestion.avatarUrl}
                      alt={`${selectedQuestion.username}'s avatar`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-3 w-3 text-muted-foreground/60" />
                  )}
                </div>
                <span className={`font-bold ${
                  selectedQuestion.identityMode === "anonymous" ? "text-muted-foreground" : "text-foreground"
                }`}>
                  {selectedQuestion.identityMode === "anonymous" ? "Anonymous" : selectedQuestion.username || "Unknown User"}
                </span>
                <span>•</span>
                <span>
                  Asked on {new Date(selectedQuestion.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  })}
                </span>
              </div>
            </div>

            {/* Answers ClaimList under the question */}
            <div className="space-y-4">
              <div className="border-b border-border/40 pb-2">
                <h4 className="text-sm font-extrabold text-foreground uppercase tracking-wider">
                  Answers & Claims answering this question
                </h4>
              </div>
              <ClaimList
                roomId={room.id}
                questionId={selectedQuestion.id}
                onReportClaim={(c) => setReportState({ claimId: c.id, contentPreview: c.content, entityTypeLabel: "Claim" })}
                onReportEvidence={(ev) => setReportState({ evidenceId: ev.id, contentPreview: ev.content, entityTypeLabel: "Evidence" })}
              />
            </div>
          </div>
        ) : (
          <QuestionList
            roomId={room.id}
            onSelectQuestion={setSelectedQuestion}
            onReportQuestion={(q) => setReportState({ questionId: q.id, contentPreview: q.content, entityTypeLabel: "Question" })}
          />
        )
      )}

      {activeTab === "claims" && (
        <ClaimList
          roomId={room.id}
          onReportClaim={(c) => setReportState({ claimId: c.id, contentPreview: c.content, entityTypeLabel: "Claim" })}
          onReportEvidence={(ev) => setReportState({ evidenceId: ev.id, contentPreview: ev.content, entityTypeLabel: "Evidence" })}
        />
      )}

      {activeTab === "evidence" && (
        <RoomEvidenceTab roomId={room.id} />
      )}

      {activeTab === "sources" && (
        <RoomSourcesTab roomId={room.id} />
      )}

      <ConfirmDialog
        open={showRetractConfirm}
        title="Retract question?"
        description="This action is irreversible. The question will be permanently retracted along with all associated answers."
        confirmLabel="Retract"
        variant="danger"
        onConfirm={async () => {
          if (!selectedQuestion) return;
          try {
            await retractQuestionMutation.mutateAsync(selectedQuestion.id);
            setSelectedQuestion((prev) => prev ? { ...prev, isRetracted: true } : null);
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
      />
    </div>
  );
}

interface RoomEvidenceTabProps {
  roomId: string;
}

function RoomEvidenceTab({ roomId }: RoomEvidenceTabProps) {
  const { data: evidence, isLoading, error } = useRoomEvidence(roomId);
  
  const getDirectionStyles = (direction: string) => {
    switch (direction) {
      case "support":
        return "bg-emerald-500/10 border-emerald-500/25 text-emerald-400";
      case "contradict":
        return "bg-rose-500/10 border-rose-500/25 text-rose-400";
      case "context":
        return "bg-slate-500/10 border-slate-500/25 text-slate-400";
      default:
        return "bg-muted border-border text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 pt-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-border bg-card/25 p-5 animate-pulse space-y-3">
            <div className="h-3 w-24 bg-muted rounded" />
            <div className="h-10 w-full bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive mt-4">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <p className="font-medium">Failed to load evidence: {(error as Error).message}</p>
      </div>
    );
  }

  if (!evidence || evidence.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-card/10 p-12 text-center max-w-md mx-auto space-y-3 mt-4">
        <div className="mx-auto rounded-full bg-muted/40 p-3 w-fit text-muted-foreground">
          <FileText className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">No evidence cards asserted yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Evidence asserted on claims will appear here as a room-wide bibliography.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      <h4 className="text-base font-bold text-foreground">Room Evidence Bibliography</h4>
      <div className="grid grid-cols-1 gap-4">
        {evidence.map((ev) => {
          const isEvAnon = ev.identityMode === "anonymous";
          const isEvDeleted = ev.username === "Deleted User";

          return (
            <div
              id={`ev-${ev.id}`}
              key={ev.id}
              className={`rounded-2xl border border-border/50 bg-card/30 p-5 space-y-3 transition-colors hover:bg-card/40 relative ${
                ev.isRetracted ? "opacity-60 grayscale-[15%]" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider border ${
                    getDirectionStyles(ev.direction)
                  }`}>
                    {ev.direction}s
                  </span>
                  <span className="rounded bg-muted border border-border/60 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground capitalize">
                    {ev.evidenceType}
                  </span>
                  {ev.isRetracted && (
                    <span className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-500">
                      Retracted
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs leading-relaxed text-foreground/80 whitespace-pre-wrap font-medium">
                {ev.content}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-border/20 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-4.5 w-4.5 overflow-hidden rounded-full border border-border/60 bg-muted flex items-center justify-center">
                    {ev.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ev.avatarUrl}
                        alt={`${ev.username}'s avatar`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-2.5 w-2.5 text-muted-foreground/60" />
                    )}
                  </div>
                  <span className={`font-bold ${
                    isEvAnon
                      ? "text-muted-foreground"
                      : isEvDeleted
                      ? "text-destructive/75"
                      : "text-foreground"
                  }`}>
                    {isEvAnon ? "Anonymous" : ev.username || "Unknown User"}
                  </span>
                  <span>•</span>
                  <span>
                    {new Date(ev.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-primary bg-primary/5 border border-primary/10 rounded-lg px-2.5 py-1 text-[11px] font-bold">
                    <Link2 className="h-3 w-3 shrink-0" />
                    <span className="truncate max-w-[150px]">
                      {ev.sourceUrl ? (
                        <a href={ev.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {ev.sourceTitle}
                        </a>
                      ) : (
                        <span>{ev.sourceTitle}</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface RoomSourcesTabProps {
  roomId: string;
}

function RoomSourcesTab({ roomId }: RoomSourcesTabProps) {
  const { data: evidence, isLoading, error } = useRoomEvidence(roomId);

  if (isLoading) {
    return (
      <div className="space-y-4 pt-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 rounded-xl border border-border bg-card/25 p-5 animate-pulse space-y-2">
            <div className="h-4 w-40 bg-muted rounded" />
            <div className="h-3 w-20 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive mt-4">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <p className="font-medium">Failed to load sources: {(error as Error).message}</p>
      </div>
    );
  }

  // Extract unique sources client-side from the view records
  const uniqueSources: {
    id: string;
    title: string;
    url: string | null;
    filePath: string | null;
    isRetracted: boolean;
    citationsCount: number;
  }[] = [];
  const seenSourceIds = new Set<string>();

  (evidence || []).forEach((ev) => {
    if (ev.sourceId) {
      if (!seenSourceIds.has(ev.sourceId)) {
        seenSourceIds.add(ev.sourceId);
        uniqueSources.push({
          id: ev.sourceId,
          title: ev.sourceTitle,
          url: ev.sourceUrl,
          filePath: ev.sourceFilePath,
          isRetracted: ev.sourceIsRetracted,
          citationsCount: 1,
        });
      } else {
        const srcObj = uniqueSources.find((s) => s.id === ev.sourceId);
        if (srcObj) {
          srcObj.citationsCount += 1;
        }
      }
    }
  });

  if (uniqueSources.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-card/10 p-12 text-center max-w-md mx-auto space-y-3 mt-4">
        <div className="mx-auto rounded-full bg-muted/40 p-3 w-fit text-muted-foreground">
          <Link2 className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">No source citations yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Verified references cited in evidence will be indexed here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      <h4 className="text-base font-bold text-foreground">Room Bibliography Sources</h4>
      <div className="grid grid-cols-1 gap-3.5">
        {uniqueSources.map((src) => (
          <div
            key={src.id}
            className={`rounded-2xl border border-border/50 bg-card/30 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors hover:bg-card/40 relative ${
              src.isRetracted ? "opacity-60 grayscale-[15%]" : ""
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h5 className="text-sm font-extrabold text-foreground">{src.title}</h5>
                {src.isRetracted && (
                  <span className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-500">
                    Retracted
                  </span>
                )}
              </div>
              {src.url && (
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  <span className="truncate max-w-[280px] sm:max-w-md">{src.url}</span>
                </a>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground bg-muted border border-border/60 px-2.5 py-1 rounded-lg">
                {src.citationsCount} {src.citationsCount === 1 ? "Citation" : "Citations"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CommentItemProps {
  node: CommentNode;
  level: number;
  currentUserId?: string | null;
  parentUsername?: string | null;
  activeReplyId: string | null;
  setActiveReplyId: (id: string | null) => void;
  activeEditId: string | null;
  setActiveEditId: (id: string | null) => void;
  onReply: (parentId: string, content: string, anonymous: boolean) => Promise<void>;
  onEdit: (messageId: string, content: string) => Promise<void>;
  onExtractClaim: (comment: DiscussionMessage) => void;
  onReport: (message: DiscussionMessage) => void;
}

function CommentItem({
  node,
  level,
  currentUserId,
  parentUsername,
  activeReplyId,
  setActiveReplyId,
  activeEditId,
  setActiveEditId,
  onReply,
  onEdit,
  onExtractClaim,
  onReport,
}: CommentItemProps) {
  const { message, children } = node;
  const isAnonymous = message.identityMode === "anonymous";
  const isDeleted = message.username === "Deleted User";

  // Dynamic Edit countdown timer
  const [canEdit, setCanEdit] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(300);

  useEffect(() => {
    if (!currentUserId || message.userId !== currentUserId) {
      setCanEdit(false);
      return;
    }

    const checkEditWindow = () => {
      const createdTime = new Date(message.createdAt).getTime();
      const elapsed = Date.now() - createdTime;
      const windowLimit = 5 * 60 * 1000; // 5 minutes
      const remainingSecs = Math.max(0, Math.ceil((windowLimit - elapsed) / 1000));
      
      setSecondsLeft(remainingSecs);
      setCanEdit(elapsed < windowLimit);
    };

    checkEditWindow();
    const interval = setInterval(checkEditWindow, 1000); // Check every second

    return () => clearInterval(interval);
  }, [message.createdAt, message.userId, currentUserId]);

  // Forms states
  const [replyContent, setReplyContent] = useState("");
  const [replyAnonymous, setReplyAnonymous] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [isReplyPosting, setIsReplyPosting] = useState(false);

  const [editContent, setEditContent] = useState(message.content);
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditSaving, setIsEditSaving] = useState(false);

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReplyError(null);
    setIsReplyPosting(true);
    try {
      await onReply(message.id, replyContent, replyAnonymous);
      setReplyContent("");
      setReplyAnonymous(false);
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : "Failed to post reply.");
    } finally {
      setIsReplyPosting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    setIsEditSaving(true);
    try {
      await onEdit(message.id, editContent);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to save edit.");
    } finally {
      setIsEditSaving(false);
    }
  };

  const isReplying = activeReplyId === message.id;
  const isEditing = activeEditId === message.id;

  const msgDate = new Date(message.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // visual indent limit to 3 levels
  const indentLevel = Math.min(level, 3);

  return (
    <div id={`msg-${message.id}`} className="space-y-3" style={{ paddingLeft: `${indentLevel * 1.25}rem` }}>
      <div className="group relative flex gap-4 rounded-2xl border border-border/50 bg-card/30 p-5 transition-colors hover:bg-card/40">
        
        {/* Left vertical timeline line to visually link nested comments */}
        {level > 0 && (
          <div className="absolute top-0 -left-4 w-px h-full bg-border/40" />
        )}

        {/* User Avatar */}
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border/60 bg-muted flex items-center justify-center">
          {message.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={message.avatarUrl}
              alt={`${message.username}'s avatar`}
              className="h-full w-full object-cover"
            />
          ) : (
            <User className={`h-4.5 w-4.5 ${isAnonymous ? "text-muted-foreground/60" : "text-muted-foreground"}`} />
          )}
        </div>

        {/* Message details */}
        <div className="flex-1 space-y-1.5">
          <div className="flex items-baseline justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-2">
              <span className={`text-xs font-bold ${
                isAnonymous
                  ? "text-muted-foreground"
                  : isDeleted
                  ? "text-destructive/75"
                  : "text-foreground"
              }`}>
                {isAnonymous ? "Anonymous" : message.username || "Unknown User"}
              </span>
              
              {/* Indentation nesting visual risk mitigation text */}
              {level >= 3 && parentUsername && (
                <span className="text-[10px] font-semibold text-primary/75">
                  Replying to @{parentUsername}
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground">{msgDate}</span>
          </div>

          {/* Edit mode vs Read mode */}
          {isEditing ? (
            <form onSubmit={handleEditSubmit} className="space-y-3 mt-1.5">
              {editError && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-2.5 text-[11px] text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}
              <div className="relative">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                  disabled={isEditSaving}
                />
                <span className={`absolute bottom-2 right-2 text-[9px] font-semibold ${
                  editContent.length > 2000 ? "text-destructive" : "text-muted-foreground"
                }`}>
                  {editContent.length} / 2000
                </span>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveEditId(null);
                    setEditContent(message.content);
                    setEditError(null);
                  }}
                  disabled={isEditSaving}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent/40 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditSaving || editContent.trim().length === 0}
                  className="flex items-center gap-1 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
                >
                  {isEditSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  <span>Save</span>
                </button>
              </div>
            </form>
          ) : (
            <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
              {message.content}
            </p>
          )}

          {/* Action Row (Reply / Edit / Extract Claim) */}
          {!isEditing && currentUserId && (
            <div className="flex items-center gap-4 pt-2">
              {!message.isModerated && (
                <button
                  onClick={() => {
                    setActiveReplyId(isReplying ? null : message.id);
                    setActiveEditId(null);
                  }}
                  className={`inline-flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer ${
                    isReplying ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Reply className="h-3.5 w-3.5" />
                  <span>Reply</span>
                </button>
              )}

              {!message.isModerated && (
                <button
                  onClick={() => onExtractClaim(message)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <Award className="h-3.5 w-3.5 text-primary/75" />
                  <span>Extract Claim</span>
                </button>
              )}

              {!message.isModerated && message.username !== "Deleted User" && (
                <button
                  onClick={() => onReport(message)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <Flag className="h-3.5 w-3.5 text-destructive/75" />
                  <span>Report</span>
                </button>
              )}

              {canEdit && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveEditId(message.id);
                      setActiveReplyId(null);
                      setEditContent(message.content);
                      setEditError(null);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                    <Clock className="h-3 w-3" />
                    <span>{Math.floor(secondsLeft / 60)}:{(secondsLeft % 60).toString().padStart(2, "0")} left</span>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Inline Reply Form */}
      {isReplying && (
        <form
          onSubmit={handleReplySubmit}
          className="rounded-2xl border border-border/60 bg-card/20 p-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {replyError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-2.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{replyError}</span>
            </div>
          )}
          <div className="relative">
            <textarea
              rows={3}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={`Reply to @${isAnonymous ? "Anonymous" : message.username}...`}
              className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              disabled={isReplyPosting}
            />
            <span className={`absolute bottom-2 right-2 text-[9px] font-semibold ${
              replyContent.length > 2000 ? "text-destructive" : "text-muted-foreground"
            }`}>
              {replyContent.length} / 2000
            </span>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={replyAnonymous}
                onChange={(e) => setReplyAnonymous(e.target.checked)}
                className="rounded border-input text-primary accent-primary h-3.5 w-3.5"
                disabled={isReplyPosting}
              />
              <span className="text-[11px] font-semibold text-foreground">Reply Anonymously</span>
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveReplyId(null);
                  setReplyContent("");
                  setReplyError(null);
                }}
                disabled={isReplyPosting}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent/40 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isReplyPosting || replyContent.trim().length === 0}
                className="flex items-center gap-1 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
              >
                {isReplyPosting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                <span>Post Reply</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Recursive Children comments render */}
      {children.length > 0 && (
        <div className="space-y-3">
          {children.map((childNode) => (
            <CommentItem
              key={childNode.message.id}
              node={childNode}
              level={level + 1}
              currentUserId={currentUserId}
              parentUsername={message.username}
              activeReplyId={activeReplyId}
              setActiveReplyId={setActiveReplyId}
              activeEditId={activeEditId}
              setActiveEditId={setActiveEditId}
              onReply={onReply}
              onEdit={onEdit}
              onExtractClaim={onExtractClaim}
              onReport={onReport}
            />
          ))}
        </div>
      )}
    </div>
  );
}
