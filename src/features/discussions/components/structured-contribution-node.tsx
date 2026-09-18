"use client";

import React, { memo, useState } from "react";
import {
  User,
  Reply,
  Loader2,
  Flag,
  AlertCircle,
  MoreHorizontal,
  FileText,
  Scale,
  CornerDownRight,
  Undo2,
} from "lucide-react";
import type { ReactionAggregate, ReactionType } from "@/features/discussions/types";
import { formatDate } from "@/lib/date";
import { Linkify } from "@/lib/linkify";
import { MessageReactions } from "./message-reactions";

export type StructuredNodeKind = "evidence" | "argument";

interface StructuredContributionNodeProps {
  kind: StructuredNodeKind;
  id: string;
  content: string;
  createdAt: string;
  username: string | null;
  avatarUrl: string | null;
  isAnonymous: boolean;
  isAuthor: boolean;
  currentUserId?: string | null;
  /** Short claim snippet rendered in the relationship line, e.g. the claim's opening words. */
  claimLabel: string;
  /** Approved relationship wording, e.g. "Evidence for", "Argument challenging". */
  relationLabel: string;
  sourceTitle?: string | null;
  sourceUrl?: string | null;
  reactions?: ReactionAggregate[];
  onToggleReaction?: (targetId: string, reactionType: ReactionType) => void;
  /** Open an anchored reply composer. Parent resolves the claim-origin anchor. */
  onReply?: (text: string, isAnonymous: boolean) => Promise<void>;
  onJumpToClaim?: () => void;
  onReport?: () => void;
  onRetract?: () => void;
  isPendingAction?: boolean;
}

const KIND_META: Record<StructuredNodeKind, { badge: string; icon: typeof FileText }> = {
  evidence: { badge: "Evidence", icon: FileText },
  argument: { badge: "Argument", icon: Scale },
};

/**
 * A structured contribution (Evidence or Argument) rendered as a chronological
 * conversation citizen: compact chat bubble, subtle claim relationship,
 * reply/react affordances. Never a dashboard card.
 */
export const StructuredContributionNode = memo(function StructuredContributionNode({
  kind,
  id,
  content,
  createdAt,
  username,
  avatarUrl,
  isAnonymous,
  isAuthor,
  currentUserId,
  claimLabel,
  relationLabel,
  sourceTitle,
  sourceUrl,
  reactions = [],
  onToggleReaction,
  onReply,
  onJumpToClaim,
  onReport,
  onRetract,
  isPendingAction = false,
}: StructuredContributionNodeProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showQuickReactions, setShowQuickReactions] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [replyAnonymous, setReplyAnonymous] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [isReplyPosting, setIsReplyPosting] = useState(false);

  const meta = KIND_META[kind];
  const BadgeIcon = meta.icon;
  const nodeDate = formatDate(createdAt, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onReply) return;
    setReplyError(null);
    setIsReplyPosting(true);
    try {
      await onReply(replyContent, replyAnonymous);
      setReplyContent("");
      setReplyAnonymous(false);
      setShowReplyForm(false);
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : "Failed to post reply.");
    } finally {
      setIsReplyPosting(false);
    }
  };

  return (
    <div
      id={`${kind}-${id}`}
      className="group/node space-y-1 mt-2.5"
    >
      <div className={`flex flex-col ${isAuthor ? "items-end" : "items-start"} w-full`}>
        {/* Header Row: Author + Timestamp */}
        <div className={`flex items-center gap-2 pb-1 text-[11px] text-muted-foreground/80 ${isAuthor ? "justify-end flex-row-reverse" : "justify-start"} max-w-[85%] sm:max-w-[75%] md:max-w-[70%]`}>
          {!isAuthor && (
            <div className="h-5 w-5 shrink-0 overflow-hidden rounded-full border border-border/60 bg-muted flex items-center justify-center">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={`${username}'s avatar`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-3 w-3 text-muted-foreground/70" />
              )}
            </div>
          )}
          <span className={`font-semibold ${isAuthor ? "text-primary text-xs" : isAnonymous ? "text-muted-foreground text-xs" : "text-foreground text-xs"}`}>
            {isAuthor ? "You" : isAnonymous ? "Anonymous" : username || "Unknown"}
          </span>
          <span className="text-xs text-muted-foreground shrink-0 select-none">
            {nodeDate}
          </span>
        </div>

        {/* Conversational Bubble with subtle structured treatment */}
        <div
          className={`rounded-2xl border border-border/60 bg-card/70 px-4 py-2.5 shadow-xs max-w-[85%] sm:max-w-[75%] md:max-w-[70%] w-fit break-words space-y-1.5 ${
            isAuthor ? "rounded-tr-xs" : "rounded-tl-xs"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-muted/40 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">
              <BadgeIcon className="h-2.5 w-2.5 shrink-0" />
              {meta.badge}
            </span>
          </div>

          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
            <Linkify text={content} />
          </p>

          {kind === "evidence" && (sourceTitle || sourceUrl) && (
            <div className="text-[11px] text-muted-foreground">
              {sourceUrl ? (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary/80 hover:text-primary hover:underline break-all"
                >
                  {sourceTitle || sourceUrl}
                </a>
              ) : (
                <span className="font-medium">{sourceTitle}</span>
              )}
            </div>
          )}

          {/* Subtle claim relationship (approved conversational pattern) */}
          <button
            type="button"
            onClick={onJumpToClaim}
            disabled={!onJumpToClaim}
            title={onJumpToClaim ? "Jump to the associated claim" : undefined}
            className={`flex w-full items-start gap-1.5 rounded-lg border border-border/40 bg-muted/20 px-2.5 py-1.5 text-left transition-colors ${
              onJumpToClaim ? "hover:bg-muted/40 cursor-pointer" : "cursor-default"
            }`}
          >
            <CornerDownRight className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/70" />
            <span className="text-[11px] leading-snug text-muted-foreground">
              <span className="font-semibold text-foreground/80">{relationLabel}</span>
              {" "}
              <span className="break-words">“{claimLabel}”</span>
            </span>
          </button>
        </div>

        {/* Attached reactions */}
        {reactions.length > 0 && onToggleReaction && (
          <div className={`mt-1 ${isAuthor ? "flex justify-end" : "flex justify-start"} w-full max-w-[85%] sm:max-w-[75%] md:max-w-[70%]`}>
            <MessageReactions
              targetId={id}
              targetType={kind}
              reactions={reactions}
              onToggleReaction={(type) => onToggleReaction(id, type)}
              disabled={!currentUserId}
            />
          </div>
        )}

        {/* Calm action bar: Reply, React, More */}
        {!isReplyPosting && currentUserId && onReply && (
          <div
            className={`flex items-center gap-3 pt-1 text-xs text-muted-foreground ${
              isAuthor ? "justify-end" : "justify-start"
            } w-full max-w-[85%] sm:max-w-[75%] md:max-w-[70%] px-1 opacity-100 md:opacity-0 md:group-hover/node:opacity-100 focus-within:opacity-100 transition-opacity duration-150`}
          >
            <button
              type="button"
              onClick={() => setShowReplyForm((prev) => !prev)}
              className="inline-flex items-center gap-1 font-medium transition-colors cursor-pointer hover:text-foreground"
            >
              <Reply className="h-3.5 w-3.5" />
              <span>Reply</span>
            </button>

            {onToggleReaction && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowQuickReactions((prev) => !prev)}
                  className="inline-flex items-center gap-1 font-medium transition-colors cursor-pointer hover:text-foreground"
                  title="Add reaction"
                >
                  <span className="text-[13px] leading-none">🙂</span>
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
                            onToggleReaction(id, type);
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

            {(onReport || (onRetract && isAuthor)) && (
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
                      {onRetract && isAuthor && (
                        <button
                          type="button"
                          disabled={isPendingAction}
                          onClick={() => {
                            setShowMoreMenu(false);
                            onRetract();
                          }}
                          className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer font-medium disabled:opacity-50"
                        >
                          <Undo2 className="h-3 w-3" />
                          <span>Retract</span>
                        </button>
                      )}
                      {onReport && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowMoreMenu(false);
                            onReport();
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
            )}
          </div>
        )}
      </div>

      {/* Inline reply form */}
      {showReplyForm && onReply && (
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
          <textarea
            rows={2}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write a reply..."
            className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            disabled={isReplyPosting}
          />
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
                  setShowReplyForm(false);
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
    </div>
  );
});
