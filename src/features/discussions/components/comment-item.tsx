"use client";

import { useState, useEffect, memo } from "react";
import type { DiscussionMessage, DiscussionClaim } from "@/features/discussions/types";
import type { CommentNode } from "@/features/discussions/utils/build-comment-tree";
import { formatDate } from "@/lib/date";
import { AuthorTrustSignal } from "@/features/reputation/components/author-trust-signal";
import { User, Award, Reply, Edit3, Check, Loader2, Send, Clock, Flag, FileText, AlertCircle } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { ReportDialog } from "./report-dialog";

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
  authorRepScores?: Map<string, number>;
  onReply: (parentId: string, content: string, anonymous: boolean) => Promise<void>;
  onEdit: (messageId: string, content: string) => Promise<void>;
  onExtractClaim: (comment: DiscussionMessage) => void;
  onReport: (message: DiscussionMessage) => void;
  onNavigateToClaims: () => void;
  onNavigateToClaim: (claimId: string) => void;
  onNavigateToEvidence: (claimId: string) => void;
  roomId?: string;
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
  authorRepScores,
  onReply,
  onEdit,
  onExtractClaim,
  onReport,
  onNavigateToClaims,
  onNavigateToClaim,
  onNavigateToEvidence,
  roomId,
}: CommentItemProps) {
  const { message, children } = node;
  const isSystem = message.messageType === "system";
  const isAnonymous = message.identityMode === "anonymous" && !isSystem;
  const isDeleted = message.username === "Deleted User";

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
  const [reportState, setReportState] = useState<{
    messageId: string;
    contentPreview: string;
    entityTypeLabel: string;
  } | null>(null);

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

  const indentLevel = Math.min(level, 3);

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
    <div id={`msg-${message.id}`} className="space-y-3" style={{ paddingLeft: `${indentLevel * 1.25}rem` }}>
      <div className="group relative flex gap-4 rounded-2xl border border-border/50 bg-card/30 p-5 transition-colors hover:bg-card/40">
        {level > 0 && (
          <div className="absolute top-0 -left-4 w-px h-full bg-border/40" />
        )}

        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border/60 bg-muted flex items-center justify-center">
          {message.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={message.avatarUrl} alt={`${message.username}'s avatar`} className="h-full w-full object-cover" />
          ) : (
            <User className={`h-4.5 w-4.5 ${isAnonymous ? "text-muted-foreground/60" : "text-muted-foreground"}`} />
          )}
        </div>

        <div className="flex-1 space-y-1.5">
          <div className="flex items-baseline justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-2">
              <span className={`text-xs font-bold ${
                isAnonymous ? "text-muted-foreground" : isDeleted ? "text-destructive/75" : "text-foreground"
              }`}>
                {isAnonymous ? "Anonymous" : message.username || "Unknown User"}
              </span>
              {!isAnonymous && !isDeleted && message.userId && message.username && (
                <AuthorTrustSignal
                  userId={message.userId}
                  username={message.username}
                  reputationScore={authorRepScores?.get(message.userId)}
                />
              )}
              {claimedMessageIds.has(message.id) && messageToClaimMap.has(message.id) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const claim = messageToClaimMap.get(message.id)!;
                    onNavigateToClaim(claim.id);
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 transition-colors hover:bg-emerald-500/20 cursor-pointer"
                  title="View this claim in the Claims tab"
                >
                  <Award className="h-3 w-3" />
                  Claim
                </button>
              )}
              {claimedMessageIds.has(message.id) && messageToClaimMap.has(message.id) && (
                <span className="text-[10px] text-muted-foreground/60 font-medium">
                  {(messageToClaimMap.get(message.id)!.agreeCount ?? 0) + (messageToClaimMap.get(message.id)!.disagreeCount ?? 0)} votes · {messageEvidenceMap.get(message.id) ?? 0} evidence
                </span>
              )}
              {level >= 3 && parentUsername && (
                <span className="text-[10px] font-semibold text-primary/75">
                  Replying to @{parentUsername}
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground">{msgDate}</span>
          </div>

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
                <span className={`absolute bottom-2 right-2 text-[9px] font-semibold ${editContent.length > 2000 ? "text-destructive" : "text-muted-foreground"}`}>
                  {editContent.length} / 2000
                </span>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setActiveEditId(null); setEditContent(message.content); setEditError(null); }}
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

          {!isEditing && currentUserId && (
            <div className="flex items-center gap-4 pt-2">
              {!message.isModerated && (
                <button
                  onClick={() => { setActiveReplyId(isReplying ? null : message.id); setActiveEditId(null); }}
                  className={`inline-flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer ${isReplying ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Reply className="h-3.5 w-3.5" />
                  <span>Reply</span>
                </button>
              )}

              {!message.isModerated && (
                claimedMessageIds.has(message.id) && messageToClaimMap.has(message.id) ? (
                  <button
                    onClick={() => { const claim = messageToClaimMap.get(message.id)!; onNavigateToClaim(claim.id); }}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 transition-colors hover:bg-emerald-500/20 cursor-pointer"
                  >
                    <Award className="h-3 w-3" />
                    Claim Created
                  </button>
                ) : (
                  <button
                    onClick={() => onExtractClaim(message)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Award className="h-3.5 w-3.5 text-primary/75" />
                    <span>Create Claim</span>
                  </button>
                )
              )}

              {!message.isModerated && claimedMessageIds.has(message.id) && messageToClaimMap.has(message.id) && messageEvidenceMap.has(message.id) && (
                <button
                  onClick={() => { const claim = messageToClaimMap.get(message.id)!; onNavigateToEvidence(claim.id); }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5 text-primary/75" />
                  <span>View Evidence</span>
                </button>
              )}

              {!message.isModerated && message.username !== "Deleted User" && currentUserId && (
                <Tooltip content="Report contribution">
                  <button
                    onClick={() => {
                      if (roomId) {
                        setReportState({
                          messageId: message.id,
                          contentPreview: message.content.slice(0, 100),
                          entityTypeLabel: "Contribution",
                        });
                      } else {
                        onReport(message);
                      }
                    }}
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Flag className="h-4 w-4" />
                  </button>
                </Tooltip>
              )}

              {canEdit && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setActiveEditId(message.id); setActiveReplyId(null); setEditContent(message.content); setEditError(null); }}
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

      {isReplying && (
        <form onSubmit={handleReplySubmit} className="rounded-2xl border border-border/60 bg-card/20 p-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
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
            <span className={`absolute bottom-2 right-2 text-[9px] font-semibold ${replyContent.length > 2000 ? "text-destructive" : "text-muted-foreground"}`}>
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
                onClick={() => { setActiveReplyId(null); setReplyContent(""); setReplyError(null); }}
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
              claimedMessageIds={claimedMessageIds}
              messageToClaimMap={messageToClaimMap}
              messageEvidenceMap={messageEvidenceMap}
              authorRepScores={authorRepScores}
              onReply={onReply}
              onEdit={onEdit}
              onExtractClaim={onExtractClaim}
              onReport={onReport}
              onNavigateToClaims={onNavigateToClaims}
              onNavigateToClaim={onNavigateToClaim}
              onNavigateToEvidence={onNavigateToEvidence}
              roomId={roomId}
            />
          ))}
        </div>
      )}

      {roomId && (
        <ReportDialog
          isOpen={!!reportState}
          onClose={() => setReportState(null)}
          messageId={reportState?.messageId || null}
          contentPreview={reportState?.contentPreview || ""}
          entityTypeLabel={reportState?.entityTypeLabel || ""}
          roomId={roomId}
        />
      )}
    </div>
  );
});
