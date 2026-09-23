"use client";

import { Sparkles, Crown, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type PlatformTitle = "founder" | "co_founder" | null;

interface ProfileTitleBadgeProps {
  platformTitle: PlatformTitle;
  isFoundingMember: boolean;
  className?: string;
}

export function ProfileTitleBadge({
  platformTitle,
  isFoundingMember,
  className,
}: ProfileTitleBadgeProps) {
  if (platformTitle === "founder") {
    return (
      <span
        data-testid="founder-badge"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-500 shadow-xs",
          className,
        )}
      >
        <Crown className="h-3 w-3 text-amber-500" />
        Founder
      </span>
    );
  }

  if (platformTitle === "co_founder") {
    return (
      <span
        data-testid="co-founder-badge"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-500 shadow-xs",
          className,
        )}
      >
        <Users className="h-3 w-3 text-emerald-500" />
        Co-Founder
      </span>
    );
  }

  if (isFoundingMember) {
    return (
      <span
        data-testid="founding-participant-badge"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-xs font-medium text-primary shadow-xs",
          className,
        )}
      >
        <Sparkles className="h-3 w-3 text-primary" />
        Founding Participant
      </span>
    );
  }

  return null;
}