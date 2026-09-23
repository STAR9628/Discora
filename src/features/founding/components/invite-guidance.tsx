"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, X, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { ShareButton } from "@/components/share/share-button";

interface InviteGuidanceProps {
  roomType: "discussion" | "debate";
  roomSlug: string;
  roomTitle: string;
}

/**
 * Lightweight contextual invitation guidance for public rooms.
 *
 * Reuses existing mechanisms only:
 * - ShareButton (copy/share the room link)
 * - /friends (existing username lookup + friend requests)
 * - private rooms already have dedicated invite UI (private-debate-management),
 *   so this card renders on public rooms only (enforced by callers).
 *
 * No referral points, rewards, counters, or contact uploads.
 */
export function InviteGuidance({ roomType, roomSlug, roomTitle }: InviteGuidanceProps) {
  const { status } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (status !== "authenticated" || dismissed) return null;

  if (!expanded) {
    return (
      <div
        data-testid={`invite-guidance-${roomType}`}
        className="rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border"
      >
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full items-center justify-between gap-3 text-left cursor-pointer"
        >
          <span className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-medium text-foreground">
                Know someone who would enjoy this {roomType}?
              </span>
              <span className="block text-xs text-muted-foreground">
                Invite a friend to join the conversation
              </span>
            </span>
          </span>
          <span className="shrink-0 text-xs font-semibold text-primary">Invite</span>
        </button>
      </div>
    );
  }

  return (
    <div
      data-testid={`invite-guidance-${roomType}-expanded`}
      className="rounded-xl border border-primary/20 bg-card/40 space-y-3 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-sm font-medium text-foreground">
              Invite a friend to this {roomType}
            </span>
            <span className="block text-xs text-muted-foreground">
              Share the link, or find them on Discora first
            </span>
          </span>
        </span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
          aria-label="Dismiss invite guidance"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ShareButton
          ariaLabel={`Share this ${roomType}`}
          shareTitle={roomTitle}
          shareText={`I thought you'd enjoy this ${roomType} on Discora.`}
          sharePath={`/${roomType}s/${roomSlug}`}
          showLabel
        />
        <Link
          href="/friends"
          className={cn(
            "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5",
            "text-xs font-medium text-muted-foreground transition-colors",
            "hover:bg-accent/50 hover:text-foreground",
          )}
        >
          <UserPlus className="h-4 w-4" />
          Find friends
        </Link>
      </div>

      <p className="text-[11px] italic leading-relaxed text-muted-foreground">
        Invites use Discora&apos;s existing friends and sharing. Your privacy settings control who can
        contact you.
      </p>
    </div>
  );
}
