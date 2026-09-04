"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, UserPlus, MessageSquare, Swords } from "lucide-react";

interface GuestContributionPromptProps {
  roomType?: "discussion" | "debate";
  customReturnUrl?: string;
}

export function GuestContributionPrompt({
  roomType = "discussion",
  customReturnUrl,
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
      className="rounded-2xl border border-border/70 bg-card/40 p-6 backdrop-blur-sm space-y-4 text-center sm:text-left sm:flex sm:items-center sm:justify-between sm:space-y-0"
    >
      <div className="space-y-1 sm:max-w-xl">
        <div className="flex items-center justify-center sm:justify-start gap-2 text-foreground font-bold text-sm">
          <Icon className="h-4 w-4 text-primary" />
          <span>Want to contribute to this {isDebate ? "debate" : "discussion"}?</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {isDebate
            ? "Sign in to state your argument, support a side with evidence, or participate in the thread."
            : "Sign in to share your perspective, help answer questions, or contribute evidence."}
        </p>
      </div>

      <div className="flex items-center justify-center sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0">
        <Link
          href={registerHref}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/60 px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
        >
          <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Create Account</span>
        </Link>
        <Link
          href={loginHref}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
        >
          <LogIn className="h-3.5 w-3.5" />
          <span>Sign In</span>
        </Link>
      </div>
    </div>
  );
}
