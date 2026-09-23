"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, MessageSquare, Swords, X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useFoundingStatus } from "../hooks/use-founding-status";

export function FoundingParticipantPrompt() {
  const { status } = useAuth();
  const { data, isLoading } = useFoundingStatus();
  const [dismissed, setDismissed] = useState(false);

  if (status !== "authenticated" || isLoading || !data || dismissed) {
    return null;
  }

  // Only show if not yet a founding member AND has at least one participation
  // (shows progress toward the badge)
  const hasDiscussion = data.hasDiscussion;
  const hasDebate = data.hasDebate;
  const isMember = data.isFoundingMember;

  // If already a member, don't show the prompt
  if (isMember) return null;

  // Don't show if no participation at all (too early)
  if (!hasDiscussion && !hasDebate) return null;

  // Don't show again if dismissed in this session
  if (typeof window !== "undefined" && sessionStorage.getItem("founding_prompt_dismissed")) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("founding_prompt_dismissed", "true");
  };

  return (
    <section
      data-testid="founding-participant-prompt"
      className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card/50 to-card/30 p-5 sm:p-6 backdrop-blur-sm space-y-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Become a Founding Participant
            </h2>
            <p className="text-xs text-muted-foreground">
              You&apos;re here during Discora&apos;s early Beta. Participate in one Discussion and one Debate to earn the Founding Participant badge.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors cursor-pointer"
          aria-label="Dismiss founding participant prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Discussion step */}
        <div className={cn(
          "flex items-start gap-3 rounded-xl border p-3 transition-all",
          hasDiscussion
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-border/60 bg-card/40"
        )}>
          <div className={cn(
            "mt-0.5 shrink-0",
            hasDiscussion ? "text-emerald-500" : "text-muted-foreground"
          )}>
            {hasDiscussion ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <MessageSquare className="h-5 w-5" />
            )}
          </div>
          <div className="space-y-0.5 text-xs">
            <span className={cn(
              "font-bold block",
              hasDiscussion ? "text-emerald-500" : "text-foreground"
            )}>
              {hasDiscussion ? "✓ Discussion participation" : "1. Participate in a Discussion"}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {hasDiscussion
                ? "Complete — you&apos;ve contributed to a Discussion"
                : "Post a claim, add evidence, ask a question, or vote in any Discussion"}
            </span>
          </div>
        </div>

        {/* Debate step */}
        <div className={cn(
          "flex items-start gap-3 rounded-xl border p-3 transition-all",
          hasDebate
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-border/60 bg-card/40"
        )}>
          <div className={cn(
            "mt-0.5 shrink-0",
            hasDebate ? "text-emerald-500" : "text-muted-foreground"
          )}>
            {hasDebate ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <Swords className="h-5 w-5" />
            )}
          </div>
          <div className="space-y-0.5 text-xs">
            <span className={cn(
              "font-bold block",
              hasDebate ? "text-emerald-500" : "text-foreground"
            )}>
              {hasDebate ? "✓ Debate participation" : "2. Participate in a Debate"}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {hasDebate
                ? "Complete — you&apos;ve joined a Debate"
                : "Join a side or contribute an argument in any Debate"}
            </span>
          </div>
        </div>
      </div>

      {/* Action links */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/40 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/discussions"
            className="text-primary hover:underline font-semibold"
          >
            Explore Discussions
          </Link>
          <span className="text-muted-foreground/40">•</span>
          <Link
            href="/debates"
            className="text-primary hover:underline font-semibold"
          >
            Explore Debates
          </Link>
        </div>

        <span className="text-[11px] text-muted-foreground">
          {hasDiscussion && !hasDebate && "Just one Debate away!"}
          {!hasDiscussion && hasDebate && "Just one Discussion away!"}
        </span>
      </div>

      {/* Completion note */}
      <p className="text-[11px] text-muted-foreground italic">
        The badge appears on your profile once both are complete. No points, levels, or leaderboards — just a quiet recognition that you were here during Discora&apos;s formative Beta and experienced both sides of the platform.
      </p>
    </section>
  );
}