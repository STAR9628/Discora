"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Scale, HelpCircle, Send, Loader2, X, AlertCircle } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useCurrentProfile } from "@/features/profiles/hooks/use-profile";
import { usePostMessage, useCreateClaim } from "@/features/discussions/hooks/use-discussions";
import { useTypingIndicator } from "@/features/rooms/hooks/use-typing-indicator";
import { TypingIndicator } from "@/features/rooms/components/typing-indicator";
import { GuestContributionPrompt } from "./guest-contribution-prompt";
import { toast } from "@/components/ui/toast";

export type ComposerMode = "message" | "claim" | "question";
export type ClaimTypeOption = "fact" | "opinion" | "prediction" | "proposal" | "observation";

export interface UnifiedComposerProps {
  roomId: string;
  roomType?: "discussion" | "debate";
  participantSide?: "proposition" | "opposition" | "neutral" | null;
  replyingTo?: {
    messageId: string;
    username: string;
  } | null;
  onCancelReply?: () => void;
  onSuccess?: () => void;
  className?: string;
}

export function UnifiedComposer({
  roomId,
  roomType = "discussion",
  participantSide,
  replyingTo,
  onCancelReply,
  onSuccess,
  className = "",
}: UnifiedComposerProps) {
  const { user } = useAuth();
  const { data: currentProfile } = useCurrentProfile();

  const currentUser = React.useMemo(() => {
    if (!user) return null;
    return {
      id: user.id,
      username:
        currentProfile?.username ||
        (user.user_metadata?.username as string) ||
        (user.user_metadata?.name as string) ||
        user.email?.split("@")[0] ||
        "Someone",
      avatarUrl: currentProfile?.avatarUrl || (user.user_metadata?.avatar_url as string) || null,
    };
  }, [user, currentProfile]);

  const { typingUsers, sendTyping } = useTypingIndicator({ roomId, currentUser });

  const [mode, setMode] = useState<ComposerMode>("message");
  const [content, setContent] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [claimType, setClaimType] = useState<ClaimTypeOption>("opinion");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const postMutation = usePostMessage();
  const createClaimMutation = useCreateClaim(roomId);

  // Automatically expand and focus when replyingTo changes
  useEffect(() => {
    if (replyingTo) {
      setIsExpanded(true);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [replyingTo]);

  if (!user) {
    return (
      <div
        data-testid="unified-composer-container"
        className={`fixed bottom-16 md:bottom-0 left-0 md:left-64 right-0 z-35 pointer-events-none p-2.5 sm:p-4 bg-gradient-to-t from-background via-background/95 to-transparent backdrop-blur-xs ${className}`}
      >
        <div className="pointer-events-auto max-w-3xl mx-auto w-full">
          <GuestContributionPrompt roomType={roomType} />
        </div>
      </div>
    );
  }

  const trimmedLength = content.trim().length;
  const isClaimTooShort = mode === "claim" && trimmedLength < 25;
  const isClaimTooLong = mode === "claim" && trimmedLength > 500;
  const isMessageTooLong = (mode === "message" || mode === "question") && trimmedLength > 2000;
  const isSubmitDisabled =
    isSubmitting ||
    trimmedLength === 0 ||
    isClaimTooShort ||
    isClaimTooLong ||
    isMessageTooLong;

  const isExpandedState = isExpanded || content.trim().length > 0 || Boolean(replyingTo);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = content.trim();

    if (mode === "claim") {
      if (trimmed.length < 25) {
        setError("Claims must be at least 25 characters.");
        return;
      }
      if (trimmed.length > 500) {
        setError("Claims must not exceed 500 characters.");
        return;
      }
    } else {
      if (trimmed.length === 0) {
        setError("Content cannot be empty.");
        return;
      }
      if (trimmed.length > 2000) {
        setError("Content must not exceed 2000 characters.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === "message") {
        await postMutation.mutateAsync({
          roomId,
          parentMessageId: replyingTo?.messageId || null,
          content: trimmed,
          identityMode: anonymous ? "anonymous" : "public",
          messageType: "message",
        });
        toast.success(replyingTo ? "Reply posted." : "Contribution posted.");
      } else if (mode === "question") {
        // Option 1 approved architecture: canonical conversational record in messages
        await postMutation.mutateAsync({
          roomId,
          parentMessageId: replyingTo?.messageId || null,
          content: trimmed,
          identityMode: anonymous ? "anonymous" : "public",
          messageType: "question",
        });
        toast.success(roomType === "debate" ? "Inquiry posted to conversation." : "Question posted to conversation.");
      } else if (mode === "claim") {
        // 1. Post canonical message row in feed
        const msgResult = await postMutation.mutateAsync({
          roomId,
          parentMessageId: null, // Claims are elevated root items in feed
          content: trimmed,
          identityMode: anonymous ? "anonymous" : "public",
          messageType: "message",
        });

        // 2. Create structured claim linked to origin message
        await createClaimMutation.mutateAsync({
          roomId,
          content: trimmed,
          claimType,
          contextType: "observation",
          identityMode: anonymous ? "anonymous" : "public",
          originMessageId: msgResult.id,
          debateSide: participantSide && participantSide !== "neutral" ? participantSide : null,
        });

        toast.success("Claim posted and elevated in room.");
      }

      setContent("");
      setIsExpanded(false);
      onCancelReply?.();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    sendTyping();
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (!isSubmitDisabled) {
        handleSubmit(e);
      }
    }
  };

  const getPlaceholder = () => {
    switch (mode) {
      case "claim":
        return "State a clear, verifiable claim or thesis for the room (min 25 characters)...";
      case "question":
        return roomType === "debate"
          ? "Ask a targeted inquiry for this debate..."
          : "Ask a foundational question to open inquiry for the room...";
      case "message":
      default:
        return replyingTo
          ? `Reply to @${replyingTo.username}...`
          : "Write a message or share a perspective...";
    }
  };

  return (
    <div
      data-testid="unified-composer-container"
      className={`fixed bottom-16 md:bottom-0 left-0 md:left-64 right-0 z-35 pointer-events-none p-2.5 sm:p-4 bg-gradient-to-t from-background via-background/95 to-transparent backdrop-blur-xs ${className}`}
    >
      <div className="pointer-events-auto max-w-3xl mx-auto w-full">
        {typingUsers.length > 0 && (
          <div className="flex justify-start">
            <TypingIndicator typingUsers={typingUsers} />
          </div>
        )}
        {!isExpandedState ? (
          /* Minimal Idle State */
          <div
            data-testid="unified-composer-idle"
            onClick={() => {
              setIsExpanded(true);
              setTimeout(() => textareaRef.current?.focus(), 50);
            }}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background/95 backdrop-blur-md px-4 py-2.5 shadow-lg hover:border-primary/50 transition-all cursor-text group"
          >
            <div className="flex items-center gap-2.5 text-muted-foreground/75 flex-1 min-w-0">
              <MessageSquare className="h-4 w-4 text-primary shrink-0 transition-transform group-hover:scale-110" />
              <span className="text-xs sm:text-sm select-none truncate">
                {replyingTo ? `Reply to @${replyingTo.username}...` : "Write a message..."}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="h-7 w-7 rounded-xl bg-primary text-primary-foreground flex items-center justify-center opacity-85 group-hover:opacity-100 transition-opacity">
                <Send className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        ) : (
          /* Gently Expanded State */
          <div
            data-testid="unified-composer"
            className="rounded-2xl border border-border/80 bg-background/95 backdrop-blur-md p-3 sm:p-4 shadow-xl space-y-2.5 animate-in fade-in zoom-in-98 duration-150"
          >
            {/* Replying Banner */}
            {replyingTo && (
              <div className="flex items-center justify-between gap-2 px-3 py-1 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary font-medium">
                <span>Replying to @{replyingTo.username}</span>
                <button
                  type="button"
                  onClick={onCancelReply}
                  className="p-0.5 rounded-md hover:bg-primary/20 text-primary cursor-pointer transition-colors"
                  title="Cancel reply"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Mode Selector & Post Options */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 p-0.5 rounded-xl bg-muted/40 border border-border/40">
                <button
                  type="button"
                  data-testid="composer-mode-message"
                  onClick={() => setMode("message")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    mode === "message"
                      ? "bg-background text-foreground shadow-xs border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5 text-primary" />
                  <span>Message</span>
                </button>

                <button
                  type="button"
                  data-testid="composer-mode-claim"
                  onClick={() => setMode("claim")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    mode === "claim"
                      ? "bg-background text-foreground shadow-xs border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Scale className="h-3.5 w-3.5 text-blue-500" />
                  <span>Claim</span>
                </button>

                <button
                  type="button"
                  data-testid="composer-mode-question"
                  onClick={() => setMode("question")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    mode === "question"
                      ? "bg-background text-foreground shadow-xs border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <HelpCircle className="h-3.5 w-3.5 text-amber-500" />
                  <span>{roomType === "debate" ? "Inquiry" : "Question"}</span>
                </button>
              </div>

              {/* Right: Anonymous & Collapse button */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer select-none">
                  <input
                    data-testid="composer-anonymous-checkbox"
                    type="checkbox"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                    disabled={isSubmitting}
                    className="rounded border-input text-primary accent-primary h-3.5 w-3.5 cursor-pointer"
                  />
                  <span className="hidden sm:inline text-[11px]">Anonymous</span>
                </label>

                {content.trim().length === 0 && !replyingTo && (
                  <button
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    title="Collapse composer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Optional Claim Type Selector in Claim Mode */}
            {mode === "claim" && (
              <div className="flex flex-wrap items-center gap-1 pt-0.5 text-xs animate-in fade-in duration-150">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">Claim Type:</span>
                {(["opinion", "fact", "prediction", "proposal", "observation"] as ClaimTypeOption[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    data-testid={`composer-claim-type-${type}`}
                    onClick={() => setClaimType(type)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer capitalize ${
                      claimType === type
                        ? "bg-blue-500/15 text-blue-500 border border-blue-500/30 font-semibold"
                        : "bg-card/40 text-muted-foreground hover:bg-muted/60 border border-border/50"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-2 text-xs text-destructive animate-in fade-in duration-150">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Textarea Form */}
            <form onSubmit={handleSubmit} className="space-y-2">
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  data-testid="composer-textarea"
                  rows={2}
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    sendTyping();
                    if (error) setError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={getPlaceholder()}
                  disabled={isSubmitting}
                  className={`w-full rounded-xl border bg-background/50 p-2.5 text-xs sm:text-sm outline-none transition-all placeholder:text-muted-foreground/60 min-h-[52px] max-h-[140px] resize-none ${
                    mode === "claim"
                      ? "focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10 border-blue-500/20"
                      : mode === "question"
                      ? "focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/10 border-amber-500/20"
                      : "focus:border-primary focus:ring-2 focus:ring-primary/10 border-input"
                  }`}
                />
              </div>

              {/* Footer Row: Guidance, Character counter, Submit button */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className={`font-medium ${
                      mode === "claim"
                        ? trimmedLength > 0 && trimmedLength < 25
                          ? "text-amber-500"
                          : trimmedLength > 500
                          ? "text-destructive font-bold"
                          : "text-muted-foreground"
                        : trimmedLength > 2000
                        ? "text-destructive font-bold"
                        : "text-muted-foreground"
                    }`}
                  >
                    {mode === "claim" ? (
                      <>
                        {content.length}/500
                        {trimmedLength > 0 && trimmedLength < 25 && (
                          <span className="ml-1 text-xs text-amber-500 font-semibold">
                            (min 25)
                          </span>
                        )}
                      </>
                    ) : (
                      <>{content.length}/2000</>
                    )}
                  </span>
                  <span className="hidden sm:inline text-muted-foreground">
                    · Ctrl+Enter
                  </span>
                </div>

                <button
                  data-testid="composer-submit-button"
                  type="submit"
                  disabled={isSubmitDisabled}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    mode === "claim"
                      ? "bg-blue-600 hover:bg-blue-500 text-white"
                      : mode === "question"
                      ? "bg-amber-600 hover:bg-amber-500 text-white"
                      : "bg-primary hover:opacity-90 text-primary-foreground"
                  }`}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                  <span>
                    {isSubmitting
                      ? "Posting…"
                      : mode === "claim"
                      ? "Post Claim"
                      : mode === "question"
                      ? "Post Question"
                      : replyingTo
                      ? "Post Reply"
                      : "Post Message"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
