"use client";

import { useState, useEffect, memo } from "react";
import type { DiscussionMessage, DiscussionClaim, ReactionAggregate, ReactionType } from "@/features/discussions/types";
import type { CommentNode } from "@/features/discussions/utils/build-comment-tree";
import type { AggregatedClaimRequestRow } from "@/features/discussions/services/discussion-service";
import { formatDate } from "@/lib/date";
import { Linkify } from "@/lib/linkify";
import { MessageReactions } from "./message-reactions";
import { ClaimInConversation } from "./claim-in-conversation";
import { ClaimRequestBanner } from "./claim-request-banner";
import {
  User,
  Reply,
  Edit3,
  Check,
  Loader2,
  Flag,
  AlertCircle,
  MoreHorizontal,
  Smile,
  Award,
  HelpCircle,
  Trash2,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";

interface CommentItemProps {
  node: CommentNode;
  level: number;
  currentUserId?: string | null;
  parentUsername?: string | null;
  activeReplyId: string | null;
  setActiveReplyId: (id: string | null) => void;
  activeEditId: string | null;
  setActiveEditId: (id: string | null) => void;
  claimedMessageIds: Set<string>;
  messageToClaimMap: Map<string, DiscussionClaim>;
  messageEvidenceMap: Map<string, number>;
  onReply: (parentId: string, content: string, anonymous: boolean) => Promise<void>;
  onEdit: (messageId: string, content: string) => Promise<void>;
  onDelete?: (messageId: string) => Promise<void>;
  onExtractClaim: (comment: DiscussionMessage) => void;
  onReport: (message: DiscussionMessage) => void;
  onNavigateToClaims: () => void;
  onNavigateToClaim: (claimId: string) => void;
  onNavigateToEvidence: () => void;
  roomId: string;
  reactions?: ReactionAggregate[];
  onToggleReaction?: (targetId: string, reactionType: ReactionType) => void;
  claimRequestState?: AggregatedClaimRequestRow;
  hasUserRequestedClaim?: boolean;
  claimRequestsMap?: Map<string, AggregatedClaimRequestRow>;
  myClaimRequests?: Set<string>;
  isRequestActionPending?: boolean;
  onRequestClaim?: (messageId: string) => void;
  onDecideClaimRequest?: (messageId: string, decision: "accept" | "skip" | "decline") => void;
  onConvertToClaim?: (messageId: string) => void;
  onNavigateToInquiries?: (claimId: string) => void;
  onCreateArgument?: (claim: DiscussionClaim) => void;
  participantSide?: "proposition" | "opposition" | null;
}

export const CommentItem = memo(function CommentItem({
  node,
  level,
  currentUserId,
  parentUsername,
  activeReplyId,
  setActiveReplyId,
  activeEditId,
  setActiveEditId,
  claimedMessageIds,
  messageToClaimMap,
  messageEvidenceMap,
  onReply,
  onEdit,
  onDelete,
  onExtractClaim,
  onReport,
  onNavigateToClaims,
  onNavigateToClaim,
  onNavigateToEvidence,
  roomId,
  reactions = [],
  onToggleReaction,
  claimRequestState,
  hasUserRequestedClaim = false,
  claimRequestsMap,
  myClaimRequests,
  isRequestActionPending = false,
  onRequestClaim,
  onDecideClaimRequest,
  onConvertToClaim,
  onNavigateToInquiries,
  onCreateArgument,
  participantSide,
}: CommentItemProps) {
  const { message, children } = node;
  const isSystem = message.messageType === "system";
  const isQuestion = message.messageType === "question";
  const isAnonymous = message.identityMode === "anonymous" && !isSystem;
  const isDeleted = message.username === "Deleted User";
  const isAuthor = Boolean(currentUserId && message.userId === currentUserId);

  const isClaim =
    message.messageType === "claim" ||
    claimedMessageIds.has(message.id) ||
    Boolean(message.convertedClaimId);

  const associatedClaim =
    messageToClaimMap.get(message.id) ||
    (message.convertedClaimId
      ? Array.from(messageToClaimMap.values()).find((c) => c.id === message.convertedClaimId)
      : null);

  // Per-message request state: when the aggregated maps are provided, each
  // message (including nested replies) resolves its own state so a parent's
  // banner is never reused for a child. The single props remain as fallback
  // for callers that do not thread the maps (e.g. legacy discussion-room).
  const resolvedRequestState = claimRequestsMap
    ? claimRequestsMap.get(message.id)
    : claimRequestState;
  const resolvedHasRequested = myClaimRequests
    ? myClaimRequests.has(message.id)
    : hasUserRequestedClaim;

  const [canEdit, setCanEdit] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showQuickReactions, setShowQuickReactions] = useState(false);

  useEffect(() => {
    if (!currentUserId || message.userId !== currentUserId) {
      setCanEdit(false);
      return;
    }

    const checkEditWindow = () => {
      const createdTime = new Date(message.createdAt).getTime();
      const elapsed = Date.now() - createdTime;
      const windowLimit = 5 * 60 * 1000;
      const remainingSecs = Math.max(0, Math.ceil((windowLimit - elapsed) / 1000));

      setSecondsLeft(remainingSecs);
      setCanEdit(elapsed < windowLimit);
    };

    checkEditWindow();
    const interval = setInterval(checkEditWindow, 1000);
    return () => clearInterval(interval);
  }, [message.createdAt, message.userId, currentUserId]);

  const [replyContent, setReplyContent] = useState("");
  const [replyAnonymous, setReplyAnonymous] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [isReplyPosting, setIsReplyPosting] = useState(false);

  const [editContent, setEditContent] = useState(message.content);
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const msgDate = formatDate(message.createdAt, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isSystem) {
    return (
      <div id={`msg-${message.id}`} className="flex justify-center py-1.5">
        <div className="flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-4 py-1.5">
          <span className="text-[10px] text-amber-400/80 font-medium text-center leading-tight">
            {message.content}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      id={`msg-${message.id}`}
      className={`group/comment space-y-1 ${level > 0 ? "border-l-2 border-border/40 pl-3 sm:pl-4 mt-2" : "mt-2.5"}`}
    >
      <div className={`flex flex-col ${isAuthor ? "items-end" : "items-start"} w-full`}>
        {/* Header Row: Author, Side, Replying to, Timestamp */}
        <div className={`flex items-center gap-2 pb-1 text-[11px] text-muted-foreground/80 ${isAuthor ? "justify-end flex-row-reverse" : "justify-start"} max-w-[85%] sm:max-w-[75%] md:max-w-[70%]`}>
          {!isAuthor && (
            <div className="h-5 w-5 shrink-0 overflow-hidden rounded-full border border-border/60 bg-muted flex items-center justify-center">
              {message.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={message.avatarUrl}
                  alt={`${message.username}'s avatar`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className={`h-3 w-3 ${isAnonymous ? "text-muted-foreground/50" : "text-muted-foreground"}`} />
              )}
            </div>
          )}

          <span
            className={`font-semibold ${
              isAuthor
                ? "text-primary text-[11px]"
                : isAnonymous
                ? "text-muted-foreground"
                : isDeleted
                ? "text-destructive/75"
                : "text-foreground"
            }`}
          >
            {isAuthor ? "You" : isAnonymous ? "Anonymous" : message.username || "Unknown"}
          </span>

          {/* Question indicator badge */}
          {isQuestion && (
            <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.2 text-[9px] font-bold text-amber-500 uppercase tracking-wider">
              Question
            </span>
          )}

          {/* Debate side indicator */}
          {participantSide && (
            <span className="rounded-md border border-border/40 bg-muted/40 px-1.5 py-0.2 text-[9px] font-semibold text-muted-foreground uppercase">
              {participantSide}
            </span>
          )}

          {/* Replying indicator */}
          {level >= 1 && parentUsername && (
            <span className="text-[10px] font-medium text-primary/75 truncate">
              ↳ @{parentUsername}
            </span>
          )}

          <span className="text-xs text-muted-foreground shrink-0 select-none">
            {msgDate}
          </span>
          {message.isEdited && (
            <span
              className="text-[10px] text-muted-foreground/70 shrink-0 select-none italic"
              title={message.editedAt ? `Edited ${formatDate(message.editedAt)}` : "Edited"}
            >
              • Edited
            </span>
          )}
        </div>

        {/* Conversational Bubble: In-Place Claim OR Question OR Normal Message OR In-Place Edit */}
        {isClaim && associatedClaim ? (
          <div className="w-fit max-w-[88%] sm:max-w-[78%] md:max-w-[72%]">
            <ClaimInConversation
              claim={associatedClaim}
              roomId={roomId}
              currentUserId={currentUserId}
              onNavigateToEvidence={onNavigateToEvidence}
              onNavigateToClaim={onNavigateToClaim}
              onNavigateToInquiries={onNavigateToInquiries}
              onCreateArgument={onCreateArgument}
              isAuthor={isAuthor}
            />
          </div>
        ) : isEditing ? (
          <form onSubmit={handleEditSubmit} className="space-y-2.5 w-full max-w-lg rounded-2xl border border-primary/30 bg-card/90 p-3 shadow-md">
            {editError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-2 text-[11px] text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{editError}</span>
              </div>
            )}
            <div className="relative">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-input bg-background/80 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                disabled={isEditSaving}
              />
              <span
                className={`absolute bottom-2 right-2 text-[9px] font-semibold ${
                  editContent.length > 2000 ? "text-destructive" : "text-muted-foreground"
                }`}
              >
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
                className="rounded-lg border border-border px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-accent/40 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isEditSaving || editContent.trim().length === 0}
                className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {isEditSaving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                <span>Save</span>
              </button>
            </div>
          </form>
        ) : isQuestion ? (
          <div
            className={`space-y-1.5 rounded-2xl border border-amber-500/35 bg-amber-500/8 p-3 sm:p-3.5 shadow-xs ring-1 ring-amber-500/15 max-w-[85%] sm:max-w-[75%] md:max-w-[70%] w-fit break-words ${
              isAuthor ? "rounded-tr-xs" : "rounded-tl-xs"
            }`}
          >
            <div className="flex items-center gap-1.5 text-amber-500 text-[10px] font-extrabold tracking-wider uppercase">
              <HelpCircle className="h-3.5 w-3.5 shrink-0" />
              <span>Question</span>
            </div>
            <p className="text-sm font-medium leading-relaxed text-foreground whitespace-pre-wrap break-words">
              <Linkify text={message.content} />
            </p>
          </div>
        ) : (
          <div
            className={`rounded-2xl text-sm leading-relaxed px-4 py-2.5 shadow-xs max-w-[85%] sm:max-w-[75%] md:max-w-[70%] w-fit break-words ${
              isAuthor
                ? "rounded-tr-xs bg-card/90 border border-border/70 text-foreground"
                : "rounded-tl-xs bg-card/65 border border-border/50 text-foreground/90"
            }`}
          >
            <p className="whitespace-pre-wrap break-words">
              <Linkify text={message.content} />
            </p>
          </div>
        )}

        {/* Aggregated Claim Requests Banner (if any) */}
        {resolvedRequestState && (
          <div className="mt-1.5 w-full max-w-[85%] sm:max-w-[75%] md:max-w-[70%]">
            <ClaimRequestBanner
              isAuthor={isAuthor}
              requestState={resolvedRequestState}
              hasUserRequested={resolvedHasRequested}
              isPendingAction={isRequestActionPending}
              onAccept={() => onDecideClaimRequest?.(message.id, "accept")}
              onSkip={() => onDecideClaimRequest?.(message.id, "skip")}
              onDecline={() => onDecideClaimRequest?.(message.id, "decline")}
              onConvert={() => onConvertToClaim?.(message.id)}
            />
          </div>
        )}

        {/* Lightweight Reactions Row attached to bubble */}
        {reactions.length > 0 && onToggleReaction && (
          <div className={`mt-1 ${isAuthor ? "flex justify-end" : "flex justify-start"} w-full max-w-[85%] sm:max-w-[75%] md:max-w-[70%]`}>
            <MessageReactions
              targetId={message.id}
              targetType={isClaim ? "claim" : "message"}
              reactions={reactions}
              onToggleReaction={(type) => onToggleReaction(message.id, type)}
              disabled={!currentUserId}
            />
          </div>
        )}

        {/* Calm Action Bar: Reply, React, Request/Convert, More (Desktop hover reveal, mobile touch accessible) */}
        {!isEditing && currentUserId && !message.isModerated && (
          <div
            className={`flex items-center gap-3 pt-1 text-xs text-muted-foreground ${
              isAuthor ? "justify-end" : "justify-start"
            } w-full max-w-[85%] sm:max-w-[75%] md:max-w-[70%] px-1 opacity-100 md:opacity-0 md:group-hover/comment:opacity-100 focus-within:opacity-100 transition-opacity duration-150`}
          >
            {/* Reply */}
            <button
              type="button"
              onClick={() => {
                setActiveReplyId(isReplying ? null : message.id);
                setActiveEditId(null);
              }}
              className={`inline-flex items-center gap-1 font-medium transition-colors cursor-pointer hover:text-foreground ${
                isReplying ? "text-primary font-bold" : ""
              }`}
            >
              <Reply className="h-3.5 w-3.5" />
              <span>Reply</span>
            </button>

            {/* React Trigger */}
            {onToggleReaction && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowQuickReactions((prev) => !prev)}
                  className="inline-flex items-center gap-1 font-medium transition-colors cursor-pointer hover:text-foreground"
                  title="Add reaction"
                >
                  <Smile className="h-3.5 w-3.5" />
                  <span>React</span>
                </button>

                {showQuickReactions && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setShowQuickReactions(false)}
                    />
                    <div className="absolute left-0 bottom-full mb-1 z-30 flex items-center gap-1 p-1 rounded-full border border-border bg-popover shadow-md animate-in fade-in zoom-in-95 duration-100">
                      {(["like", "insightful", "curious"] as ReactionType[]).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            onToggleReaction(message.id, type);
                            setShowQuickReactions(false);
                          }}
                          className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted text-sm cursor-pointer"
                        >
                          {type === "like" ? "👍" : type === "insightful" ? "💡" : "🤔"}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Request as Claim (non-author) or Make this a Claim (author) on regular messages */}
            {!isClaim && !isQuestion && (
              <>
                {isAuthor ? (
                  <button
                    type="button"
                    onClick={() => onConvertToClaim?.(message.id)}
                    className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    title="Turn this message into an examined Claim"
                  >
                    <Award className="h-3.5 w-3.5 text-primary/75" />
                    <span className="hidden sm:inline">Make this a Claim</span>
                    <span className="sm:hidden">Claim</span>
                  </button>
                ) : !resolvedHasRequested ? (
                  <button
                    type="button"
                    onClick={() => onRequestClaim?.(message.id)}
                    className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Request author to examine this message as a Claim"
                  >
                    <Award className="h-3.5 w-3.5 text-muted-foreground/80" />
                    <span className="hidden sm:inline">Request as Claim</span>
                    <span className="sm:hidden">Request</span>
                  </button>
                ) : null}
              </>
            )}

            {/* More Menu: Edit, Report */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMoreMenu((prev) => !prev)}
                className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-muted/60 text-muted-foreground transition-colors cursor-pointer"
                title="More actions"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>

              {showMoreMenu && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowMoreMenu(false)}
                  />
                  <div className="absolute right-0 bottom-full mb-1 z-30 min-w-[130px] rounded-xl border border-border bg-popover p-1 shadow-md text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveEditId(message.id);
                          setActiveReplyId(null);
                          setEditContent(message.content);
                          setShowMoreMenu(false);
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer font-medium"
                      >
                        <span className="flex items-center gap-1.5">
                          <Edit3 className="h-3 w-3" />
                          <span>Edit</span>
                        </span>
                        <span className="text-[10px] text-amber-500 font-bold">
                          {Math.floor(secondsLeft / 60)}:
                          {(secondsLeft % 60).toString().padStart(2, "0")}
                        </span>
                      </button>
                    )}

                    {canEdit && onDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreMenu(false);
                          setShowDeleteConfirm(true);
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer font-medium"
                      >
                        <span className="flex items-center gap-1.5">
                          <Trash2 className="h-3 w-3" />
                          <span>Delete</span>
                        </span>
                        <span className="text-[10px] text-amber-500 font-bold">
                          {Math.floor(secondsLeft / 60)}:
                          {(secondsLeft % 60).toString().padStart(2, "0")}
                        </span>
                      </button>
                    )}

                    {!isDeleted && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreMenu(false);
                          onReport(message);
                        }}
                        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer font-medium"
                      >
                        <Flag className="h-3 w-3" />
                        <span>Report</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Inline Reply Form */}
      {isReplying && (
        <form
          onSubmit={handleReplySubmit}
          className={`rounded-2xl border border-border/70 bg-card/60 p-3.5 space-y-2.5 max-w-lg w-full mt-2 animate-in fade-in slide-in-from-top-1 duration-150 ${
            isAuthor ? "ml-auto" : "mr-auto"
          }`}
        >
          {replyError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{replyError}</span>
            </div>
          )}
          <div className="relative">
            <textarea
              rows={2}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={`Reply to @${isAnonymous ? "Anonymous" : message.username}...`}
              className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              disabled={isReplyPosting}
            />
            <span
              className={`absolute bottom-2 right-2 text-[9px] font-semibold ${
                replyContent.length > 2000 ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {replyContent.length} / 2000
            </span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={replyAnonymous}
                onChange={(e) => setReplyAnonymous(e.target.checked)}
                className="rounded border-input text-primary accent-primary h-3.5 w-3.5"
                disabled={isReplyPosting}
              />
              <span className="text-[11px] font-medium text-foreground/80">
                Reply Anonymously
              </span>
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
                className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {isReplyPosting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Reply className="h-3.5 w-3.5" />
                )}
                <span>Reply</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Recursive Children for Conversation Threading */}
      {children.length > 0 && (
        <div className="space-y-2">
          {children.map((child) => (
            <CommentItem
              key={child.message.id}
              node={child}
              level={level + 1}
              currentUserId={currentUserId}
              parentUsername={isAnonymous ? "Anonymous" : message.username}
              activeReplyId={activeReplyId}
              setActiveReplyId={setActiveReplyId}
              activeEditId={activeEditId}
              setActiveEditId={setActiveEditId}
              claimedMessageIds={claimedMessageIds}
              messageToClaimMap={messageToClaimMap}
              messageEvidenceMap={messageEvidenceMap}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onExtractClaim={onExtractClaim}
              onReport={onReport}
              onNavigateToClaims={onNavigateToClaims}
              onNavigateToClaim={onNavigateToClaim}
              onNavigateToEvidence={onNavigateToEvidence}
              roomId={roomId}
              reactions={reactions}
              onToggleReaction={onToggleReaction}
              claimRequestState={claimRequestState}
              hasUserRequestedClaim={hasUserRequestedClaim}
              claimRequestsMap={claimRequestsMap}
              myClaimRequests={myClaimRequests}
              isRequestActionPending={isRequestActionPending}
              onRequestClaim={onRequestClaim}
              onDecideClaimRequest={onDecideClaimRequest}
              onConvertToClaim={onConvertToClaim}
              onNavigateToInquiries={onNavigateToInquiries}
              onCreateArgument={onCreateArgument}
              participantSide={participantSide}
            />
          ))}
        </div>
      )}
      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete contribution?"
        description="Are you sure you want to delete this contribution? This can only be done within 5 minutes of posting."
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={async () => {
          if (!onDelete) return;
          setIsDeleting(true);
          try {
            await onDelete(message.id);
            setShowDeleteConfirm(false);
          } catch (err) {
            toast.error("Failed to delete message", {
              description: err instanceof Error ? err.message : "Please try again.",
            });
          } finally {
            setIsDeleting(false);
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
});
