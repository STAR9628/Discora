"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, UserPlus, MessageSquare, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GuestContributionPromptProps {
  roomType?: "discussion" | "debate";
  customReturnUrl?: string;
  customTitle?: string;
  customDescription?: string;
}

export function GuestContributionPrompt({
  roomType = "discussion",
  customReturnUrl,
  customTitle,
  customDescription,
}: GuestContributionPromptProps) {
  const pathname = usePathname();
  const returnUrl = customReturnUrl || pathname;
  const loginHref = `/login?redirectedFrom=${encodeURIComponent(returnUrl)}`;
  const registerHref = `/register?redirectedFrom=${encodeURIComponent(returnUrl)}`;

  const isDebate = roomType === "debate";
  const Icon = isDebate ? Swords : MessageSquare;

  return (
    <div
      data-testid="guest-contribution-prompt"
      className="rounded-2xl border border-border/80 bg-background/95 p-3.5 sm:p-4 backdrop-blur-md shadow-lg space-y-3 text-center sm:text-left sm:flex sm:items-center sm:justify-between sm:space-y-0"
    >
      <div className="space-y-0.5 sm:max-w-md">
        <div className="flex items-center justify-center sm:justify-start gap-2 text-foreground font-bold text-xs sm:text-sm">
          <Icon className="h-4 w-4 text-primary shrink-0" />
          <span>{customTitle || `Sign in to join this ${isDebate ? "debate" : "discussion"}`}</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {customDescription ||
            (isDebate
              ? "Share arguments, support a side with evidence, or participate in the conversation."
              : "Share insights, propose claims, or ask questions in this room.")}
        </p>
      </div>

      <div className="flex items-center justify-center sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0">
        <Button asChild variant="outline" size="sm" className="rounded-xl text-xs font-semibold">
          <Link href={registerHref}>
            <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Create Account</span>
          </Link>
        </Button>
        <Button asChild variant="default" size="sm" className="rounded-xl text-xs font-semibold shadow-xs">
          <Link href={loginHref}>
            <LogIn className="h-3.5 w-3.5" />
            <span>Sign In</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
